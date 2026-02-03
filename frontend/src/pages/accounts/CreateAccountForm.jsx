import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Save,
  CreditCard,
  Wallet,
  PiggyBank,
  Building2,
  TrendingDown,
  Calculator,
  Calendar,
  DollarSign,
  AlertCircle,
} from "lucide-react";

function CreateAccountForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canCreate, loading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(false);

  // Permission check for customer_accounts module
  const canCreateAccount =
    user?.role === "admin" ||
    (user?.role === "manager" && canCreate("customer_accounts"));
  const [accountTypes, setAccountTypes] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [formData, setFormData] = useState({
    account_type_id: "",
    initial_balance: "",
    loan_term_months: "",
    custom_interest_rate: "",
    emi_due_day: "",
    rd_contribution_amount: "",
    rd_contribution_day: "",
    rd_term_days: "",
    fd_term_days: "",
    start_date: "",
  });
  const [emiPreview, setEmiPreview] = useState(null);

  useEffect(() => {
    // Check permissions before allowing access
    if (!permissionsLoading && !canCreateAccount) {
      toast.error("You don't have permission to create accounts");
      navigate(`/customers/${id}/accounts`);
      return;
    }
    if (!permissionsLoading && canCreateAccount) {
      fetchCustomer();
      fetchAccountTypes();
    }
  }, [id, permissionsLoading, canCreateAccount, navigate]);

  useEffect(() => {
    if (
      formData.account_type_id &&
      formData.initial_balance &&
      isLoanAccount()
    ) {
      calculateEMIPreview();
    } else {
      setEmiPreview(null);
    }
  }, [
    formData.account_type_id,
    formData.initial_balance,
    formData.loan_term_months,
    formData.custom_interest_rate,
  ]);

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

  const fetchAccountTypes = async () => {
    try {
      const response = await api.post("/account-types/list");
      if (response.data.success) {
        setAccountTypes(response.data.data || []);
      }
    } catch (error) {
      toast.error("Error fetching account types");
    }
  };

  const isLoanAccount = () => {
    const selectedType = accountTypes.find(
      (at) => at.id === parseInt(formData.account_type_id)
    );
    return selectedType?.name?.toLowerCase() === "loan";
  };

  const isRDAccount = () => {
    const selectedType = accountTypes.find(
      (at) => at.id === parseInt(formData.account_type_id)
    );
    return selectedType?.name?.toLowerCase() === "rd";
  };

  const isFDAccount = () => {
    const selectedType = accountTypes.find(
      (at) => at.id === parseInt(formData.account_type_id)
    );
    return selectedType?.name?.toLowerCase() === "fd";
  };

  const isDDSAccount = () => {
    const selectedType = accountTypes.find(
      (at) => at.id === parseInt(formData.account_type_id)
    );
    return selectedType?.name?.toLowerCase() === "dds";
  };

  const calculateEMIPreview = () => {
    const loanAmount = parseFloat(formData.initial_balance);
    const termMonths = parseInt(formData.loan_term_months);
    const selectedType = accountTypes.find(
      (at) => at.id === parseInt(formData.account_type_id)
    );

    if (!selectedType || !loanAmount || !termMonths) {
      setEmiPreview(null);
      return;
    }

    // Use custom interest rate if provided, otherwise use account type default
    const interestRate = formData.custom_interest_rate
      ? parseFloat(formData.custom_interest_rate)
      : selectedType.interest_rate || 0;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = termMonths;

    // EMI Calculation: EMI = [P x R x (1+R)^N] / [(1+R)^N - 1]
    let emiAmount = 0;
    if (monthlyRate > 0) {
      const numerator =
        loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments);
      const denominator = Math.pow(1 + monthlyRate, numPayments) - 1;
      emiAmount = numerator / denominator;
    } else {
      emiAmount = loanAmount / numPayments;
    }

    const totalAmount = emiAmount * numPayments;
    const totalInterest = totalAmount - loanAmount;

    setEmiPreview({
      emiAmount: emiAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      totalInterest: totalInterest.toFixed(2),
      interestRate: interestRate,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If account type is changing, reset form data
    if (name === "account_type_id") {
      setFormData({
        account_type_id: value,
        initial_balance: "",
        loan_term_months: "",
        custom_interest_rate: "",
        emi_due_day: "",
        rd_contribution_amount: "",
        rd_contribution_day: "",
        rd_term_days: "",
        fd_term_days: "",
        start_date: "",
      });
      return;
    }
    
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const getDefaultStartDate = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth.toISOString().split("T")[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.account_type_id) {
        toast.error("Please select an account type");
        setLoading(false);
        return;
      }

      const selectedType = accountTypes.find(
        (at) => at.id === parseInt(formData.account_type_id)
      );

      if (isLoanAccount()) {
        // Loan validation
        const loanAmount = parseFloat(formData.initial_balance);
        const termMonths = parseInt(formData.loan_term_months);

        if (!loanAmount || loanAmount <= 0) {
          toast.error("Loan amount is required and must be greater than 0");
          setLoading(false);
          return;
        }

        if (!termMonths || termMonths <= 0) {
          toast.error("Loan tenure is required");
          setLoading(false);
          return;
        }
      } else {
        // Other account types - initial balance can be 0
        const initialBalance = parseFloat(formData.initial_balance) || 0;
        if (initialBalance < 0) {
          toast.error("Initial balance cannot be negative");
          setLoading(false);
          return;
        }
      }

      // Prepare payload
      const payload = {
        customer_id: parseInt(id),
        account_type_id: parseInt(formData.account_type_id),
      };

      if (isLoanAccount()) {
        // For loans, initial_balance is the loan amount (positive)
        // Backend will convert to negative balance
        payload.initial_balance = parseFloat(formData.initial_balance);
        // Add loan term if provided
        if (formData.loan_term_months) {
          payload.loan_term_months = parseInt(formData.loan_term_months);
        }
        // Add custom interest rate if provided
        if (formData.custom_interest_rate) {
          payload.custom_interest_rate = parseFloat(
            formData.custom_interest_rate
          );
        }
        // Add EMI due day if provided
        if (formData.emi_due_day) {
          payload.emi_due_day = parseInt(formData.emi_due_day);
        }
      } else if (isRDAccount()) {
        // For RD accounts - copy monthly contribution amount to initial_balance
        // Validation: Monthly contribution amount is required
        if (!formData.rd_contribution_amount || parseFloat(formData.rd_contribution_amount) <= 0) {
          toast.error("Monthly Contribution Amount is required and must be greater than 0");
          setLoading(false);
          return;
        }
        
        // Copy monthly contribution amount to initial_balance internally
        const contributionAmount = parseFloat(formData.rd_contribution_amount);
        payload.initial_balance = contributionAmount;

        // Add RD-specific parameters
        payload.rd_contribution_amount = contributionAmount;
        if (formData.rd_contribution_day) {
          payload.rd_contribution_day = parseInt(formData.rd_contribution_day);
        }
        if (formData.rd_term_days) {
          payload.rd_term_days = parseInt(formData.rd_term_days);
        }
        if (formData.custom_interest_rate) {
          payload.custom_interest_rate = parseFloat(
            formData.custom_interest_rate
          );
        }
      } else if (isFDAccount()) {
        // For FD accounts - Principal Amount is required
        if (!formData.initial_balance || parseFloat(formData.initial_balance) <= 0) {
          toast.error("Principal Amount is required and must be greater than 0");
          setLoading(false);
          return;
        }
        
        const balanceValue = parseFloat(formData.initial_balance);
        payload.initial_balance = balanceValue;

        // Add FD-specific parameters
        if (formData.fd_term_days) {
          payload.fd_term_days = parseInt(formData.fd_term_days);
        }
        if (formData.custom_interest_rate) {
          payload.custom_interest_rate = parseFloat(
            formData.custom_interest_rate
          );
        }
      } else if (isDDSAccount()) {
        // For DDS accounts (similar to FD)
        const balanceValue =
          formData.initial_balance === "" ||
          formData.initial_balance === null ||
          formData.initial_balance === undefined
            ? 0
            : parseFloat(formData.initial_balance);
        payload.initial_balance = isNaN(balanceValue) ? 0 : balanceValue;
        // Add DDS-specific parameters (reuse fd_term_days parameter)
        if (formData.fd_term_days) {
          payload.fd_term_days = parseInt(formData.fd_term_days);
        }
        if (formData.custom_interest_rate) {
          payload.custom_interest_rate = parseFloat(
            formData.custom_interest_rate
          );
        }
      } else {
        // For other accounts (Savings), initial_balance can be 0
        // Explicitly handle empty string as 0, but ensure we always send a number
        const balanceValue =
          formData.initial_balance === "" ||
          formData.initial_balance === null ||
          formData.initial_balance === undefined
            ? 0
            : parseFloat(formData.initial_balance);
        payload.initial_balance = isNaN(balanceValue) ? 0 : balanceValue;
      }

      const response = await api.post("/accounts", payload);

      if (response.data.success) {
        toast.success("Account created successfully");
        navigate(`/customers/${id}/accounts`);
      } else {
        toast.error(response.data.message || "Failed to create account");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error creating account");
    } finally {
      setLoading(false);
    }
  };

  const selectedAccountType = accountTypes.find(
    (at) => at.id === parseInt(formData.account_type_id)
  );
  console.log(selectedAccountType,'selectedAccountType');

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/customers/${id}/accounts`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 text-sm sm:text-base"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          <span className="hidden sm:inline">Back to Accounts</span>
          <span className="sm:hidden">Back</span>
        </button>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
          Create New Account
        </h1>
        <p className="text-gray-600 text-sm sm:text-base mt-1">
          Create account for {customer?.name}
        </p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Account Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="inline h-4 w-4 mr-1" />
              Account Type *
            </label>
            <select
              name="account_type_id"
              value={formData.account_type_id}
              onChange={handleChange}
              required
              className="input-field"
            >
              <option value="">Select account type</option>
              {accountTypes
                .filter((at) => at.is_active)
                .map((accountType) => (
                  <option key={accountType.id} value={accountType.id}>
                    {accountType.display_name} — {accountType.interest_rate}%
                  </option>
                ))}
            </select>
          </div>

          {/* Dynamic Fields Based on Account Type */}
          {formData.account_type_id && (
            <>
              {isLoanAccount() ? (
                /* Loan Account Fields */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Loan Amount (₹) *
                    </label>
                    <input
                      type="number"
                      name="initial_balance"
                      value={formData.initial_balance}
                      onChange={handleChange}
                      required
                      min="1"
                      step="0.01"
                      className="input-field"
                      placeholder="Enter loan amount (e.g., 10000)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum: ₹
                      {selectedAccountType?.loan_parameters?.min_loan_amount?.toLocaleString() ||
                        "N/A"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        Loan Tenure (Months) *
                      </label>
                      <input
                        type="number"
                        name="loan_term_months"
                        value={formData.loan_term_months}
                        onChange={handleChange}
                        required
                        min="1"
                        className="input-field"
                        placeholder="Enter tenure in months (e.g., 12)"
                      />
                      {selectedAccountType?.term_in_days && (
                        <p className="text-xs text-gray-500 mt-1">
                          Default:{" "}
                          {Math.round(selectedAccountType.term_in_days / 30.44)}{" "}
                          months
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <TrendingDown className="inline h-4 w-4 mr-1" />
                        Interest Rate (%) (Optional)
                      </label>
                      <input
                        type="number"
                        name="custom_interest_rate"
                        disabled={user?.role === "manager"}
                        value={
                          user?.role === "manager"
                            ? selectedAccountType?.interest_rate || 0
                            : formData.custom_interest_rate
                        }
                        onChange={handleChange}
                        min="0"
                        max="100"
                        step="0.01"
                        className="input-field"
                        placeholder={`Default: ${
                          selectedAccountType?.interest_rate || 0
                        }%`}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to use account type default:{" "}
                        {selectedAccountType?.interest_rate || 0}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      EMI Due Day of Month (Optional)
                    </label>
                    <input
                      type="number"
                      name="emi_due_day"
                      value={formData.emi_due_day}
                      onChange={handleChange}
                      min="1"
                      max="31"
                      className="input-field"
                      placeholder="Day of month (1-31)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to use loan start date's day. EMI will be due
                      on this day each month.
                    </p>
                  </div>

                  {/* EMI Preview */}
                  {emiPreview && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Calculator className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="font-semibold text-blue-900">
                          EMI Calculation Preview
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Monthly EMI</p>
                          <p className="text-xl font-bold text-blue-900">
                            ₹
                            {parseFloat(emiPreview.emiAmount).toLocaleString(
                              "en-IN",
                              {
                                maximumFractionDigits: 2,
                              }
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="text-xl font-bold text-blue-900">
                            ₹
                            {parseFloat(emiPreview.totalAmount).toLocaleString(
                              "en-IN",
                              {
                                maximumFractionDigits: 2,
                              }
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            Total Interest
                          </p>
                          <p className="text-lg font-semibold text-blue-700">
                            ₹
                            {parseFloat(
                              emiPreview.totalInterest
                            ).toLocaleString("en-IN", {
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Interest Rate</p>
                          <p className="text-lg font-semibold text-blue-700">
                            {emiPreview.interestRate}% p.a.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : isRDAccount() ? (
                /* RD Account Fields */
                <>
                  {/* Initial Deposit field is hidden for RD accounts */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="inline h-4 w-4 mr-1" />
                        Monthly Contribution Amount (₹) *
                      </label>
                      <input
                        type="number"
                        name="rd_contribution_amount"
                        value={formData.rd_contribution_amount}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="input-field"
                        placeholder={`Min: ${
                          selectedAccountType?.min_contribution_amount || 0
                        }`}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedAccountType?.min_contribution_amount
                          ? `Minimum: ₹${selectedAccountType.min_contribution_amount.toLocaleString()}`
                          : "Amount you will contribute every month"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        Contribution Day of Month
                      </label>
                      <input
                        type="number"
                        name="rd_contribution_day"
                        value={formData.rd_contribution_day}
                        onChange={handleChange}
                        min="1"
                        max="31"
                        className="input-field"
                        placeholder="Day of month (1-31)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to use account start date's day
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        RD Term (Days)
                      </label>
                      <input
                        type="number"
                        name="rd_term_days"
                        value={formData.rd_term_days}
                        onChange={handleChange}
                        min="1"
                        className="input-field"
                        placeholder="Enter term in days"
                      />
                      {selectedAccountType?.term_in_days && (
                        <p className="text-xs text-gray-500 mt-1">
                          Default: {selectedAccountType.term_in_days} days
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <TrendingDown className="inline h-4 w-4 mr-1" />
                        Interest Rate (%) (Optional)
                      </label>
                      <input
                        type="number"
                        name="custom_interest_rate"
                        disabled={user?.role === "manager"}
                        value={
                          user?.role === "manager"
                            ? selectedAccountType?.interest_rate || 0
                            : formData.custom_interest_rate
                        }
                        onChange={handleChange}
                        min="0"
                        max="100"
                        step="0.01"
                        className="input-field"
                        placeholder={`Default: ${
                          selectedAccountType?.interest_rate || 0
                        }%`}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to use account type default:{" "}
                        {selectedAccountType?.interest_rate || 0}%
                      </p>
                    </div>
                  </div>
                </>
              ) : isFDAccount() ? (
                /* FD Account Fields */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Principal Amount (₹) *
                    </label>
                    <input
                      type="number"
                      name="initial_balance"
                      value={formData.initial_balance || ""}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="input-field"
                      placeholder="Enter principal amount"
                    />
                      <p className="text-xs text-gray-500 mt-1">
                      One-time lump sum amount you will deposit
                      {selectedAccountType?.min_deposit && selectedAccountType.min_deposit > 0 && (
                        <span className="block mt-1">
                          Minimum: ₹{selectedAccountType.min_deposit.toLocaleString()}
                        </span>
                    )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        FD Term (Days)
                      </label>
                      <input
                        type="number"
                        name="fd_term_days"
                        value={formData.fd_term_days}
                        onChange={handleChange}
                        min="1"
                        className="input-field"
                        placeholder="Enter term in days"
                      />
                      {selectedAccountType?.term_in_days && (
                        <p className="text-xs text-gray-500 mt-1">
                          Default: {selectedAccountType.term_in_days} days
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <TrendingDown className="inline h-4 w-4 mr-1" />
                        Interest Rate (%) (Optional)
                      </label>
                      <input
                        type="number"
                        name="custom_interest_rate"
                        disabled={user?.role === "manager"}
                        value={
                          user?.role === "manager"
                            ? selectedAccountType?.interest_rate || 0
                            : formData.custom_interest_rate
                        }
                        onChange={handleChange}
                        min="0"
                        max="100"
                        step="0.01"
                        className="input-field"
                        placeholder={`Default: ${
                          selectedAccountType?.interest_rate || 0
                        }%`}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to use account type default:{" "}
                        {selectedAccountType?.interest_rate || 0}%
                      </p>
                    </div>
                  </div>
                </>
              ) : isDDSAccount() ? (
                /* DDS Account Fields */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Daily Contribution (₹) *
                    </label>
                    <input
                      type="number"
                      name="initial_balance"
                      value={formData.initial_balance}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="input-field"
                      placeholder="Enter daily deposit amount"
                    />
                    { selectedAccountType?.min_deposit != "" ? (
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum: ₹
                        {selectedAccountType.min_deposit.toLocaleString()}
                      </p>
                    ) : selectedAccountType?.name=='DDS' ? (
                      <p className="text-xs text-gray-500 mt-1">
                        Amount you will contribute every day
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum: ₹10
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        DDS Term (Days)
                      </label>
                      <input
                        type="number"
                        name="fd_term_days"
                        value={formData.fd_term_days}
                        onChange={handleChange}
                        min="1"
                        className="input-field"
                        placeholder="Enter term in days"
                      />
                      {selectedAccountType?.term_in_days && (
                        <p className="text-xs text-gray-500 mt-1">
                          Default: {selectedAccountType.term_in_days} days
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <TrendingDown className="inline h-4 w-4 mr-1" />
                        Interest Rate (%) (Optional)
                      </label>
                      <input
                        type="number"
                        name="custom_interest_rate"
                        disabled={user?.role === "manager"}
                        value={
                          user?.role === "manager"
                            ? selectedAccountType?.interest_rate || 0
                            : formData.custom_interest_rate
                        }
                        onChange={handleChange}
                        min="0"
                        max="100"
                        step="0.01"
                        className="input-field"
                        placeholder={`Default: ${
                          selectedAccountType?.interest_rate || 0
                        }%`}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to use account type default:{" "}
                        {selectedAccountType?.interest_rate || 0}%
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                /* Savings Account Fields */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Initial Deposit (₹)
                    </label>
                    <input
                      type="number"
                      name="initial_balance"
                      value={formData.initial_balance}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="input-field"
                      placeholder="Enter initial deposit (can be 0)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave as 0 if customer will deposit later
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(`/customers/${id}/accounts`)}
              className="btn-secondary w-full sm:w-auto"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center justify-center w-full sm:w-auto"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              <span className="hidden sm:inline">Create Account</span>
              <span className="sm:hidden">Create</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateAccountForm;
