import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Save,
  DollarSign,
  Clock,
  TrendingUp,
  AlertCircle,
  Shield,
  CreditCard,
  Settings,
  FileText,
  Calculator,
} from "lucide-react";

function AccountTypeForm() {
  const [formData, setFormData] = useState({
    name: "",
    display_name:'',
    interest_rate: "",
    term_in_days: "",
    min_deposit: "",
    max_deposit: "",
    min_withdrawal: "",
    max_withdrawal: "",
    withdrawal_limit_daily: "",
    withdrawal_limit_monthly: "",
    deposit_limit_daily: "",
    deposit_limit_monthly: "",
    atm_withdrawal_limit_daily: "",
    minimum_balance: "",
    low_balance_penalty: "",
    interest_calculation_frequency: "",
    interest_calculation_method: "simple",
    contribution_frequency: "",
    min_contribution_amount: "",
    lock_in_period_days: "",
    early_withdrawal_penalty_rate: "",
    loan_parameters: {
      max_loan_amount: "",
      min_loan_amount: "",
      repayment_frequency: "",
      penalty_rate: "",
    },
  });
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [originalInterestRate, setOriginalInterestRate] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const { user } = useAuth();
  const {
    canCreate,
    canUpdate,
    loading: permissionsLoading,
  } = usePermissions();
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id && id !== "new") {
      setIsEdit(true);
      fetchAccountType();
    }
  }, [id]);

  const fetchAccountType = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/account-types/get/${id}`);
      if (response.data.success) {
        const accountType = response.data.data;
        // Store original interest rate for comparison
        setOriginalInterestRate(accountType.interest_rate);
        setFormData({
          name: accountType.name,
          display_name: accountType.display_name,
          interest_rate: accountType.interest_rate.toString(),
          term_in_days: accountType.term_in_days
            ? accountType.term_in_days.toString()
            : "",
          min_deposit: accountType.min_deposit
            ? accountType.min_deposit.toString()
            : "",
          max_deposit: accountType.max_deposit
            ? accountType.max_deposit.toString()
            : "",
          min_withdrawal: accountType.min_withdrawal
            ? accountType.min_withdrawal.toString()
            : "",
          max_withdrawal: accountType.max_withdrawal
            ? accountType.max_withdrawal.toString()
            : "",
          withdrawal_limit_daily: accountType.withdrawal_limit_daily
            ? accountType.withdrawal_limit_daily.toString()
            : "",
          withdrawal_limit_monthly: accountType.withdrawal_limit_monthly
            ? accountType.withdrawal_limit_monthly.toString()
            : "",
          contribution_frequency: accountType.contribution_frequency || "",
          min_contribution_amount: accountType.min_contribution_amount
            ? accountType.min_contribution_amount.toString()
            : "",
          lock_in_period_days: accountType.lock_in_period_days
            ? accountType.lock_in_period_days.toString()
            : "",
          early_withdrawal_penalty_rate:
            accountType.early_withdrawal_penalty_rate
              ? accountType.early_withdrawal_penalty_rate.toString()
              : "",
          // New M2 fields
          deposit_limit_daily: accountType.deposit_limit_daily
            ? accountType.deposit_limit_daily.toString()
            : "",
          deposit_limit_monthly: accountType.deposit_limit_monthly
            ? accountType.deposit_limit_monthly.toString()
            : "",
          atm_withdrawal_limit_daily: accountType.atm_withdrawal_limit_daily
            ? accountType.atm_withdrawal_limit_daily.toString()
            : "",
          minimum_balance: accountType.minimum_balance
            ? accountType.minimum_balance.toString()
            : "",
          low_balance_penalty: accountType.low_balance_penalty
            ? accountType.low_balance_penalty.toString()
            : "",
          interest_calculation_frequency:
            accountType.interest_calculation_frequency || "",
          interest_calculation_method:
            accountType.interest_calculation_method || "simple",
          loan_parameters: {
            max_loan_amount: accountType.loan_parameters?.max_loan_amount
              ? accountType.loan_parameters.max_loan_amount.toString()
              : "",
            min_loan_amount: accountType.loan_parameters?.min_loan_amount
              ? accountType.loan_parameters.min_loan_amount.toString()
              : "",
            repayment_frequency:
              accountType.loan_parameters?.repayment_frequency || "",
            penalty_rate: accountType.loan_parameters?.penalty_rate
              ? accountType.loan_parameters.penalty_rate.toString()
              : "",
          },
        });
      } else {
        toast.error("Failed to fetch account type");
        navigate("/accounts/types");
      }
    } catch (error) {
      toast.error("Error fetching account type");
      navigate("/accounts/types");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check permissions
    if (isEdit && !canUpdateAccountType) {
      toast.error("You don't have permission to update account types");
      return;
    }
    if (!isEdit && !canCreateAccountType) {
      toast.error("You don't have permission to create account types");
      return;
    }

    if (!formData.name || !formData.interest_rate) {
      toast.error("Name and interest rate are required");
      return;
    }

    // Validate interest rate
    const interestRate = parseFloat(formData.interest_rate);
    if (isNaN(interestRate) || interestRate < 0 || interestRate > 100) {
      toast.error("Interest rate must be between 0 and 100");
      return;
    }

    // Check if interest rate changed (only for edit mode)
    const interestRateChanged = isEdit && originalInterestRate !== null && 
      Math.abs(interestRate - originalInterestRate) > 0.001;

    // If interest rate changed, document is required
    if (interestRateChanged && !documentFile) {
      toast.error("Document upload is required when interest rate is changed");
      return;
    }

    // Validate term for RD/FD/DDS accounts
    if (
      formData.name === "RD" ||
      formData.name === "FD" ||
      formData.name === "DDS"
    ) {
      if (!formData.term_in_days) {
        toast.error("RD, FD, and DDS accounts require a term in days");
        return;
      }
      const termDays = parseInt(formData.term_in_days);
      if (isNaN(termDays) || termDays <= 0) {
        toast.error("Term must be a positive number");
        return;
      }
    }

    // For Savings and Loan accounts, term should be empty
    if (
      (formData.name === "Savings" || formData.name === "Loan") &&
      formData.term_in_days
    ) {
      toast.error("Savings and Loan accounts should not have a term");
      return;
    }

    try {
      setLoading(true);

      // Check if we need to send FormData (when document is present)
      const hasDocument = documentFile !== null;
      
      let payload;
      let config = {};

      if (hasDocument && isEdit) {
        // Use FormData for file upload
        payload = new FormData();
        
        // Append all form fields
        payload.append('name', formData.name);
        payload.append('display_name', formData.display_name);
        payload.append('interest_rate', interestRate.toString());
        if (formData.term_in_days) {
          payload.append('term_in_days', formData.term_in_days);
        }
        
        // Append numeric fields
        if (formData.min_deposit) payload.append('min_deposit', parseFloat(formData.min_deposit));
        if (formData.max_deposit) payload.append('max_deposit', parseFloat(formData.max_deposit));
        if (formData.min_withdrawal) payload.append('min_withdrawal', parseFloat(formData.min_withdrawal));
        if (formData.max_withdrawal) payload.append('max_withdrawal', parseFloat(formData.max_withdrawal));
        if (formData.withdrawal_limit_daily) payload.append('withdrawal_limit_daily', parseFloat(formData.withdrawal_limit_daily));
        if (formData.withdrawal_limit_monthly) payload.append('withdrawal_limit_monthly', parseFloat(formData.withdrawal_limit_monthly));
        if (formData.deposit_limit_daily) payload.append('deposit_limit_daily', parseFloat(formData.deposit_limit_daily));
        if (formData.deposit_limit_monthly) payload.append('deposit_limit_monthly', parseFloat(formData.deposit_limit_monthly));
        if (formData.atm_withdrawal_limit_daily) payload.append('atm_withdrawal_limit_daily', parseFloat(formData.atm_withdrawal_limit_daily));
        if (formData.minimum_balance) payload.append('minimum_balance', parseFloat(formData.minimum_balance));
        if (formData.low_balance_penalty) payload.append('low_balance_penalty', parseFloat(formData.low_balance_penalty));
        if (formData.interest_calculation_frequency) payload.append('interest_calculation_frequency', formData.interest_calculation_frequency);
        if (formData.interest_calculation_method) payload.append('interest_calculation_method', formData.interest_calculation_method);
        if (formData.contribution_frequency) payload.append('contribution_frequency', formData.contribution_frequency);
        if (formData.min_contribution_amount) payload.append('min_contribution_amount', parseFloat(formData.min_contribution_amount));
        if (formData.lock_in_period_days) payload.append('lock_in_period_days', parseInt(formData.lock_in_period_days));
        if (formData.early_withdrawal_penalty_rate) payload.append('early_withdrawal_penalty_rate', parseFloat(formData.early_withdrawal_penalty_rate));
        
        // Append loan parameters if Loan account
        if (formData.name === "Loan" && formData.loan_parameters) {
          payload.append('loan_parameters', JSON.stringify({
            max_loan_amount: formData.loan_parameters.max_loan_amount ? parseFloat(formData.loan_parameters.max_loan_amount) : null,
            min_loan_amount: formData.loan_parameters.min_loan_amount ? parseFloat(formData.loan_parameters.min_loan_amount) : null,
            repayment_frequency: formData.loan_parameters.repayment_frequency || null,
            penalty_rate: formData.loan_parameters.penalty_rate ? parseFloat(formData.loan_parameters.penalty_rate) : null,
          }));
        }
        
        // Append document file
        payload.append('document', documentFile);
        
        // Don't set Content-Type header - browser will set it automatically with boundary for FormData
        config = {};
      } else {
        // Use regular JSON payload
        payload = {
        name: formData.name,
        display_name: formData.display_name,
        interest_rate: interestRate,
        term_in_days: formData.term_in_days
          ? parseInt(formData.term_in_days)
          : null,
        min_deposit: formData.min_deposit
          ? parseFloat(formData.min_deposit)
          : 0,
        max_deposit: formData.max_deposit
          ? parseFloat(formData.max_deposit)
          : null,
        min_withdrawal: formData.min_withdrawal
          ? parseFloat(formData.min_withdrawal)
          : 0,
        max_withdrawal: formData.max_withdrawal
          ? parseFloat(formData.max_withdrawal)
          : null,
        withdrawal_limit_daily: formData.withdrawal_limit_daily
          ? parseFloat(formData.withdrawal_limit_daily)
          : null,
        withdrawal_limit_monthly: formData.withdrawal_limit_monthly
          ? parseFloat(formData.withdrawal_limit_monthly)
          : null,
        // New M2 fields
        deposit_limit_daily: formData.deposit_limit_daily
          ? parseFloat(formData.deposit_limit_daily)
          : null,
        deposit_limit_monthly: formData.deposit_limit_monthly
          ? parseFloat(formData.deposit_limit_monthly)
          : null,
        atm_withdrawal_limit_daily: formData.atm_withdrawal_limit_daily
          ? parseFloat(formData.atm_withdrawal_limit_daily)
          : null,
        minimum_balance: formData.minimum_balance
          ? parseFloat(formData.minimum_balance)
          : 0,
        low_balance_penalty: formData.low_balance_penalty
          ? parseFloat(formData.low_balance_penalty)
          : 0,
        interest_calculation_frequency:
          formData.interest_calculation_frequency || null,
        interest_calculation_method:
          formData.interest_calculation_method || "simple",
        contribution_frequency: formData.contribution_frequency || null,
        min_contribution_amount: formData.min_contribution_amount
          ? parseFloat(formData.min_contribution_amount)
          : null,
        lock_in_period_days: formData.lock_in_period_days
          ? parseInt(formData.lock_in_period_days)
          : null,
        early_withdrawal_penalty_rate: formData.early_withdrawal_penalty_rate
          ? parseFloat(formData.early_withdrawal_penalty_rate)
          : 0,
      };

      // Add loan parameters for Loan accounts
      if (formData.name === "Loan") {
        payload.loan_parameters = {
          max_loan_amount: formData.loan_parameters.max_loan_amount
            ? parseFloat(formData.loan_parameters.max_loan_amount)
            : null,
          min_loan_amount: formData.loan_parameters.min_loan_amount
            ? parseFloat(formData.loan_parameters.min_loan_amount)
            : null,
          repayment_frequency:
            formData.loan_parameters.repayment_frequency || null,
          penalty_rate: formData.loan_parameters.penalty_rate
            ? parseFloat(formData.loan_parameters.penalty_rate)
            : null,
        };
        }
      }

      let response;
      if (isEdit) {
        response = await api.put(`/account-types/${id}`, payload, config);
      } else {
        response = await api.post("/account-types", payload);
      }

      if (response.data.success) {
        toast.success(
          `Account type ${isEdit ? "updated" : "created"} successfully`
        );
        navigate("/accounts/types");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(`Error ${isEdit ? "updating" : "creating"} account type`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // If account type name is changing, reset irrelevant fields
    if (name === "name") {
      setFormData((prev) => {
        const newData = {
          ...prev,
          [name]: value,
        };

        // Clear fields based on account type
        if (value === "Loan") {
          // Loan doesn't need deposit/withdrawal limits, contribution, lock-in, etc.
          newData.term_in_days = "";
          newData.contribution_frequency = "";
          newData.min_contribution_amount = "";
          newData.lock_in_period_days = "";
          newData.early_withdrawal_penalty_rate = "";
          newData.display_name = "";
        } else if (value === "Savings") {
          // Savings doesn't need term, contribution, lock-in
          newData.term_in_days = "";
          newData.contribution_frequency = "";
          newData.min_contribution_amount = "";
          newData.lock_in_period_days = "";
          newData.early_withdrawal_penalty_rate = "";
          newData.display_name = "";
        } else if (value === "RD") {
          // RD doesn't need withdrawal limits, lock-in period
          newData.withdrawal_limit_daily = "";
          newData.withdrawal_limit_monthly = "";
          newData.min_withdrawal = "";
          newData.max_withdrawal = "";
          newData.lock_in_period_days = "";
          newData.display_name = "";
        } else if (value === "FD") {
          // FD doesn't need contribution frequency, withdrawal limits
          newData.contribution_frequency = "";
          newData.min_contribution_amount = "";
          newData.withdrawal_limit_daily = "";
          newData.withdrawal_limit_monthly = "";
          newData.min_withdrawal = "";
          newData.max_withdrawal = "";
          newData.display_name = "";
        } else if (value === "DDS") {
          // DDS doesn't need contribution frequency, withdrawal limits (similar to FD)
          newData.contribution_frequency = "";
          newData.min_contribution_amount = "";
          newData.withdrawal_limit_daily = "";
          newData.withdrawal_limit_monthly = "";
          newData.min_withdrawal = "";
          newData.max_withdrawal = "";
          newData.display_name = "";
        }

        return newData;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleLoanParameterChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      loan_parameters: {
        ...prev.loan_parameters,
        [name]: value,
      },
    }));
  };

  // Permission-based access control
  const canManage =
    user?.role === "admin" ||
    (user?.role === "manager" &&
      (canCreate("account_types") || canUpdate("account_types")));
  const canCreateAccountType =
    user?.role === "admin" ||
    (user?.role === "manager" && canCreate("account_types"));
  const canUpdateAccountType =
    user?.role === "admin" ||
    (user?.role === "manager" && canUpdate("account_types"));

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="text-gray-500 mt-2">
          You don't have permission to manage account types.
        </p>
      </div>
    );
  }

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/accounts/types")}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? "Edit Account Type" : "Add Account Type"}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit
                ? "Update account type details"
                : "Create a new account type with interest rates and terms"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Settings className="h-4 w-4 mr-2" />
          {showAdvanced ? "Hide" : "Show"} Advanced
        </button>
      </div>

      {/* Form */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  required
                >
                  <option value="">Select account type</option>
                  <option value="Savings">Savings</option> 
                  <option value="DDS">Daily Deposit Scheme (DDS)</option>
                  <option value="RD">Recurring Deposit (RD)</option>
                  <option value="FD">Fixed Deposit (FD)</option>
                  <option value="Loan">Loan</option>
                </select>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Name *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  placeholder="Enter display name (e.g. DDS 1)"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                 transition-all duration-200 bg-gray-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* Interest Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interest Rate (%) *
              </label>
              <div className="relative">
                <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  name="interest_rate"
                  value={formData.interest_rate}
                  onChange={handleInputChange}
                  placeholder="Enter interest rate (0-100)"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* Document Upload - Show only when editing and interest rate changes */}
            {isEdit && originalInterestRate !== null && 
             Math.abs(parseFloat(formData.interest_rate || 0) - originalInterestRate) > 0.001 && (
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Upload * <span className="text-red-500">(Required when interest rate changes)</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="file"
                    name="document"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setDocumentFile(file);
                      }
                    }}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    className="w-full pl-12 pr-4 py-1.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                </div>
                {documentFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {documentFile.name}
                  </p>
                )}
              </div>
            )}

            {/* Term in Days (for RD/FD/DDS only) */}
            {(formData.name === "RD" ||
              formData.name === "FD" ||
              formData.name === "DDS") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Term in Days *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    name="term_in_days"
                    value={formData.term_in_days}
                    onChange={handleInputChange}
                    placeholder="Enter term in days"
                    min="1"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Info for Savings and Loan */}
          {(formData.name === "Savings" || formData.name === "Loan") && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>{formData.name} accounts</strong> do not require a
                    term period. They can be opened and closed at any time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Parameters */}
          {showAdvanced && (
            <div className="space-y-6 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Advanced Parameters
              </h3>

              {/* Deposit Limits - Show for Savings, RD, FD, DDS */}
              {(formData.name === "Savings" ||
                formData.name === "RD" ||
                formData.name === "FD" ||
                formData.name === "DDS") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Deposit
                    </label>
                    <input
                      type="number"
                      name="min_deposit"
                      value={formData.min_deposit}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Deposit
                    </label>
                    <input
                      type="number"
                      name="max_deposit"
                      value={formData.max_deposit}
                      onChange={handleInputChange}
                      placeholder="No limit"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Daily Deposit Limit
                    </label>
                    <input
                      type="number"
                      name="deposit_limit_daily"
                      value={formData.deposit_limit_daily}
                      onChange={handleInputChange}
                      placeholder="No limit"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Deposit Limit
                    </label>
                    <input
                      type="number"
                      name="deposit_limit_monthly"
                      value={formData.deposit_limit_monthly}
                      onChange={handleInputChange}
                      placeholder="No limit"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              )}

              {/* Withdrawal Limits - Show only for Savings */}
              {formData.name === "Savings" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Withdrawal
                      </label>
                      <input
                        type="number"
                        name="min_withdrawal"
                        value={formData.min_withdrawal}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Withdrawal
                      </label>
                      <input
                        type="number"
                        name="max_withdrawal"
                        value={formData.max_withdrawal}
                        onChange={handleInputChange}
                        placeholder="No limit"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Daily Withdrawal Limit
                      </label>
                      <input
                        type="number"
                        name="withdrawal_limit_daily"
                        value={formData.withdrawal_limit_daily}
                        onChange={handleInputChange}
                        placeholder="No limit"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monthly Withdrawal Limit
                      </label>
                      <input
                        type="number"
                        name="withdrawal_limit_monthly"
                        value={formData.withdrawal_limit_monthly}
                        onChange={handleInputChange}
                        placeholder="No limit"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Balance Requirements - Show only for Savings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Balance Required
                      </label>
                      <input
                        type="number"
                        name="minimum_balance"
                        value={formData.minimum_balance}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Low Balance Penalty
                      </label>
                      <input
                        type="number"
                        name="low_balance_penalty"
                        value={formData.low_balance_penalty}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Interest Calculation - Show for Savings, RD, FD, DDS */}
              {(formData.name === "Savings" ||
                formData.name === "RD" ||
                formData.name === "FD" ||
                formData.name === "DDS") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interest Calculation Frequency
                    </label>
                    <select
                      name="interest_calculation_frequency"
                      value={formData.interest_calculation_frequency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select frequency</option>
                      <option value="daily">Daily</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interest Calculation Method
                    </label>
                    <select
                      name="interest_calculation_method"
                      value={formData.interest_calculation_method}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="simple">Simple Interest</option>
                      <option value="compound">Compound Interest</option>
                    </select>
                  </div>
                </div>
              )}

              {/* RD Specific Parameters */}
              {formData.name === "RD" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contribution Frequency
                    </label>
                    <select
                      name="contribution_frequency"
                      value={formData.contribution_frequency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select frequency</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Contribution Amount
                    </label>
                    <input
                      type="number"
                      name="min_contribution_amount"
                      value={formData.min_contribution_amount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              )}

              {/* FD Specific Parameters */}
              {formData.name === "FD" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lock-in Period (Days)
                  </label>
                  <input
                    type="number"
                    name="lock_in_period_days"
                    value={formData.lock_in_period_days}
                    onChange={handleInputChange}
                    placeholder="365"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              )}

              {/* DDS Specific Parameters (similar to FD) */}
              {formData.name === "DDS" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lock-in Period (Days)
                  </label>
                  <input
                    type="number"
                    name="lock_in_period_days"
                    value={formData.lock_in_period_days}
                    onChange={handleInputChange}
                    placeholder="365"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              )}

              {/* Early Withdrawal Penalty - Show for RD, FD, and DDS */}
              {(formData.name === "RD" ||
                formData.name === "FD" ||
                formData.name === "DDS") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Early Withdrawal Penalty Rate (%)
                  </label>
                  <input
                    type="number"
                    name="early_withdrawal_penalty_rate"
                    value={formData.early_withdrawal_penalty_rate}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              )}

              {/* Loan Parameters */}
              {formData.name === "Loan" && (
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-900 flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Loan Parameters
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Loan Amount
                      </label>
                      <input
                        type="number"
                        name="max_loan_amount"
                        value={formData.loan_parameters.max_loan_amount}
                        onChange={handleLoanParameterChange}
                        placeholder="1000000"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Loan Amount
                      </label>
                      <input
                        type="number"
                        name="min_loan_amount"
                        value={formData.loan_parameters.min_loan_amount}
                        onChange={handleLoanParameterChange}
                        placeholder="10000"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Repayment Frequency
                      </label>
                      <select
                        name="repayment_frequency"
                        value={formData.loan_parameters.repayment_frequency}
                        onChange={handleLoanParameterChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="">Select frequency</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Penalty Rate (%)
                      </label>
                      <input
                        type="number"
                        name="penalty_rate"
                        value={formData.loan_parameters.penalty_rate}
                        onChange={handleLoanParameterChange}
                        placeholder="5.00"
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate("/accounts/types")}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEdit ? "Update" : "Create"} Account Type
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AccountTypeForm;
