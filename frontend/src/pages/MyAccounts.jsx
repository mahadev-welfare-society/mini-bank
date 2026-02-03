"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  Clock,
  CreditCard,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  PiggyBank,
  Building2,
  Calculator,
  X,
  Eye,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { useAuth } from "../store/AuthContext";

function MyAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalData, setModalData] = useState({});
  const [accountTypes, setAccountTypes] = useState([]);
  const [loanAccountType, setLoanAccountType] = useState(null);
  const [emiSchedule, setEmiSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSummary, setScheduleSummary] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMyAccounts();
    fetchAccountTypes();
  }, []);

  // Fetch EMI schedule when schedule modal opens
  useEffect(() => {
    if (modalType === "schedule" && selectedAccount?.id) {
      fetchEmiSchedule(selectedAccount.id);
    }
  }, [modalType, selectedAccount]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showModal) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Lock body scroll
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    // Cleanup function
    return () => {
      if (showModal) {
        const scrollY = document.body.style.top;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || "0") * -1);
        }
      }
    };
  }, [showModal]);

  const fetchEmiSchedule = async (accountId) => {
    try {
      setScheduleLoading(true);
      const response = await api.post(`/accounts/${accountId}/emi-schedule`, {});
      if (response.data.success) {
        // Response structure: { success: true, data: { schedule: [...], summary: {...} } }
        setEmiSchedule(response.data.data?.schedule || []);
        setScheduleSummary(response.data.data?.summary || null);
      } else {
        toast.error(response.data.message || "Failed to fetch EMI schedule");
        setEmiSchedule([]);
        setScheduleSummary(null);
      }
    } catch (error) {
      console.error("Error fetching EMI schedule:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch EMI schedule"
      );
      setEmiSchedule([]);
      setScheduleSummary(null);
    } finally {
      setScheduleLoading(false);
    }
  };
  const fetchAccountTypes = async () => {
    try {
      const response = await api.post("/account-types/list");
      if (response.data.success) {
        const types = response.data.data || [];
        setAccountTypes(types);
        // Find loan account type
        const loanType = types.find(
          (type) => type.name?.toLowerCase() === "loan"
        );
        setLoanAccountType(loanType);
      }
    } catch (error) {
      console.error("Error fetching account types:", error);
    }
  };

  const fetchMyAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.post("/customers/me");
      if (response.data.success) {
        const customerData = response.data.data;
        // Get actual accounts from the customer data (with IDs, balances, etc.)
        const accounts = customerData.accounts || [];
        setAccounts(accounts);
      } else {
        toast.error(response.data.message || "Failed to fetch your accounts");
        setAccounts([]);
      }
    } catch (error) {
      console.error("Error fetching my accounts:", error);
      toast.error("Failed to fetch your accounts");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const getAccountTypeIcon = (accountType) => {
    const typeName =
      typeof accountType === "string"
        ? accountType
        : accountType?.account_type || accountType;
    switch (typeName?.toLowerCase()) {
      case "savings":
        return PiggyBank;
      case "rd":
        return Clock;
      case "fd":
        return Building2;
      case "dds":
        return Calendar;
      case "loan":
        return CreditCard;
      default:
        return Wallet;
    }
  };

  const getAccountTypeColor = (accountType) => {
    const typeName =
      typeof accountType === "string"
        ? accountType
        : accountType?.account_type || accountType;
    switch (typeName?.toLowerCase()) {
      case "savings":
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          icon: "text-emerald-600",
          accent: "from-emerald-500 to-teal-600",
        };
      case "rd":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "text-blue-600",
          accent: "from-blue-500 to-cyan-600",
        };
      case "fd":
        return {
          bg: "bg-purple-50",
          border: "border-purple-200",
          icon: "text-purple-600",
          accent: "from-purple-500 to-indigo-600",
        };
      case "dds":
        return {
          bg: "bg-indigo-50",
          border: "border-indigo-200",
          icon: "text-indigo-600",
          accent: "from-indigo-500 to-purple-600",
        };
      case "loan":
        return {
          bg: "bg-orange-50",
          border: "border-orange-200",
          icon: "text-orange-600",
          accent: "from-orange-500 to-red-600",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          icon: "text-gray-600",
          accent: "from-gray-500 to-gray-600",
        };
    }
  };

  const handleAction = (account, actionType) => {
    setSelectedAccount(account);
    setModalType(actionType);

    // Initialize modal data with default values based on action type
    const initialModalData = {};

    // For loan repayment, pre-fill with EMI amount if available
    if (actionType === "repay" && account?.snapshot_emi_amount) {
      initialModalData.amount = account.snapshot_emi_amount.toString();
    }

    setModalData(initialModalData);
    setShowModal(true);
  };

  // Razorpay payment handler
  const handleRazorpayPayment = async (
    accountId,
    amount,
    transactionType,
    description
  ) => {
    try {
      // Create payment order
      const orderResponse = await api.post("/payments/create-order", {
        account_id: accountId,
        amount: amount,
        transaction_type: transactionType,
        description: description,
      });

      if (!orderResponse.data.success) {
        toast.error(
          orderResponse.data.message || "Failed to create payment order"
        );
        setIsSubmitting(false);
        return;
      }

      const orderData = orderResponse.data.data;

      // Check if Razorpay is available
      if (!window.Razorpay) {
        toast.error("Payment gateway not loaded. Please refresh the page.");
        setIsSubmitting(false);
        return;
      }

      // Helper function to capitalize first letter of each word
      const capitalizeWords = (str) => {
        return str
          .replace(/_/g, " ")
          .split(" ")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" ");
      };

      // Razorpay options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount_in_paise,
        currency: orderData.currency,
        name: "Mahadev Welfare Society",
        description: orderData.description || capitalizeWords(transactionType),
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            // Verify payment on backend
            const verifyResponse = await api.post("/payments/verify", {
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              account_id: accountId,
              transaction_type: transactionType,
              amount: amount,
              description: description,
            });

            if (verifyResponse.data.success) {
              toast.success("Payment successful! Transaction completed.");
              setShowModal(false);
              setModalData({});
              setIsSubmitting(false);
              fetchMyAccounts();
            } else {
              toast.error(
                verifyResponse.data.message || "Payment verification failed"
              );
              setIsSubmitting(false);
            }
          } catch (error) {
            console.error("Error verifying payment:", error);
            toast.error(
              error.response?.data?.message || "Failed to verify payment"
            );
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: async function () {
            // Handle payment cancellation
            try {
              await api.post("/payments/failure", {
                order_id: orderData.order_id,
                account_id: accountId,
                transaction_type: transactionType,
                amount: amount,
                error_description: "Payment cancelled by user",
              });
            } catch (error) {
              console.error("Error recording payment failure:", error);
            }
            toast.error("Payment cancelled");
            setIsSubmitting(false);
          },
        },
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", async function (response) {
        try {
          await api.post("/payments/failure", {
            order_id: response.error.metadata.order_id,
            payment_id: response.error.metadata.payment_id,
            account_id: accountId,
            transaction_type: transactionType,
            amount: amount,
            error_description: response.error.description || "Payment failed",
          });
        } catch (error) {
          console.error("Error recording payment failure:", error);
        }
        toast.error(
          `Payment failed: ${response.error.description || "Unknown error"}`
        );
        setIsSubmitting(false);
      });

      razorpay.open();
    } catch (error) {
      console.error("Error initiating payment:", error);
      toast.error(
        error.response?.data?.message || "Failed to initiate payment"
      );
      setIsSubmitting(false);
    }
  };

  const submitAction = async () => {
    setIsSubmitting(true);
    try {
      // For loan application, selectedAccount is not required (it may be a loan account with 0 balance)
      if (modalType !== "apply_loan" && !selectedAccount) {
        toast.error("Please select an account");
        setIsSubmitting(false);
        return;
      }

      // Get the account ID from the selected account (if exists)
      const accountId = selectedAccount?.id;

      // For loan repayment, amount must be provided and positive
      let amount;
      if (modalType === "repay") {
        // For loan repayment, use EMI amount as fallback if amount is not provided
        const emiAmount = selectedAccount?.snapshot_emi_amount || 0;
        const enteredAmount = modalData.amount
          ? parseFloat(modalData.amount)
          : emiAmount;

        if (!enteredAmount || enteredAmount <= 0) {
          toast.error(
            "Please enter a valid payment amount (must be greater than 0)"
          );
          return;
        }
        amount = enteredAmount;
      } else {
        amount = modalData.amount
          ? parseFloat(modalData.amount)
          : selectedAccount?.balance || 0;
      }

      // Validate amount is positive for all transaction types
      if (amount <= 0 && modalType !== "apply_loan") {
        toast.error("Amount must be greater than 0");
        return;
      }

      const description = modalData.description || modalData.reference || "";

      let response;

      // Use Razorpay for deposits and loan repayments
      if (modalType === "deposit") {
        await handleRazorpayPayment(accountId, amount, "deposit", description);
        // Don't set isSubmitting to false here - let Razorpay handlers manage it
        return; // Don't proceed with regular flow
      } else if (modalType === "repay") {
        await handleRazorpayPayment(
          accountId,
          amount,
          "loan_repayment",
          description || "Loan repayment"
        );
        // Don't set isSubmitting to false here - let Razorpay handlers manage it
        return; // Don't proceed with regular flow
      } else if (modalType === "withdraw") {
        response = await api.post("/transactions/simulate-withdrawal", {
          account_id: accountId,
          amount: amount,
          description: description,
        });
      } else if (modalType === "contribute") {
        response = await api.post("/transactions/simulate-deposit", {
          account_id: accountId,
          amount: amount,
          description: modalData.note || "RD Daily Contribution",
        });
      } else if (modalType === "break_rd") {
        // Break RD: withdraw all balance and close account
        const breakBalance = selectedAccount.balance || 0;
        response = await api.post("/transactions/simulate-withdrawal", {
          account_id: accountId,
          amount: breakBalance, // Withdraw full balance
          description: `RD Account Break - ${
            modalData.reason || "Early closure"
          }`,
        });
        // After successful withdrawal, close the account (this would need a backend endpoint)
        // For now, we'll just show success
      } else if (modalType === "break_fd") {
        // Break FD: withdraw all balance with penalty
        const breakBalance = selectedAccount.balance || 0;
        response = await api.post("/transactions/simulate-withdrawal", {
          account_id: accountId,
          amount: breakBalance, // Withdraw full balance
          description: `FD Account Break - ${
            modalData.reason || "Early closure"
          }`,
        });
      } else if (modalType === "apply_loan") {
        // Apply for loan: create loan account
        if (!loanAccountType) {
          toast.error(
            "Loan account type not available. Please contact support."
          );
          return;
        }
        const loanAmount = parseFloat(modalData.amount) || 0;
        if (loanAmount <= 0) {
          toast.error("Please enter a valid loan amount");
          return;
        }
        const loanTermMonths =
          modalData.termType === "years"
            ? parseInt(modalData.term) * 12
            : parseInt(modalData.term) || 12;

        // Use customer_id from selectedAccount if it exists (loan account with 0 balance)
        // Otherwise, backend will auto-set for staff
        const customerId = selectedAccount?.customer_id || null;

        response = await api.post("/accounts", {
          account_type_id: loanAccountType.id,
          initial_balance: loanAmount, // For loan, this is the principal amount
          customer_id: customerId,
          loan_term_months: loanTermMonths, // Custom loan term
        });
      } else {
        // For other actions, just show success message
        toast.success(`${modalType} action completed successfully`);
        setShowModal(false);
        setModalData({});
        setIsSubmitting(false);
        return;
      }

      if (response.data.success) {
        toast.success(
          response.data.message ||
            (modalType === "apply_loan"
              ? "Loan application submitted successfully!"
              : `${modalType} completed successfully`)
        );
        setShowModal(false);
        setModalData({});
        // Refresh accounts to show updated balance
        fetchMyAccounts();
      } else {
        toast.error(response.data.message || `${modalType} failed`);
      }
    } catch (error) {
      console.error("Error in submitAction:", error);
      toast.error(error.response?.data?.message || `${modalType} failed`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalTitle = () => {
    // Handle apply_loan case
    if (modalType === "apply_loan") {
      return "Apply for Loan";
    }

    // Handle both old string format and new account object format
    if (!selectedAccount) {
      return "Account Action";
    }

    let accountTypeName = "";

    if (typeof selectedAccount === "string") {
      accountTypeName = selectedAccount;
    } else if (selectedAccount && typeof selectedAccount === "object") {
      accountTypeName =
        selectedAccount.account_type || selectedAccount.name || "";
    }
    switch (modalType) {
      case "deposit":
        return `Deposit to ${accountTypeName?.toUpperCase()} Account`;
      case "withdraw":
        return `Withdraw from ${accountTypeName?.toUpperCase()} Account`;
      case "contribute":
        return `Contribute to ${accountTypeName?.toUpperCase()} Account`;
      case "repay":
        return `Make Payment to ${accountTypeName?.toUpperCase()} Account`;
      case "view":
        return `${accountTypeName?.toUpperCase()} Account Details`;
      case "calculate":
        return `Calculate ${accountTypeName?.toUpperCase()} Returns`;
      case "schedule":
        return `${accountTypeName?.toUpperCase()} Payment Schedule`;
      case "maturity":
        return `${accountTypeName?.toUpperCase()} Maturity Details`;
      case "balance":
        return `${accountTypeName?.toUpperCase()} Balance Details`;
      default:
        return "Account Action";
    }
  };

  const renderModalContent = () => {
    // Handle both old string format and new account object format
    if (!selectedAccount) {
      return <div>No account selected</div>;
    }

    let accountTypeName = "";

    if (typeof selectedAccount === "string") {
      accountTypeName = selectedAccount;
    } else if (selectedAccount && typeof selectedAccount === "object") {
      accountTypeName =
        selectedAccount.account_type || selectedAccount.name || "";
    }

    switch (modalType) {
      case "deposit":
        // Calculate deposit details
        const depositCurrentBalance = selectedAccount?.balance || 0;
        const depositAmount = parseFloat(modalData.amount) || 0;
        const newBalanceAfterDeposit = depositCurrentBalance + depositAmount;
        const depositEffectiveInterestRate =
          selectedAccount?.effective_interest_rate ||
          selectedAccount?.snapshot_interest_rate ||
          0;
        const accountTypeName = selectedAccount?.account_type || "";
        const isDepositFD = accountTypeName?.toLowerCase() === "fd";
        const isDepositRD = accountTypeName?.toLowerCase() === "rd";
        // For RD, use min_contribution_amount; for FD, use min_deposit
        const minDeposit = isDepositRD
          ? selectedAccount?.snapshot_min_contribution_amount || 0
          : selectedAccount?.snapshot_min_deposit || 0;
        const maxDeposit = selectedAccount?.snapshot_max_deposit || null;

        // FD-specific: Calculate expected maturity amount
        let fdMaturityAmount = 0;
        let fdInterestEarned = 0;
        if (
          isDepositFD &&
          depositAmount > 0 &&
          selectedAccount?.maturity_date &&
          selectedAccount?.start_date
        ) {
          const maturityDate = new Date(selectedAccount.maturity_date);
          const startDate = new Date(selectedAccount.start_date);
          const totalDays = Math.ceil(
            (maturityDate - startDate) / (1000 * 60 * 60 * 24)
          );
          const years = totalDays / 365.25;
          const method =
            selectedAccount?.snapshot_interest_calculation_method || "compound";

          if (method === "simple") {
            fdInterestEarned =
              depositAmount * (depositEffectiveInterestRate / 100) * years;
          } else {
            fdInterestEarned =
              depositAmount *
              ((1 + depositEffectiveInterestRate / 100) ** years - 1);
          }
          fdMaturityAmount = depositAmount + fdInterestEarned;
        }

        // Calculate estimated monthly interest based on new balance after deposit (for Savings)
        const estimatedInterestAfterDeposit =
          !isDepositFD &&
          newBalanceAfterDeposit > 0 &&
          depositEffectiveInterestRate > 0
            ? (
                (newBalanceAfterDeposit *
                  (depositEffectiveInterestRate / 100)) /
                12
              ).toFixed(2)
            : 0;

        // FD validation: Only allow deposit if balance is 0
        const fdDepositAllowed = isDepositFD
          ? depositCurrentBalance === 0
          : true;
        const fdDepositError =
          isDepositFD && depositCurrentBalance > 0
            ? "FD account already has a deposit. Only one deposit is allowed."
            : "";

        return (
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-xl p-4 mb-4 border border-emerald-200">
              <div className="flex items-center space-x-2">
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-900">
                  {isDepositFD ? "Make Initial FD Deposit" : "Deposit Money"}
                </span>
              </div>
              <p className="text-xs text-emerald-700 mt-1">
                {isDepositFD
                  ? "One-time deposit to start your Fixed Deposit"
                  : "Add funds to your savings account"}
              </p>
            </div>

            {/* FD Deposit Warning */}
            {isDepositFD && !fdDepositAllowed && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <p className="text-sm text-red-800">{fdDepositError}</p>
              </div>
            )}

            {/* Current Balance Display */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Current Balance:
                </span>
                <span className="text-lg font-bold text-blue-600">
                  ₹
                  {depositCurrentBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              {(isDepositFD || isDepositRD) && depositCurrentBalance === 0 && (
                <div className="mt-2 text-xs text-blue-700">
                  {isDepositRD
                    ? `Minimum contribution: ₹${minDeposit.toLocaleString(
                        "en-IN"
                      )}`
                    : `Minimum deposit: ₹${minDeposit.toLocaleString("en-IN")}`}
                  {maxDeposit &&
                    ` (Max: ₹${maxDeposit.toLocaleString("en-IN")})`}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Principal Amount (₹){" "}
                {isDepositFD && <span className="text-red-500">*</span>}
              </label>
              <input
                type="number"
                step="0.01"
                min={minDeposit}
                max={maxDeposit || undefined}
                value={modalData.amount || ""}
                onChange={(e) =>
                  setModalData({ ...modalData, amount: e.target.value })
                }
                placeholder={
                  isDepositFD
                    ? "Enter principal amount (one-time)"
                    : "Enter deposit amount"
                }
                disabled={!fdDepositAllowed}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition ${
                  !fdDepositAllowed ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              />
              {isDepositFD &&
                depositAmount > 0 &&
                depositAmount < minDeposit && (
                  <p className="mt-1 text-sm text-red-600">
                    Minimum deposit amount is ₹
                    {minDeposit.toLocaleString("en-IN")}
                  </p>
                )}
              {isDepositFD && maxDeposit && depositAmount > maxDeposit && (
                <p className="mt-1 text-sm text-red-600">
                  Maximum deposit amount is ₹
                  {maxDeposit.toLocaleString("en-IN")}
                </p>
              )}
            </div>

            {/* FD Expected Maturity Preview */}
            {isDepositFD &&
              depositAmount >= minDeposit &&
              fdMaturityAmount > 0 && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="text-sm font-semibold text-purple-900 mb-3">
                    Expected Maturity Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Principal:</span>
                      <span className="font-semibold">
                        ₹
                        {depositAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interest Rate:</span>
                      <span className="font-semibold">
                        {depositEffectiveInterestRate.toFixed(2)}% p.a.
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interest Earned:</span>
                      <span className="font-semibold text-green-600">
                        ₹
                        {fdInterestEarned.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-purple-300">
                      <span className="text-gray-700 font-semibold">
                        Maturity Amount:
                      </span>
                      <span className="font-bold text-purple-600 text-base">
                        ₹
                        {fdMaturityAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* Savings Interest Preview */}
            {!isDepositFD && estimatedInterestAfterDeposit > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-blue-700">
                    Estimated Monthly Interest:
                  </span>
                  <span className="text-sm font-semibold text-blue-600">
                    ₹{estimatedInterestAfterDeposit}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reference/Note (Optional)
              </label>
              <input
                type="text"
                value={modalData.reference || ""}
                onChange={(e) =>
                  setModalData({ ...modalData, reference: e.target.value })
                }
                placeholder="Add a note for this deposit"
                disabled={!fdDepositAllowed}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition ${
                  !fdDepositAllowed ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              />
            </div>

            {/* Test Mode Info */}
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-800">
                  <p className="font-semibold mb-1">
                    Test Mode - Use these test cards (No OTP required):
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 ml-1">
                    <li>
                      <strong>Success:</strong> 4111 1111 1111 1111
                    </li>
                    <li>
                      <strong>Failure:</strong> 4000 0000 0000 0002
                    </li>
                  </ul>
                  <p className="mt-1 text-yellow-700">
                    CVV: Any 3 digits | Expiry: Any future date
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={
                  isSubmitting ||
                  !modalData.amount ||
                  depositAmount <= 0 ||
                  !fdDepositAllowed ||
                  (isDepositFD && depositAmount < minDeposit)
                }
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                  isSubmitting ||
                  !modalData.amount ||
                  depositAmount <= 0 ||
                  !fdDepositAllowed ||
                  (isDepositFD && depositAmount < minDeposit)
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : null}
                <span>{isDepositFD ? "Start FD" : "Deposit Money"}</span>
              </button>
            </div>
          </div>
        );

      case "withdraw":
        // Calculate remaining balance and other details
        const currentBalance = selectedAccount?.balance || 0;
        const withdrawalAmount = parseFloat(modalData.amount) || 0;
        const remainingBalance = currentBalance - withdrawalAmount;
        const minimumBalance =
          selectedAccount?.effective_minimum_balance ||
          selectedAccount?.snapshot_minimum_balance ||
          selectedAccount?.minimum_balance ||
          0;
        const effectiveInterestRate =
          selectedAccount?.effective_interest_rate ||
          selectedAccount?.snapshot_interest_rate ||
          0;
        const isBelowMinimum = remainingBalance < minimumBalance;

        // Calculate estimated monthly interest based on remaining balance after withdrawal
        const estimatedInterest =
          remainingBalance > 0 && effectiveInterestRate > 0
            ? ((remainingBalance * (effectiveInterestRate / 100)) / 12).toFixed(
                2
              ) // Monthly interest estimate
            : 0;

        return (
          <div className="space-y-4">
            <div className="bg-orange-50 rounded-xl p-4 mb-4 border border-orange-200">
              <div className="flex items-center space-x-2">
                <ArrowUpRight className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-semibold text-orange-900">
                  Withdraw Money
                </span>
              </div>
              <p className="text-xs text-orange-700 mt-1">
                Take money out of your savings account
              </p>
            </div>

            {/* Current Balance Display */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Current Balance:
                </span>
                <span className="text-lg font-bold text-blue-600">
                  ₹
                  {currentBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={currentBalance}
                value={modalData.amount || ""}
                onChange={(e) =>
                  setModalData({ ...modalData, amount: e.target.value })
                }
                placeholder="Enter withdrawal amount"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
              {modalData.amount &&
                parseFloat(modalData.amount) > currentBalance && (
                  <p className="mt-1 text-sm text-red-600">
                    Insufficient balance. Maximum withdrawal: ₹
                    {currentBalance.toLocaleString("en-IN")}
                  </p>
                )}
            </div>

            {/* Withdrawal Details */}
            {withdrawalAmount > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Withdrawal Summary
                </h4>

                {/* Remaining Balance */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Remaining Balance:
                  </span>
                  <span
                    className={`text-base font-bold ${
                      isBelowMinimum ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    ₹
                    {remainingBalance.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* Minimum Required Balance */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Minimum Required:
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    ₹
                    {minimumBalance.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* Interest Information */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">
                    Interest Rate (p.a.):
                  </span>
                  <span className="text-sm font-semibold text-blue-600">
                    {effectiveInterestRate.toFixed(2)}%
                  </span>
                </div>

                {/* Estimated Monthly Interest */}
                {effectiveInterestRate > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-blue-700">
                        Estimated Monthly Interest:
                      </span>
                      <span className="text-sm font-bold text-blue-600">
                        ₹{estimatedInterest}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Based on current balance after withdrawal
                    </p>
                  </div>
                )}

                {/* Warning if below minimum */}
                {isBelowMinimum && (
                  <div className="bg-red-50 rounded-lg p-3 mt-2 border border-red-200">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">
                          Warning: Below Minimum Balance
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          This withdrawal will reduce your balance below the
                          minimum required amount of ₹
                          {minimumBalance.toLocaleString("en-IN")}. You may
                          incur penalties or fees.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Withdrawal Method
              </label>
              <select
                value={modalData.method || ""}
                onChange={(e) =>
                  setModalData({ ...modalData, method: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              >
                <option value="">Select method</option>
                <option value="atm">ATM Withdrawal</option>
                <option value="branch">Branch Withdrawal</option>
                <option value="online">Online Transfer</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={
                  isSubmitting ||
                  !modalData.amount ||
                  withdrawalAmount <= 0 ||
                  withdrawalAmount > currentBalance
                }
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                  isSubmitting ||
                  !modalData.amount ||
                  withdrawalAmount <= 0 ||
                  withdrawalAmount > currentBalance
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-orange-600 text-white hover:bg-orange-700"
                }`}
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : null}
                <span>Withdraw Money</span>
              </button>
            </div>
          </div>
        );

      case "view":
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">
                  {accountTypeName?.toUpperCase()} Details
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Account Type:
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {accountTypeName?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Interest Rate:
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  4.5% p.a.
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Current Balance:
                </span>
                <span className="text-sm font-semibold text-emerald-600">
                  ₹25,000
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm font-medium text-gray-600">
                  Status:
                </span>
                <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Active
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition mt-4"
            >
              Close
            </button>
          </div>
        );

      case "maturity":
        // Calculate maturity details from real account data
        const maturityAccountTypeName = selectedAccount?.account_type || "";
        const maturityAccountBalance = selectedAccount?.balance || 0;
        const maturityInterestRate =
          selectedAccount?.effective_interest_rate ||
          selectedAccount?.snapshot_interest_rate ||
          0;
        const maturityDateReal = selectedAccount?.maturity_date
          ? new Date(selectedAccount.maturity_date)
          : null;
        const maturityStartDate = selectedAccount?.start_date
          ? new Date(selectedAccount.start_date)
          : null;
        const maturityMethod =
          selectedAccount?.snapshot_interest_calculation_method || "compound";

        // Determine account type for maturity calculation
        const isMaturityRD = maturityAccountTypeName?.toLowerCase() === "rd";
        const isMaturityFD = maturityAccountTypeName?.toLowerCase() === "fd";

        // Calculate maturity amount
        let maturityAmountReal = 0;
        let interestEarnedReal = 0;
        let totalPrincipalInvested = 0; // For RD: total installments * monthly contribution

        if (maturityDateReal && maturityStartDate) {
          const totalDays = Math.ceil(
            (maturityDateReal - maturityStartDate) / (1000 * 60 * 60 * 24)
          );
          const years = totalDays / 365.25;

          if (isMaturityRD) {
            // RD: Calculate based on total installments * monthly contribution
            const contributionFrequency =
              selectedAccount?.snapshot_contribution_frequency || "monthly";
            const minContribution =
              selectedAccount?.snapshot_min_contribution_amount || 0;

            // Determine committed contribution amount (same logic as progress calculation)
            let committedAmount = minContribution;
            const balance = maturityAccountBalance || 0;
            if (balance > 0) {
              const commonAmounts = [500, 1000, 1500, 2000, 2500, 5000, 10000];
              if (commonAmounts.includes(balance)) {
                committedAmount = balance;
              } else {
                for (const commonAmount of commonAmounts) {
                  if (balance % commonAmount === 0) {
                    const numContributions = balance / commonAmount;
                    if (numContributions >= 1 && numContributions <= 12) {
                      committedAmount = commonAmount;
                      break;
                    }
                  }
                }
                if (
                  committedAmount === minContribution &&
                  balance >= minContribution &&
                  balance <= minContribution * 2
                ) {
                  committedAmount = balance;
                }
              }
            }

            // Calculate total installments based on contribution frequency
            let totalInstallmentsForCalc = 0;
            if (contributionFrequency === "daily") {
              totalInstallmentsForCalc = totalDays;
            } else if (contributionFrequency === "weekly") {
              totalInstallmentsForCalc = Math.ceil(totalDays / 7);
            } else if (contributionFrequency === "monthly") {
              totalInstallmentsForCalc = Math.ceil(totalDays / 30.44);
            } else if (contributionFrequency === "quarterly") {
              totalInstallmentsForCalc = Math.ceil(totalDays / 91.25);
            } else {
              totalInstallmentsForCalc = Math.ceil(totalDays / 30.44);
            }

            // Total principal = total installments * committed amount
            totalPrincipalInvested = totalInstallmentsForCalc * committedAmount;

            // Calculate interest on total principal
            if (maturityMethod === "simple") {
              // Simple interest on RD: P * r * t where P is total principal, t is years
              interestEarnedReal =
                totalPrincipalInvested * (maturityInterestRate / 100) * years;
            } else {
              // Compound interest on RD: Calculate based on monthly contributions
              // Formula: M = P * [((1 + r/12)^n - 1) / (r/12)] * (1 + r/12)
              // Where P = monthly contribution, r = annual rate, n = number of months
              const monthlyRate = maturityInterestRate / 100 / 12;
              const numMonths = totalDays / 30.44;
              if (monthlyRate > 0) {
                interestEarnedReal =
                  committedAmount *
                    ((Math.pow(1 + monthlyRate, numMonths) - 1) / monthlyRate) *
                    (1 + monthlyRate) -
                  totalPrincipalInvested;
              } else {
                interestEarnedReal = 0;
              }
            }
            maturityAmountReal = totalPrincipalInvested + interestEarnedReal;
          } else {
            // FD: Calculate based on current balance (one-time deposit)
            if (maturityAccountBalance > 0) {
              if (maturityMethod === "simple") {
                interestEarnedReal =
                  maturityAccountBalance * (maturityInterestRate / 100) * years;
              } else {
                interestEarnedReal =
                  maturityAccountBalance *
                  ((1 + maturityInterestRate / 100) ** years - 1);
              }
              maturityAmountReal = maturityAccountBalance + interestEarnedReal;
              totalPrincipalInvested = maturityAccountBalance;
            }
          }
        }

        // Calculate days remaining
        const maturityDaysRemaining = maturityDateReal
          ? Math.max(
              0,
              Math.ceil((maturityDateReal - new Date()) / (1000 * 60 * 60 * 24))
            )
          : 0;

        // Calculate progress - different logic for RD vs FD
        // (isMaturityRD and isMaturityFD are already defined above)

        let maturityProgress = 0;
        let installmentsMade = 0;
        let totalInstallments = 0;

        if (
          maturityDateReal &&
          maturityStartDate &&
          maturityAccountBalance >= 0
        ) {
          // Reset times to start of day for accurate day calculations
          const start = new Date(maturityStartDate);
          start.setHours(0, 0, 0, 0);
          const maturity = new Date(maturityDateReal);
          maturity.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Calculate total days in the term
          const totalDaysCalc = Math.ceil(
            (maturity - start) / (1000 * 60 * 60 * 24)
          );
          const daysPassedCalc = Math.ceil(
            (today - start) / (1000 * 60 * 60 * 24)
          );

          if (isMaturityRD) {
            // RD: Progress based on installments made vs total installments
            const contributionFrequency =
              selectedAccount?.snapshot_contribution_frequency || "monthly";
            const minContribution =
              selectedAccount?.snapshot_min_contribution_amount || 0;

            // Determine committed contribution amount
            let committedAmount = minContribution;
            const balance = maturityAccountBalance || 0;
            if (balance > 0) {
              const commonAmounts = [500, 1000, 1500, 2000, 2500, 5000, 10000];
              if (commonAmounts.includes(balance)) {
                committedAmount = balance;
              } else {
                for (const commonAmount of commonAmounts) {
                  if (balance % commonAmount === 0) {
                    const numContributions = balance / commonAmount;
                    if (numContributions >= 1 && numContributions <= 12) {
                      committedAmount = commonAmount;
                      break;
                    }
                  }
                }
                if (
                  committedAmount === minContribution &&
                  balance >= minContribution &&
                  balance <= minContribution * 2
                ) {
                  committedAmount = balance;
                }
              }
            }

            // Calculate total installments based on contribution frequency
            if (contributionFrequency === "daily") {
              totalInstallments = totalDaysCalc;
            } else if (contributionFrequency === "weekly") {
              totalInstallments = Math.ceil(totalDaysCalc / 7);
            } else if (contributionFrequency === "monthly") {
              totalInstallments = Math.ceil(totalDaysCalc / 30.44);
            } else if (contributionFrequency === "quarterly") {
              totalInstallments = Math.ceil(totalDaysCalc / 91.25);
            } else {
              totalInstallments = Math.ceil(totalDaysCalc / 30.44);
            }

            // Calculate installments made
            if (committedAmount > 0 && balance > 0) {
              installmentsMade = Math.floor(balance / committedAmount);
            } else if (balance === 0) {
              installmentsMade = 0;
            }

            // Calculate progress percentage based on installments
            if (totalInstallments > 0) {
              maturityProgress = Math.min(
                100,
                Math.max(0, (installmentsMade / totalInstallments) * 100)
              );
            }
          } else if (isMaturityFD) {
            // FD: Progress based on time elapsed (days passed / total days)
            if (totalDaysCalc > 0) {
              maturityProgress = Math.min(
                100,
                Math.max(0, (daysPassedCalc / totalDaysCalc) * 100)
              );
            }
          }
        }

        return (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-200">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-green-900">
                  Maturity Details
                </span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                Track your {maturityAccountTypeName?.toUpperCase() || "Account"}{" "}
                maturity progress
              </p>
            </div>

            {/* Current Balance */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Current Balance:
                </span>
                <span className="text-base font-bold text-blue-600">
                  ₹
                  {maturityAccountBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {maturityDateReal ? (
                <>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Maturity Date:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {maturityDateReal.toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Days Remaining:
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        maturityDaysRemaining <= 30
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {maturityDaysRemaining} days
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Interest Rate:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {maturityInterestRate.toFixed(2)}% p.a. ({maturityMethod})
                    </span>
                  </div>
                  {maturityAmountReal > 0 && (
                    <>
                      {isMaturityRD && totalPrincipalInvested > 0 && (
                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-600">
                            Total Principal (Installments × Contribution):
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            ₹
                            {totalPrincipalInvested.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">
                          Interest Earned:
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          ₹
                          {interestEarnedReal.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-900">
                        Maturity Amount:
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        ₹
                        {maturityAmountReal.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    {isMaturityRD && totalPrincipalInvested > 0 && (
                      <p className="text-xs text-gray-600 mt-2">
                        Total Principal: ₹
                        {totalPrincipalInvested.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        + Interest: ₹
                        {interestEarnedReal.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
                  </div>
                  {maturityAccountTypeName?.toLowerCase() === "rd" && (
                    <div className="py-3 border-t border-gray-200 mt-3 pt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          Contribution Progress:
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {installmentsMade} / {totalInstallments} installments
                          ({maturityProgress.toFixed(2)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            maturityProgress >= 100
                              ? "bg-green-600"
                              : maturityProgress >= 75
                              ? "bg-blue-600"
                              : maturityProgress >= 50
                              ? "bg-yellow-500"
                              : "bg-orange-500"
                          }`}
                          style={{
                            width: `${Math.min(100, maturityProgress)}%`,
                          }}
                        ></div>
                      </div>
                      {maturityStartDate && maturityDateReal && (
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                          <div>
                            Started:{" "}
                            {maturityStartDate.toLocaleDateString("en-IN")} •
                            Maturity:{" "}
                            {maturityDateReal.toLocaleDateString("en-IN")}
                          </div>
                          {installmentsMade > 0 && totalInstallments > 0 && (
                            <div className="text-blue-600 font-medium">
                              {installmentsMade} of {totalInstallments} monthly
                              installments completed
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    Maturity date not set for this account.
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        );

      case "balance":
        // Loan Balance Details Modal
        const balanceOutstanding = selectedAccount?.balance
          ? Math.abs(selectedAccount.balance)
          : 0;
        const balancePrincipal =
          selectedAccount?.snapshot_loan_principal || balanceOutstanding;
        const balanceEMI = selectedAccount?.snapshot_emi_amount || 0;
        const balanceNextDue = selectedAccount?.next_payment_date || null;
        const balanceInterestRate =
          selectedAccount?.effective_interest_rate ||
          selectedAccount?.snapshot_interest_rate ||
          0;
        const balanceRepaymentFreq =
          selectedAccount?.snapshot_repayment_frequency || "monthly";
        const balanceTotalEMIs =
          selectedAccount?.snapshot_loan_term_months || 12;
        const balancePaidEMIs = selectedAccount?.paid_emis_count || 0;
        const balanceRemainingEMIs = balanceTotalEMIs - balancePaidEMIs;

        // Calculate accrued interest (estimated)
        // This is a simplified calculation - actual accrued interest would be calculated based on days since last payment
        const loanStartDate = selectedAccount?.start_date
          ? new Date(selectedAccount.start_date)
          : new Date();
        const daysSinceStart = Math.floor(
          (new Date() - loanStartDate) / (1000 * 60 * 60 * 24)
        );
        const yearsSinceStart = daysSinceStart / 365.25;
        const totalInterestPaid =
          balancePaidEMIs > 0
            ? balanceEMI * balancePaidEMIs -
              (balancePrincipal * balancePaidEMIs) / balanceTotalEMIs
            : 0;
        const estimatedAccruedInterest =
          balanceOutstanding *
            (balanceInterestRate / 100) *
            (daysSinceStart / 365.25) -
          totalInterestPaid;

        // Calculate days until next payment
        let daysUntilNext = null;
        if (balanceNextDue) {
          const nextDate = new Date(balanceNextDue);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          nextDate.setHours(0, 0, 0, 0);
          daysUntilNext = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        }

        return (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  Loan Balance Details
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Detailed breakdown of your loan account
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Original Principal:
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  ₹
                  {balancePrincipal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Outstanding Principal:
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  ₹
                  {balanceOutstanding.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Principal Paid:
                </span>
                <span className="text-sm font-semibold text-green-600">
                  ₹
                  {(balancePrincipal - balanceOutstanding).toLocaleString(
                    "en-IN",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Monthly EMI:
                </span>
                <span className="text-sm font-semibold text-orange-600">
                  ₹
                  {balanceEMI.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Interest Rate:
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {balanceInterestRate.toFixed(2)}% p.a.
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Repayment Frequency:
                </span>
                <span className="text-sm font-semibold text-gray-900 capitalize">
                  {balanceRepaymentFreq}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Total EMIs:
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {balanceTotalEMIs}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Paid EMIs:
                </span>
                <span className="text-sm font-semibold text-green-600">
                  {balancePaidEMIs}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Remaining EMIs:
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {balanceRemainingEMIs}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm font-medium text-gray-600">
                  Next Due Date:
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {balanceNextDue
                    ? new Date(balanceNextDue).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Not set"}
                </span>
              </div>
            </div>

            {daysUntilNext !== null && daysUntilNext >= 0 && (
              <div
                className={`rounded-lg p-3 ${
                  daysUntilNext <= 7
                    ? "bg-red-50 border border-red-200"
                    : daysUntilNext <= 15
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-blue-50 border border-blue-200"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <AlertCircle
                    className={`h-4 w-4 ${
                      daysUntilNext <= 7
                        ? "text-red-600"
                        : daysUntilNext <= 15
                        ? "text-yellow-600"
                        : "text-blue-600"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      daysUntilNext <= 7
                        ? "text-red-800"
                        : daysUntilNext <= 15
                        ? "text-yellow-800"
                        : "text-blue-800"
                    }`}
                  >
                    Payment Reminder
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 ${
                    daysUntilNext <= 7
                      ? "text-red-700"
                      : daysUntilNext <= 15
                      ? "text-yellow-700"
                      : "text-blue-700"
                  }`}
                >
                  {daysUntilNext === 0
                    ? `Your next EMI of ₹${balanceEMI.toLocaleString(
                        "en-IN"
                      )} is due today!`
                    : daysUntilNext === 1
                    ? `Your next EMI of ₹${balanceEMI.toLocaleString(
                        "en-IN"
                      )} is due tomorrow`
                    : `Your next EMI of ₹${balanceEMI.toLocaleString(
                        "en-IN"
                      )} is due in ${daysUntilNext} days`}
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setModalType("repay");
                  setModalData({ amount: balanceEMI });
                }}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Make Payment
              </button>
            </div>
          </div>
        );

      case "contribute":
        // Calculate RD contribution details
        const rdCurrentBalance = selectedAccount?.balance || 0;
        const contributionAmount = parseFloat(modalData.amount) || 0;
        const newBalanceAfterContribution =
          rdCurrentBalance + contributionAmount;
        const minContribution =
          selectedAccount?.snapshot_min_contribution_amount || 0;

        // For RD, the committed contribution amount should be the first deposit amount
        // If balance > 0, try to determine the committed amount from the balance
        // Logic: If balance is exactly a common amount, or if it's a multiple,
        // we can infer the committed amount
        let committedContributionAmount = minContribution;

        if (rdCurrentBalance > 0) {
          const balance = rdCurrentBalance;

          // Common RD contribution amounts: 500, 1000, 1500, 2000, 2500, 5000, 10000
          const commonAmounts = [500, 1000, 1500, 2000, 2500, 5000, 10000];

          // Check if balance matches any common amount exactly
          if (commonAmounts.includes(balance)) {
            // If balance is exactly ₹1000, committed amount is ₹1000
            committedContributionAmount = balance;
          } else {
            // Check if balance is a multiple of a common amount
            // This handles cases like ₹2000 (2x ₹1000), ₹3000 (3x ₹1000), etc.
            for (const commonAmount of commonAmounts) {
              if (balance % commonAmount === 0) {
                // Balance is a multiple of this common amount
                const numContributions = balance / commonAmount;
                // If it's a reasonable number of contributions (1-12 months), use it
                if (numContributions >= 1 && numContributions <= 12) {
                  committedContributionAmount = commonAmount;
                  break;
                }
              }
            }

            // If we couldn't find a match, check if balance is close to a common amount
            if (committedContributionAmount === minContribution) {
              const closestCommon = commonAmounts.find(
                (amount) => Math.abs(balance - amount) < 10 // Within ₹10
              );
              if (closestCommon) {
                committedContributionAmount = closestCommon;
              } else if (
                balance >= minContribution &&
                balance <= minContribution * 2
              ) {
                // If balance is between min and 2x min, likely it's the committed amount
                // (e.g., min is ₹500, balance is ₹1000, so committed is ₹1000)
                committedContributionAmount = balance;
              }
            }
          }
        }
        const maturityDate = selectedAccount?.maturity_date
          ? new Date(selectedAccount.maturity_date)
          : null;
        const startDate = selectedAccount?.start_date
          ? new Date(selectedAccount.start_date)
          : null;

        // Determine if this is the first contribution
        const isFirstContribution = rdCurrentBalance === 0 || !startDate;

        // Calculate next installment date (for subsequent contributions)
        let nextInstallmentDate = null;
        let canContribute = true; // Whether user can contribute now
        const contributionFrequency =
          selectedAccount?.snapshot_contribution_frequency || "monthly";

        if (!isFirstContribution && startDate) {
          // For RD, the start_date is when the first contribution was made
          // Next installment should be start_date + 1 interval (for monthly, it's 1 month)
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Calculate next installment date from start_date
          nextInstallmentDate = new Date(startDate);

          // Add one interval to get the next installment date
          if (contributionFrequency === "daily") {
            nextInstallmentDate.setDate(nextInstallmentDate.getDate() + 1);
          } else if (contributionFrequency === "weekly") {
            nextInstallmentDate.setDate(nextInstallmentDate.getDate() + 7);
          } else if (contributionFrequency === "monthly") {
            nextInstallmentDate.setMonth(nextInstallmentDate.getMonth() + 1);
          } else if (contributionFrequency === "quarterly") {
            nextInstallmentDate.setMonth(nextInstallmentDate.getMonth() + 3);
          } else {
            // Default to monthly
            nextInstallmentDate.setMonth(nextInstallmentDate.getMonth() + 1);
          }

          // Reset time to start of day for comparison
          nextInstallmentDate.setHours(0, 0, 0, 0);

          // If next installment date is in the past, keep moving forward until it's in the future
          // This handles cases where user hasn't contributed for multiple periods
          while (nextInstallmentDate < today) {
            if (contributionFrequency === "daily") {
              nextInstallmentDate.setDate(nextInstallmentDate.getDate() + 1);
            } else if (contributionFrequency === "weekly") {
              nextInstallmentDate.setDate(nextInstallmentDate.getDate() + 7);
            } else if (contributionFrequency === "monthly") {
              nextInstallmentDate.setMonth(nextInstallmentDate.getMonth() + 1);
            } else if (contributionFrequency === "quarterly") {
              nextInstallmentDate.setMonth(nextInstallmentDate.getMonth() + 3);
            } else {
              nextInstallmentDate.setMonth(nextInstallmentDate.getMonth() + 1);
            }
          }

          // User can only contribute on or after the next installment date
          canContribute = today >= nextInstallmentDate;
        }

        // Calculate days remaining
        const daysRemaining =
          maturityDate && startDate
            ? Math.max(
                0,
                Math.ceil((maturityDate - new Date()) / (1000 * 60 * 60 * 24))
              )
            : 0;

        // Calculate days until next installment
        const daysUntilNextInstallment = nextInstallmentDate
          ? Math.ceil(
              (nextInstallmentDate - new Date()) / (1000 * 60 * 60 * 24)
            )
          : null;

        // Calculate contribution progress (days passed / total days)
        let contributionProgress = 0;
        if (maturityDate && startDate) {
          const totalDays = Math.ceil(
            (maturityDate - startDate) / (1000 * 60 * 60 * 24)
          );
          const daysPassed = Math.ceil(
            (new Date() - startDate) / (1000 * 60 * 60 * 24)
          );
          contributionProgress = Math.min(
            100,
            Math.max(0, (daysPassed / totalDays) * 100)
          );
        }

        return (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  {isFirstContribution
                    ? "First Contribution"
                    : "Monthly Contribution"}
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                {isFirstContribution
                  ? "Start your RD account with your first contribution"
                  : `Add your monthly contribution to your RD account`}
              </p>
            </div>

            {/* Next Installment Date - Show only after first contribution */}
            {!isFirstContribution && nextInstallmentDate && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      Next Installment Date
                    </p>
                    <p className="text-lg font-bold text-blue-700">
                      {nextInstallmentDate.toLocaleDateString("en-IN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      Days Remaining
                    </p>
                    <p
                      className={`text-xl font-bold ${
                        daysUntilNextInstallment <= 3
                          ? "text-red-600"
                          : daysUntilNextInstallment <= 7
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {daysUntilNextInstallment}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">days</p>
                  </div>
                </div>
                {daysUntilNextInstallment <= 3 && (
                  <div className="mt-3 bg-red-50 rounded-lg p-2 border border-red-200">
                    <p className="text-xs text-red-700 font-medium">
                      ⚠️ Your next installment is due soon!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Current Balance Display */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Current Balance:
                </span>
                <span className="text-lg font-bold text-blue-600">
                  ₹
                  {rdCurrentBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contribution Amount (₹)
                {committedContributionAmount > 0 && (
                  <span className="text-xs text-gray-500 ml-2">
                    (Your committed amount: ₹
                    {committedContributionAmount.toLocaleString("en-IN")})
                  </span>
                )}
              </label>
              {!canContribute && nextInstallmentDate && (
                <div className="bg-yellow-50 rounded-lg p-3 mb-2 border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    ⏳ Contribution is disabled until the next installment date.
                    You can contribute on or after{" "}
                    <span className="font-semibold">
                      {nextInstallmentDate.toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </p>
                </div>
              )}
              <input
                type="number"
                step="0.01"
                min={minContribution}
                value={modalData.amount || committedContributionAmount || ""}
                onChange={(e) =>
                  setModalData({ ...modalData, amount: e.target.value })
                }
                placeholder={`Enter contribution amount (Default: ₹${committedContributionAmount.toLocaleString(
                  "en-IN"
                )})`}
                disabled={!canContribute}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                  !canContribute
                    ? "bg-gray-100 cursor-not-allowed opacity-60"
                    : ""
                }`}
              />
              {contributionAmount > 0 &&
                contributionAmount < minContribution && (
                  <p className="mt-1 text-sm text-red-600">
                    Minimum contribution amount is ₹
                    {minContribution.toLocaleString("en-IN")}
                  </p>
                )}
              {!isFirstContribution && (
                <p className="mt-1 text-xs text-gray-500">
                  Your regular contribution amount is ₹
                  {committedContributionAmount.toLocaleString("en-IN")}. You can
                  change this amount if needed (minimum: ₹
                  {minContribution.toLocaleString("en-IN")}).
                </p>
              )}
            </div>

            {/* Contribution Summary */}
            {contributionAmount >= minContribution &&
              contributionAmount > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Contribution Summary
                  </h4>

                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      New Balance:
                    </span>
                    <span className="text-base font-bold text-green-600">
                      ₹
                      {newBalanceAfterContribution.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {maturityDate && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">
                          Maturity Date:
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {maturityDate.toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">
                          Days Remaining:
                        </span>
                        <span className="text-sm font-semibold text-blue-600">
                          {daysRemaining} days
                        </span>
                      </div>

                      {/* Contribution Progress */}
                      <div className="pt-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-600">
                            Contribution Progress:
                          </span>
                          <span className="text-xs font-semibold text-gray-900">
                            {contributionProgress.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${contributionProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Note (Optional)
              </label>
              <input
                type="text"
                value={modalData.note || ""}
                onChange={(e) =>
                  setModalData({ ...modalData, note: e.target.value })
                }
                placeholder="Add a note for this contribution"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={
                  isSubmitting ||
                  !canContribute ||
                  !modalData.amount ||
                  contributionAmount < minContribution ||
                  contributionAmount <= 0
                }
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                  isSubmitting ||
                  !canContribute ||
                  !modalData.amount ||
                  contributionAmount < minContribution ||
                  contributionAmount <= 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : null}
                <span>
                  {isFirstContribution
                    ? "Start Contribution"
                    : "Make Contribution"}
                </span>
              </button>
            </div>
          </div>
        );

      case "calculate":
        // Check account type for FD vs RD
        const calcAccountType = selectedAccount?.account_type || "";
        const isCalcFD = calcAccountType?.toLowerCase() === "fd";
        const isCalcRD = calcAccountType?.toLowerCase() === "rd";

        // Default values
        const defaultPrincipal =
          selectedAccount?.balance ||
          selectedAccount?.snapshot_min_deposit ||
          10000;
        const defaultMonthlyContribution =
          selectedAccount?.snapshot_min_contribution_amount || 1000;
        const defaultRate =
          selectedAccount?.effective_interest_rate ||
          selectedAccount?.snapshot_interest_rate ||
          0;
        const defaultMethod =
          selectedAccount?.snapshot_interest_calculation_method || "compound";

        // Get user inputs from modalData or use defaults
        const principalAmount = modalData.principalAmount
          ? parseFloat(modalData.principalAmount)
          : isCalcFD
          ? defaultPrincipal
          : 0;
        const monthlyContribution = modalData.monthlyContribution
          ? parseFloat(modalData.monthlyContribution)
          : isCalcRD
          ? defaultMonthlyContribution
          : 0;
        const calcRate = modalData.rate
          ? parseFloat(modalData.rate)
          : defaultRate;
        const calcTerm = modalData.term
          ? parseInt(modalData.term)
          : isCalcFD
          ? 12
          : 12; // Default 12 months
        const calcTermUnit = modalData.termUnit || "months"; // months or years

        // Convert term to months and years
        const totalMonths =
          calcTermUnit === "months" ? calcTerm : calcTerm * 12;
        const totalYears = totalMonths / 12;
        const calculatedDays = Math.ceil(totalMonths * 30.44); // Average days per month

        // Calculate maturity amount - different formulas for FD vs RD
        let calculatedMaturityAmount = 0;
        let calculatedInterest = 0;
        let totalPrincipal = 0;

        if (isCalcFD && principalAmount > 0 && calcRate > 0 && totalYears > 0) {
          // FD: One-time principal deposit
          totalPrincipal = principalAmount;
          const r = calcRate / 100; // Annual rate as decimal

          if (defaultMethod === "simple") {
            // Simple interest: I = P × r × t
            calculatedInterest = principalAmount * r * totalYears;
            calculatedMaturityAmount = principalAmount + calculatedInterest;
          } else {
            // Compound interest: A = P × (1 + r)^t
            calculatedMaturityAmount =
              principalAmount * Math.pow(1 + r, totalYears);
            calculatedInterest = calculatedMaturityAmount - principalAmount;
          }
        } else if (
          isCalcRD &&
          monthlyContribution > 0 &&
          calcRate > 0 &&
          totalMonths > 0
        ) {
          // RD: Monthly contributions
          totalPrincipal = monthlyContribution * totalMonths;
          const r = calcRate / 100; // Annual rate as decimal

          if (defaultMethod === "simple") {
            // Simple interest calculation for RD
            // Interest = (P × n × (n+1) × r) / (2 × 12)
            calculatedInterest =
              (monthlyContribution * totalMonths * (totalMonths + 1) * r) /
              (2 * 12);
            calculatedMaturityAmount = totalPrincipal + calculatedInterest;
          } else {
            // Compound interest calculation for RD
            const monthlyRate = r / 12;
            if (monthlyRate > 0) {
              const maturityFactor =
                ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) *
                (1 + monthlyRate);
              calculatedMaturityAmount = monthlyContribution * maturityFactor;
              calculatedInterest = calculatedMaturityAmount - totalPrincipal;
            } else {
              calculatedMaturityAmount = totalPrincipal;
              calculatedInterest = 0;
            }
          }
        }

        // Calculate maturity date
        const calcMaturityDate =
          calculatedDays > 0
            ? new Date(Date.now() + calculatedDays * 24 * 60 * 60 * 1000)
            : null;

        return (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200">
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">
                  {isCalcFD ? "FD Return Calculator" : "RD Return Calculator"}
                </span>
              </div>
              <p className="text-xs text-purple-700 mt-1">
                {isCalcFD
                  ? "Calculate potential returns for your Fixed Deposit"
                  : "Calculate potential returns for your RD investment"}
              </p>
            </div>

            {/* Current Account Info (Reference) */}
            {selectedAccount && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Current Account:</strong>{" "}
                  {isCalcFD
                    ? `Min Deposit ₹${defaultPrincipal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : `Min Contribution ₹${defaultMonthlyContribution.toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}`}{" "}
                  | Rate {defaultRate.toFixed(2)}% p.a. ({defaultMethod})
                </p>
              </div>
            )}

            {/* Input Fields */}
            <div className="space-y-4">
              {isCalcFD ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Principal Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={modalData.principalAmount || defaultPrincipal || ""}
                    onChange={(e) =>
                      setModalData({
                        ...modalData,
                        principalAmount: e.target.value,
                      })
                    }
                    placeholder="Enter principal amount (one-time deposit)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                  {defaultPrincipal > 0 && (
                    <button
                      onClick={() =>
                        setModalData({
                          ...modalData,
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
                      modalData.monthlyContribution ||
                      defaultMonthlyContribution ||
                      ""
                    }
                    onChange={(e) =>
                      setModalData({
                        ...modalData,
                        monthlyContribution: e.target.value,
                      })
                    }
                    placeholder="Enter monthly contribution amount"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                  {defaultMonthlyContribution > 0 && (
                    <button
                      onClick={() =>
                        setModalData({
                          ...modalData,
                          monthlyContribution: defaultMonthlyContribution,
                        })
                      }
                      className="mt-1 text-xs text-purple-600 hover:text-purple-700 underline"
                    >
                      Use minimum contribution (₹
                      {defaultMonthlyContribution.toLocaleString("en-IN")})
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
                  value={modalData.rate || defaultRate || ""}
                  onChange={(e) =>
                    setModalData({
                      ...modalData,
                      rate: e.target.value,
                    })
                  }
                  placeholder="Enter interest rate"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
                {defaultRate > 0 && (
                  <button
                    onClick={() =>
                      setModalData({
                        ...modalData,
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
                    value={modalData.term || calcTerm || ""}
                    onChange={(e) =>
                      setModalData({
                        ...modalData,
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
                    value={modalData.termUnit || "months"}
                    onChange={(e) =>
                      setModalData({
                        ...modalData,
                        termUnit: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
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
                    { label: "6M", value: 6, unit: "months" },
                    { label: "1Y", value: 12, unit: "months" },
                    { label: "2Y", value: 24, unit: "months" },
                    { label: "5Y", value: 5, unit: "years" },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() =>
                        setModalData({
                          ...modalData,
                          term: option.value,
                          termUnit: option.unit,
                        })
                      }
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition ${
                        modalData.term == option.value &&
                        modalData.termUnit === option.unit
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
                  {isCalcFD ? "FD Return Calculation" : "RD Return Calculation"}
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
                          )} years (${totalMonths} months)`
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
                        {calcMaturityDate.toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
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
                        {calculatedMaturityAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
                <strong>Note:</strong> This calculator uses {defaultMethod}{" "}
                interest calculation. Actual returns may vary based on your
                account terms and compounding frequency.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setModalData({});
                  setShowModal(false);
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Reset to defaults
                  setModalData({
                    ...(isCalcFD
                      ? { principalAmount: defaultPrincipal }
                      : { monthlyContribution: defaultMonthlyContribution }),
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

      case "break_fd":
        // Calculate break FD details with penalties
        const breakFdBalance = selectedAccount?.balance || 0;
        const breakFdMaturityDate = selectedAccount?.maturity_date
          ? new Date(selectedAccount.maturity_date)
          : null;
        const breakFdStartDate = selectedAccount?.start_date
          ? new Date(selectedAccount.start_date)
          : null;
        const breakFdInterestRate =
          selectedAccount?.effective_interest_rate ||
          selectedAccount?.snapshot_interest_rate ||
          0;
        const breakFdMethod =
          selectedAccount?.snapshot_interest_calculation_method || "compound";
        const breakFdPenaltyRate =
          selectedAccount?.snapshot_early_withdrawal_penalty_rate || 3.0; // Default 3%

        // Calculate days remaining
        const breakFdDaysRemaining = breakFdMaturityDate
          ? Math.max(
              0,
              Math.ceil(
                (breakFdMaturityDate - new Date()) / (1000 * 60 * 60 * 24)
              )
            )
          : 0;

        // Calculate interest earned so far
        let breakFdInterestEarned = 0;
        if (breakFdStartDate && breakFdBalance > 0 && breakFdInterestRate > 0) {
          const daysPassed = Math.ceil(
            (new Date() - breakFdStartDate) / (1000 * 60 * 60 * 24)
          );
          const yearsPassed = daysPassed / 365.25;

          if (breakFdMethod === "simple") {
            breakFdInterestEarned =
              breakFdBalance * (breakFdInterestRate / 100) * yearsPassed;
          } else {
            breakFdInterestEarned =
              breakFdBalance *
              ((1 + breakFdInterestRate / 100) ** yearsPassed - 1);
          }
        }

        // Calculate penalty amount
        const breakFdPenaltyAmount =
          (breakFdBalance * breakFdPenaltyRate) / 100;

        // Calculate final amount after penalty
        const breakFdFinalAmount = Math.max(
          0,
          breakFdBalance - breakFdPenaltyAmount
        );

        return (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-semibold text-red-900">
                  Break Fixed Deposit
                </span>
              </div>
              <p className="text-xs text-red-700 mt-1">
                Early withdrawal will incur penalties and loss of interest
              </p>
            </div>

            {/* Current Balance */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Current Balance (Principal):
                </span>
                <span className="text-lg font-bold text-blue-600">
                  ₹
                  {breakFdBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* Break FD Details */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Break FD Summary
              </h4>

              {breakFdMaturityDate && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Days Remaining to Maturity:
                  </span>
                  <span className="text-sm font-semibold text-red-600">
                    {breakFdDaysRemaining} days
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Principal Amount:
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  ₹
                  {breakFdBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {breakFdInterestEarned > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Interest Earned So Far:
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    ₹
                    {breakFdInterestEarned.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">
                  Early Withdrawal Penalty ({breakFdPenaltyRate}%):
                </span>
                <span className="text-sm font-semibold text-red-600">
                  - ₹
                  {breakFdPenaltyAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="bg-red-50 rounded-lg p-3 border border-red-200 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">
                    Final Amount to Receive:
                  </span>
                  <span className="text-lg font-bold text-red-600">
                    ₹
                    {breakFdFinalAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning Messages */}
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-800">
                  <p className="font-semibold mb-1">
                    ⚠️ Early Withdrawal Warning:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>You will lose all accrued interest</li>
                    <li>
                      A penalty of {breakFdPenaltyRate}% will be applied to your
                      principal
                    </li>
                    <li>
                      You will receive only ₹
                      {breakFdFinalAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      instead of the full maturity amount
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Breaking FD (Optional)
              </label>
              <textarea
                value={modalData.reason || ""}
                onChange={(e) =>
                  setModalData({ ...modalData, reason: e.target.value })
                }
                placeholder="Enter reason for early withdrawal"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : null}
                <span>Break FD & Withdraw</span>
              </button>
            </div>
          </div>
        );

      case "repay":
        // Loan Repayment Modal
        const repayOutstanding = selectedAccount?.balance
          ? Math.abs(selectedAccount.balance)
          : 0;
        const repayEMI = selectedAccount?.snapshot_emi_amount || 0;
        const repayNextDue = selectedAccount?.next_payment_date || null;
        const repayAmount = parseFloat(modalData.amount) || repayEMI;
        const repayRemaining = Math.max(0, repayOutstanding - repayAmount);

        // Check if payment date has arrived
        const isPaymentDateReached = repayNextDue
          ? (() => {
              const nextPaymentDate = new Date(repayNextDue);
              const today = new Date();
              // Set time to midnight for date comparison
              today.setHours(0, 0, 0, 0);
              nextPaymentDate.setHours(0, 0, 0, 0);
              return today >= nextPaymentDate;
            })()
          : false;

        return (
          <div className="space-y-4">
            <div className="bg-orange-50 rounded-xl p-4 mb-4 border border-orange-200">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-semibold text-orange-900">
                  Make Loan Payment
                </span>
              </div>
              <p className="text-xs text-orange-700 mt-1">
                Make a payment towards your loan account
              </p>
            </div>

            {/* Loan Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">
                Loan Summary
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Outstanding Balance:
                  </span>
                  <span className="text-base font-bold text-red-600">
                    ₹
                    {repayOutstanding.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Monthly EMI:</span>
                  <span className="text-sm font-semibold text-orange-600">
                    ₹
                    {repayEMI.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {repayNextDue && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Next Payment Due:
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                      {new Date(repayNextDue).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={repayOutstanding}
                value={modalData.amount || repayEMI}
                onChange={(e) =>
                  setModalData({ ...modalData, amount: e.target.value })
                }
                placeholder={`Enter payment amount (Suggested: ₹${repayEMI.toLocaleString(
                  "en-IN"
                )})`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() =>
                    setModalData({ ...modalData, amount: repayEMI })
                  }
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                >
                  Use EMI Amount (₹{repayEMI.toLocaleString("en-IN")})
                </button>
                <button
                  onClick={() =>
                    setModalData({ ...modalData, amount: repayOutstanding })
                  }
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                >
                  Pay Full Outstanding
                </button>
              </div>
              {repayAmount > repayOutstanding && (
                <p className="mt-1 text-sm text-red-600">
                  Payment amount cannot exceed outstanding balance
                </p>
              )}
            </div>

            {/* Payment Preview */}
            {repayAmount > 0 && repayAmount <= repayOutstanding && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-green-900 mb-2">
                  Payment Preview
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Payment Amount:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      ₹
                      {repayAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Remaining Balance:
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        repayRemaining === 0
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}
                    >
                      ₹
                      {repayRemaining.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {repayRemaining === 0 && (
                    <p className="text-xs text-green-700 mt-2">
                      🎉 This payment will fully settle your loan!
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={modalData.method || ""}
                onChange={(e) =>
                  setModalData({ ...modalData, method: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              >
                <option value="">Select payment method</option>
                <option value="online">Online Banking</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="auto_debit">Auto Debit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Date
              </label>
              <input
                type="date"
                value={modalData.date || new Date().toISOString().split("T")[0]}
                onChange={(e) =>
                  setModalData({ ...modalData, date: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reference/Note (Optional)
              </label>
              <input
                type="text"
                value={modalData.reference || modalData.description || ""}
                onChange={(e) =>
                  setModalData({
                    ...modalData,
                    reference: e.target.value,
                    description: e.target.value,
                  })
                }
                placeholder="Add a note for this payment"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
            </div>

            {/* Test Mode Info */}
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-800">
                  <p className="font-semibold mb-1">
                    Test Mode - Use these test cards (No OTP required):
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 ml-1">
                    <li>
                      <strong>Success:</strong> 4111 1111 1111 1111
                    </li>
                    <li>
                      <strong>Failure:</strong> 4000 0000 0000 0002
                    </li>
                  </ul>
                  <p className="mt-1 text-yellow-700">
                    CVV: Any 3 digits | Expiry: Any future date
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Date Warning */}
            {!isPaymentDateReached && repayNextDue && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">
                      Payment Not Available Yet
                    </p>
                    <p className="text-xs">
                      You can make a payment on or after{" "}
                      <strong>
                        {new Date(repayNextDue).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={isSubmitting || !isPaymentDateReached}
                className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                title={
                  !isPaymentDateReached && repayNextDue
                    ? `Payment available from ${new Date(
                        repayNextDue
                      ).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}`
                    : ""
                }
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : null}
                <span>Make Payment</span>
              </button>
            </div>
          </div>
        );

      case "break_rd":
        // Calculate break RD details with penalties
        const breakCurrentBalance = selectedAccount?.balance || 0;
        const breakMaturityDate = selectedAccount?.maturity_date
          ? new Date(selectedAccount.maturity_date)
          : null;
        const breakStartDate = selectedAccount?.start_date
          ? new Date(selectedAccount.start_date)
          : null;
        const breakInterestRate =
          selectedAccount?.effective_interest_rate ||
          selectedAccount?.snapshot_interest_rate ||
          0;
        const breakMethod =
          selectedAccount?.snapshot_interest_calculation_method || "compound";

        // Get penalty rate (typically 1-2% for RD)
        const penaltyRate =
          selectedAccount?.snapshot_early_withdrawal_penalty_rate || 1.0; // Default 1%

        // Calculate days elapsed
        const daysElapsed = breakStartDate
          ? Math.max(
              0,
              Math.ceil((new Date() - breakStartDate) / (1000 * 60 * 60 * 24))
            )
          : 0;
        const yearsElapsed = daysElapsed / 365.25;

        // Calculate interest earned so far
        let interestEarnedSoFar = 0;
        if (breakStartDate && breakCurrentBalance > 0 && daysElapsed > 0) {
          if (breakMethod === "simple") {
            interestEarnedSoFar =
              breakCurrentBalance * (breakInterestRate / 100) * yearsElapsed;
          } else {
            interestEarnedSoFar =
              breakCurrentBalance *
              ((1 + breakInterestRate / 100) ** yearsElapsed - 1);
          }
        }

        // Calculate penalty amount (on principal or interest, depending on bank policy)
        // Typically penalty is on principal for early withdrawal
        const penaltyAmount = breakCurrentBalance * (penaltyRate / 100);

        // Calculate amount after break (principal + interest - penalty)
        const amountAfterBreak =
          breakCurrentBalance + interestEarnedSoFar - penaltyAmount;

        // Calculate days remaining to maturity
        const daysRemainingToMaturity = breakMaturityDate
          ? Math.max(
              0,
              Math.ceil(
                (breakMaturityDate - new Date()) / (1000 * 60 * 60 * 24)
              )
            )
          : 0;

        return (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-semibold text-red-900">
                  Break RD Account
                </span>
              </div>
              <p className="text-xs text-red-700 mt-1">
                Early closure of RD account with penalty charges
              </p>
            </div>

            {/* Warning Alert */}
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">
                    Early Withdrawal Warning
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Breaking your RD account before maturity will result in
                    penalty charges. You will receive: Principal + Interest -
                    Penalty.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Account Details */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Current Balance:
                </span>
                <span className="text-base font-bold text-blue-600">
                  ₹
                  {breakCurrentBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              {breakMaturityDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Days Remaining to Maturity:
                  </span>
                  <span className="text-sm font-semibold text-red-600">
                    {daysRemainingToMaturity} days
                  </span>
                </div>
              )}
            </div>

            {/* Break RD Calculation */}
            {breakCurrentBalance > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 text-center">
                  Break RD Calculation
                </h4>

                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Principal Amount:
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    ₹
                    {breakCurrentBalance.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {daysElapsed > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Interest Earned ({daysElapsed} days):
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      ₹
                      {interestEarnedSoFar.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Early Withdrawal Penalty ({penaltyRate}%):
                  </span>
                  <span className="text-sm font-semibold text-red-600">
                    - ₹
                    {penaltyAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="bg-green-50 rounded-lg p-3 mt-3 border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-900">
                      Amount You Will Receive:
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      ₹
                      {Math.max(0, amountAfterBreak).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {amountAfterBreak < breakCurrentBalance && (
                  <div className="bg-red-50 rounded-lg p-3 mt-2 border border-red-200">
                    <p className="text-xs text-red-700">
                      <strong>Note:</strong> You will receive less than your
                      principal amount due to penalty charges.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Breaking RD (Optional)
              </label>
              <textarea
                value={modalData.reason || ""}
                onChange={(e) =>
                  setModalData({ ...modalData, reason: e.target.value })
                }
                placeholder="Please provide a reason for breaking the RD account"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : null}
                <span>Confirm Break RD</span>
              </button>
            </div>
          </div>
        );

      case "schedule":
        // Loan EMI Schedule Modal
        const outstandingBalance = selectedAccount?.balance
          ? Math.abs(selectedAccount.balance)
          : 0;
        const loanPrincipal =
          selectedAccount?.snapshot_loan_principal || outstandingBalance;
        const monthlyEMI = selectedAccount?.snapshot_emi_amount || 0;
        const totalEMIs = selectedAccount?.snapshot_loan_term_months || 12;
        const paidEMIs = selectedAccount?.paid_emis_count || 0;
        const nextPaymentDate = selectedAccount?.next_payment_date || null;
        const interestRate =
          selectedAccount?.effective_interest_rate ||
          selectedAccount?.snapshot_interest_rate ||
          0;
        const repaymentFreq =
          selectedAccount?.snapshot_repayment_frequency || "monthly";

        return (
          <div className="space-y-4">
            <div className="bg-indigo-50 rounded-xl p-4 mb-4 border border-indigo-200">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-900">
                  EMI Payment Schedule
                </span>
              </div>
              <p className="text-xs text-indigo-700 mt-1">
                Complete payment schedule for your loan
              </p>
            </div>

            {/* Loan Summary */}
            {scheduleSummary && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">
                  Loan Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Principal Amount:</p>
                    <p className="font-bold text-gray-900">
                      ₹
                      {scheduleSummary.principal?.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Outstanding Balance:</p>
                    <p className="font-bold text-red-600">
                      ₹
                      {scheduleSummary.outstanding_balance?.toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      ) || "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Monthly EMI:</p>
                    <p className="font-bold text-orange-600">
                      ₹
                      {scheduleSummary.emi_amount?.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Interest Rate:</p>
                    <p className="font-bold text-gray-900">
                      {scheduleSummary.interest_rate?.toFixed(2) || "0"}% p.a.
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total EMIs:</p>
                    <p className="font-bold text-gray-900">
                      {scheduleSummary.total_emis || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Paid EMIs:</p>
                    <p className="font-bold text-green-600">
                      {scheduleSummary.paid_emis || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Remaining EMIs:</p>
                    <p className="font-bold text-blue-600">
                      {scheduleSummary.remaining_emis || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Next Payment:</p>
                    <p className="font-bold text-indigo-600">
                      {scheduleSummary.next_payment_date
                        ? new Date(
                            scheduleSummary.next_payment_date
                          ).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* EMI Schedule Table */}
            {scheduleLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-indigo-600"></div>
              </div>
            ) : emiSchedule.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <div
                    className={`overflow-y-auto ${
                      emiSchedule.length > 12 ? "max-h-[500px]" : "max-h-none"
                    }`}
                  >
                    <table className="w-full">
                      <thead className="bg-indigo-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-900 uppercase tracking-wider bg-indigo-50">
                            EMI #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-900 uppercase tracking-wider bg-indigo-50">
                            Due Date
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-indigo-900 uppercase tracking-wider bg-indigo-50">
                            EMI Amount
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-indigo-900 uppercase tracking-wider bg-indigo-50">
                            Principal
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-indigo-900 uppercase tracking-wider bg-indigo-50">
                            Interest
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-indigo-900 uppercase tracking-wider bg-indigo-50">
                            Remaining
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-indigo-900 uppercase tracking-wider bg-indigo-50">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {emiSchedule.map((emi, index) => {
                          const dueDate = new Date(emi.payment_date);
                          const isOverdue = emi.is_overdue;
                          const isPaid = emi.is_paid;
                          const statusClass = isPaid
                            ? "bg-green-100 text-green-800"
                            : isOverdue
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800";
                          const statusText = isPaid
                            ? "Paid"
                            : isOverdue
                            ? "Overdue"
                            : "Pending";

                          return (
                            <tr
                              key={index}
                              className={`hover:bg-gray-50 ${
                                isPaid
                                  ? "opacity-75"
                                  : isOverdue
                                  ? "bg-red-50"
                                  : ""
                              }`}
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {emi.emi_number}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {dueDate.toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                ₹
                                {emi.emi_amount?.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }) || "0"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                ₹
                                {emi.principal_component?.toLocaleString(
                                  "en-IN",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                ) || "0"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                ₹
                                {emi.interest_component?.toLocaleString(
                                  "en-IN",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                ) || "0"}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                ₹
                                {emi.remaining_principal?.toLocaleString(
                                  "en-IN",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                ) || "0"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClass}`}
                                >
                                  {statusText}
                                </span>
                                {isPaid && emi.paid_date && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Paid:{" "}
                                    {new Date(emi.paid_date).toLocaleDateString(
                                      "en-IN"
                                    )}
                                  </p>
                                )}
                                {isPaid && emi.paid_amount > 0 && (
                                  <p className="text-xs text-gray-500">
                                    ₹{emi.paid_amount.toLocaleString("en-IN")}
                                  </p>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                {emiSchedule.length > 12 && (
                  <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-600">
                      Showing {emiSchedule.length} EMIs. Scroll to view all.
                    </p>
                  </div>
                )}
              </div>
            ) : scheduleSummary?.debug ? (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-sm font-semibold text-yellow-800 mb-2">
                  EMI Schedule Not Available
                </p>
                <p className="text-xs text-yellow-700 mb-3">
                  The loan account may be missing required information. Please
                  ensure:
                </p>
                <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
                  <li>Loan principal amount is set</li>
                  <li>EMI amount is calculated</li>
                  <li>Loan term (months) is specified</li>
                  <li>Start date is set</li>
                </ul>
                {scheduleSummary.debug && (
                  <div className="mt-3 pt-3 border-t border-yellow-300 text-xs text-yellow-600">
                    <p>Debug Info:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>
                        Has Principal:{" "}
                        {scheduleSummary.debug.has_principal ? "Yes" : "No"}
                      </li>
                      <li>
                        Has EMI Amount:{" "}
                        {scheduleSummary.debug.has_emi_amount ? "Yes" : "No"}
                      </li>
                      <li>
                        Has Term Months:{" "}
                        {scheduleSummary.debug.has_term_months ? "Yes" : "No"}
                      </li>
                      <li>
                        Has Start Date:{" "}
                        {scheduleSummary.debug.has_start_date ? "Yes" : "No"}
                      </li>
                      <li>
                        Balance: ₹
                        {scheduleSummary.debug.balance?.toLocaleString(
                          "en-IN"
                        ) || "0"}
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 text-center">
                <p className="text-sm text-yellow-800">
                  No EMI schedule available. Please contact support.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setModalType("repay");
                  setModalData({});
                }}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Make Payment
              </button>
            </div>
          </div>
        );

      case "apply_loan":
        // Loan Application Modal
        const loanAmount = parseFloat(modalData.amount) || 0;
        const loanTermMonthsCalc =
          modalData.termType === "years"
            ? (parseFloat(modalData.term) || 1) * 12
            : parseFloat(modalData.term) || 12;
        const loanInterestRate = loanAccountType?.interest_rate || 12;
        const loanParams = loanAccountType?.loan_parameters || {};
        const minLoanAmount = loanParams?.min_loan_amount || 10000;
        const maxLoanAmount = loanParams?.max_loan_amount || 1000000;
        const defaultRepaymentFreq =
          loanParams?.repayment_frequency || "monthly";

        // Calculate EMI preview
        const calculateEMIPreview = (principal, rate, months) => {
          if (!principal || !rate || !months) return 0;
          const monthlyRate = rate / 100 / 12;
          if (monthlyRate === 0) return principal / months;
          const emi =
            (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
            (Math.pow(1 + monthlyRate, months) - 1);
          return emi;
        };

        const emiPreview = calculateEMIPreview(
          loanAmount,
          loanInterestRate,
          loanTermMonthsCalc
        );
        const totalAmount = emiPreview * loanTermMonthsCalc;
        const totalInterest = totalAmount - loanAmount;

        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 mb-4 border border-red-200">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-red-600" />
                <span className="text-sm font-semibold text-red-900">
                  Loan Application
                </span>
              </div>
              <p className="text-xs text-red-700 mt-1">
                Apply for a loan with competitive interest rates
              </p>
            </div>

            {/* Loan Terms Info */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-600">Interest Rate</p>
                  <p className="text-base font-bold text-gray-900">
                    {loanInterestRate}% p.a.
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Repayment Frequency</p>
                  <p className="text-base font-semibold text-gray-900 capitalize">
                    {defaultRepaymentFreq}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <p className="text-xs text-gray-600">
                  Loan Amount Range: ₹{minLoanAmount.toLocaleString("en-IN")} -
                  ₹{maxLoanAmount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* Loan Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Loan Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="1000"
                min={minLoanAmount}
                max={maxLoanAmount}
                value={modalData.amount || ""}
                onChange={(e) =>
                  setModalData({ ...modalData, amount: e.target.value })
                }
                placeholder={`Enter loan amount (Min: ₹${minLoanAmount.toLocaleString(
                  "en-IN"
                )})`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              />
              {loanAmount > 0 && (
                <div className="mt-1 text-xs text-gray-600">
                  {loanAmount < minLoanAmount
                    ? `Minimum loan amount is ₹${minLoanAmount.toLocaleString(
                        "en-IN"
                      )}`
                    : loanAmount > maxLoanAmount
                    ? `Maximum loan amount is ₹${maxLoanAmount.toLocaleString(
                        "en-IN"
                      )}`
                    : "Valid loan amount"}
                </div>
              )}
            </div>

            {/* Loan Term */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Loan Term (Months) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="1"
                  min="1"
                  max={modalData.termType === "years" ? "10" : "120"}
                  value={
                    modalData.term || (modalData.termType === "years" ? 1 : 12)
                  }
                  onChange={(e) =>
                    setModalData({ ...modalData, term: e.target.value })
                  }
                  placeholder={
                    modalData.termType === "years"
                      ? "Enter term in years"
                      : "Enter term in months"
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                />
                <select
                  value={modalData.termType || "months"}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const currentTerm =
                      parseFloat(modalData.term) ||
                      (newType === "years" ? 1 : 12);
                    // Convert term when switching between months and years
                    const convertedTerm =
                      newType === "years"
                        ? Math.round((currentTerm / 12) * 10) / 10 // Round to 1 decimal
                        : Math.round(currentTerm * 12);
                    setModalData({
                      ...modalData,
                      termType: newType,
                      term: convertedTerm,
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                >
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
              {modalData.termType === "years" && modalData.term && (
                <p className="mt-1 text-xs text-gray-600">
                  {modalData.term}{" "}
                  {parseFloat(modalData.term) === 1 ? "year" : "years"} ={" "}
                  {Math.round(parseFloat(modalData.term) * 12)} months
                </p>
              )}
            </div>

            {/* Quick Term Buttons */}
            <div className="flex gap-2 flex-wrap">
              {[6, 12, 24, 36, 48, 60].map((months) => (
                <button
                  key={months}
                  onClick={() =>
                    setModalData({
                      ...modalData,
                      term: months,
                      termType: "months",
                    })
                  }
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                    (parseInt(modalData.term) || 12) === months &&
                    modalData.termType !== "years"
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {months}M
                </button>
              ))}
            </div>

            {/* EMI Preview */}
            {loanAmount >= minLoanAmount &&
              loanAmount <= maxLoanAmount &&
              loanTermMonthsCalc > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-900 mb-3">
                    Loan Preview
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Principal Amount:
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        ₹
                        {loanAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Monthly EMI:
                      </span>
                      <span className="text-base font-bold text-green-600">
                        ₹
                        {emiPreview.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Total Interest:
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        ₹
                        {totalInterest.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-green-200">
                      <span className="text-sm font-semibold text-gray-700">
                        Total Amount Payable:
                      </span>
                      <span className="text-base font-bold text-gray-900">
                        ₹
                        {totalAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Loan Term:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {loanTermMonthsCalc} months (
                        {(loanTermMonthsCalc / 12).toFixed(1)} years)
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* Terms and Conditions */}
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> By applying for this loan, you agree to
                the terms and conditions. The loan will be processed after
                approval. Interest rates and terms are subject to change.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={
                  !loanAmount ||
                  loanAmount < minLoanAmount ||
                  loanAmount > maxLoanAmount ||
                  !loanTermMonthsCalc ||
                  loanTermMonthsCalc <= 0
                }
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                  !loanAmount ||
                  loanAmount < minLoanAmount ||
                  loanAmount > maxLoanAmount ||
                  !loanTermMonthsCalc ||
                  loanTermMonthsCalc <= 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                Apply for Loan
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">No action available</p>
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Close
            </button>
          </div>
        );
    }
  };

  const getAccountTypeFeatures = (accountType, account = null) => {
    // Use real account data if available, otherwise use defaults
    const realBalance = account?.balance
      ? `₹${account.balance.toLocaleString()}`
      : "₹0";
    const realMaturityDate = account?.maturity_date
      ? new Date(account.maturity_date).toLocaleDateString()
      : null;

    const typeName =
      typeof accountType === "string"
        ? accountType
        : accountType?.account_type || accountType;
    switch (typeName?.toLowerCase()) {
      case "savings":
        return {
          title: "Savings Account",
          description: "Daily banking with deposits and withdrawals",
          balance: realBalance,
          features: [
            "Deposit money",
            "Withdraw money",
            "Check balance",
            "View history",
          ],
          actions: [
            {
              type: "deposit",
              label: "Deposit",
              icon: ArrowDownLeft,
              color: "bg-emerald-600 hover:bg-emerald-700",
            },
            {
              type: "withdraw",
              label: "Withdraw",
              icon: ArrowUpRight,
              color: "bg-orange-600 hover:bg-orange-700",
            },
          ],
        };
      case "rd":
        // Calculate contribution progress based on installments made vs total installments
        // Progress = (Installments Made / Total Installments) × 100
        let contributionProgress = 0;
        if (
          account?.maturity_date &&
          account?.start_date &&
          account?.balance >= 0
        ) {
          const maturityDate = new Date(account.maturity_date);
          const startDate = new Date(account.start_date);
          const contributionFrequency =
            account?.snapshot_contribution_frequency || "monthly";
          const minContribution =
            account?.snapshot_min_contribution_amount || 0;

          // Determine committed contribution amount (same logic as in contribute modal)
          let committedAmount = minContribution;
          const balance = account.balance || 0;
          if (balance > 0) {
            const commonAmounts = [500, 1000, 1500, 2000, 2500, 5000, 10000];
            if (commonAmounts.includes(balance)) {
              committedAmount = balance;
            } else {
              for (const commonAmount of commonAmounts) {
                if (balance % commonAmount === 0) {
                  const numContributions = balance / commonAmount;
                  if (numContributions >= 1 && numContributions <= 12) {
                    committedAmount = commonAmount;
                    break;
                  }
                }
              }
              if (
                committedAmount === minContribution &&
                balance >= minContribution &&
                balance <= minContribution * 2
              ) {
                committedAmount = balance;
              }
            }
          }

          // Calculate total installments expected
          const totalDays = Math.ceil(
            (maturityDate - startDate) / (1000 * 60 * 60 * 24)
          );

          // Calculate installments based on contribution frequency
          let totalInstallments = 0;
          if (contributionFrequency === "daily") {
            totalInstallments = totalDays;
          } else if (contributionFrequency === "weekly") {
            totalInstallments = Math.ceil(totalDays / 7);
          } else if (contributionFrequency === "monthly") {
            totalInstallments = Math.ceil(totalDays / 30.44); // Average days per month
          } else if (contributionFrequency === "quarterly") {
            totalInstallments = Math.ceil(totalDays / 91.25); // Average days per quarter
          } else {
            // Default to monthly
            totalInstallments = Math.ceil(totalDays / 30.44);
          }

          // Calculate installments made (based on balance and committed amount)
          let installmentsMade = 0;
          if (committedAmount > 0 && balance > 0) {
            installmentsMade = Math.floor(balance / committedAmount);
          } else if (balance === 0) {
            installmentsMade = 0;
          }

          // Calculate progress percentage
          if (totalInstallments > 0) {
            contributionProgress = Math.min(
              100,
              Math.max(0, (installmentsMade / totalInstallments) * 100)
            );
          }
        }

        return {
          title: "Recurring Deposit",
          description: "Monthly contributions with maturity benefits",
          balance: realBalance,
          maturityDate: realMaturityDate || "Not set",
          contributionProgress: contributionProgress,
          features: [
            "Monthly contributions",
            "Maturity tracking",
            "Progress monitoring",
            "Interest calculation",
          ],
          actions: [
            {
              type: "contribute",
              label: "Monthly Contribution",
              icon: DollarSign,
              color: "bg-blue-600 hover:bg-blue-700",
            },
            {
              type: "maturity",
              label: "Maturity Details",
              icon: Calendar,
              color: "bg-green-600 hover:bg-green-700",
            },
            {
              type: "calculate",
              label: "Calculate Returns",
              icon: Calculator,
              color: "bg-purple-600 hover:bg-purple-700",
            },
            {
              type: "break_rd",
              label: "Break RD",
              icon: AlertCircle,
              color: "bg-red-600 hover:bg-red-700",
            },
          ],
        };
      case "fd":
        // FD: One-time deposit when balance is 0, then maturity tracking and break FD
        const fdBalance = account?.balance || 0;
        const fdActions = [];

        if (fdBalance === 0) {
          // No deposit yet - show deposit and calculate actions (calculate helps customer before investing)
          fdActions.push(
            {
              type: "deposit",
              label: "Make Initial Deposit",
              icon: DollarSign,
              color: "bg-emerald-600 hover:bg-emerald-700",
            },
            {
              type: "calculate",
              label: "Calculate Returns",
              icon: Calculator,
              color: "bg-indigo-600 hover:bg-indigo-700",
            }
          );
        } else {
          // Deposit made - show maturity, calculate, and break FD
          fdActions.push(
            {
              type: "maturity",
              label: "Maturity Details",
              icon: Calendar,
              color: "bg-green-600 hover:bg-green-700",
            },
            {
              type: "calculate",
              label: "Calculate Returns",
              icon: Calculator,
              color: "bg-indigo-600 hover:bg-indigo-700",
            },
            {
              type: "break_fd",
              label: "Break FD",
              icon: AlertCircle,
              color: "bg-red-600 hover:bg-red-700",
            }
          );
        }

        return {
          title: "Fixed Deposit",
          description:
            fdBalance === 0
              ? "Make a one-time deposit to start your FD"
              : "Fixed term investment with guaranteed returns",
          balance: realBalance,
          maturityDate: realMaturityDate || "Not set",
          interestRate:
            account?.effective_interest_rate ||
            account?.snapshot_interest_rate ||
            0,
          lockInPeriod: account?.snapshot_lock_in_period_days
            ? `${Math.round(
                account.snapshot_lock_in_period_days / 30.44
              )} months`
            : "Not set",
          features: [
            "One-time deposit",
            "Fixed interest rate",
            "Maturity tracking",
            fdBalance > 0
              ? "Early withdrawal available (with penalty)"
              : "Lock-in period",
          ],
          actions: fdActions,
        };
      case "loan":
        // Check if there's an outstanding balance (negative balance means outstanding loan)
        const loanBalance = account?.balance || 0;
        const hasOutstandingBalance = loanBalance < 0;
        const outstandingAmount = hasOutstandingBalance
          ? Math.abs(loanBalance)
          : 0;

        // Calculate loan details if there's an outstanding balance
        const loanEMIAmount = account?.snapshot_emi_amount || 0;
        const loanNextPaymentDate = account?.next_payment_date
          ? new Date(account.next_payment_date).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "Not set";

        const loanInterestRate =
          account?.effective_interest_rate ||
          account?.snapshot_interest_rate ||
          0;

        // If no outstanding balance, show loan application
        if (!hasOutstandingBalance) {
          return {
            title: "Loan Account",
            description: "Apply for a loan with flexible repayment options",
            balance: "₹0",
            outstandingBalance: "₹0",
            monthlyEMI: "Not applied",
            nextDueDate: "N/A",
            interestRate: "N/A",
            hasOutstandingBalance: false,
            features: [
              "Flexible repayment terms",
              "Competitive interest rates",
              "Quick approval process",
              "EMI calculator",
            ],
            actions: [
              {
                type: "apply_loan",
                label: "Apply for Loan",
                icon: CreditCard,
                color: "bg-red-600 hover:bg-red-700",
              },
            ],
          };
        }

        // If has outstanding balance, show loan management
        return {
          title: "Loan Account",
          description: "Track repayments and outstanding balance",
          balance: `₹${outstandingAmount.toLocaleString("en-IN")}`,
          outstandingBalance: `₹${outstandingAmount.toLocaleString("en-IN")}`,
          monthlyEMI:
            loanEMIAmount > 0
              ? `₹${loanEMIAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "Not calculated",
          nextDueDate: loanNextPaymentDate,
          interestRate: `${loanInterestRate.toFixed(2)}% p.a.`,
          hasOutstandingBalance: true,
          features: [
            "Outstanding balance tracking",
            "EMI schedule management",
            "Payment history",
            "Interest calculation",
          ],
          actions: [
            {
              type: "repay",
              label: "Make Payment",
              icon: DollarSign,
              color: "bg-red-600 hover:bg-red-700",
            },
            {
              type: "schedule",
              label: "EMI Schedule",
              icon: Calendar,
              color: "bg-orange-600 hover:bg-orange-700",
            },
            {
              type: "balance",
              label: "Balance Details",
              icon: TrendingUp,
              color: "bg-blue-600 hover:bg-blue-700",
            },
          ],
        };
      default:
        return {
          title:
            accountTypeName?.charAt(0).toUpperCase() +
            accountTypeName?.slice(1),
          description: "Account management",
          balance: "₹0",
          features: ["View details"],
          actions: [
            {
              type: "view",
              label: "View Details",
              icon: Eye,
              color: "bg-gray-600 hover:bg-gray-700",
            },
          ],
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            My Accounts
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchMyAccounts}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
              <Wallet className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">
                {accounts.length} Account{accounts.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
        <p className="text-gray-600">
          Manage and monitor all your banking accounts in one place
        </p>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Accounts Assigned
          </h3>
          <p className="text-gray-500">
            You don't have any account types assigned yet. Contact your manager
            for account assignment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {accounts.map((account, index) => {
            const accountType = account.account_type || account; // Support both old and new format
            const accountTypeName =
              typeof accountType === "string"
                ? accountType
                : accountType?.toLowerCase?.() || accountType;
            const Icon = getAccountTypeIcon(accountType);
            const colors = getAccountTypeColor(accountType);
            const features = getAccountTypeFeatures(accountType, account);

            return (
              <div
                key={index}
                className={`${colors.bg} border-2 ${colors.border} rounded-2xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group`}
              >
                {/* Icon & Type */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-br ${colors.accent} shadow-md`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition" />
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {features.title}
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  {features.description}
                </p>

                {/* Balance */}
                <div className="bg-white bg-opacity-60 rounded-lg p-3 mb-4 border border-white border-opacity-50">
                  <p className="text-xs text-gray-600 font-medium">
                    Current Balance
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    ₹{account.balance ? account.balance.toLocaleString() : "0"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Account #{account.id}
                  </p>
                  {/* Additional Info for specific account types */}
                  {accountTypeName?.toLowerCase() === "rd" &&
                    features.maturityDate && (
                      <div className="mt-2 pt-2 border-t border-white border-opacity-30">
                        <p className="text-xs text-gray-600">
                          Maturity: {features.maturityDate}
                        </p>
                        {account?.snapshot_min_contribution_amount > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            Min contribution: ₹
                            {account.snapshot_min_contribution_amount.toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        )}
                        <div className="mt-1">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>
                              {features.contributionProgress.toFixed(2)}%
                            </span>
                          </div>
                          <div className="w-full bg-white bg-opacity-40 rounded-full h-1">
                            <div
                              className="bg-blue-500 h-1 rounded-full"
                              style={{
                                width: `${features.contributionProgress}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  {accountTypeName?.toLowerCase() === "fd" &&
                    features.maturityDate && (
                      <div className="mt-2 pt-2 border-t border-white border-opacity-30">
                        <p className="text-xs text-gray-600">
                          Maturity: {features.maturityDate}
                        </p>
                        <p className="text-xs text-gray-600">
                          Rate: {features.interestRate}
                        </p>
                      </div>
                    )}
                  {accountTypeName?.toLowerCase() === "loan" &&
                    (features.hasOutstandingBalance ? (
                      <div className="mt-2 pt-2 border-t border-white border-opacity-30">
                        <p className="text-xs text-gray-600">
                          Outstanding: {features.outstandingBalance}
                        </p>
                        <p className="text-xs text-gray-600">
                          EMI: {features.monthlyEMI}
                        </p>
                        {features.nextDueDate &&
                          features.nextDueDate !== "N/A" && (
                            <p className="text-xs text-gray-600">
                              Next Due: {features.nextDueDate}
                            </p>
                          )}
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-white border-opacity-30">
                        <p className="text-xs text-orange-600 font-medium">
                          No active loan
                        </p>
                        <p className="text-xs text-gray-600">
                          Click "Apply for Loan" to get started
                        </p>
                      </div>
                    ))}
                </div>

                {/* Features */}
                <div className="space-y-2 mb-5">
                  {features.features.slice(0, 2).map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-gray-700"
                    >
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {features.actions.map((action, idx) => {
                    // Check if this is a loan repayment action and if payment date has arrived
                    const isRepayAction = action.type === "repay";
                    const isPaymentDateReached = isRepayAction
                      ? (() => {
                          if (!account?.next_payment_date) return false;
                          const nextPaymentDate = new Date(
                            account.next_payment_date
                          );
                          const today = new Date();
                          // Set time to midnight for date comparison
                          today.setHours(0, 0, 0, 0);
                          nextPaymentDate.setHours(0, 0, 0, 0);
                          return today >= nextPaymentDate;
                        })()
                      : true;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleAction(account, action.type)}
                        disabled={isRepayAction && !isPaymentDateReached}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-semibold text-sm transition-all duration-200 ${
                          action.color
                        } ${
                          isRepayAction && !isPaymentDateReached
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        title={
                          isRepayAction && !isPaymentDateReached
                            ? `Payment available from ${
                                account?.next_payment_date
                                  ? new Date(
                                      account.next_payment_date
                                    ).toLocaleDateString("en-IN", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "next payment date"
                              }`
                            : ""
                        }
                      >
                        <action.icon className="h-4 w-4" />
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (selectedAccount || modalType === "apply_loan") && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-none">
          <div
            className={`bg-white rounded-2xl shadow-2xl ${
              modalType === "schedule" ? "max-w-2xl" : "max-w-lg"
            } w-full p-6 max-h-[90vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {getModalTitle()}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {renderModalContent()}
          </div>
        </div>
      )}

      {/* Transaction History Section */}
      {accounts.length > 0 && (
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Recent Transactions
            </h2>
            <p className="text-gray-600">
              View your recent banking activity and transaction history
            </p>
          </div>
          <TransactionHistory />
        </div>
      )}
    </div>
  );
}

// Transaction History Component
function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (accounts.length > 0) {
      fetchTransactions();
    }
  }, [selectedAccount, accounts]);

  const fetchAccounts = async () => {
    try {
      const response = await api.post("/accounts/list", {});
      if (response.data.success) {
        setAccounts(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedAccount(response.data.data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        `/accounts/${selectedAccount}/transactions`,
        {
          page: 1,
          limit: 10,
        }
      );
      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
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
    return new Date(dateString).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Account Selector */}
      {accounts.length > 1 && (
        <div className="p-4 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_type_name} - Balance: ₹
                {account.balance?.toLocaleString() || 0}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Transactions Found
          </h3>
          <p className="text-gray-500">
            No transactions have been recorded for this account yet.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {transactions.map((transaction) => {
            const Icon = getTransactionIcon(transaction.transaction_type);
            const typeColor = getTransactionColor(transaction.transaction_type);

            return (
              <div
                key={transaction.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full ${typeColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {transaction.transaction_type.replace("_", " ")}
                      </div>
                      <div className="text-xs text-gray-500">
                        {transaction.description ||
                          transaction.reference_number}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-semibold ${
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
                    <div className="text-xs text-gray-500">
                      {formatDate(transaction.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View All Link */}
      {transactions.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <button
            onClick={() => (window.location.href = "/my-transactions")}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            View All Transactions →
          </button>
        </div>
      )}
    </div>
  );
}

export default MyAccounts;
