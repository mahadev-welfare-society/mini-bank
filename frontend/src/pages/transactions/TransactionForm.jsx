import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Save,
  DollarSign,
  CreditCard,
  PiggyBank,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Search,
  User,
  ChevronRight,
} from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";

function TransactionForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Step-by-step state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedAccountType, setSelectedAccountType] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Data states
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [availableAccountTypes, setAvailableAccountTypes] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);

   const { canCreate } = usePermissions();
   const canCreateTransaction =
    user?.role === "admin" ||
    (user?.role === "manager" && canCreate("transactions"));


  const [formData, setFormData] = useState({
    account_id: "",
    transaction_type: "",
    amount: "",
    description: "",
    payment_type: "cash",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (customerSearchQuery) {
      const query = customerSearchQuery.toLowerCase();
      const filtered = customers.filter(
        (customer) =>
          customer.name?.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query) ||
          customer.phone?.includes(query)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers.slice(0, 10)); // Show first 10 when no search
    }
  }, [customerSearchQuery, customers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showCustomerDropdown &&
        !event.target.closest(".customer-search-container")
      ) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCustomerDropdown]);

  const fetchCustomers = async () => {
    try {
      const response = await api.post("/customers/list", {
        page: 1,
        limit: 1000,
        sort_by: "created_at",
        sort_order: "desc",
      });
      if (response.data.success) {
        let activeCustomer = response.data.data;
        activeCustomer = activeCustomer.filter((item) => item.is_active);
        setCustomers(activeCustomer || []);
        setFilteredCustomers(activeCustomer?.slice(0, 10) || []);
      } else {
        toast.error("Failed to fetch customers");
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Error fetching customers");
    }
  };

  const fetchCustomerAccounts = async (customerId) => {
    try {
      const response = await api.post(`/accounts/customer/${customerId}`, {});
      if (response.data.success) {
        const accounts = response.data.data || [];
        setCustomerAccounts(accounts);
        // Extract unique account types from customer's accounts
        const accountTypes = [
          ...new Set(
            accounts
              .filter((acc) => acc.status === "active")
              .map((acc) => acc.account_type_name)
          ),
        ];
        setAvailableAccountTypes(accountTypes.filter((type) => type !== "FD"));
      } else {
        toast.error("Failed to fetch customer accounts");
      }
    } catch (error) {
      console.error("Error fetching customer accounts:", error);
      toast.error("Error fetching customer accounts");
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchQuery(customer.name);
    setShowCustomerDropdown(false);
    setSelectedAccountType(null);
    setSelectedAccount(null);
    setFormData({
      account_id: "",
      transaction_type: "",
      amount: "",
      description: "",
      payment_type: "cash",
    });
    fetchCustomerAccounts(customer.id);
  };

  const handleAccountTypeSelect = (accountType) => {
    setSelectedAccountType(accountType);
    setSelectedAccount(null);
    setFormData({
      ...formData,
      account_id: "",
      transaction_type: "",
      payment_type: "cash",
    });

    // Filter accounts by selected account type
    const filtered = customerAccounts.filter(
      (acc) => acc.account_type_name === accountType && acc.status === "active"
    );
    setFilteredAccounts(filtered);
  };

  const handleAccountSelect = (e) => {
    const accountId = e.target.value;
    const account = filteredAccounts.find(
      (acc) => acc.id === parseInt(accountId)
    );
    setSelectedAccount(account);
    setFormData({
      ...formData,
      account_id: accountId,
      transaction_type: "", // Reset transaction type when account changes
      payment_type: "cash",
    });
  };

  // Get available transaction types based on account type
  const getAvailableTransactionTypes = () => {
    if (!selectedAccount) return [];

    const accountType = selectedAccount.account_type_name?.toLowerCase();

    const allTypes = [
      { value: "deposit", label: "Deposit", icon: PiggyBank },
      { value: "withdrawal", label: "Withdrawal", icon: DollarSign },
      { value: "loan_repayment", label: "Loan Repayment", icon: Clock },
      { value: "interest", label: "Interest", icon: Building2 },
      { value: "penalty", label: "Penalty", icon: AlertCircle },
      { value: "loan_disbursal", label: "Loan Disbursal", icon: CreditCard },
    ];

    if (accountType === "fd") {
      // FD: No deposit (already paid), No withdrawal (break from customer manager account)
      return allTypes.filter(
        (type) => type.value !== "deposit" && type.value !== "withdrawal"
      );
    } else if (accountType === "rd") {
      // RD: Deposit only
      return allTypes.filter((type) => type.value === "deposit");
    } else if (accountType === "dds") {
      // DDS: Deposit only
      return allTypes.filter((type) => type.value === "deposit");
    } else if (accountType === "loan") {
      // Loan: repay EMI, interest, penalty (NO loan_disbursal)
      return allTypes.filter(
        (type) =>
          type.value === "loan_repayment" ||
          type.value === "interest" ||
          type.value === "penalty"
      );
    } else {
      // Savings: deposit, withdrawal, interest, penalty
      return allTypes.filter(
        (type) => type.value === "deposit" || type.value === "withdrawal"
      );
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!selectedCustomer) {
      newErrors.customer = "Please select a customer";
    }

    if (!selectedAccountType) {
      newErrors.accountType = "Please select an account type";
    }

    if (!formData.account_id) {
      newErrors.account_id = "Please select an account";
    }

    if (!formData.transaction_type) {
      newErrors.transaction_type = "Please select a transaction type";
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Please enter a description";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      const response = await api.post("/transactions", payload);

      if (response.data.success) {
        toast.success("Transaction created successfully");
        navigate("/transactions");
      } else {
        toast.error(response.data.message || "Failed to create transaction");
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Error creating transaction";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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

  const availableTransactionTypes = getAvailableTransactionTypes();

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
              Create Transaction
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Process deposits, withdrawals, and other banking transactions (only approved customer visible)
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Customer Selection with Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Step 1: Select Customer <span className="text-red-500">*</span>
              </label>
              <div className="relative customer-search-container">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Search by name, email, or phone..."
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.customer ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearchQuery("");
                        setSelectedAccountType(null);
                        setSelectedAccount(null);
                        setCustomerAccounts([]);
                        setAvailableAccountTypes([]);
                        setFilteredAccounts([]);
                        setFormData({
                          account_id: "",
                          transaction_type: "",
                          amount: "",
                          description: "",
                          payment_type: "cash",
                        });
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {showCustomerDropdown && !selectedCustomer && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleCustomerSelect(customer)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                        >
                          <User className="h-5 w-5 text-gray-400" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {customer.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {customer.email}{" "}
                              {customer.phone && `• ${customer.phone}`}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No customers found
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3">
                  <User className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-900">
                      {selectedCustomer.name}
                    </div>
                    <div className="text-sm text-blue-700">
                      {selectedCustomer.email}
                    </div>
                  </div>
                </div>
              )}
              {errors.customer && (
                <p className="mt-1 text-sm text-red-600">{errors.customer}</p>
              )}
            </div>

            {/* Step 2: Account Type Selection (only show if customer selected) */}
            {selectedCustomer && availableAccountTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Step 2: Select Account Type{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {availableAccountTypes.map((accountType) => {
                    const isSelected = selectedAccountType === accountType;
                    const accountTypeLower = accountType.toLowerCase();
                    let icon = DollarSign;
                    let borderClass = "border-blue-500";
                    let bgClass = "bg-blue-50";
                    let textClass = "text-blue-600";
                    let iconBgClass = "bg-blue-100";

                    if (accountTypeLower === "savings") {
                      icon = PiggyBank;
                      borderClass = "border-green-500";
                      bgClass = "bg-green-50";
                      textClass = "text-green-600";
                      iconBgClass = "bg-green-100";
                    } else if (accountTypeLower === "rd") {
                      icon = Clock;
                      borderClass = "border-blue-500";
                      bgClass = "bg-blue-50";
                      textClass = "text-blue-600";
                      iconBgClass = "bg-blue-100";
                    } else if (accountTypeLower === "fd") {
                      icon = Building2;
                      borderClass = "border-purple-500";
                      bgClass = "bg-purple-50";
                      textClass = "text-purple-600";
                      iconBgClass = "bg-purple-100";
                    } else if (accountTypeLower === "dds") {
                      icon = Clock;
                      borderClass = "border-indigo-500";
                      bgClass = "bg-indigo-50";
                      textClass = "text-indigo-600";
                      iconBgClass = "bg-indigo-100";
                    } else if (accountTypeLower === "loan") {
                      icon = CreditCard;
                      borderClass = "border-red-500";
                      bgClass = "bg-red-50";
                      textClass = "text-red-600";
                      iconBgClass = "bg-red-100";
                    }

                    const Icon = icon;

                    return (
                      <button
                        key={accountType}
                        type="button"
                        onClick={() => handleAccountTypeSelect(accountType)}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          isSelected
                            ? `${borderClass} ${bgClass}`
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-full ${textClass} ${iconBgClass} w-fit mx-auto mb-2`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {accountType}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.accountType && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.accountType}
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Account Selection (only show if account type selected) */}
            {selectedAccountType && filteredAccounts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Step 3: Select Account <span className="text-red-500">*</span>
                </label>
                <select
                  name="account_id"
                  value={formData.account_id}
                  onChange={(e) => handleAccountSelect(e)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.account_id ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Choose an account...</option>
                  {filteredAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account?.account_type?.display_name ||
                        account.account_type_name}{" "}
                      (Account #{account.id}) - Balance: ₹
                      {account.balance?.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || 0}
                    </option>
                  ))}
                </select>
                {errors.account_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.account_id}
                  </p>
                )}
              </div>
            )}

            {/* Step 4: Transaction Type (only show if account selected) */}
            {selectedAccount && availableTransactionTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Step 4: Select Transaction Type{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {availableTransactionTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.transaction_type === type.value;
                    const colorClass = isSelected
                      ? getTransactionColor(type.value)
                      : "text-gray-600 bg-gray-100";

                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            transaction_type: type.value,
                          }))
                        }
                        className={`p-2 rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-full ${colorClass} w-fit mx-auto mb-2`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {type.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.transaction_type && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.transaction_type}
                  </p>
                )}
              </div>
            )}

            {/* Account Details Summary */}
            {selectedAccount && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Account Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Customer:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {selectedCustomer?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Account Type:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {selectedAccount.account_type_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Account ID:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      #{selectedAccount.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Balance:</span>
                    <span className="ml-2 font-medium text-blue-600">
                      ₹
                      {selectedAccount.balance?.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        selectedAccount.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {selectedAccount.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedCustomer &&
              selectedAccount &&
              formData?.transaction_type && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-8">
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        placeholder="Enter amount"
                        min="0"
                        step="0.01"
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.amount ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                    </div>
                    {errors.amount && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.amount}
                      </p>
                    )}
                  </div>

                  {/* Payment Mode */}
                  {formData?.transaction_type === "deposit" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Mode <span className="text-red-500">*</span>
                      </label>
                      <div className="flex space-x-4 h-10">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="payment_type"
                            value="cash"
                            checked={formData.payment_type === "cash"}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-gray-700">Cash</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="payment_type"
                            value="qr"
                            checked={formData.payment_type === "qr"}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-gray-700">QR Payment</span>
                        </label>
                      </div>
                      {errors.payment_type && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.payment_type}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

            {/* Description */}
            {selectedCustomer &&
              selectedAccount &&
              formData?.transaction_type && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter transaction description..."
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.description ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.description}
                    </p>
                  )}
                </div>
              )}

            {/* Transaction Preview */}
            {formData.amount &&
              selectedAccount &&
              formData.transaction_type && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">
                    Transaction Preview
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Current Balance:</span>
                      <span className="font-medium">
                        ₹
                        {selectedAccount.balance?.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Transaction Amount:</span>
                      <span
                        className={`font-medium ${
                          formData.transaction_type === "deposit" ||
                          formData.transaction_type === "interest" ||
                          formData.transaction_type === "loan_disbursal"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formData.transaction_type === "deposit" ||
                        formData.transaction_type === "interest" ||
                        formData.transaction_type === "loan_disbursal"
                          ? "+"
                          : "-"}
                        ₹
                        {parseFloat(formData.amount || 0).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-2">
                      <span className="text-blue-900 font-semibold">
                        New Balance:
                      </span>
                      <span className="font-bold text-blue-900">
                        ₹
                        {(
                          (selectedAccount.balance || 0) +
                          (formData.transaction_type === "deposit" ||
                          formData.transaction_type === "interest" ||
                          formData.transaction_type === "loan_disbursal"
                            ? parseFloat(formData.amount || 0)
                            : -parseFloat(formData.amount || 0))
                        ).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/transactions")}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Transaction
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TransactionForm;
