import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { api } from "../services/api";
import {
  Users,
  User,
  Shield,
  Clock,
  DollarSign,
  Activity,
  CheckCircle,
  UserPlus,
  BarChart3,
  CreditCard,
  Edit,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  PieChart,
  Target,
  Wallet,
  Building2,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  Settings,
  Bell,
  Lock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  MoreHorizontal,
  Calculator,
  X,
  QrCode,
} from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";
import QRModal from "../components/QRModal";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canView } = usePermissions();
  const [dashboardData, setDashboardData] = useState({
    totalCustomers: 0,
    totalStaff: 0,
    recentCustomers: [],
    systemStatus: "Online",
    // Financial data
    totalDeposits: 0,
    totalWithdrawals: 0,
    activeAccounts: 0,
    pendingTransactions: 0,
    // Account type data
    savingsAccounts: 0,
    rdAccounts: 0,
    fdAccounts: 0,
    loanAccounts: 0,
    // Recent activity
    recentTransactions: [],
    upcomingMaturities: [],
    overduePayments: [],
    // Performance metrics
    monthlyGrowth: 0,
    customerSatisfaction: 0,
    systemUptime: 0,
    // Staff personal data
    myAccountTypes: [],
    personalBalance: 0,
    // Edit requests
    pendingEditRequests: [],
  });
  const [loading, setLoading] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [calculatorType, setCalculatorType] = useState(null); // 'rd', 'fd', 'dds', 'loan', 'select'
  const [accountTypes, setAccountTypes] = useState([]); // Store account types for calculator defaults
  const [calculatorData, setCalculatorData] = useState({
    principal: "",
    interestRate: "",
    term: "",
    monthlyContribution: "", // For RD
    dailyContribution: "", // For DDS
    frequency: "monthly", // For RD
    accountType: "", // 'rd', 'fd', 'dds', 'loan'
    termUnit: "months", // 'months', 'years', or 'days' for DDS
    calculationMethod: "compound", // 'simple' or 'compound'
  });

  useEffect(() => {
    fetchDashboardData();
    fetchAccountTypes(); // Fetch account types for calculator defaults
    if (user?.role === "admin") {
      fetchPendingEditRequests();
    }
  }, [user]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showCalculator) {
      // Save current overflow style
      const originalOverflow = document.body.style.overflow;
      // Disable scrolling
      document.body.style.overflow = "hidden";

      // Cleanup: restore scrolling when modal closes
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showCalculator]);

  const fetchAccountTypes = async () => {
    try {
      const response = await api.post("/account-types/list");
      if (response.data.success) {
        setAccountTypes(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching account types:", error);
    }
  };

  const fetchPendingEditRequests = async () => {
    try {
      const response = await api.post("/transactions/edit-requests/pending");
      if (response.data.success) {
        setDashboardData((prev) => ({
          ...prev,
          pendingEditRequests: response.data.data || [],
        }));
      }
    } catch (error) {
      console.error("Error fetching pending edit requests:", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard data from the new API
      const response = await api.post("/dashboard");
      if (response.data.success) {
        const data = response.data.data;

        if (user?.role === "staff") {
          // Staff dashboard data
          setDashboardData({
            totalCustomers: 0, // Not relevant for staff
            totalStaff: 0, // Not relevant for staff
            recentCustomers: [],
            systemStatus: "Online",
            // Financial data
            totalDeposits: 0, // Not relevant for staff
            totalWithdrawals: 0, // Not relevant for staff
            activeAccounts: data.account_count || 0,
            pendingTransactions: 0, // Not relevant for staff
            // Account type data
            ddsAccounts: data.account_distribution?.dds || 0,
            savingsAccounts: data.account_distribution?.savings || 0,
            rdAccounts: data.account_distribution?.rd || 0,
            fdAccounts: data.account_distribution?.fd || 0,
            loanAccounts: data.account_distribution?.loan || 0,
            // Recent activity
            recentTransactions: data.recent_transactions || [],
            upcomingMaturities: [],
            overduePayments: [],
            // Performance metrics
            monthlyGrowth: 0, // Not relevant for staff
            customerSatisfaction: 0, // Not relevant for staff
            systemUptime: 0, // Not relevant for staff
            // Staff personal data
            myAccountTypes: data.accounts?.map((acc) => acc.account_type) || [],
            personalBalance: data.personal_balance || 0,
            accounts: data.accounts || [],
          });
        } else {
          // Admin/Manager dashboard data
          setDashboardData({
            totalCustomers: data.total_customers || 0,
            totalStaff: data.total_staff || 0,
            recentCustomers: data.recent_customers || [],
            systemStatus: data.system_status || "Online",
            // Financial data
            totalDeposits: data.financial_metrics?.total_deposits || 0,
            totalWithdrawals: data.financial_metrics?.total_withdrawals || 0,
            activeAccounts: data.active_accounts || 0,
            pendingTransactions:
              data.financial_metrics?.pending_transactions || 0,
            // Account type data
            ddsAccounts: data.account_distribution?.dds || 0,
            savingsAccounts: data.account_distribution?.savings || 0,
            rdAccounts: data.account_distribution?.rd || 0,
            fdAccounts: data.account_distribution?.fd || 0,
            loanAccounts: data.account_distribution?.loan || 0,
            // Recent activity
            recentTransactions: data.recent_transactions || [],
            upcomingMaturities: data.upcoming_maturities || [],
            overduePayments: data.overdue_payments || [],
            // Performance metrics
            monthlyGrowth: data.monthly_growth || 0,
            customerSatisfaction: data.customer_satisfaction || 0,
            systemUptime: data.system_uptime || 0,
            // Staff personal data
            myAccountTypes: [],
            personalBalance: 0,
          });
        }
      } else {
        console.error("Failed to fetch dashboard data:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Quick Action Handlers
  const handleAddCustomer = () => {
    navigate("/customers/new");
  };

  const handleAccountTypes = () => {
    navigate("/accounts/types");
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Staff Dashboard Action Handlers
  const handleDeposit = () => {
    navigate("/my-accounts");
  };

  const handleWithdraw = () => {
    navigate("/my-accounts");
  };

  const handleContribute = () => {
    navigate("/my-accounts");
  };

  const handleLoanRepayment = () => {
    navigate("/my-accounts");
  };

  const handleViewAllTransactions = () => {
    navigate("/transactions");
  };
  const handleManageAccess = () => {
    navigate("/manage-access");
  };
  const handleViewTransactions = () => {
    navigate("/my-transactions");
  };
  const handleViewAccounts = () => {
    navigate("/my-accounts");
  };
  const handleMyProfile = () => {
    navigate("/profile");
  };
  // Helper function to get account type details
  const getAccountTypeDetails = (accountType, account = null) => {
    // Use real account data if available
    const realBalance = account?.balance
      ? `₹${account.balance.toLocaleString()}`
      : "₹0";
    const realMaturityDate = account?.maturity_date
      ? new Date(account.maturity_date).toLocaleDateString()
      : null;

    // Handle both string and object inputs for accountType
    const accountTypeName =
      typeof accountType === "string"
        ? accountType
        : accountType?.account_type ||
          accountType?.toLowerCase?.() ||
          "unknown";

    const accountTypeMap = {
      savings: {
        name: "Savings Account",
        description: "Daily banking",
        icon: PiggyBank,
        color: "green",
        balance: realBalance,
        status: "Active",
      },
      rd: {
        name: "Recurring Deposit",
        description: realMaturityDate
          ? `Matures ${realMaturityDate}`
          : "In progress",
        icon: Target,
        color: "blue",
        balance: realBalance,
        status: realMaturityDate || "Active",
      },
      fd: {
        name: "Fixed Deposit",
        description: realMaturityDate
          ? `Matures ${realMaturityDate}`
          : "Locked until maturity",
        icon: Lock,
        color: "purple",
        balance: realBalance,
        status: realMaturityDate || "Active",
      },
      dds: {
        name: "Daily Deposit Scheme",
        description: realMaturityDate
          ? `Matures ${realMaturityDate}`
          : "Locked until maturity",
        icon: Calendar,
        color: "indigo",
        balance: realBalance,
        status: realMaturityDate || "Active",
      },
      loan: {
        name: "Loan Account",
        description: "Outstanding balance",
        icon: CreditCard,
        color: "red",
        balance: realBalance,
        status: "Active",
      },
    };
    return (
      accountTypeMap[accountTypeName] || {
        name:
          typeof accountTypeName === "string"
            ? accountTypeName.charAt(0).toUpperCase() + accountTypeName.slice(1)
            : "Unknown Account",
        description: "Account details",
        icon: Wallet,
        color: "gray",
        balance: realBalance,
        status: "Inactive",
      }
    );
  };

  // Admin Dashboard
  const AdminDashboard = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Complete system overview and management
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => {
              setCalculatorType("select");
              setShowCalculator(true);
              setCalculatorData({
                principal: "",
                interestRate: "",
                term: "",
                monthlyContribution: "",
                frequency: "monthly",
                accountType: "",
                termUnit: "months",
                calculationMethod: "compound",
              });
            }}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            title="Calculate Returns & EMI"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculator
          </button>
          <button
            onClick={() => setShowQRModal(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
            title="Show QR Code"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Show QR
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 nest-hub:grid-cols-2 nest-hub-max:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-2xl shadow-lg border border-blue-200">
          <Link to="/customers">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-600">
                  {user?.role === "manager"
                    ? "My Customers"
                    : "Total Customers"}
                </p>
                <p className="desktop:text-2xl sm:text-xl text-md font-bold text-blue-900">
                  {dashboardData.totalCustomers}
                </p>
                <p className="text-[10px] sm:text-xs text-blue-600 mt-1">
                  {user?.role === "manager"
                    ? "Customers assigned to you"
                    : // : `+${dashboardData.monthlyGrowth}% this month`
                      "Total customers in the system"}
                </p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl">
                <Users className="h-4 sm:h-6 w-4 sm:w-6 text-white" />
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-2xl shadow-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-green-600">
                Active Accounts
              </p>
              <p className="desktop:text-2xl sm:text-xl text-md font-bold text-green-900">
                {dashboardData.activeAccounts}
              </p>
              <p className="text-[10px] sm:text-xs text-green-600 mt-1">
                Across all account types
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-xl">
              <Wallet className="h-4 sm:h-6 w-4 sm:w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-6 rounded-2xl shadow-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-purple-600">
                Total Deposits
              </p>
              <p className="desktop:text-2xl sm:text-xl text-md font-bold text-purple-900">
                ₹
                {dashboardData.totalDeposits >= 100000
                  ? (dashboardData.totalDeposits / 100000).toFixed(2) + "L"
                  : dashboardData.totalDeposits.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-purple-600 mt-1">
                This month
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-xl">
              <TrendingUp className="h-4 sm:h-6 w-4 sm:w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 sm:p-6 rounded-2xl shadow-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-orange-600">
                Total Withdrawal
              </p>
              <p className="desktop:text-2xl text-xl font-bold text-orange-900">
                {dashboardData.totalWithdrawals >= 100000
                  ? (dashboardData.totalWithdrawals / 100000).toFixed(2) + "L"
                  : dashboardData.totalWithdrawals.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-orange-600 mt-1">
                This month
              </p>
            </div>
            <div className="p-3 bg-orange-500 rounded-xl">
              <TrendingDown className="h-4 sm:h-6 w-4 sm:w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 nest-hub:grid-cols-2 xl:grid-cols-3  gap-8">
        {/* Account Type Distribution */}
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Account Distribution
              </h3>
              <PieChart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Daily Deposit Scheme
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {dashboardData.ddsAccounts}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Recurring Deposit
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {dashboardData.rdAccounts}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Fixed Deposit
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {dashboardData.fdAccounts}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Loan Accounts
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {dashboardData.loanAccounts}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Savings
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {dashboardData.savingsAccounts}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Transactions
            </h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {dashboardData.recentTransactions &&
            dashboardData.recentTransactions.length > 0 ? (
              dashboardData.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-3 ${
                        transaction.transaction_type === "deposit" ||
                        transaction.transaction_type === "interest"
                          ? "bg-green-500"
                          : transaction.transaction_type === "withdrawal" ||
                            transaction.transaction_type === "penalty"
                          ? "bg-red-500"
                          : "bg-blue-500"
                      }`}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.transaction_type
                          ?.replace("_", " ")
                          .toUpperCase() || "Transaction"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transaction.customer_name || "Unknown Customer"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ₹{(transaction.amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.created_at
                        ? new Date(transaction.created_at).toLocaleDateString()
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">No recent transactions</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Maturities */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Upcoming Maturities
            </h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {dashboardData.upcomingMaturities.map((maturity) => (
              <div
                key={maturity.id}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {maturity.customer}
                  </p>
                  <p className="text-xs text-gray-500">
                    {maturity.type} Account
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-900">
                    ₹{maturity.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600">{maturity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Payments */}
        {dashboardData.overduePayments?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Overdue Payments
              </h3>
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="space-y-4">
              {dashboardData.overduePayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {payment.customer}
                    </p>
                    <p className="text-xs text-gray-500">{payment.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-900">
                      ₹{payment.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-red-600">
                      {payment.daysOverdue} days overdue
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          <button
            onClick={handleAddCustomer}
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <UserPlus className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-900">
              Add Customer
            </span>
          </button>
          <button
            onClick={handleAccountTypes}
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
          >
            <Settings className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-900">
              Account Types
            </span>
          </button>
          <button
            onClick={handleManageAccess}
            className="flex flex-col items-center p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            // className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Shield className="h-8 w-8 text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">
              Manage Access
            </span>
          </button>
          <button
            onClick={handleViewAllTransactions}
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <Activity className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-900">
              View Transactions
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  // Manager Dashboard (same as Admin Dashboard)
  const ManagerDashboard = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Complete system overview and management
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => {
              setCalculatorType("select");
              setShowCalculator(true);
              setCalculatorData({
                principal: "",
                interestRate: "",
                term: "",
                monthlyContribution: "",
                frequency: "monthly",
                accountType: "",
                termUnit: "months",
                calculationMethod: "compound",
              });
            }}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            title="Calculate Returns & EMI"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculator
          </button>
          <button
            onClick={() => setShowQRModal(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
            title="Show QR Code"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Show QR
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 nest-hub:grid-cols-2 nest-hub-max:grid-cols-3 2xl:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl shadow-lg border border-blue-200">
          <Link to="/customers">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  {user?.role === "manager" ? "My Customers" : "Total Users"}
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {dashboardData.totalCustomers}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {user?.role === "manager"
                    ? "Customers assigned to you"
                    : `+${dashboardData.monthlyGrowth}% this month`}
                </p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl shadow-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">
                Active Accounts
              </p>
              <p className="desktop:text-2xl text-xl font-bold text-green-900">
                {dashboardData.activeAccounts}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Across all account types
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-xl">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl shadow-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">
                Total Deposits
              </p>
              <p className="desktop:text-2xl text-xl font-bold text-purple-900">
                ₹
                {dashboardData.totalDeposits >= 100000
                  ? (dashboardData.totalDeposits / 100000).toFixed(2) + "L"
                  : dashboardData.totalDeposits.toLocaleString()}
              </p>
              <p className="text-xs text-purple-600 mt-1">This month</p>
            </div>
            <div className="p-3 bg-purple-500 rounded-xl">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl shadow-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">
                Total Withdrawal
              </p>
              <p className="desktop:text-2xl text-xl font-bold text-orange-900">
                {dashboardData.totalWithdrawals >= 100000
                  ? (dashboardData.totalWithdrawals / 100000).toFixed(2) + "L"
                  : dashboardData.totalWithdrawals.toLocaleString()}
              </p>
              <p className="text-xs text-orange-600 mt-1">This Month</p>
            </div>
            <div className="p-3 bg-orange-500 rounded-xl">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* <div className="grid grid-cols-1 gap-8"></div> */}

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 nest-hub:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Account Type Distribution */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Account Distribution
            </h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">
                  Daily Deposit Scheme
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {dashboardData.ddsAccounts}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">
                  Recurring Deposit
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {dashboardData.rdAccounts}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">
                  Fixed Deposit
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {dashboardData.fdAccounts}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">
                  Loan Accounts
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {dashboardData.loanAccounts}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">
                  Savings
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {dashboardData.savingsAccounts}
              </span>
            </div>
          </div>
        </div>
        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Transactions
            </h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {dashboardData.recentTransactions &&
            dashboardData.recentTransactions.length > 0 ? (
              dashboardData.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-3 ${
                        transaction.transaction_type === "deposit" ||
                        transaction.transaction_type === "interest"
                          ? "bg-green-500"
                          : transaction.transaction_type === "withdrawal" ||
                            transaction.transaction_type === "penalty"
                          ? "bg-red-500"
                          : "bg-blue-500"
                      }`}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.transaction_type
                          ?.replace("_", " ")
                          .toUpperCase() || "Transaction"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transaction.customer_name || "Unknown Customer"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ₹{(transaction.amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.created_at
                        ? new Date(transaction.created_at).toLocaleDateString()
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">No recent transactions</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Maturities */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Upcoming Maturities
            </h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {dashboardData.upcomingMaturities.map((maturity) => (
              <div
                key={maturity.id}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {maturity.customer}
                  </p>
                  <p className="text-xs text-gray-500">
                    {maturity.type} Account
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-900">
                    ₹{maturity.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600">{maturity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Payments */}
        {dashboardData.overduePayments?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Overdue Payments
              </h3>
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="space-y-4">
              {dashboardData.overduePayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {payment.customer}
                    </p>
                    <p className="text-xs text-gray-500">{payment.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-900">
                      ₹{payment.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-red-600">
                      {payment.daysOverdue} days overdue
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {canView("customers_management") && (
            <button
              onClick={handleAddCustomer}
              className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <UserPlus className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-blue-900">
                Add Customer
              </span>
            </button>
          )}
          {canView("account_types") && (
            <button
              onClick={handleAccountTypes}
              className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <Settings className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-purple-900">
                Account Types
              </span>
            </button>
          )}
          {canView("transactions") && (
            <button
              onClick={handleViewAllTransactions}
              className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Activity className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-blue-900">
                View Transactions
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Staff Dashboard
  const StaffDashboard = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Your personal banking overview</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Personal Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 nest-hub:grid-cols-2 nest-hub-max:grid-cols-3 2xl:grid-cols-4 gap-6">
        {dashboardData.accounts && dashboardData.accounts.length > 0 ? (
          dashboardData.accounts.slice(0, 4).map((account, index) => {
            const accountType = account.account_type || account;
            const details = getAccountTypeDetails(accountType, account);
            const IconComponent = details.icon;
            const gradientClasses = {
              green: "from-green-50 to-green-100 border-green-200",
              blue: "from-blue-50 to-blue-100 border-blue-200",
              purple: "from-purple-50 to-purple-100 border-purple-200",
              red: "from-red-50 to-red-100 border-red-200",
              gray: "from-gray-50 to-gray-100 border-gray-200",
            };
            const textClasses = {
              green: "text-green-600 text-green-900 text-green-600",
              blue: "text-blue-600 text-blue-900 text-blue-600",
              purple: "text-purple-600 text-purple-900 text-purple-600",
              red: "text-red-600 text-red-900 text-red-600",
              gray: "text-gray-600 text-gray-900 text-gray-600",
            };
            const bgClasses = {
              green: "bg-green-500",
              blue: "bg-blue-500",
              purple: "bg-purple-500",
              red: "bg-red-500",
              gray: "bg-gray-500",
            };

            const colors = textClasses[details.color].split(" ");
            const gradient = gradientClasses[details.color];
            const bg = bgClasses[details.color];

            return (
              <div
                key={account.id || index}
                className={`bg-gradient-to-br ${gradient} p-6 rounded-2xl shadow-lg border`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${colors[0]}`}>
                      {details.name.split(" ")[0]}
                    </p>
                    <p
                      className={`desktop:text-2xl text-xl font-bold ${colors[1]}`}
                    >
                      {details.balance}
                    </p>
                    <p className={`text-xs ${colors[2]} mt-1`}>
                      Account #{account.id}
                    </p>
                  </div>
                  <div className={`p-3 ${bg} rounded-xl`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No accounts assigned</p>
            <p className="text-gray-400 text-sm">
              Contact admin to assign accounts
            </p>
          </div>
        )}
      </div>

      {/* Account Types & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            My Account Types
          </h3>
          <div className="space-y-4">
            {dashboardData.accounts && dashboardData.accounts.length > 0 ? (
              dashboardData.accounts.map((account, index) => {
                const accountType = account.account_type || account;
                const details = getAccountTypeDetails(accountType, account);
                const IconComponent = details.icon;
                const colorClasses = {
                  green:
                    "bg-green-50 text-green-600 text-green-900 text-green-600",
                  blue: "bg-blue-50 text-blue-600 text-blue-900 text-blue-600",
                  purple:
                    "bg-purple-50 text-purple-600 text-purple-900 text-purple-600",
                  red: "bg-red-50 text-red-600 text-red-900 text-red-600",
                  gray: "bg-gray-50 text-gray-600 text-gray-900 text-gray-600",
                };
                const colors = colorClasses[details.color].split(" ");

                return (
                  <div
                    key={account.id || index}
                    className={`flex items-center justify-between p-4 ${colors[0]} rounded-lg`}
                  >
                    <div className="flex items-center">
                      <IconComponent className={`h-5 w-5 ${colors[1]} mr-3`} />
                      <div>
                        <p className={`text-sm font-medium ${colors[2]}`}>
                          {details.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Account #{account.id} • {details.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${colors[2]}`}>
                        {details.balance}
                      </p>
                      <p className={`text-xs ${colors[3]}`}>{details.status}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">No accounts assigned</p>
                <p className="text-gray-400 text-xs">
                  Contact admin to assign accounts
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            <button
              onClick={handleDeposit}
              className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
            >
              <ArrowDownLeft className="h-6 w-6 text-green-600 mb-2" />
              <span className="text-sm font-medium text-green-900">
                Deposit
              </span>
            </button>
            <button
              onClick={handleWithdraw}
              className="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
            >
              <ArrowUpRight className="h-6 w-6 text-red-600 mb-2" />
              <span className="text-sm font-medium text-red-900">Withdraw</span>
            </button>
            <button
              onClick={handleContribute}
              className="flex flex-col items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <PiggyBank className="h-6 w-6 text-indigo-600 mb-2" />
              <span className="text-sm font-medium text-indigo-900">
                RD Contribution
              </span>
            </button>
            <button
              onClick={handleLoanRepayment}
              className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
            >
              <CreditCard className="h-6 w-6 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-orange-900">
                Pay EMI
              </span>
            </button>
            <button
              onClick={handleViewAccounts}
              className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Wallet className="h-6 w-6 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-blue-900">
                My Accounts
              </span>
            </button>
            <button
              onClick={handleViewTransactions}
              className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <Activity className="h-6 w-6 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-purple-900">
                My Transactions
              </span>
            </button>
            <button
              onClick={handleMyProfile}
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <User className="h-6 w-6 text-gray-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">
                My Profile
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Main Dashboard Render
  const renderDashboard = () => {
    if (user?.role === "admin") {
      return <AdminDashboard />;
    } else if (user?.role === "manager") {
      return <ManagerDashboard />;
    } else {
      return <StaffDashboard />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  // Calculate maturity/returns based on account type
  const calculateReturns = () => {
    if (calculatorType === "select" || !calculatorType) return null;

    const principal = parseFloat(calculatorData.principal) || 0;
    const interestRate = parseFloat(calculatorData.interestRate) || 0;
    const term = parseFloat(calculatorData.term) || 0;
    const monthlyContribution =
      parseFloat(calculatorData.monthlyContribution) || 0;
    const dailyContribution = parseFloat(calculatorData.dailyContribution) || 0;
    const termUnit = calculatorData.termUnit || "months";

    if (!interestRate || !term) return null;

    const monthlyRate = interestRate / 100 / 12;
    const totalMonths = termUnit === "months" ? term : term * 12;
    const years = totalMonths / 12;

    if (calculatorType === "rd") {
      if (!monthlyContribution) return null;
      // RD Calculation: Future value of recurring deposits (annuity)
      const n = totalMonths;
      const r = monthlyRate;
      const P = monthlyContribution;

      // Future Value = P * [((1 + r)^n - 1) / r] * (1 + r)
      // Formula for annuity due (payment at beginning of period)
      let futureValue = 0;
      if (r > 0) {
        futureValue = P * (((1 + r) ** n - 1) / r) * (1 + r);
      } else {
        // If interest rate is 0, just return total contributions
        futureValue = P * n;
      }
      const totalContributed = P * n;
      const interestEarned = futureValue - totalContributed;

      return {
        maturityAmount: futureValue,
        totalContributed,
        interestEarned,
        principal: totalContributed,
      };
    } else if (calculatorType === "fd") {
      if (!principal) return null;
      // FD Calculation: Compound interest on one-time deposit
      const compoundAmount = principal * (1 + interestRate / 100) ** years;
      const interestEarned = compoundAmount - principal;

      return {
        maturityAmount: compoundAmount,
        totalContributed: principal,
        interestEarned,
        principal,
      };
    } else if (calculatorType === "dds") {
      const dailyContribution =
        parseFloat(calculatorData.dailyContribution) || 0;
      if (!dailyContribution) return null;

      // DDS Calculation: Future value of daily deposits
      // Convert term to days
      let totalDays = 0;
      if (termUnit === "days") {
        totalDays = term;
      } else if (termUnit === "months") {
        totalDays = term * 30.44; // Average days per month
      } else if (termUnit === "years") {
        totalDays = term * 365.25; // Average days per year
      }

      if (totalDays <= 0) return null;

      // Daily interest rate
      const dailyRate = interestRate / 100 / 365.25;
      const n = totalDays;
      const P = dailyContribution;

      // Future Value = P * [((1 + r)^n - 1) / r] * (1 + r) for daily deposits (annuity due)
      let futureValue = 0;
      if (dailyRate > 0) {
        futureValue =
          P * (((1 + dailyRate) ** n - 1) / dailyRate) * (1 + dailyRate);
      } else {
        // If interest rate is 0, just return total contributions
        futureValue = P * n;
      }
      const totalContributed = P * n;
      const interestEarned = futureValue - totalContributed;

      return {
        maturityAmount: futureValue,
        totalContributed,
        interestEarned,
        principal: totalContributed,
      };
    } else if (calculatorType === "loan") {
      if (!principal) return null;
      // Loan EMI Calculation
      const n = totalMonths;
      const r = monthlyRate;

      // EMI = [P x R x (1+R)^N] / [(1+R)^N - 1]
      const emi = (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
      const totalAmount = emi * n;
      const totalInterest = totalAmount - principal;

      return {
        emi,
        totalAmount,
        totalInterest,
        principal,
      };
    }

    return null;
  };

  const calculationResult = calculateReturns();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      {renderDashboard()}

      {/* Comprehensive Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full h-[90vh] sm:h-auto max-h-[90vh] sm:max-h-auto flex flex-col overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                  <Calculator className="h-4 w-4 sm:h-6 sm:w-6 inline-block mr-2 text-purple-600" />
                  Financial Calculator
                </h2>
                <button
                  onClick={() => {
                    setShowCalculator(false);
                    setCalculatorType(null);
                    setCalculatorData({
                      principal: "",
                      interestRate: "",
                      term: "",
                      monthlyContribution: "",
                      dailyContribution: "",
                      frequency: "monthly",
                      accountType: "",
                      termUnit: "months",
                      calculationMethod: "compound",
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 sm:p-6 sm:space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Account Type Selection */}
              {calculatorType === "select" && (
                <div className="space-y-4">
                  <div className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200">
                    <div className="flex items-center space-x-2">
                      <Calculator className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-900">
                        Select Calculator Type
                      </span>
                    </div>
                    <p className="text-xs text-purple-700 mt-1">
                      Choose the type of calculation you want to perform
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { type: "rd", label: "RD", color: "blue", icon: Target },
                      { type: "fd", label: "FD", color: "purple", icon: Lock },
                      {
                        type: "dds",
                        label: "DDS",
                        color: "indigo",
                        icon: Calendar,
                      },
                      {
                        type: "loan",
                        label: "Loan",
                        color: "red",
                        icon: CreditCard,
                      },
                    ].map(({ type, label, color, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => {
                          // Find the matching account type to get defaults
                          const matchingAccountType = accountTypes.find(
                            (at) => at.name?.toLowerCase() === type
                          );

                          // Set defaults based on account type settings
                          const defaults = {
                            accountType: type,
                            principal: "",
                            interestRate:
                              matchingAccountType?.interest_rate || "",
                            term: matchingAccountType?.term_in_days
                              ? type === "dds"
                                ? matchingAccountType.term_in_days
                                : type === "fd"
                                ? Math.round(
                                    matchingAccountType.term_in_days / 365.25
                                  )
                                : ""
                              : type === "dds"
                              ? 365
                              : type === "fd"
                              ? 1 : type === "rd"
                              ? 12
                              : "",
                            monthlyContribution:
                              type === "rd"
                                ? matchingAccountType?.min_contribution_amount ||
                                  ""
                                : "",
                            dailyContribution:
                              type === "dds"
                                ? matchingAccountType?.min_contribution_amount ||
                                  ""
                                : "",
                            termUnit:
                              type === "loan" || type === "rd"
                                ? "months"
                                : type === "dds"
                                ? "days"
                                : type === "fd"
                                ? "years"
                                : "months",
                            calculationMethod:
                              matchingAccountType?.interest_calculation_method ||
                              "compound",
                          };

                          setCalculatorType(type);
                          setCalculatorData({
                            ...calculatorData,
                            ...defaults,
                          });
                        }}
                        className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                          calculatorData.accountType === type
                            ? `bg-${color}-50 border-${color}-500 shadow-lg`
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Icon
                          className={`h-8 w-8 mb-2 ${
                            calculatorData.accountType === type
                              ? `text-${color}-600`
                              : "text-gray-400"
                          }`}
                        />
                        <span
                          className={`text-sm font-semibold ${
                            calculatorData.accountType === type
                              ? `text-${color}-900`
                              : "text-gray-700"
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Calculator Inputs - Show when account type is selected */}
              {calculatorType !== "select" &&
                calculatorType !== null &&
                (() => {
                  // Find matching account type for defaults
                  const matchingAccountType = accountTypes.find(
                    (at) => at.name?.toLowerCase() === calculatorType
                  );

                  return (
                    <>
                      <div className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200">
                        <div className="flex items-center space-x-2">
                          <Calculator className="h-5 w-5 text-purple-600" />
                          <span className="text-sm font-semibold text-purple-900">
                            {calculatorType === "rd"
                              ? "RD Returns Calculator"
                              : calculatorType === "fd"
                              ? "FD Returns Calculator"
                              : calculatorType === "dds"
                              ? "DDS Returns Calculator"
                              : "Loan EMI Calculator"}
                          </span>
                        </div>
                        <p className="text-xs text-purple-700 mt-1">
                          {calculatorType === "rd"
                            ? "Calculate potential returns for your RD investment"
                            : calculatorType === "fd"
                            ? "Calculate potential returns for your Fixed Deposit"
                            : calculatorType === "dds"
                            ? "Calculate potential returns for your Daily Deposit Scheme"
                            : "Calculate EMI and total interest for your loan"}
                        </p>
                        {/* {matchingAccountType && (
                          <div className="mt-2 p-2 bg-white rounded-lg border border-purple-200">
                            <p className="text-xs text-purple-800">
                              <strong>Account Type Settings:</strong> Rate{" "}
                              {matchingAccountType.interest_rate?.toFixed(2)}%
                              p.a. (
                              {matchingAccountType.interest_calculation_method ||
                                "compound"}
                              )
                              {calculatorType === "rd" &&
                                matchingAccountType.min_contribution_amount && (
                                  <>
                                    {" "}
                                    | Min Contribution ₹
                                    {matchingAccountType.min_contribution_amount.toLocaleString(
                                      "en-IN"
                                    )}
                                  </>
                                )}
                              {calculatorType === "fd" &&
                                matchingAccountType.min_deposit && (
                                  <>
                                    {" "}
                                    | Min Deposit ₹
                                    {matchingAccountType.min_deposit.toLocaleString(
                                      "en-IN"
                                    )}
                                  </>
                                )}
                              {calculatorType === "dds" &&
                                matchingAccountType.min_contribution_amount && (
                                  <>
                                    {" "}
                                    | Min Daily Contribution ₹
                                    {matchingAccountType.min_contribution_amount.toLocaleString(
                                      "en-IN"
                                    )}
                                  </>
                                )}
                              {matchingAccountType.term_in_days && (
                                <>
                                  {" "}
                                  | Term:{" "}
                                  {calculatorType === "dds"
                                    ? `${matchingAccountType.term_in_days} days`
                                    : `${Math.round(
                                        matchingAccountType.term_in_days / 30.44
                                      )} months`}
                                </>
                              )}
                            </p>
                          </div>
                        )} */}
                      </div>

                      {/* Input Fields based on calculator type */}
                      <div className="space-y-4">
                        {calculatorType === "rd" ? (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Monthly Contribution (₹){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="100"
                                min="0"
                                value={calculatorData.monthlyContribution || ""}
                                onChange={(e) =>
                                  setCalculatorData({
                                    ...calculatorData,
                                    monthlyContribution: e.target.value,
                                  })
                                }
                                placeholder="Enter monthly contribution amount"
                                className="w-full placeholder-xs input-xs px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                              />
                              {matchingAccountType?.min_contribution_amount && (
                                <button
                                  onClick={() =>
                                    setCalculatorData({
                                      ...calculatorData,
                                      monthlyContribution:
                                        matchingAccountType.min_contribution_amount,
                                    })
                                  }
                                  className="mt-1 text-xs text-purple-600 hover:text-purple-700 underline"
                                >
                                  Use minimum contribution (₹
                                  {matchingAccountType.min_contribution_amount.toLocaleString(
                                    "en-IN"
                                  )}
                                  )
                                </button>
                              )}
                              <p className="mt-1 text-xs text-gray-500">
                                Amount you will contribute every month
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Interest Rate (% p.a.){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="20"
                                value={calculatorData.interestRate || ""}
                                onChange={(e) =>
                                  setCalculatorData({
                                    ...calculatorData,
                                    interestRate: e.target.value,
                                  })
                                }
                                placeholder="Enter annual interest rate"
                                className="w-full placeholder-xs input-xs px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                              />
                              {matchingAccountType?.interest_rate && (
                                <button
                                  onClick={() =>
                                    setCalculatorData({
                                      ...calculatorData,
                                      interestRate:
                                        matchingAccountType.interest_rate,
                                    })
                                  }
                                  className="mt-1 text-xs text-purple-600 hover:text-purple-700 underline"
                                >
                                  Use account rate (
                                  {matchingAccountType.interest_rate.toFixed(2)}
                                  %)
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Term Duration{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  step="1"
                                  min="1"
                                  value={calculatorData.term || ""}
                                  onChange={(e) =>
                                    setCalculatorData({
                                      ...calculatorData,
                                      term: e.target.value,
                                    })
                                  }
                                  placeholder="Enter duration"
                                  className="w-full placeholder-xs input-xs px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                />
                                {matchingAccountType?.term_in_days && (
                                  <button
                                    onClick={() => {
                                      const termInMonths = Math.round(
                                        matchingAccountType.term_in_days / 30.44
                                      );
                                      setCalculatorData({
                                        ...calculatorData,
                                        term: termInMonths,
                                        termUnit: "months",
                                      });
                                    }}
                                    className="mt-1 text-xs text-purple-600 hover:text-purple-700 underline"
                                  >
                                    Use account term (
                                    {Math.round(
                                      matchingAccountType.term_in_days / 30.44
                                    )}{" "}
                                    months)
                                  </button>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Unit
                                </label>
                                <select
                                  value={calculatorData.termUnit || "months"}
                                  onChange={(e) =>
                                    setCalculatorData({
                                      ...calculatorData,
                                      termUnit: e.target.value,
                                    })
                                  }
                                  className="w-full px-2 sm:px-4 py-0 sm:py-3 h-[39px] sm:min-h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                >
                                  <option value="months">Months</option>
                                  <option value="years">Years</option>
                                </select>
                              </div>
                            </div>
                            {/* Quick Term Buttons */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Quick Select Term
                              </label>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { label: "1Y", value: 1, unit: "years" },
                                  { label: "2Y", value: 2, unit: "years" },
                                  { label: "3Y", value: 3, unit: "years" },
                                  { label: "5Y", value: 5, unit: "years" },
                                ].map((option) => (
                                  <button
                                    key={option.label}
                                    onClick={() =>
                                      setCalculatorData({
                                        ...calculatorData,
                                        term: option.value,
                                        termUnit: option.unit,
                                      })
                                    }
                                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition ${
                                      calculatorData.term == option.value &&
                                      calculatorData.termUnit === option.unit
                                        ? "bg-purple-600 text-white border-purple-600"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : calculatorType === "loan" ? (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Loan Amount (₹){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="1000"
                                min="0"
                                value={calculatorData.principal || ""}
                                onChange={(e) =>
                                  setCalculatorData({
                                    ...calculatorData,
                                    principal: e.target.value,
                                  })
                                }
                                placeholder="Enter loan amount"
                                className="w-full placeholder-xs input-xs px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Interest Rate (% p.a.){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="30"
                                value={calculatorData.interestRate || ""}
                                onChange={(e) =>
                                  setCalculatorData({
                                    ...calculatorData,
                                    interestRate: e.target.value,
                                  })
                                }
                                placeholder="Enter annual interest rate"
                                className="w-full placeholder-xs input-xs px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Loan Tenure (Months){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="1"
                                min="1"
                                value={calculatorData.term || ""}
                                onChange={(e) =>
                                  setCalculatorData({
                                    ...calculatorData,
                                    term: e.target.value,
                                  })
                                }
                                placeholder="Enter loan tenure in months"
                                className="w-full placeholder-xs input-xs px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                              />
                              {/* Quick Term Buttons for Loan */}
                              <div className="mt-2 flex gap-2 flex-wrap">
                                {[6, 12, 24, 36, 48, 60].map((months) => (
                                  <button
                                    key={months}
                                    onClick={() =>
                                      setCalculatorData({
                                        ...calculatorData,
                                        term: months,
                                        termUnit: "months",
                                      })
                                    }
                                    className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs rounded-lg font-medium transition ${
                                      parseInt(calculatorData.term) === months
                                        ? "bg-red-600 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                  >
                                    {months}M
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : calculatorType === "dds" ? (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Daily Contribution (₹){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="10"
                                min="0"
                                value={calculatorData.dailyContribution || ""}
                                onChange={(e) =>
                                  setCalculatorData({
                                    ...calculatorData,
                                    dailyContribution: e.target.value,
                                  })
                                }
                                placeholder="Enter daily contribution amount"
                                className="w-full placeholder-xs input-xs px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                              />
                              {matchingAccountType?.min_contribution_amount && (
                                <button
                                  onClick={() =>
                                    setCalculatorData({
                                      ...calculatorData,
                                      dailyContribution:
                                        matchingAccountType.min_contribution_amount,
                                    })
                                  }
                                  className="mt-1 text-xs text-purple-600 hover:text-purple-700 underline"
                                >
                                  Use minimum daily contribution (₹
                                  {matchingAccountType.min_contribution_amount.toLocaleString(
                                    "en-IN"
                                  )}
                                  )
                                </button>
                              )}
                              <p className="mt-1 text-xs text-gray-500">
                                Amount you will contribute every day
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Interest Rate (% p.a.){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="20"
                                value={calculatorData.interestRate || ""}
                                onChange={(e) =>
                                  setCalculatorData({
                                    ...calculatorData,
                                    interestRate: e.target.value,
                                  })
                                }
                                placeholder="Enter annual interest rate"
                                className="w-full placeholder-xs input-xs px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                              />
                              {matchingAccountType?.interest_rate && (
                                <button
                                  onClick={() =>
                                    setCalculatorData({
                                      ...calculatorData,
                                      interestRate:
                                        matchingAccountType.interest_rate,
                                    })
                                  }
                                  className="mt-1 text-xs text-purple-600 hover:text-purple-700 underline"
                                >
                                  Use account rate (
                                  {matchingAccountType.interest_rate.toFixed(2)}
                                  %)
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Term Duration{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  step="1"
                                  min="1"
                                  value={calculatorData.term || ""}
                                  onChange={(e) =>
                                    setCalculatorData({
                                      ...calculatorData,
                                      term: e.target.value,
                                    })
                                  }
                                  placeholder="Enter duration"
                                  className="w-full placeholder-xs input-xs px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                />
                                {matchingAccountType?.term_in_days && (
                                  <button
                                    onClick={() => {
                                      setCalculatorData({
                                        ...calculatorData,
                                        term: matchingAccountType.term_in_days,
                                        termUnit: "days",
                                      });
                                    }}
                                    className="mt-1 text-xs text-purple-600 hover:text-purple-700 underline"
                                  >
                                    Use account term (
                                    {matchingAccountType.term_in_days} days)
                                  </button>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Unit
                                </label>
                                <select
                                  value={calculatorData.termUnit || "days"}
                                  onChange={(e) =>
                                    setCalculatorData({
                                      ...calculatorData,
                                      termUnit: e.target.value,
                                    })
                                  }
                                  className="w-full px-2 sm:px-4 py-0 sm:py-3 h-[39px] sm:h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                >
                                  <option value="days">Days</option>
                                  <option value="months">Months</option>
                                  <option value="years">Years</option>
                                </select>
                              </div>
                            </div>
                            {/* Quick Term Buttons for DDS */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Quick Select Term
                              </label>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { label: "90D", value: 90, unit: "days" },
                                  { label: "180D", value: 180, unit: "days" },
                                  { label: "12M", value: 12, unit: "months" },
                                  { label: "24M", value: 24, unit: "months" },
                                ].map((option) => (
                                  <button
                                    key={option.label}
                                    onClick={() =>
                                      setCalculatorData({
                                        ...calculatorData,
                                        term: option.value,
                                        termUnit: option.unit,
                                      })
                                    }
                                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition ${
                                      calculatorData.term == option.value &&
                                      calculatorData.termUnit === option.unit
                                        ? "bg-purple-600 text-white border-purple-600"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Principal Amount (₹){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="1000"
                                min="0"
                                value={calculatorData.principal || ""}
                                onChange={(e) =>
                                  setCalculatorData({
                                    ...calculatorData,
                                    principal: e.target.value,
                                  })
                                }
                                placeholder="Enter principal amount (one-time deposit)"
                                className="w-full placeholder-xs input-xs px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                One-time lump sum amount you will deposit
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Interest Rate (% p.a.){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="20"
                                value={calculatorData.interestRate || ""}
                                onChange={(e) =>
                                  setCalculatorData({
                                    ...calculatorData,
                                    interestRate: e.target.value,
                                  })
                                }
                                placeholder="Enter annual interest rate"
                                className="w-full placeholder-xs input-xs px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Term Duration{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  step={
                                    calculatorData.termUnit === "years"
                                      ? "0.1"
                                      : "1"
                                  }
                                  min="0.1"
                                  value={calculatorData.term || ""}
                                  onChange={(e) =>
                                    setCalculatorData({
                                      ...calculatorData,
                                      term: e.target.value,
                                    })
                                  }
                                  placeholder="Enter duration"
                                  className="w-full placeholder-xs input-xs px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Unit
                                </label>
                                <select
                                  value={calculatorData.termUnit || "years"}
                                  onChange={(e) =>
                                    setCalculatorData({
                                      ...calculatorData,
                                      termUnit: e.target.value,
                                    })
                                  }
                                  className="w-full px-2 sm:px-4 py-0 sm:py-3 h-[39px] sm:h-[50px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                >
                                  <option value="months">Months</option>
                                  <option value="years">Years</option>
                                </select>
                              </div>
                            </div>
                            {/* Quick Term Buttons */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Quick Select Term
                              </label>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { label: "1Y", value: 1, unit: "years" },
                                  { label: "2Y", value: 2, unit: "years" },
                                  { label: "3Y", value: 3, unit: "years" },
                                  { label: "5Y", value: 5, unit: "years" },
                                ].map((option) => (
                                  <button
                                    key={option.label}
                                    onClick={() =>
                                      setCalculatorData({
                                        ...calculatorData,
                                        term: option.value,
                                        termUnit: option.unit,
                                      })
                                    }
                                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition ${
                                      calculatorData.term == option.value &&
                                      calculatorData.termUnit === option.unit
                                        ? "bg-purple-600 text-white border-purple-600"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}

              {/* Calculation Results */}
              {calculationResult && calculatorType !== "select" && (
                <div
                  className={`mt-6 rounded-lg p-4 sm:p-6 border-2 ${
                    calculatorType === "loan"
                      ? "bg-red-50 border-red-200"
                      : "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-lg"
                  }`}
                >
                  <h4 className="font-bold text-gray-900 mb-4 text-center sm:text-lg text-base">
                    📊{" "}
                    {calculatorType === "loan"
                      ? "Loan EMI Calculation"
                      : calculatorType === "rd"
                      ? "RD Return Calculation"
                      : calculatorType === "fd"
                      ? "FD Return Calculation"
                      : "DDS Return Calculation"}
                  </h4>
                  <div className="space-y-3">
                    {calculatorType === "loan" ? (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-red-200">
                          <span className="text-sm font-medium text-gray-700">
                            Loan Amount:
                          </span>
                          <span className="text-base font-bold text-gray-900">
                            ₹
                            {calculationResult.principal.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-red-200">
                          <span className="text-sm font-medium text-gray-700">
                            Monthly EMI:
                          </span>
                          <span className="text-lg font-bold text-red-600">
                            ₹
                            {calculationResult.emi.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-red-200">
                          <span className="text-sm font-medium text-gray-700">
                            Total Interest:
                          </span>
                          <span className="text-base font-semibold text-gray-900">
                            ₹
                            {calculationResult.totalInterest.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </span>
                        </div>
                        <div className="bg-gradient-to-r from-red-500 to-orange-600 rounded-lg p-4 mt-4 border-2 border-red-300 shadow-md">
                          <div className="flex justify-between items-center">
                            <span className="text-sm sm:text-base font-bold text-white">
                              Total Amount Payable:
                            </span>
                            <span className="text-lg sm:text-2xl font-extrabold text-white">
                              ₹
                              {calculationResult.totalAmount.toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {calculatorType === "rd" ? (
                          <div className="flex justify-between items-center py-2 border-b border-purple-200">
                            <span className="text-sm font-medium text-gray-700">
                              Monthly Contribution:
                            </span>
                            <span className="text-base font-bold text-gray-900">
                              ₹
                              {calculatorData.monthlyContribution.toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </span>
                          </div>
                        ) : calculatorType === "dds" ? (
                          <div className="flex justify-between items-center py-2 border-b border-purple-200">
                            <span className="text-sm font-medium text-gray-700">
                              Daily Contribution:
                            </span>
                            <span className="text-base font-bold text-gray-900">
                              ₹
                              {calculatorData.dailyContribution.toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center py-2 border-b border-purple-200">
                            <span className="text-sm font-medium text-gray-700">
                              Principal Amount:
                            </span>
                            <span className="text-base font-bold text-gray-900">
                              ₹
                              {calculationResult.principal.toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-2 border-b border-purple-200">
                          <span className="text-sm font-medium text-gray-700">
                            {calculatorType === "rd" || calculatorType === "dds"
                              ? "Total Principal Invested:"
                              : "Principal Amount:"}
                          </span>
                          <span className="text-base font-bold text-blue-600">
                            ₹
                            {calculationResult.totalContributed.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-purple-200">
                          <span className="text-sm font-medium text-gray-700">
                            Interest Rate:
                          </span>
                          <span className="text-sm font-semibold text-purple-600">
                            {calculatorData.interestRate}% p.a. (compound)
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-purple-200">
                          <span className="text-sm font-medium text-gray-700">
                            Interest Earned:
                          </span>
                          <span className="text-base font-bold text-green-600">
                            ₹
                            {calculationResult.interestEarned.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </span>
                        </div>
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 mt-4 border-2 border-green-300 shadow-md">
                          <div className="flex justify-between items-center">
                            <span className="text-sm sm:text-base font-bold text-white">
                              Total Maturity Amount:
                            </span>
                            <span className="text-lg sm:text-2xl font-extrabold text-white">
                              ₹
                              {calculationResult.maturityAmount.toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-green-300 space-y-1">
                            <p className="text-xs text-green-100">
                              Return on Investment:{" "}
                              {calculationResult.totalContributed > 0
                                ? (
                                    (calculationResult.interestEarned /
                                      calculationResult.totalContributed) *
                                    100
                                  ).toFixed(2)
                                : "0.00"}
                              %
                            </p>
                            <p className="text-xs text-green-100">
                              Profit: ₹
                              {calculationResult.interestEarned.toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Info Box */}
              {calculatorType !== "select" && calculatorType !== null && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>Note:</strong> This calculator uses compound
                    interest calculation. Actual returns may vary based on your
                    account terms and compounding frequency.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              {calculatorType === "select" ? (
                <button
                  onClick={() => {
                    setShowCalculator(false);
                    setCalculatorType(null);
                    setCalculatorData({
                      principal: "",
                      interestRate: "",
                      term: "",
                      monthlyContribution: "",
                      dailyContribution: "",
                      frequency: "monthly",
                      accountType: "",
                      termUnit: "months",
                      calculationMethod: "compound",
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setCalculatorType("select");
                      setCalculatorData({
                        principal: "",
                        interestRate: "",
                        term: "",
                        monthlyContribution: "",
                        frequency: "monthly",
                        accountType: "",
                        termUnit: "months",
                        calculationMethod: "compound",
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setCalculatorData({
                        principal: "",
                        interestRate: "",
                        term: "",
                        monthlyContribution: "",
                        frequency: "monthly",
                        accountType: calculatorType,
                        termUnit:
                          calculatorType === "loan" || calculatorType === "rd"
                            ? "months"
                            : "years",
                        calculationMethod: "compound",
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => {
                      setShowCalculator(false);
                      setCalculatorType(null);
                      setCalculatorData({
                        principal: "",
                        interestRate: "",
                        term: "",
                        monthlyContribution: "",
                        frequency: "monthly",
                        accountType: "",
                        termUnit: "months",
                        calculationMethod: "compound",
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="QR Code"
      />
    </div>
  );
}

export default Dashboard;
