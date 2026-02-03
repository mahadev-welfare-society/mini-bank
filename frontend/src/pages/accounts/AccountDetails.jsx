import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  PiggyBank,
  Building2,
  TrendingDown,
  Calendar,
  CheckCircle,
  XCircle,
  Edit,
  FileText,
  History,
  Eye,
  Calculator,
  Clock,
} from "lucide-react";
import ConfirmationModal from "../../components/ConfirmationModal";
import InterestLogsTable from "./InterestLogs";

function AccountDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUpdate, loading: permissionsLoading } = usePermissions();
  const [account, setAccount] = useState(null);

  // Permission check for customer_accounts module
  const canUpdateAccount =
    user?.role === "admin" ||
    (user?.role === "manager" && canUpdate("customer_accounts"));
  const [transactions, setTransactions] = useState([]);
  const [emiSchedule, setEmiSchedule] = useState([]);
  const [scheduleSummary, setScheduleSummary] = useState(null);
  const [parameterHistory, setParameterHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [newInterestRate, setNewInterestRate] = useState("");
  const [interestReason, setInterestReason] = useState("");
  const [activeTab, setActiveTab] = useState("details"); // details, transactions, emi, history

  useEffect(() => {
    fetchAccount();
  }, [id]);

  useEffect(() => {
    if (account && activeTab === "transactions") {
      fetchTransactions();
    } else if (account && activeTab === "emi" && isLoanAccount()) {
      fetchEmiSchedule();
    } else if (account && activeTab === "history" && user?.role === "admin") {
      fetchParameterHistory();
    }
  }, [account, activeTab]);

  // Prevent background scrolling when any modal is open
  useEffect(() => {
    const isAnyModalOpen = showInterestModal || showStatusModal;

    if (isAnyModalOpen) {
      // Save current overflow style
      const originalOverflow = document.body.style.overflow;
      // Disable scrolling
      document.body.style.overflow = "hidden";

      // Cleanup: restore scrolling when modal closes
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showInterestModal, showStatusModal]);

  const fetchAccount = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/accounts/get/${id}`, {});
      if (response.data.success) {
        setAccount(response.data.data);
      } else {
        toast.error("Account not found");
        navigate("/customers");
      }
    } catch (error) {
      toast.error("Error fetching account details");
      navigate("/customers");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true);
      const response = await api.post(`/accounts/${id}/transactions`, {
        page: 1,
        limit: 100,
      });
      if (response.data.success) {
        setTransactions(response.data.data || []);
      }
    } catch (error) {
      toast.error("Error fetching transactions");
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchEmiSchedule = async () => {
    try {
      setScheduleLoading(true);
      const response = await api.post(`/accounts/${id}/emi-schedule`, {});
      if (response.data.success) {
        setEmiSchedule(response.data.data?.schedule || []);
        setScheduleSummary(response.data.data?.summary || null);
      }
    } catch (error) {
      toast.error("Error fetching EMI schedule");
    } finally {
      setScheduleLoading(false);
    }
  };

  const fetchParameterHistory = async () => {
    try {
      const response = await api.post(`/accounts/${id}/parameter-history`, {});
      if (response.data.success) {
        setParameterHistory(response.data.data || []);
      }
    } catch (error) {
      toast.error("Error fetching parameter history");
    }
  };
  const getNextInstallmentDate = (startDate) => {
    if (!startDate) return null;

    const start = new Date(startDate);
    const today = new Date();

    const installmentDay = start.getDate();

    // base = current month/year
    let nextDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      installmentDay
    );

    // if today's date already passed the installment day → next month
    if (today.getDate() > installmentDay) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate;
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const response = await api.put(`/accounts/${id}/status`, {
        status: newStatus,
      });
      if (response.data.success) {
        toast.success(
          `Account ${
            newStatus === "active" ? "activated" : "closed"
          } successfully`
        );
        setShowStatusModal(false);
        fetchAccount();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Error updating account status");
    }
  };

  const handleInterestRateUpdate = async () => {
    if (
      !newInterestRate ||
      parseFloat(newInterestRate) < 0 ||
      parseFloat(newInterestRate) > 100
    ) {
      toast.error("Please enter a valid interest rate (0-100)");
      return;
    }

    try {
      const response = await api.put(`/accounts/${id}/interest-rate`, {
        interest_rate: parseFloat(newInterestRate),
        reason: interestReason || "Interest rate update",
      });
      if (response.data.success) {
        toast.success("Interest rate updated successfully");
        setShowInterestModal(false);
        setNewInterestRate("");
        setInterestReason("");
        fetchAccount();
        if (activeTab === "history") {
          fetchParameterHistory();
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Error updating interest rate");
    }
  };

  const isLoanAccount = () => {
    return account?.account_type_name?.toLowerCase() === "loan";
  };

  const getAccountIcon = () => {
    const accountType = account?.account_type_name?.toLowerCase();
    switch (accountType) {
      case "savings":
        return Wallet;
      case "rd":
        return PiggyBank;
      case "fd":
        return Building2;
      case "dds":
        return Calendar;
      case "loan":
        return TrendingDown;
      default:
        return CreditCard;
    }
  };

  const getAccountColor = () => {
    const accountType = account?.account_type_name?.toLowerCase();
    switch (accountType) {
      case "savings":
        return "from-blue-500 to-indigo-500";
      case "rd":
        return "from-purple-500 to-pink-500";
      case "fd":
        return "from-green-500 to-emerald-500";
      case "loan":
        return "from-red-500 to-orange-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Account Not Found
          </h3>
          <button
            onClick={() => navigate("/customers")}
            className="mt-4 btn-primary"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  const Icon = getAccountIcon();
  const balance = account.balance || 0;
  const displayBalance = isLoanAccount() ? Math.abs(balance) : balance;
  const isNegative = isLoanAccount() && balance < 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => {
            if (account.customer_id) {
              navigate(`/customers/${account.customer_id}/accounts`);
            } else {
              navigate("/customers");
            }
          }}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 text-sm sm:text-base"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          <span className="hidden sm:inline">Back to Accounts</span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
              Account Details
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">
              {account.account_type_name} Account #{account.id}
            </p>
          </div>
          {canUpdateAccount && account.account_type_name === "Savings" && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowStatusModal(true)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  account.status === "active"
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-green-50 text-green-600 hover:bg-green-100"
                }`}
              >
                {account.status === "active" ? (
                  <>
                    <XCircle className="h-4 w-4 inline mr-2" />
                    Close Account
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Activate Account
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Overview Card - Compact */}
      <div
        className={`bg-gradient-to-r ${getAccountColor()} rounded-xl shadow-lg p-4 sm:p-5 mb-4 text-white`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                {account?.account_type_display_name ||
                  account.account_type_name}
              </h2>
              <p className="text-white/80 text-xs">Account #{account.id}</p>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full border-2 ${
              account.status === "active"
                ? "bg-green-500/90 backdrop-blur-sm border-green-300/50 shadow-lg"
                : "bg-gray-600/90 backdrop-blur-sm border-gray-400/50 shadow-lg"
            }`}
          >
            <span className="text-xs font-bold text-white drop-shadow-sm">
              {account.status === "active" ? "Active" : "Closed"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="text-white/80 text-xs mb-0.5">
              {isLoanAccount() ? "Outstanding Balance" : "Balance"}
            </p>
            <p className="text-xl sm:text-2xl font-bold">
              {isNegative && "-"}
              {formatCurrency(displayBalance)}
            </p>
          </div>
          {isLoanAccount() && account.snapshot_loan_principal && (
            <>
              <div>
                <p className="text-white/80 text-xs mb-0.5">Principal Amount</p>
                <p className="text-lg sm:text-xl font-bold">
                  {formatCurrency(account.snapshot_loan_principal)}
                </p>
              </div>
              {account.snapshot_emi_amount && (
                <div>
                  <p className="text-white/80 text-xs mb-0.5">Monthly EMI</p>
                  <p className="text-lg sm:text-xl font-bold">
                    {formatCurrency(account.snapshot_emi_amount)}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4 sm:px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("details")}
              className={`py-4 px-4 sm:px-6 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "details"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Eye className="h-4 w-4 inline mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`py-4 px-4 sm:px-6 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "transactions"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Transactions
            </button>
            {isLoanAccount() && (
              <button
                onClick={() => setActiveTab("emi")}
                className={`py-4 px-4 sm:px-6 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === "emi"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Calculator className="h-4 w-4 inline mr-2" />
                EMI Schedule
              </button>
            )}

            {user?.role === "admin" && (
              <button
                onClick={() => setActiveTab("interest-logs")}
                className={`py-4 px-4 sm:px-6 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === "interest-logs"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Clock className="h-4 w-4 inline mr-2" />
                Interest Logs
              </button>
            )}
            {user?.role === "admin" && (
              <button
                onClick={() => setActiveTab("history")}
                className={`py-4 px-4 sm:px-6 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === "history"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <History className="h-4 w-4 inline mr-2" />
                History
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {activeTab === "details" && (
            <div className="space-y-4">
              {/* Account Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Account ID</p>
                  <p className="text-sm font-semibold text-gray-900">
                    #{account.id}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Account Type</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {account.account_type_name}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Customer</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {account.customer_name || "N/A"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      account.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {account.status === "active" ? "Active" : "Closed"}
                  </span>
                </div>
                {account.start_date && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Start Date
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(account.start_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {account.start_date && account.account_type_name === "RD" && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Next Installment Date
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {getNextInstallmentDate(
                        account.start_date
                      )?.toLocaleDateString()}
                    </p>
                  </div>
                )}

                {account.maturity_date && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Maturity Date
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(account.maturity_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Interest Rate</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      {account.snapshot_interest_rate ||
                        account.account_type?.interest_rate ||
                        "N/A"}
                      %
                    </p>
                    {canUpdateAccount && (
                      <button
                        onClick={() => {
                          setNewInterestRate(
                            account.snapshot_interest_rate?.toString() ||
                              account.account_type?.interest_rate?.toString() ||
                              ""
                          );
                          setShowInterestModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        <Edit className="h-3 w-3 inline mr-1" />
                        Update
                      </button>
                    )}
                  </div>
                </div>
                {account.created_at && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Created At</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(account.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Loan Specific Information */}
              {isLoanAccount() && scheduleSummary && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
                    <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
                    Loan Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-gray-600">Total EMIs</p>
                      <p className="text-base font-bold text-gray-900">
                        {scheduleSummary.total_emis || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Paid EMIs</p>
                      <p className="text-base font-bold text-green-600">
                        {scheduleSummary.paid_emis || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Remaining EMIs</p>
                      <p className="text-base font-bold text-red-600">
                        {scheduleSummary.remaining_emis || 0}
                      </p>
                    </div>
                    {scheduleSummary.next_payment_date && (
                      <div>
                        <p className="text-xs text-gray-600">Next Payment</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(
                            scheduleSummary.next_payment_date
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "transactions" && (
            <div>
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Transactions
                  </h3>
                  <p className="text-gray-500">
                    This account doesn't have any transactions yet.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Balance After
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(
                                transaction.created_at
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                                  transaction.transaction_type === "deposit"
                                    ? "bg-green-100 text-green-800"
                                    : transaction.transaction_type ===
                                      "withdrawal"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {transaction.transaction_type}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {transaction.transaction_type === "deposit"
                                ? "+"
                                : "-"}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {transaction.payment_type
                                ? transaction.payment_type.toUpperCase()
                                : "CASH"}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {transaction.description || "N/A"}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(transaction.balance_after)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                              transaction.transaction_type === "deposit"
                                ? "bg-green-100 text-green-800"
                                : transaction.transaction_type === "withdrawal"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {transaction.transaction_type}
                          </span>
                          <p className="text-xs text-gray-500">
                            {new Date(
                              transaction.created_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 mb-0.5">Amount</p>
                          <p
                            className={`text-base font-bold ${
                              transaction.transaction_type === "deposit"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {transaction.transaction_type === "deposit"
                              ? "+"
                              : "-"}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </p>
                        </div>
                        {transaction.description && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-0.5">
                              Description
                            </p>
                            <p className="text-sm text-gray-900">
                              {transaction.description}
                            </p>
                          </div>
                        )}
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-0.5">
                            Balance After
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(transaction.balance_after)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "emi" && isLoanAccount() && (
            <div>
              {scheduleLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : emiSchedule.length === 0 ? (
                <div className="text-center py-12">
                  <Calculator className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No EMI Schedule
                  </h3>
                  <p className="text-gray-500">
                    EMI schedule is not available for this loan account.
                  </p>
                </div>
              ) : (
                <div>
                  {scheduleSummary && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Principal</p>
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(scheduleSummary.principal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">EMI Amount</p>
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(scheduleSummary.emi_amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Outstanding</p>
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(
                              scheduleSummary.outstanding_balance
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Interest Rate</p>
                          <p className="text-lg font-bold text-gray-900">
                            {scheduleSummary.interest_rate}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            EMI #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Due Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            EMI Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {emiSchedule.map((emi, index) => {
                          // Determine status from backend fields
                          const isPaid =
                            emi.is_paid === true || emi.is_paid === "true";
                          const isOverdue =
                            emi.is_overdue === true ||
                            emi.is_overdue === "true";
                          const status = isPaid
                            ? "paid"
                            : isOverdue
                            ? "overdue"
                            : "pending";

                          // Get date - handle both payment_date and due_date fields
                          const dateStr = emi.payment_date || emi.due_date;
                          let displayDate = "Invalid Date";
                          if (dateStr) {
                            try {
                              const dateObj =
                                typeof dateStr === "string"
                                  ? new Date(dateStr)
                                  : dateStr;
                              if (!isNaN(dateObj.getTime())) {
                                displayDate = dateObj.toLocaleDateString();
                              }
                            } catch (e) {
                              console.error("Date parsing error:", e, dateStr);
                            }
                          }

                          return (
                            <tr
                              key={index}
                              className={`hover:bg-gray-50 ${
                                status === "paid" ? "bg-green-50/50" : ""
                              }`}
                            >
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {emi.emi_number || index + 1}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {displayDate}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {formatCurrency(emi.emi_amount)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                                    status === "paid"
                                      ? "bg-green-100 text-green-800"
                                      : status === "overdue"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {status === "paid"
                                    ? "Paid"
                                    : status === "overdue"
                                    ? "Overdue"
                                    : "Pending"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && user?.role === "admin" && (
            <div>
              {parameterHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    No Parameter History
                  </h3>
                  <p className="text-sm text-gray-500">
                    Track changes to account parameters like interest rates,
                    limits, etc.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-xs text-blue-800 font-medium">
                      <History className="h-3 w-3 inline mr-1" />
                      Audit Trail: Shows all parameter changes made to this
                      account
                    </p>
                  </div>
                  {parameterHistory.map((update, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-900 capitalize">
                          {update.parameter_name?.replace(/_/g, " ") ||
                            "Interest Rate"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(
                            update.created_at || update.updated_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-500 mb-0.5">Old Value</p>
                          <p className="font-semibold text-gray-700">
                            {update.old_value}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-0.5">New Value</p>
                          <p className="font-semibold text-blue-600">
                            {update.new_value}
                          </p>
                        </div>
                      </div>
                      {update.reason && (
                        <p className="text-xs text-gray-500 mt-1.5">
                          <span className="font-medium">Reason:</span>{" "}
                          {update.reason}
                        </p>
                      )}
                      {(update.updater_name || update.updated_by_name) && (
                        <p className="text-xs text-gray-400 mt-1">
                          Updated by:{" "}
                          {update.updater_name || update.updated_by_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "interest-logs" && user?.role === "admin" && (
            <InterestLogsTable accountId={id} />
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      <ConfirmationModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onConfirm={() =>
          handleStatusUpdate(account.status === "active" ? "closed" : "active")
        }
        title={
          account.status === "active" ? "Close Account" : "Activate Account"
        }
        message={
          account.status === "active"
            ? `Are you sure you want to close this ${account.account_type_name} account? The account will be marked as closed.`
            : `Are you sure you want to activate this ${account.account_type_name} account?`
        }
        confirmText={account.status === "active" ? "Close Account" : "Activate"}
        confirmColor="red"
      />

      {/* Interest Rate Update Modal */}
      {showInterestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-none">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Update Interest Rate
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Interest Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={newInterestRate}
                  onChange={(e) => setNewInterestRate(e.target.value)}
                  className="input-field"
                  placeholder="Enter interest rate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={interestReason}
                  onChange={(e) => setInterestReason(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Enter reason for update"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInterestModal(false);
                  setNewInterestRate("");
                  setInterestReason("");
                }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleInterestRateUpdate}
                className="flex-1 btn-primary"
              >
                Update Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountDetails;
