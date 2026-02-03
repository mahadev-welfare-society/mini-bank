import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useAuth } from "../store/AuthContext";
import { api } from "../services/api";
import toast from "react-hot-toast";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  Plus,
  Edit,
  User,
  Eye,
  EyeOff,
  Check,
  X,
  Users,
  Key,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

function ManageAccess() {
  const { user } = useAuth();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManagerForm, setShowManagerForm] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [editingManager, setEditingManager] = useState(null);
  const [availableModules, setAvailableModules] = useState([]);
  const [managerPermissions, setManagerPermissions] = useState({});
  const [permissionsLastUpdated, setPermissionsLastUpdated] = useState(null);

  // Confirmation modal states for toggle active
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [managerToToggle, setManagerToToggle] = useState(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [managerForm, setManagerForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const [showManagerPassword, setShowManagerPassword] = useState(false);
  const [managerValidationErrors, setManagerValidationErrors] = useState({});

  const [permissionsForm, setPermissionsForm] = useState({});

  // Pagination for managers list
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchManagers();
      fetchAvailableModules();
    }
  }, [user]);

  // Prevent background scrolling when any modal is open
  useEffect(() => {
    const isAnyModalOpen =
      showManagerForm || showPermissionsModal || showToggleModal;

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
  }, [showManagerForm, showPermissionsModal, showToggleModal]);

  const fetchManagers = async () => {
    try {
      setLoading(true);
      const response = await api.post("/user-management/managers");
      if (response.data.success) {
        setManagers(response.data.data);
        setPage(1); // reset to first page on reload
      } else {
        toast.error("Failed to fetch managers");
      }
    } catch (error) {
      toast.error("Error fetching managers");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableModules = async () => {
    try {
      const response = await api.post("/user-management/modules");
      if (response.data.success) {
        setAvailableModules(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  };

  const fetchManagerPermissions = async (managerId) => {
    try {
      const response = await api.post(
        `/user-management/managers/${managerId}/permissions`
      );
      if (response.data.success) {
        const permissions = {};
        let lastUpdater = null;
        let lastUpdated = null;

        response.data.data.forEach((perm) => {
          permissions[perm.module] = {
            can_view: perm.can_view,
            can_create: perm.can_create,
            can_update: perm.can_update,
            can_delete: perm.can_delete,
          };
          // Track the most recent update
          if (perm.last_updater_name && perm.updated_at) {
            const permUpdated = new Date(perm.updated_at);
            if (!lastUpdated || permUpdated > lastUpdated) {
              lastUpdated = permUpdated;
              lastUpdater = perm.last_updater_name;
            }
          }
        });
        setManagerPermissions(permissions);
        setPermissionsLastUpdated({
          name: lastUpdater,
          date: lastUpdated,
        });
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    }
  };

  // Validation functions for manager form
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
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

  const validatePhone = (phone) => {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length === 10;
  };

  const validateManagerForm = (isEdit = false) => {
    const errors = {};

    // Name validation
    if (!managerForm.name || managerForm.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters long";
    }

    // Email validation
    if (managerForm.email && !validateEmail(managerForm.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Phone validation
    if (!managerForm.phone || !validatePhone(managerForm.phone)) {
      errors.phone = "Please enter a valid 10-digit phone number";
    }

    // Password validation
    if (!isEdit && !managerForm.password) {
      errors.password = "Password is required";
    } else if (managerForm.password) {
      const passwordValidation = validatePassword(managerForm.password);
      if (!passwordValidation.valid) {
        errors.password = passwordValidation.message;
      }
    }

    setManagerValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleManagerFormChange = (field, value) => {
    setManagerForm({
      ...managerForm,
      [field]: value,
    });

    // Clear validation error for this field
    if (managerValidationErrors[field]) {
      setManagerValidationErrors({
        ...managerValidationErrors,
        [field]: null,
      });
    }

    // Real-time validation
    if (field === "email" && value && value.length > 0) {
      if (!validateEmail(value)) {
        setManagerValidationErrors({
          ...managerValidationErrors,
          email: "Please enter a valid email address",
        });
      }
    } else if (field === "password" && value) {
      const passwordValidation = validatePassword(value);
      if (!passwordValidation.valid) {
        setManagerValidationErrors({
          ...managerValidationErrors,
          password: passwordValidation.message,
        });
      } else {
        setManagerValidationErrors({
          ...managerValidationErrors,
          password: null,
        });
      }
    } else if (field === "phone" && value) {
      if (!validatePhone(value)) {
        setManagerValidationErrors({
          ...managerValidationErrors,
          phone: "Please enter a valid 10-digit phone number",
        });
      }
    }
  };

  const handleCreateManager = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateManagerForm(false)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post("/user-management/managers/create", managerForm);
      if (response.data.success) {
        toast.success("Manager created successfully");
        setShowManagerForm(false);
        setManagerForm({ name: "", email: "", password: "", phone: "" });
        setManagerValidationErrors({});
        fetchManagers();
      } else {
        toast.error(response.data.message || "Failed to create manager");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error creating manager");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateManager = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateManagerForm(true)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: managerForm.name,
        email: managerForm.email,
        phone: managerForm.phone,
      };
      if (managerForm.password && managerForm.password.trim().length > 0) {
        payload.password = managerForm.password;
      }

      const response = await api.put(
        `/user-management/managers/${editingManager.id}`,
        payload
      );
      if (response.data.success) {
        toast.success("Manager updated successfully");
        setShowManagerForm(false);
        setEditingManager(null);
        setManagerForm({ name: "", email: "", password: "", phone: "" });
        setManagerValidationErrors({});
        fetchManagers();
      } else {
        toast.error(response.data.message || "Failed to update manager");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating manager");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = (manager) => {
    setManagerToToggle(manager);
    setShowToggleModal(true);
  };

  const confirmToggleActive = async () => {
    if (!managerToToggle) return;

    setIsToggling(true);
    try {
      const newActiveStatus = !managerToToggle.is_active;
      const response = await api.patch(
        `/user-management/managers/${managerToToggle.id}/toggle-active`,
        {
          is_active: newActiveStatus,
        }
      );

      if (response.data.success) {
        // Refresh managers list to get updated last_updater_name
        await fetchManagers();
        toast.success(
          response.data.message ||
            `Manager ${
              newActiveStatus ? "activated" : "deactivated"
            } successfully`
        );
        setShowToggleModal(false);
        setManagerToToggle(null);
      } else {
        toast.error(response.data.message || "Failed to toggle manager status");
      }
    } catch (error) {
      console.error("Failed to toggle manager status", error);
      toast.error(
        error.response?.data?.message || "Failed to toggle manager status"
      );
    } finally {
      setIsToggling(false);
    }
  };

  const cancelToggleActive = () => {
    setShowToggleModal(false);
    setManagerToToggle(null);
  };

  const handleOpenPermissions = async (manager) => {
    setSelectedManager(manager);
    setPermissionsLastUpdated(null); // Reset before fetching
    await fetchManagerPermissions(manager.id);
    setShowPermissionsModal(true);
  };

  const handleSavePermissions = async () => {
    try {
      const permissions = Object.entries(permissionsForm).map(
        ([module, perms]) => ({
          module,
          ...perms,
        })
      );

      const response = await api.put(
        `/user-management/managers/${selectedManager.id}/permissions`,
        {
          permissions,
        }
      );

      if (response.data.success) {
        toast.success("Permissions updated successfully");
        // Refresh permissions to get updated last_updater info
        await fetchManagerPermissions(selectedManager.id);
        // Don't close modal, just refresh the data
      } else {
        toast.error(response.data.message || "Failed to update permissions");
      }
      setShowPermissionsModal(false)
    } catch (error) {
      toast.error("Error updating permissions");
    }
  };

  const handleEditManager = (manager) => {
    setEditingManager(manager);
    setManagerForm({
      name: manager.name,
      email: manager.email,
      password: "",
      phone: manager.phone,
    });
    setShowManagerPassword(false);
    setShowManagerForm(true);
  };

  const handlePermissionChange = (module, permission, value) => {
    setPermissionsForm((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permission]: value,
      },
    }));
  };

  const initializePermissionsForm = () => {
    const form = {};
    availableModules.forEach((module) => {
      form[module.id] = managerPermissions[module.id] || {
        can_view: false,
        can_create: false,
        can_update: false,
        can_delete: false,
      };
    });
    setPermissionsForm(form);
  };

  useEffect(() => {
    if (showPermissionsModal && availableModules.length > 0) {
      initializePermissionsForm();
    }
  }, [showPermissionsModal, availableModules, managerPermissions]);

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 p-4 sm:p-6 lg:p-8 max-w-full overflow-hidden">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              Manage Access
            </h1>
            <p className="text-gray-600 mt-1 mb-1 text-sm sm:text-base">
              Create and manage managers with specific permissions
            </p>
          </div>
          <button
            onClick={() => {
              setEditingManager(null);
              setManagerForm({ name: "", email: "", password: "", phone: "" });
              setShowManagerPassword(false);
              setShowManagerForm(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Add Manager</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Managers List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Managers
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
              </div>
            ) : managers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No managers found</p>
              </div>
            ) : (
              <>
                {/* Controls */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs sm:text-sm text-gray-600">
                    Page <span className="font-medium">{page}</span> of{" "}
                    {Math.max(1, Math.ceil(managers.length / pageSize))}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {[5, 10, 20, 50].map((s) => (
                        <option key={s} value={s}>
                          {s} / page
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-2 py-1 text-xs sm:text-sm sm:px-3 sm:py-1.5 bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPage((p) =>
                            p < Math.ceil(managers.length / pageSize)
                              ? p + 1
                              : p
                          )
                        }
                        disabled={page >= Math.ceil(managers.length / pageSize)}
                        className="px-2 py-1 text-xs sm:text-sm sm:px-3 sm:py-1.5 bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scrollable list */}
                <div className="space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {managers
                    .slice(
                      (page - 1) * pageSize,
                      (page - 1) * pageSize + pageSize
                    )
                    .map((manager) => (
                      <div
                        key={manager.id}
                        className="border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors overflow-hidden"
                      >
                        {/* Desktop Layout */}
                        <div className="hidden sm:flex items-center justify-between p-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {manager.name}
                              </h4>
                              <p className="text-sm text-gray-600 truncate">
                                {manager.email}
                              </p>
                              <div className="text-xs text-gray-500 space-y-1">
                                <p>
                                  Created:{" "}
                                  {new Date(
                                    manager.created_at
                                  ).toLocaleDateString()}
                                </p>
                                {(manager.last_updater_name ||
                                  manager.last_update_by) &&
                                  manager.updated_at && (
                                    <p>
                                      Updated:{" "}
                                      {new Date(
                                        manager.updated_at
                                      ).toLocaleDateString()}{" "}
                                      {manager.last_updater_name ? (
                                        <>
                                          by {manager.last_updater_name}
                                        </>
                                      ) : manager.last_update_by ? (
                                        <>
                                          by Admin (ID: {manager.last_update_by}
                                          )
                                        </>
                                      ) : null}
                                    </p>
                                  )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleOpenPermissions(manager)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <Key className="h-4 w-4" />
                              <span className="hidden md:inline">
                                Permissions
                              </span>
                            </button>
                            <button
                              onClick={() => handleEditManager(manager)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="hidden md:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => handleToggleActive(manager)}
                              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                manager.is_active
                                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
                              }`}
                              title={
                                manager.is_active
                                  ? "Deactivate manager"
                                  : "Activate manager"
                              }
                            >
                              {manager.is_active ? (
                                <ToggleLeft className="h-4 w-4" />
                              ) : (
                                <ToggleRight className="h-4 w-4" />
                              )}
                              <span className="hidden md:inline">
                                {manager.is_active ? "Deactivate" : "Activate"}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Mobile Layout */}
                        <div className="sm:hidden p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-gray-900 text-base">
                                {manager.name}
                              </h4>
                              <p className="text-sm text-gray-600 break-all">
                                {manager.email}
                              </p>
                              <div className="text-xs text-gray-500 mt-1 space-y-1">
                                <p>
                                  Created:{" "}
                                  {new Date(
                                    manager.created_at
                                  ).toLocaleDateString()}
                                </p>
                                {(manager.last_updater_name ||
                                  manager.last_update_by) &&
                                  manager.updated_at && (
                                    <p>
                                      Updated:{" "}
                                      {new Date(
                                        manager.updated_at
                                      ).toLocaleDateString()}{" "}
                                      {manager.last_updater_name ? (
                                        <>
                                          by {manager.last_updater_name} 
                                        </>
                                      ) : manager.last_update_by ? (
                                        <>
                                          by Admin (ID: {manager.last_update_by}
                                          )
                                        </>
                                      ) : null}
                                    </p>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* Mobile Action Buttons */}
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => handleOpenPermissions(manager)}
                              className="flex flex-col items-center gap-1 px-2 py-2 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <Key className="h-4 w-4" />
                              <span>Permissions</span>
                            </button>
                            <button
                              onClick={() => handleEditManager(manager)}
                              className="flex flex-col items-center gap-1 px-2 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleToggleActive(manager)}
                              className={`flex flex-col items-center gap-1 px-2 py-2 text-xs rounded-lg transition-colors ${
                                manager.is_active
                                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
                              }`}
                              title={
                                manager.is_active
                                  ? "Deactivate manager"
                                  : "Activate manager"
                              }
                            >
                              {manager.is_active ? (
                                <ToggleLeft className="h-4 w-4" />
                              ) : (
                                <ToggleRight className="h-4 w-4" />
                              )}
                              <span>
                                {manager.is_active ? "Deactivate" : "Activate"}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Footer pagination summary */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-gray-600">
                  <div>
                    Showing{" "}
                    {Math.min((page - 1) * pageSize + 1, managers.length)}-
                    {Math.min(page * pageSize, managers.length)} of{" "}
                    {managers.length}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="px-2 py-1 text-xs sm:text-sm bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                    >
                      First
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-2 py-1 text-xs sm:text-sm bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((p) =>
                          p < Math.ceil(managers.length / pageSize) ? p + 1 : p
                        )
                      }
                      disabled={page >= Math.ceil(managers.length / pageSize)}
                      className="px-2 py-1 text-xs sm:text-sm bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPage(
                          Math.max(1, Math.ceil(managers.length / pageSize))
                        )
                      }
                      disabled={page >= Math.ceil(managers.length / pageSize)}
                      className="px-2 py-1 text-xs sm:text-sm bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                    >
                      Last
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Manager Form Modal (Portal) */}
      {showManagerForm &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-[1000]">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingManager ? "Edit Manager" : "Add New Manager"}
                </h3>
                <button
                  onClick={() => setShowManagerForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form
                onSubmit={
                  editingManager ? handleUpdateManager : handleCreateManager
                }
                autoComplete="off"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={managerForm.name}
                      onChange={(e) =>
                        handleManagerFormChange("name", e.target.value)
                      }
                      placeholder="Enter manager's name (min 2 characters)"
                      autoComplete="off"
                      minLength={2}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        managerValidationErrors.name
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      autoCorrect="off"
                      autoCapitalize="off"
                      required
                    />
                    {managerValidationErrors.name && (
                      <p className="mt-1 text-xs text-red-600">
                        {managerValidationErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={managerForm.phone}
                      onChange={(e) =>{
                        e.target.value = e.target.value.replace(/[^0-9]/g, '')
                        if (e.target.value.length > 10) {
                          e.target.value = e.target.value.slice(0, 10)
                        }
                        handleManagerFormChange("phone", e.target.value)
                      }}
                      maxLength={10}
                      pattern="[0-9]{10}"
                      placeholder="Enter manager's phone number"
                      autoComplete="off"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        managerValidationErrors.phone
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      autoCorrect="off"
                      autoCapitalize="off"
                      required
                    />
                    {managerValidationErrors.phone && (
                      <p className="mt-1 text-xs text-red-600">
                        {managerValidationErrors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={managerForm.email}
                      onChange={(e) =>
                        handleManagerFormChange("email", e.target.value)
                      }
                      placeholder="Enter manager's email (e.g., manager@example.com)"
                      autoComplete="off"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        managerValidationErrors.email
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      autoCorrect="off"
                      autoCapitalize="off"
                      required
                    />
                    {managerValidationErrors.email && (
                      <p className="mt-1 text-xs text-red-600">
                        {managerValidationErrors.email}
                      </p>
                    )}
                    {managerForm.email &&
                      !managerValidationErrors.email &&
                      validateEmail(managerForm.email) && (
                        <p className="mt-1 text-xs text-green-600">
                          ✓ Valid email address
                        </p>
                      )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {editingManager ? "New Password (optional)" : "Password *"}
                    </label>
                    <div className="relative">
                      <input
                        type={showManagerPassword ? "text" : "password"}
                        value={managerForm.password}
                        onChange={(e) =>
                          handleManagerFormChange("password", e.target.value)
                        }
                        className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          managerValidationErrors.password
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        minLength={8}
                        autoComplete="new-password"
                        name="new-password"
                        required={!editingManager}
                        placeholder={
                          editingManager
                            ? "Leave blank to keep current password"
                            : "Enter password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)"
                        }
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                        onClick={() => setShowManagerPassword((v) => !v)}
                        aria-label={
                          showManagerPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showManagerPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {managerValidationErrors.password && (
                      <p className="mt-1 text-xs text-red-600">
                        {managerValidationErrors.password}
                      </p>
                    )}
                    {managerForm.password &&
                      !managerValidationErrors.password && (
                        <p className="mt-1 text-xs text-green-600">
                          ✓ Password meets requirements
                        </p>
                      )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
                  <button
                    type="button"
                    onClick={() => setShowManagerForm(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : null}
                    <span>{editingManager ? "Update" : "Create"} Manager</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Permissions Modal (Portal) */}
      {showPermissionsModal &&
        selectedManager &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-[1000]">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Permissions for {selectedManager.name}
                  </h3>
                  {permissionsLastUpdated?.name && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated:{" "}
                      {permissionsLastUpdated.date
                        ? new Date(
                            permissionsLastUpdated.date
                          ).toLocaleDateString()
                        : "N/A"}{" "}
                      by {permissionsLastUpdated.name} 
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {availableModules.map((module) => (
                  <div
                    key={module.id}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4"
                  >
                    <div className="mb-3 sm:mb-4">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                        {module.name}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {module.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                      {[
                        { key: "can_view", label: "View", hide: false },
                        {
                          key: "can_create",
                          label: "Create",
                          hide: module.hide_create === true,
                        },
                        {
                          key: "can_update",
                          label: "Update",
                          hide: module.hide_update === true,
                        },
                        {
                          key: "can_delete",
                          label: "Delete",
                          hide: module.hide_delete === true,
                        },
                      ]
                        .filter((permission) => !permission.hide)
                        .map((permission) => (
                          <label
                            key={permission.key}
                            className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={
                                permissionsForm[module.id]?.[permission.key] ||
                                false
                              }
                              onChange={(e) =>
                                handlePermissionChange(
                                  module.id,
                                  permission.key,
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs sm:text-sm font-medium text-gray-700">
                              {permission.label}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePermissions}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Save Permissions
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Toggle Active/Inactive Confirmation Modal */}
      <ConfirmationModal
        isOpen={showToggleModal}
        onClose={cancelToggleActive}
        onConfirm={confirmToggleActive}
        title={
          managerToToggle
            ? managerToToggle.is_active
              ? "Deactivate Manager"
              : "Activate Manager"
            : "Toggle Manager Status"
        }
        message={
          managerToToggle
            ? managerToToggle.is_active
              ? `Are you sure you want to deactivate "${managerToToggle.name}"?`
              : `Are you sure you want to activate "${managerToToggle.name}"?`
            : ""
        }
        confirmText={
          managerToToggle
            ? managerToToggle.is_active
              ? "Deactivate Manager"
              : "Activate Manager"
            : "Confirm"
        }
        cancelText="Cancel"
        type={managerToToggle?.is_active ? "danger" : "success"}
        isLoading={isToggling}
      />
    </div>
  );
}

export default ManageAccess;
