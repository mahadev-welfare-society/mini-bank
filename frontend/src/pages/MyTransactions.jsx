import React, { useState, useEffect } from "react";
import { useAuth } from "../store/AuthContext";
import { api } from "../services/api";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  DollarSign,
  Eye,
  BarChart3,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

function MyTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [showFilters, setShowFilters] = useState(false); // Start collapsed by default

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions();
    }
  }, [selectedAccount]);

  const fetchAccounts = async () => {
    try {
      const response = await api.post("/customers/me");
      if (response.data.success) {
        const customerData = response.data.data;
        const accounts = customerData.accounts || [];
        setAccounts(accounts);
        if (accounts.length > 0) {
          setSelectedAccount(accounts[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to fetch accounts");
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        `/accounts/${selectedAccount}/transactions`,
        {
          page: 1,
          limit: 50,
        }
      );
      if (response.data.success) {
        setTransactions(response.data.data);
      } else {
        toast.error(response.data.message || "Failed to fetch transactions");
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to fetch transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type.toLowerCase()) {
      case "deposit":
        return <ArrowDownLeft className="h-5 w-5 text-emerald-600" />;
      case "withdrawal":
        return <ArrowUpRight className="h-5 w-5 text-orange-600" />;
      case "loan_repayment":
        return <DollarSign className="h-5 w-5 text-blue-600" />;
      default:
        return <DollarSign className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type.toLowerCase()) {
      case "deposit":
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "withdrawal":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "loan_repayment":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
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

    setDateRange({
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    });
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.reference_number
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || transaction.status === statusFilter;
    const matchesType =
      !typeFilter || transaction.transaction_type === typeFilter;

    // Date range filter
    let matchesDate = true;
    if (dateRange.startDate || dateRange.endDate) {
      const transactionDate = new Date(transaction.created_at);
      transactionDate.setHours(0, 0, 0, 0);

      if (dateRange.startDate) {
        const startDate = new Date(dateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (transactionDate < startDate) {
          matchesDate = false;
        }
      }

      if (dateRange.endDate && matchesDate) {
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (transactionDate > endDate) {
          matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  const selectedAccountData = accounts.find(
    (acc) => acc.id === selectedAccount
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 p-4 sm:p-6 lg:p-8 max-w-full overflow-hidden">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            My Transactions
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTransactions}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">
                {transactions.length} Transaction
                {transactions.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
        <p className="text-gray-600">
          View and manage your transaction history across all accounts
        </p>
      </div>

      {/* Account Selection */}
      {accounts.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_type?.toUpperCase()} - Balance:{" "}
                {formatAmount(account.balance || 0)}
                {account.status === "closed" ? " (Closed)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900">Filters</h3>
            </div>
            <div className="flex items-center gap-2">
              {(searchTerm ||
                statusFilter ||
                typeFilter ||
                dateRange.startDate ||
                dateRange.endDate) && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("");
                    setTypeFilter("");
                    setDateRange({ startDate: "", endDate: "" });
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-white rounded transition-colors"
              >
                {showFilters ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 space-y-3">
            {/* Search and Quick Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search transactions..."
                    className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="">All Types</option>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="loan_repayment">Loan Repayment</option>
                  <option value="interest">Interest</option>
                  <option value="penalty">Penalty</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            {/* Quick Date Range Presets */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                <Calendar className="inline h-3 w-3 mr-1" />
                Quick Date Range
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setQuickDateRange("today")}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                >
                  Today
                </button>
                <button
                  onClick={() => setQuickDateRange("week")}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                >
                  7 Days
                </button>
                <button
                  onClick={() => setQuickDateRange("month")}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                >
                  1 Month
                </button>
                <button
                  onClick={() => setQuickDateRange("3months")}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                >
                  3 Months
                </button>
                <button
                  onClick={() => setQuickDateRange("6months")}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                >
                  6 Months
                </button>
                <button
                  onClick={() => setQuickDateRange("year")}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                >
                  1 Year
                </button>
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange({
                        ...dateRange,
                        startDate: e.target.value,
                      })
                    }
                    max={
                      dateRange.endDate ||
                      new Date().toISOString().split("T")[0]
                    }
                    className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange({
                        ...dateRange,
                        endDate: e.target.value,
                      })
                    }
                    min={dateRange.startDate}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {(dateRange.startDate ||
              dateRange.endDate ||
              typeFilter ||
              statusFilter ||
              searchTerm) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-2.5">
                <p className="text-xs font-semibold text-blue-900 mb-1.5">
                  Active Filters:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {dateRange.startDate && dateRange.endDate && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      <Calendar className="h-3 w-3" />
                      {new Date(dateRange.startDate).toLocaleDateString(
                        "en-IN"
                      )}{" "}
                      -{" "}
                      {new Date(dateRange.endDate).toLocaleDateString("en-IN")}
                      <button
                        onClick={() =>
                          setDateRange({ startDate: "", endDate: "" })
                        }
                        className="ml-1 hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {typeFilter && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Type: {typeFilter}
                      <button
                        onClick={() => setTypeFilter("")}
                        className="ml-1 hover:text-green-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {statusFilter && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                      Status: {statusFilter}
                      <button
                        onClick={() => setStatusFilter("")}
                        className="ml-1 hover:text-purple-900"
                      >
                        <X className="h-3 w-3" />
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
        )}
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Transaction History
            {selectedAccountData && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                - {selectedAccountData.account_type?.toUpperCase()} Account
              </span>
            )}
          </h3>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Eye className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No transactions found
            </h3>
            <p className="text-gray-600">
              {searchTerm ||
              statusFilter ||
              typeFilter ||
              dateRange.startDate ||
              dateRange.endDate
                ? "Try adjusting your filters to see more results."
                : "You don't have any transactions yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg border ${getTransactionColor(
                        transaction.transaction_type
                      )}`}
                    >
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 capitalize">
                          {transaction.transaction_type.replace("_", " ")}
                        </h4>
                        {getStatusIcon(transaction.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {transaction.description || "No description"}
                      </p>
                      {transaction.reference_number && (
                        <p className="text-xs text-gray-500">
                          Ref: {transaction.reference_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-semibold ${
                        transaction.transaction_type === "deposit"
                          ? "text-emerald-600"
                          : "text-orange-600"
                      }`}
                    >
                      {transaction.transaction_type === "deposit" ? "+" : "-"}
                      {formatAmount(transaction.amount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(transaction.created_at)}
                    </div>
                    <div className="text-xs text-gray-400">
                      Balance: {formatAmount(transaction.balance_after)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredTransactions.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Deposits</p>
                <p className="text-lg font-semibold text-emerald-600">
                  {formatAmount(
                    filteredTransactions
                      .filter((t) => t.transaction_type === "deposit")
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <ArrowUpRight className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Withdrawals</p>
                <p className="text-lg font-semibold text-orange-600">
                  {formatAmount(
                    filteredTransactions
                      .filter((t) => t.transaction_type === "withdrawal")
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-lg font-semibold text-blue-600">
                  {filteredTransactions.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyTransactions;
