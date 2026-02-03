import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Plus,
  CreditCard,
  Wallet,
  Eye,
  Edit,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  RefreshCw,
  PiggyBank,
  Building2,
  AlertCircle,
} from "lucide-react";


function CustomerAccounts() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    canCreate,
    canUpdate,
    loading: permissionsLoading,
  } = usePermissions();
  const [customer, setCustomer] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountTypes, setAccountTypes] = useState([]);

  // Permission checks for customer_accounts module
  const canCreateAccount =
    user?.role === "admin" ||
    (user?.role === "manager" && canCreate("customer_accounts"));
  const canUpdateAccount =
    user?.role === "admin" ||
    (user?.role === "manager" && canUpdate("customer_accounts"));

  useEffect(() => {
    fetchCustomer();
    fetchAccounts();
    fetchAccountTypes();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const response = await api.post(`/customers/get/${id}`);
      if (response.data.success) {
        setCustomer(response.data.data);
      }
    } catch (error) {
      toast.error("Error fetching customer details");
      navigate("/customers");
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/accounts/customer/${id}`, {});
      if (response.data.success) {
        setAccounts(response.data.data || []);
      }
    } catch (error) {
      toast.error("Error fetching accounts");
    } finally {
      setLoading(false);
    }
  };

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

  const handleStatusUpdate = async (accountId, newStatus) => {
    try {
      const response = await api.put(`/accounts/${accountId}/status`, {
        status: newStatus,
      });
      if (response.data.success) {
        toast.success(
          `Account ${
            newStatus === "active" ? "activated" : "closed"
          } successfully`
        );
        fetchAccounts();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Error updating account status");
    }
  };

  const handleBreakAccount = async (accountId, accountTypeName) => {
    if (
      !window.confirm(
        `Are you sure you want to break this ${accountTypeName} account? The balance will be transferred to the Savings account.`
      )
    ) {
      return;
    }

    try {
      const response = await api.post(`/accounts/${accountId}/break`);
      if (response.data.success) {
        toast.success(
          `${accountTypeName} account broken successfully. Balance transferred to Savings account.`
        );
        fetchAccounts();
      } else {
        toast.error(response.data.message || "Failed to break account");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error breaking account");
    }
  };

  const getAccountTypeName = (accountTypeId) => {
    const accountType = accountTypes.find((at) => at.id === accountTypeId);
    return accountType?.name || "Unknown";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getAccountIcon = (accountTypeName) => {
    switch (accountTypeName?.toLowerCase()) {
      case "savings":
        return Wallet;
      case "rd":
        return PiggyBank;
      case "fd":
        return Building2;
      case "loan":
        return TrendingDown;
      default:
        return CreditCard;
    }
  };

  const getAccountColor = (accountTypeName) => {
    switch (accountTypeName?.toLowerCase()) {
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

  if (loading && !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/customers")}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 text-sm sm:text-base"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          <span className="hidden sm:inline">Back to Customers</span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              {customer?.name}'s Accounts
            </h1>
            <p className="text-gray-600 text-sm sm:text-base mt-1">
              Manage accounts for {customer?.email}
            </p>
          </div>
          {canCreateAccount && customer?.is_active && (
            <button
              onClick={() => navigate(`/customers/${id}/accounts/new`)}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Create Account</span>
              <span className="sm:hidden">Create</span>
            </button>
          )}
        </div>
      </div>

      {/* Accounts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Accounts Found
          </h3>
          <p className="text-gray-500 mb-6">
            This customer doesn't have any accounts yet.
          </p>
          {canCreateAccount && (
            <button
              onClick={() => navigate(`/customers/${id}/accounts/new`)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl inline-flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create First Account
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            // Use account_type_name from API response, fallback to lookup
            const accountTypeName =
              account?.account_type?.display_name ||
              account?.account_type_name ||
              getAccountTypeName(account.account_type_id);
            const accountTypeLower =
              account.account_type?.name || accountTypeName?.toLowerCase();
            const Icon = getAccountIcon(accountTypeName);
            const isLoan = accountTypeLower === "loan";
            const isFixedDeposit = ["fd", "rd", "dds"].includes(
              accountTypeLower
            );
            const balance = account.balance || 0;
            const displayBalance = isLoan ? Math.abs(balance) : balance;
            const isMatured =
              account.maturity_date &&
              new Date(account.maturity_date) <= new Date();

            return (
              <div
                key={account.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-200"
              >
                {/* Account Header */}
                <div
                  className={`bg-gradient-to-r ${getAccountColor(
                    accountTypeName
                  )} p-6 text-white`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{accountTypeName}</h3>
                        <p className="text-white/80 text-sm">
                          Account #{account.id}
                        </p>
                      </div>
                    </div>
                    {account.status === "active" ? (
                      <CheckCircle className="h-6 w-6 text-white" />
                    ) : (
                      <XCircle className="h-6 w-6 text-white/60" />
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-white/80 text-sm mb-1">
                      {isLoan ? "Outstanding Balance" : "Balance"}
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(displayBalance)}
                    </p>
                  </div>
                </div>

                {/* Account Details */}
                <div className="p-6">
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Status</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          account.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {account.status === "active" ? "Active" : "Closed"}
                      </span>
                    </div>
                    {account.start_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Start Date
                        </span>
                        <span className="text-gray-900 font-medium">
                          {new Date(account.start_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {account.maturity_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Maturity Date
                        </span>
                        <span
                          className={`font-medium ${
                            isMatured
                              ? "text-green-600 font-semibold"
                              : "text-gray-900"
                          }`}
                        >
                          {new Date(account.maturity_date).toLocaleDateString()}
                          {isMatured && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              Matured
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() =>
                          navigate(`/customers/${id}/accounts/${account.id}`)
                        }
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                      {canUpdateAccount &&
                        (accountTypeName === "Savings" ||
                          accountTypeName === "Loan") && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(
                                account.id,
                                account.status === "active"
                                  ? "closed"
                                  : "active"
                              )
                            }
                            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg transition-colors text-sm font-semibold ${
                              account.status === "active"
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-green-50 text-green-600 hover:bg-green-100"
                            }`}
                          >
                            {account.status === "active" ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Close
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </button>
                        )}
                    </div>
                    {/* Break Account Button for FD/RD/DDS */}
                    {canUpdateAccount &&
                      isFixedDeposit &&
                      account.status === "active" &&
                      balance > 0 && (
                        <button
                          onClick={() =>
                            handleBreakAccount(account.id, accountTypeName)
                          }
                          className={`w-full flex items-center justify-center px-4 py-2 rounded-lg transition-colors text-sm font-semibold ${
                            isMatured
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-orange-50 text-orange-600 hover:bg-orange-100"
                          }`}
                        >
                          <AlertCircle className="h-4 w-4 mr-2" />
                          {isMatured
                            ? `Break ${accountTypeName} (Matured)`
                            : `Break ${accountTypeName} (Early)`}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomerAccounts;
