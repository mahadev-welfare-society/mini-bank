import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

function CustomerForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "staff",
    password: "",
    account_types: [],
    assigned_manager_id: null,
    address_village: "",
    address_post_office: "",
    address_tehsil: "",
    address_district: "",
    address_state: "",
    address_pincode: "",
  });
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [managers, setManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    // Only admin can see and change manager assignment
    if (user?.role === "admin") {
      fetchManagers();
    }
    if (id) {
      setIsEdit(true);
      fetchCustomer();
    }
  }, [id, user]);

  const fetchManagers = async () => {
    try {
      setLoadingManagers(true);
      const response = await api.post("/user-management/managers");
      if (response.data.success) {
        setManagers(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    } finally {
      setLoadingManagers(false);
    }
  };

  const fetchCustomer = async () => {
    try {
      const response = await api.post(`/customers/get/${id}`);
      if (response.data.success) {
        const customer = response.data.data;
        setFormData({
          name: customer.name,
          email: customer.email,
          phone: customer.phone || "",
          role: customer.role || "staff",
          password: "", // Don't show existing password
          account_types: customer.account_types || [],
          assigned_manager_id: customer.assigned_manager_id || null,
          address_village: customer.address_village || "",
          address_post_office: customer.address_post_office || "",
          address_tehsil: customer.address_tehsil || "",
          address_district: customer.address_district || "",
          address_state: customer.address_state || "",
          address_pincode: customer.address_pincode || "",
        });
      } else {
        toast.error("Customer not found");
        navigate("/customers");
      }
    } catch (error) {
      toast.error("Error fetching customer");
      navigate("/customers");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format phone number (remove non-digits, limit to 10)
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "");
      formattedValue = digitsOnly.slice(0, 10);
    }

    // Pincode: numbers only, max 6 digits
    if (name === "address_pincode") {
      formattedValue = value.replace(/\D/g, "").slice(0, 6);
    }

    setFormData({
      ...formData,
      [name]: formattedValue,
    });

    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: null,
      });
    }

    // Real-time validation feedback
    if (name === "email" && value) {
      if (!validateEmail(value)) {
        setValidationErrors({
          ...validationErrors,
          email: "Please enter a valid email address",
        });
      }
    } else if (name === "phone" && formattedValue) {
      if (!validatePhone(formattedValue)) {
        setValidationErrors({
          ...validationErrors,
          phone: "Phone number must be exactly 10 digits",
        });
      }
    } else if (name === "password" && value) {
      const passwordValidation = validatePassword(value);
      if (!passwordValidation.valid) {
        setValidationErrors({
          ...validationErrors,
          password: passwordValidation.message,
        });
      } else {
        setValidationErrors({
          ...validationErrors,
          password: null,
        });
      }
    } else if (name === "address_pincode" && formattedValue.length < 6) {
      setValidationErrors({
        ...validationErrors,
        address_pincode: "Pincode must be 6 digits",
      });
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length === 10;
  };

  const validatePassword = (password) => {
    // Password must be at least 8 characters, contain at least one uppercase, one lowercase, and one number
    if (!password || password.length < 8) {
      return {
        valid: false,
        message: "Password must be at least 8 characters long",
      };
    }
    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one uppercase letter",
      };
    }
    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one lowercase letter",
      };
    }
    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one number",
      };
    }
    return { valid: true, message: "" };
  };

  const validateForm = () => {
    // Name validation
    if (!formData.name || formData.name.trim().length < 2) {
      toast.error("Name must be at least 2 characters long");
      return false;
    }

    // Email validation - optional
    if (formData.email && !validateEmail(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    // Phone validation
    if (!formData.phone || !validatePhone(formData.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return false;
    }

    // Pincode is mandatory
    if (!formData.address_pincode || formData.address_pincode.length !== 6) {
      toast.error("Pincode is required and must be 6 digits");
      return false;
    }

    // Address validation (optional but if provided, should be meaningful)
    if (formData.address && formData.address.trim().length < 5) {
      toast.error("Address must be at least 5 characters long");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let response;
      let dataToSend = { ...formData };

      // Format phone number (remove non-digits, ensure it's 10 digits)
      if (dataToSend.phone) {
        dataToSend.phone = dataToSend.phone.replace(/\D/g, "");
      }

      // For edit mode, only send password if it's provided
      if (isEdit && !dataToSend.password) {
        delete dataToSend.password;
      }

      // For managers creating customers, don't send assigned_manager_id
      // (backend will auto-assign to the creating manager)
      if (!isEdit && user?.role === "manager") {
        delete dataToSend.assigned_manager_id;
      }

      // Only admin can set assigned_manager_id
      if (user?.role !== "admin") {
        delete dataToSend.assigned_manager_id;
      }

      if (isEdit) {
        response = await api.put(`/customers/${id}`, dataToSend);
      } else {
        response = await api.post("/customers", dataToSend);
      }

      if (response.data.success) {
        toast.success(
          `Customer ${isEdit ? "updated" : "created"} successfully`
        );
        navigate("/customers");
      } else {
        // Show error message from backend
        const errorMessage = response.data.message || "Failed to save customer";
        toast.error(errorMessage);

        // If there are protected account types, show additional info
        if (response.data.data?.protected_account_types) {
          const protectedTypes =
            response.data.data.protected_account_types.join(", ");
          toast.error(
            `Cannot remove account types: ${protectedTypes}. Please close all active accounts first.`,
            {
              duration: 5000,
            }
          );
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Check if user can create (admin always can, manager needs permission)
  const { canCreate } = usePermissions();
  const canCreateCustomer =
    user?.role === "admin" ||
    (user?.role === "manager" && canCreate("customers_management"));

  if (!isEdit && !canCreateCustomer) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="text-gray-500">
          You don't have permission to create customers.
        </p>
        <button
          onClick={() => navigate("/customers")}
          className="mt-4 btn-primary"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
          {isEdit ? "Edit Customer" : "Add New Customer"}
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          {isEdit ? "Update customer information" : "Enter customer details"}
        </p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-6"
          autoComplete="off"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <User className="inline h-4 w-4 mr-1" />
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="input-field"
                placeholder="Enter customer's full name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Mail className="inline h-4 w-4 mr-1" />
                Email Address (Optional)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                // required
                className={`input-field ${
                  validationErrors.email
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                }`}
                placeholder="Enter customer's email (e.g., user@example.com)"
                value={formData.email}
                onChange={handleChange}
              />
              {validationErrors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Phone className="inline h-4 w-4 mr-1" />
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className={`input-field ${
                  validationErrors.phone
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                }`}
                required
                placeholder="Enter 10-digit phone number"
                value={formData.phone}
                onChange={handleChange}
                maxLength={10}
                pattern="[0-9]{10}"
              />
              {validationErrors.phone && (
                <p className="mt-1 text-xs text-red-600">
                  {validationErrors.phone}
                </p>
              )}
              {formData.phone &&
                formData.phone.length === 10 &&
                !validationErrors.phone && (
                  <p className="mt-1 text-xs text-green-600">
                    ✓ Valid phone number
                  </p>
                )}
            </div>

            {/* Assigned Manager - Only for Admin */}
            {user?.role === "admin" && (
              <div>
                <label
                  htmlFor="assigned_manager_id"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  <User className="inline h-4 w-4 mr-1" />
                  Assign Manager (Optional)
                </label>
                <select
                  id="assigned_manager_id"
                  name="assigned_manager_id"
                  className="input-field"
                  value={formData.assigned_manager_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assigned_manager_id: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  disabled={loadingManagers}
                >
                  <option value="">No Manager Assigned</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Select a manager to assign this customer to. Only the assigned
                  manager and admin can manage this customer.
                </p>
              </div>
            )}
          </div>

          {/* Address */}
          <div className="">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Address
            </h3>
            <p className="text-gray-600 text-sm sm:text-base">
              Enter customer's address details
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Village / House No */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Village Name/ House No
              </label>
              <input
                type="text"
                name="address_village"
                className="input-field"
                value={formData.address_village}
                onChange={handleChange}
                placeholder="Enter village / house number"
              />
            </div>

            {/* Post Office */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Post Office
              </label>
              <input
                type="text"
                name="address_post_office"
                className="input-field"
                value={formData.address_post_office}
                onChange={handleChange}
                placeholder="Enter post office"
              />
            </div>

            {/* Tehsil (Taluka) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tehsil / Taluka
              </label>
              <input
                type="text"
                name="address_tehsil"
                className="input-field"
                value={formData.address_tehsil}
                onChange={handleChange}
                placeholder="Enter tehsil or taluka"
              />
            </div>

            {/* District */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District
              </label>
              <input
                type="text"
                name="address_district"
                className="input-field"
                value={formData.address_district}
                onChange={handleChange}
                placeholder="Enter district"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                name="address_state"
                className="input-field"
                value={formData.address_state}
                onChange={handleChange}
                placeholder="Enter state"
              />
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode *
              </label>
              <input
                type="text"
                name="address_pincode"
                className={`input-field ${
                  validationErrors.address_pincode
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                }`}
                value={formData.address_pincode}
                onChange={handleChange}
                placeholder="Enter 6-digit pincode"
                maxLength={6}
                required
              />
              {validationErrors.address_pincode && (
                <p className="mt-1 text-xs text-red-600">
                  {validationErrors.address_pincode}
                </p>
              )}
            </div>
          </div>

          {/* Address */}
          {/* <div className="-mt-4">
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              <MapPin className="inline h-4 w-4 mr-1" />
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              className="input-field"
              placeholder="Enter customer's address"
              value={formData.address}
              onChange={handleChange}
            />
          </div> */}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate("/customers")}
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
              <span className="hidden sm:inline">
                {isEdit ? "Update Customer" : "Create Customer"}
              </span>
              <span className="sm:hidden">{isEdit ? "Update" : "Create"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomerForm;
