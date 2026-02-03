import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Clock,
  TrendingUp,
  Settings,
  Search,
  Filter,
  Shield,
  CreditCard,
  Calculator,
  Eye,
} from "lucide-react";

function AccountTypeList() {
  const [accountTypes, setAccountTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState(null);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [calculatorAccountType, setCalculatorAccountType] = useState(null);
  const [calculatorData, setCalculatorData] = useState({});
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const {
    canView,
    canCreate,
    canUpdate,
    canDelete,
    loading: permissionsLoading,
  } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    fetchAccountTypes();
  }, []);

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (typeof window === "undefined" || !document.body) return;

    if (showCalculatorModal || selectedAccountType) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      if (typeof window !== "undefined" && document.body) {
        document.body.style.overflow = "unset";
      }
    };
  }, [showCalculatorModal, selectedAccountType]);

  const fetchAccountTypes = async () => {
    try {
      setLoading(true);
      const response = await api.post("/account-types/list");
      if (response.data.success) {
        setAccountTypes(response.data.data);
      } else {
        toast.error("Failed to fetch account types");
      }
    } catch (error) {
      toast.error("Error fetching account types");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (accountTypeId, accountTypeName) => {
    if (
      window.confirm(`Are you sure you want to deactivate ${accountTypeName}?`)
    ) {
      try {
        const response = await api.delete(`/account-types/${accountTypeId}`);
        if (response.data.success) {
          toast.success("Account type deactivated successfully");
          fetchAccountTypes();
        } else {
          toast.error(response.data.message);
        }
      } catch (error) {
        toast.error("Error deactivating account type");
      }
    }
  };

  const handleOpenCalculator = (accountType) => {
    setCalculatorAccountType(accountType);
    // Initialize calculator data with defaults
    const isFD = accountType.name?.toLowerCase() === "fd";
    const isDDS = accountType.name?.toLowerCase() === "dds";
    const isRD = accountType.name?.toLowerCase() === "rd";

    setCalculatorData({
      principalAmount: isFD ? accountType.min_deposit || 10000 : 0,
      dailyContribution: isDDS ? accountType.min_contribution_amount || 10 : 0,
      monthlyContribution: isRD
        ? accountType.min_contribution_amount || 1000
        : 0,
      rate: accountType.interest_rate || 0,
      term: isDDS ? 365 : 12,
      termUnit: isDDS ? "days" : "months",
    });
    setShowCalculatorModal(true);
  };

  // Permission-based access control
  const canManage =
    user?.role === "admin" ||
    (user?.role === "manager" && canView("account_types"));
  const canCreateAccountType =
    user?.role === "admin" ||
    (user?.role === "manager" && canCreate("account_types"));
  const canUpdateAccountType =
    user?.role === "admin" ||
    (user?.role === "manager" && canUpdate("account_types"));
  const canDeleteAccountType =
    user?.role === "admin" ||
    (user?.role === "manager" && canDelete("account_types"));

  // Filter account types based on search term
  const filteredAccountTypes = accountTypes.filter((accountType) =>
    accountType.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAccountTypeIcon = (name) => {
    switch (name) {
      case "Savings":
        return <DollarSign className="h-6 w-6 text-green-400" />;
      case "RD":
        return <Clock className="h-6 w-6 text-blue-400" />;
      case "FD":
        return <Shield className="h-6 w-6 text-purple-400" />;
      case "DDS":
        return <Clock className="h-6 w-6 text-indigo-400" />;
      case "Loan":
        return <CreditCard className="h-6 w-6 text-red-400" />;
      default:
        return <Settings className="h-6 w-6 text-gray-500" />;
    }
  };

  const getAccountTypeColor = (name) => {
    switch (name) {
      case "Savings":
        return "from-green-500 to-emerald-600";
      case "RD":
        return "from-blue-500 to-cyan-600";
      case "FD":
        return "from-purple-500 to-violet-600";
      case "DDS":
        return "from-indigo-500 to-purple-600";
      case "Loan":
        return "from-red-500 to-pink-600";
      default:
        return "from-gray-500 to-slate-600";
    }
  };

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Check if manager has permission to view account types
  if (user?.role === "manager" && !canView("account_types")) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to view account types.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 p-4 sm:p-6 lg:p-8 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Account Types
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage interest rates, terms, and advanced parameters for different
            account types
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            {showAdvanced ? "Hide" : "Show"} Advanced
          </button>
          {canCreateAccountType && (
            <button
              onClick={() => navigate("/accounts/types/new")}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Account Type
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-3 sm:p-4">
        <div className="relative w-full sm:w-auto max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search account types..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Account Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 nest-hub:grid-cols-2 nest-hub-max:grid-cols-3 2xl:grid-cols-3 gap-6">
        {filteredAccountTypes.map((accountType) => (
          <div
            key={accountType.id}
            className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div
                  className={`p-3 bg-gradient-to-r ${getAccountTypeColor(
                    accountType.name
                  )} rounded-xl`}
                >
                  {getAccountTypeIcon(accountType.name)}
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {accountType.display_name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {accountType.name} Account
                  </p>
                  {/* <p className="text-sm text-gray-500">Account Type</p> */}
                </div>
              </div>
              <div className="flex space-x-2">
                {/* Calculator button for RD, FD, and DDS */}
                {(accountType.name?.toLowerCase() === "rd" ||
                  accountType.name?.toLowerCase() === "fd" ||
                  accountType.name?.toLowerCase() === "dds") && (
                  <button
                    onClick={() => handleOpenCalculator(accountType)}
                    className="p-2 text-purple-600 hover:text-white hover:bg-purple-600 rounded-lg transition-all duration-200"
                    title="Calculate Returns"
                  >
                    <Calculator className="h-4 w-4" />
                  </button>
                )}
                {(canUpdateAccountType || canDeleteAccountType) && (
                  <>
                    <button
                      onClick={() => setSelectedAccountType(accountType)}
                      className="p-2 text-gray-600 hover:text-white hover:bg-gray-600 rounded-lg transition-all duration-200"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {canUpdateAccountType && (
                      <button
                        onClick={() =>
                          navigate(`/accounts/types/${accountType.id}/edit`)
                        }
                        className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-200"
                        title="Edit account type"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {/* {canDeleteAccountType && (
                    <button
                      onClick={() =>
                        handleDelete(accountType.id, accountType.name)
                      }
                      className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200"
                      title="Deactivate account type"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    )} */}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Interest Rate</span>
                </div>
                <span className="text-lg font-semibold text-green-600">
                  {accountType.interest_rate}%
                </span>
              </div>

              {accountType.term_in_days && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="text-sm text-gray-600">Term</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600">
                    {accountType.term_in_days} days
                  </span>
                </div>
              )}

              {/* Advanced Parameters */}
              {showAdvanced && (
                <div className="space-y-2 pt-3 border-t border-gray-200">
                  {accountType.min_deposit > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Min Deposit</span>
                      <span className="font-medium">
                        ₹{accountType.min_deposit}
                      </span>
                    </div>
                  )}
                  {accountType.max_deposit && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Max Deposit</span>
                      <span className="font-medium">
                        ₹{accountType.max_deposit}
                      </span>
                    </div>
                  )}
                  {accountType.withdrawal_limit_daily && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Daily Limit</span>
                      <span className="font-medium">
                        ₹{accountType.withdrawal_limit_daily}
                      </span>
                    </div>
                  )}
                  {accountType.early_withdrawal_penalty_rate > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Penalty Rate</span>
                      <span className="font-medium text-red-600">
                        {accountType.early_withdrawal_penalty_rate}%
                      </span>
                    </div>
                  )}
                  {accountType.loan_parameters &&
                    Object.keys(accountType.loan_parameters).length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Loan Range</span>
                        <span className="font-medium">
                          ₹{accountType.loan_parameters.min_loan_amount || 0} -
                          ₹{accountType.loan_parameters.max_loan_amount || 0}
                        </span>
                      </div>
                    )}
                </div>
              )}

              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created by {accountType.creator_name}</span>
                  <span>
                    {new Date(accountType.created_at).toLocaleDateString()}
                  </span>
                </div>
                {accountType.version > 1 && (
                  <div className="text-xs text-gray-400 mt-1">
                    Version {accountType.version}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAccountTypes.length === 0 && (
        <div className="text-center py-12">
          <Settings className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No account types
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm
              ? "No account types match your search."
              : "Get started by adding a new account type."}
          </p>
          {canCreateAccountType && !searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => navigate("/accounts/types/new")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl flex items-center justify-center mx-auto"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Account Type
              </button>
            </div>
          )}
        </div>
      )}

      {/* Calculator Modal */}
      {mounted &&
        showCalculatorModal &&
        calculatorAccountType &&
        typeof window !== "undefined" &&
        document.body &&
        createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCalculatorModal(false);
                setCalculatorAccountType(null);
                setCalculatorData({});
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Calculator className="h-5 w-5 text-purple-600" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      {calculatorAccountType.name?.toLowerCase() === "fd"
                        ? "FD Return Calculator"
                        : calculatorAccountType.name?.toLowerCase() === "dds"
                        ? "DDS Return Calculator"
                        : "RD Return Calculator"}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowCalculatorModal(false);
                      setCalculatorAccountType(null);
                      setCalculatorData({});
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>

                {(() => {
                  const isCalcFD =
                    calculatorAccountType.name?.toLowerCase() === "fd";
                  const isCalcDDS =
                    calculatorAccountType.name?.toLowerCase() === "dds";
                  const isCalcRD =
                    calculatorAccountType.name?.toLowerCase() === "rd";

                  // Default values
                  const defaultPrincipal =
                    calculatorAccountType.min_deposit || 10000;
                  const defaultMonthlyContribution =
                    calculatorAccountType.min_contribution_amount || 1000;
                  const defaultRate = calculatorAccountType.interest_rate || 0;
                  const defaultMethod =
                    calculatorAccountType.interest_calculation_method ||
                    "compound";

                  // Get user inputs from calculatorData or use defaults
                  const principalAmount = calculatorData.principalAmount
                    ? parseFloat(calculatorData.principalAmount)
                    : isCalcFD
                    ? defaultPrincipal
                    : 0;
                  const dailyContribution = calculatorData.dailyContribution
                    ? parseFloat(calculatorData.dailyContribution)
                    : isCalcDDS
                    ? calculatorAccountType.min_contribution_amount || 100
                    : 0;
                  const monthlyContribution = calculatorData.monthlyContribution
                    ? parseFloat(calculatorData.monthlyContribution)
                    : isCalcRD
                    ? defaultMonthlyContribution
                    : 0;
                  const calcRate = calculatorData.rate
                    ? parseFloat(calculatorData.rate)
                    : defaultRate;
                  const calcTerm = calculatorData.term
                    ? parseInt(calculatorData.term)
                    : isCalcDDS
                    ? 365
                    : 12;
                  const calcTermUnit =
                    calculatorData.termUnit || (isCalcDDS ? "days" : "months");

                  // Convert term to days, months and years
                  let totalDays = 0;
                  let totalMonths = 0;
                  let totalYears = 0;

                  if (calcTermUnit === "days") {
                    totalDays = calcTerm;
                    totalMonths = totalDays / 30.44;
                    totalYears = totalDays / 365.25;
                  } else if (calcTermUnit === "months") {
                    totalMonths = calcTerm;
                    totalDays = Math.ceil(totalMonths * 30.44);
                    totalYears = totalMonths / 12;
                  } else {
                    totalYears = calcTerm;
                    totalMonths = totalYears * 12;
                    totalDays = Math.ceil(totalYears * 365.25);
                  }

                  const calculatedDays = totalDays;

                  // Calculate maturity amount
                  let calculatedMaturityAmount = 0;
                  let calculatedInterest = 0;
                  let totalPrincipal = 0;

                  if (
                    isCalcFD &&
                    principalAmount > 0 &&
                    calcRate > 0 &&
                    totalYears > 0
                  ) {
                    totalPrincipal = principalAmount;
                    const r = calcRate / 100;

                    if (defaultMethod === "simple") {
                      calculatedInterest = principalAmount * r * totalYears;
                      calculatedMaturityAmount =
                        principalAmount + calculatedInterest;
                    } else {
                      calculatedMaturityAmount =
                        principalAmount * Math.pow(1 + r, totalYears);
                      calculatedInterest =
                        calculatedMaturityAmount - principalAmount;
                    }
                  } else if (
                    isCalcDDS &&
                    dailyContribution > 0 &&
                    calcRate > 0 &&
                    totalDays > 0
                  ) {
                    // DDS Calculation: Daily contributions with daily compounding
                    totalPrincipal = dailyContribution * totalDays;
                    const r = calcRate / 100;
                    const dailyRate = r / 365.25;

                    if (dailyRate === 0) {
                      calculatedMaturityAmount = totalPrincipal;
                      calculatedInterest = 0;
                    } else {
                      // Future Value of Annuity Due (daily payments)
                      const futureValue =
                        dailyContribution *
                        (((Math.pow(1 + dailyRate, totalDays) - 1) /
                          dailyRate) *
                          (1 + dailyRate));
                      calculatedMaturityAmount = futureValue;
                      calculatedInterest =
                        calculatedMaturityAmount - totalPrincipal;
                    }
                  } else if (
                    isCalcRD &&
                    monthlyContribution > 0 &&
                    calcRate > 0 &&
                    totalMonths > 0
                  ) {
                    totalPrincipal = monthlyContribution * totalMonths;
                    const r = calcRate / 100;

                    if (defaultMethod === "simple") {
                      calculatedInterest =
                        (monthlyContribution *
                          totalMonths *
                          (totalMonths + 1) *
                          r) /
                        (2 * 12);
                      calculatedMaturityAmount =
                        totalPrincipal + calculatedInterest;
                    } else {
                      const monthlyRate = r / 12;
                      if (monthlyRate > 0) {
                        const maturityFactor =
                          ((Math.pow(1 + monthlyRate, totalMonths) - 1) /
                            monthlyRate) *
                          (1 + monthlyRate);
                        calculatedMaturityAmount =
                          monthlyContribution * maturityFactor;
                        calculatedInterest =
                          calculatedMaturityAmount - totalPrincipal;
                      } else {
                        calculatedMaturityAmount = totalPrincipal;
                        calculatedInterest = 0;
                      }
                    }
                  }

                  // Calculate maturity date
                  const calcMaturityDate =
                    calculatedDays > 0
                      ? new Date(
                          Date.now() + calculatedDays * 24 * 60 * 60 * 1000
                        )
                      : null;

                  return (
                    <div className="space-y-4">
                      <div className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200">
                        <p className="text-xs text-purple-700">
                          {isCalcFD
                            ? "Calculate potential returns for your Fixed Deposit"
                            : isCalcDDS
                            ? "Calculate potential returns for your Daily Deposit Scheme"
                            : "Calculate potential returns for your RD investment"}
                        </p>
                      </div>

                      {/* Current Account Info */}
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-blue-700">
                          <strong>Account Type:</strong>{" "}
                          {calculatorAccountType.name} | Rate{" "}
                          {defaultRate.toFixed(2)}% p.a. ({defaultMethod})
                          {isCalcFD || isCalcDDS
                            ? ` | Min Deposit ₹${defaultPrincipal.toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}`
                            : ` | Min Contribution ₹${defaultMonthlyContribution.toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}`}
                        </p>
                      </div>

                      {/* Input Fields */}
                      <div className="space-y-4">
                        {isCalcFD ? (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Principal Amount (₹){" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="1000"
                              min="0"
                              value={
                                calculatorData.principalAmount ||
                                defaultPrincipal ||
                                ""
                              }
                              onChange={(e) =>
                                setCalculatorData({
                                  ...calculatorData,
                                  principalAmount: e.target.value,
                                })
                              }
                              placeholder="Enter principal amount (one-time deposit)"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            />
                            {defaultPrincipal > 0 && (
                              <button
                                onClick={() =>
                                  setCalculatorData({
                                    ...calculatorData,
                                    principalAmount: defaultPrincipal,
                                  })
                                }
                                className="mt-1 text-xs text-purple-600 hover:text-purple-700 underline"
                              >
                                Use minimum deposit (₹
                                {defaultPrincipal.toLocaleString("en-IN")})
                              </button>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                              One-time lump sum amount you will deposit
                            </p>
                          </div>
                        ) : isCalcDDS ? (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Daily Contribution (₹){" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="10"
                              min="0"
                              value={
                                calculatorData.dailyContribution ||
                                calculatorAccountType.min_contribution_amount ||
                                ""
                              }
                              onChange={(e) =>
                                setCalculatorData({
                                  ...calculatorData,
                                  dailyContribution: e.target.value,
                                })
                              }
                              placeholder="Enter daily contribution amount"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            />
                            {calculatorAccountType.min_contribution_amount >
                              0 && (
                              <button
                                onClick={() =>
                                  setCalculatorData({
                                    ...calculatorData,
                                    dailyContribution:
                                      calculatorAccountType.min_contribution_amount,
                                  })
                                }
                                className="mt-1 text-xs text-purple-600 hover:text-purple-700 underline"
                              >
                                Use minimum contribution (₹
                                {calculatorAccountType.min_contribution_amount.toLocaleString(
                                  "en-IN"
                                )}
                                )
                              </button>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                              Amount you will contribute every day
                            </p>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Monthly Contribution (₹)
                            </label>
                            <input
                              type="number"
                              step="100"
                              min="0"
                              value={
                                calculatorData.monthlyContribution ||
                                defaultMonthlyContribution ||
                                ""
                              }
                              onChange={(e) =>
                                setCalculatorData({
                                  ...calculatorData,
                                  monthlyContribution: e.target.value,
                                })
                              }
                              placeholder="Enter monthly contribution amount"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            />
                            {defaultMonthlyContribution > 0 && (
                              <button
                                onClick={() =>
                                  setCalculatorData({
                                    ...calculatorData,
                                    monthlyContribution:
                                      defaultMonthlyContribution,
                                  })
                                }
                                className="mt-1 text-xs text-purple-600 hover:text-purple-700 underline"
                              >
                                Use minimum contribution (₹
                                {defaultMonthlyContribution.toLocaleString(
                                  "en-IN"
                                )}
                                )
                              </button>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                              Amount you will contribute every month
                            </p>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Interest Rate (% p.a.)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="20"
                            value={calculatorData.rate || defaultRate || ""}
                            onChange={(e) =>
                              setCalculatorData({
                                ...calculatorData,
                                rate: e.target.value,
                              })
                            }
                            placeholder="Enter interest rate"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                          />
                          {defaultRate > 0 && (
                            <button
                              onClick={() =>
                                setCalculatorData({
                                  ...calculatorData,
                                  rate: defaultRate,
                                })
                              }
                              className="mt-1 text-xs text-purple-600 hover:text-purple-700 underline"
                            >
                              Use account rate ({defaultRate.toFixed(2)}%)
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Term Duration
                            </label>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={calculatorData.term || calcTerm || ""}
                              onChange={(e) =>
                                setCalculatorData({
                                  ...calculatorData,
                                  term: e.target.value,
                                })
                              }
                              placeholder="Enter duration"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Unit
                            </label>
                            <select
                              value={
                                calculatorData.termUnit ||
                                (isCalcDDS ? "days" : "months")
                              }
                              onChange={(e) =>
                                setCalculatorData({
                                  ...calculatorData,
                                  termUnit: e.target.value,
                                })
                              }
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            >
                              {isCalcDDS ? (
                                <>
                                  <option value="days">Days</option>
                                  <option value="months">Months</option>
                                  <option value="years">Years</option>
                                </>
                              ) : (
                                <>
                                  <option value="months">Months</option>
                                  <option value="years">Years</option>
                                </>
                              )}
                            </select>
                          </div>
                        </div>

                        {/* Quick Term Buttons */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Quick Select Term
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {(isCalcDDS
                              ? [
                                  { label: "90D", value: 90, unit: "days" },
                                  { label: "180D", value: 180, unit: "days" },
                                  { label: "1Y", value: 365, unit: "days" },
                                  { label: "2Y", value: 730, unit: "days" },
                                ]
                              : [
                                  { label: "6M", value: 6, unit: "months" },
                                  { label: "1Y", value: 12, unit: "months" },
                                  { label: "2Y", value: 24, unit: "months" },
                                  { label: "5Y", value: 5, unit: "years" },
                                ]
                            ).map((option) => (
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
                      </div>

                      {/* Calculation Results */}
                      {calculatedMaturityAmount > 0 && (
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-5 border-2 border-purple-200 shadow-lg">
                          <h4 className="font-bold text-gray-900 mb-4 text-center text-lg">
                            📊{" "}
                            {isCalcFD
                              ? "FD Return Calculation"
                              : isCalcDDS
                              ? "DDS Return Calculation"
                              : "RD Return Calculation"}
                          </h4>
                          <div className="space-y-3">
                            {isCalcFD ? (
                              <div className="flex justify-between items-center py-2 border-b border-purple-200">
                                <span className="text-sm font-medium text-gray-700">
                                  Principal Amount:
                                </span>
                                <span className="text-base font-bold text-gray-900">
                                  ₹
                                  {principalAmount.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            ) : isCalcDDS ? (
                              <div className="flex justify-between items-center py-2 border-b border-purple-200">
                                <span className="text-sm font-medium text-gray-700">
                                  Total Contribution:
                                </span>
                                <span className="text-base font-bold text-gray-900">
                                  ₹
                                  {totalPrincipal.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center py-2 border-b border-purple-200">
                                <span className="text-sm font-medium text-gray-700">
                                  Monthly Contribution:
                                </span>
                                <span className="text-base font-bold text-gray-900">
                                  ₹
                                  {monthlyContribution.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center py-2 border-b border-purple-200">
                              <span className="text-sm font-medium text-gray-700">
                                Investment Period:
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {isCalcFD
                                  ? `${totalYears.toFixed(
                                      2
                                    )} years (${totalMonths.toFixed(1)} months)`
                                  : isCalcDDS
                                  ? `${totalDays} days (${totalMonths.toFixed(
                                      1
                                    )} months, ${totalYears.toFixed(2)} years)`
                                  : `${totalMonths} months${
                                      calcTermUnit === "years"
                                        ? ` (${calcTerm} years)`
                                        : ""
                                    }`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-purple-200">
                              <span className="text-sm font-medium text-gray-700">
                                {isCalcFD
                                  ? "Principal Amount:"
                                  : isCalcDDS
                                  ? "Total Contribution:"
                                  : "Total Principal Invested:"}
                              </span>
                              <span className="text-base font-bold text-blue-600">
                                ₹
                                {totalPrincipal.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-purple-200">
                              <span className="text-sm font-medium text-gray-700">
                                Interest Rate:
                              </span>
                              <span className="text-sm font-semibold text-purple-600">
                                {calcRate.toFixed(2)}% p.a. ({defaultMethod})
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-purple-200">
                              <span className="text-sm font-medium text-gray-700">
                                Interest Earned:
                              </span>
                              <span className="text-base font-bold text-green-600">
                                ₹
                                {calculatedInterest.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            {calcMaturityDate && (
                              <div className="flex justify-between items-center py-2 border-b border-purple-200">
                                <span className="text-sm font-medium text-gray-700">
                                  Maturity Date:
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {calcMaturityDate.toLocaleDateString(
                                    "en-IN",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )}
                                </span>
                              </div>
                            )}
                            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 mt-4 border-2 border-green-300 shadow-md">
                              <div className="flex justify-between items-center">
                                <span className="text-base font-bold text-white">
                                  Total Maturity Amount:
                                </span>
                                <span className="text-2xl font-extrabold text-white">
                                  ₹
                                  {calculatedMaturityAmount.toLocaleString(
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
                                  {totalPrincipal > 0
                                    ? (
                                        (calculatedInterest / totalPrincipal) *
                                        100
                                      ).toFixed(2)
                                    : "0.00"}
                                  %
                                </p>
                                <p className="text-xs text-green-100">
                                  Profit: ₹
                                  {calculatedInterest.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Info Box */}
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-blue-700">
                          <strong>Note:</strong> This calculator uses{" "}
                          {defaultMethod} interest calculation. Actual returns
                          may vary based on your account terms and compounding
                          frequency.
                        </p>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => {
                            setCalculatorData({});
                            setShowCalculatorModal(false);
                            setCalculatorAccountType(null);
                          }}
                          className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => {
                            setCalculatorData({
                              ...(isCalcFD || isCalcDDS
                                ? { principalAmount: defaultPrincipal }
                                : {
                                    monthlyContribution:
                                      defaultMonthlyContribution,
                                  }),
                              rate: defaultRate,
                              term: 12,
                              termUnit: "months",
                            });
                          }}
                          className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Account Type Details Modal */}
      {mounted &&
        selectedAccountType &&
        typeof window !== "undefined" &&
        document.body &&
        createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedAccountType(null);
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedAccountType.name} Details
                  </h3>
                  <button
                    onClick={() => setSelectedAccountType(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Interest Rate
                      </label>
                      <p className="text-lg font-semibold text-green-600">
                        {selectedAccountType.interest_rate}%
                      </p>
                    </div>
                    {selectedAccountType.term_in_days && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Term
                        </label>
                        <p className="text-lg font-semibold text-blue-600">
                          {selectedAccountType.term_in_days} days
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {selectedAccountType.min_deposit > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Min Deposit
                        </label>
                        <p className="text-sm font-semibold">
                          ₹{selectedAccountType.min_deposit}
                        </p>
                      </div>
                    )}
                    {selectedAccountType.max_deposit && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Max Deposit
                        </label>
                        <p className="text-sm font-semibold">
                          ₹{selectedAccountType.max_deposit}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedAccountType.loan_parameters &&
                    Object.keys(selectedAccountType.loan_parameters).length >
                      0 && (
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-2">
                          Loan Parameters
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Min Loan Amount
                            </label>
                            <p className="text-sm font-semibold">
                              ₹
                              {selectedAccountType.loan_parameters
                                .min_loan_amount || 0}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Max Loan Amount
                            </label>
                            <p className="text-sm font-semibold">
                              ₹
                              {selectedAccountType.loan_parameters
                                .max_loan_amount || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Created by {selectedAccountType.creator_name}</span>
                      <span>
                        {new Date(
                          selectedAccountType.created_at
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default AccountTypeList;
