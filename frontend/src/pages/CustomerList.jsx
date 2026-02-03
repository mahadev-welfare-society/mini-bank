import { useState, useEffect, useCallback, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { api } from "../services/api";
import toast from "react-hot-toast";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  Plus,
  Search,
  Edit,
  Eye,
  Phone,
  Mail,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  ToggleLeft,
  ToggleRight,
  BadgeCheck,
  BadgeX,
} from "lucide-react";

// Memoized SearchFilters component to prevent unnecessary re-renders
const SearchFilters = memo(
  ({
    searchTerm,
    setSearchTerm,
    handleSearchChange,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    clearFilters,
  }) => {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-3 sm:p-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-auto md:flex-1 lg:max-w-2xl max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchChange(searchTerm);
                }
              }}
            />
            {/* <button
              type="button"
              onClick={() => handleSearchChange(searchTerm)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md"
              title="Search"
            >
              <Search className="h-4 w-4 text-gray-500" />
            </button> */}
          </div>

          {/* Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
            >
              <option value="created_at">Date Created</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>

            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    );
  }
);

SearchFilters.displayName = "SearchFilters";

function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    limit: 10,
    has_next: false,
    has_prev: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { user, loading: authLoading } = useAuth();
  const {
    canView,
    canCreate,
    canUpdate,
    canDelete,
    loading: permissionsLoading,
  } = usePermissions();
  const navigate = useNavigate();

  // Confirmation modal states for toggle active
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [customerToToggle, setCustomerToToggle] = useState(null);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    // Only fetch customers after auth and permissions are loaded
    if (!authLoading && !(user?.role === "manager" && permissionsLoading)) {
      fetchCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    itemsPerPage,
    searchQuery,
    sortBy,
    sortOrder,
    authLoading,
    permissionsLoading,
  ]);

  // Watch for empty search term and clear search query
  useEffect(() => {
    if (searchTerm === "" && searchQuery !== "") {
      setSearchQuery("");
    }
  }, [searchTerm, searchQuery]);

  // Filter and search handlers - memoized to prevent unnecessary re-renders
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  // Debounced live search: trigger fetching when user types
  useEffect(() => {
    const timerId = setTimeout(() => {
      const trimmed = searchTerm.trim();
      if (trimmed !== searchQuery) {
        handleSearchChange(trimmed);
      }
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm, searchQuery, handleSearchChange]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // Build request body for POST
      const requestBody = {
        page: currentPage,
        limit: itemsPerPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (searchQuery.trim()) {
        requestBody.search = searchQuery.trim();
      }

      const response = await api.post("/customers/list", requestBody);
      if (response.data.success) {
        setCustomers(response.data.data);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        toast.error("Failed to fetch customers");
      }
    } catch (error) {
      toast.error("Error fetching customers");
    } finally {
      setLoading(false);
    }
  };

  // Pagination functions
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleSortChange = useCallback(
    (field) => {
      if (sortBy === field) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortBy(field);
        setSortOrder("asc");
      }
      setCurrentPage(1); // Reset to first page when sorting
    },
    [sortBy, sortOrder]
  );

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSearchQuery("");
    setSortBy("created_at");
    setSortOrder("desc");
    setCurrentPage(1);
  }, []);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(pagination.total_pages);
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(1, prev - 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(pagination.total_pages, prev + 1));

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const totalPages = pagination.total_pages;
    const current = pagination.current_page;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (current >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Show loading state while auth or permissions are loading
  if (authLoading || (user?.role === "manager" && permissionsLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Check permissions based on role and permissions
  const canViewCustomers =
    user?.role === "admin" ||
    (user?.role === "manager" && canView("customers_management"));
  // const canCreateCustomer = user?.role === "admin"; // Only admin can create customers
  const canCreateCustomer =
    user?.role === "admin" ||
    (user?.role === "manager" && canCreate("customers_management"));

  // Check if manager has view/edit/delete permissions at all
  const hasViewPermission =
    user?.role === "admin" ||
    (user?.role === "manager" && canView("customer_accounts"));
  const hasEditPermission =
    user?.role === "admin" ||
    (user?.role === "manager" && canUpdate("customers_management"));
  // Both staff and manager can toggle active status
  const hasToggleActivePermission =
    user?.role === "admin" || (user?.role === "manager" && canUpdate("customers_management"));

  const canViewCustomerAccounts = (customer) => {
    if (user?.role === "admin") return true;
    if (user?.role === "manager" && canView("customer_accounts")) {
      // Manager can only view accounts of customers assigned to them
      return customer.assigned_manager_id === user.id;
    }
    return false;
  };

  const canEditCustomer = (customer) => {
    if (user?.role === "admin") return true;
    if (user?.role === "manager" && canUpdate("customers_management")) {
      // Manager can only edit customers assigned to them
      return customer.assigned_manager_id === user.id;
    }
    return false;
  };
  const canToggleActiveCustomer = (customer) => {
    // Both staff and manager can activate/deactivate customers
    if (user?.role === "admin") return true;
    if (user?.role === "manager" && canUpdate("customers_management")) {
      // Manager can only delete customers assigned to them
      return customer.assigned_manager_id === user.id;
    }
    return false;
  };

  const handleToggleActive = (customer) => {
    setCustomerToToggle(customer);
    setShowToggleModal(true);
  };

  const confirmToggleActive = async () => {
    if (!customerToToggle) return;

    setIsToggling(true);
    try {
      const newActiveStatus = !customerToToggle.is_active;
      const response = await api.patch(
        `/customers/${customerToToggle.id}/toggle-active`,
        {
          is_active: newActiveStatus,
        }
      );

      if (response.data.success) {
        // Update local state
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === customerToToggle.id
              ? { ...c, is_active: newActiveStatus }
              : c
          )
        );
        toast.success(
          response.data.message ||
            `Customer ${
              newActiveStatus ? "activated" : "deactivated"
            } successfully`
        );
        setShowToggleModal(false);
        setCustomerToToggle(null);
      } else {
        toast.error(
          response.data.message || "Failed to toggle customer status"
        );
      }
    } catch (error) {
      console.error("Failed to toggle customer status", error);
      toast.error(
        error.response?.data?.message || "Failed to toggle customer status"
      );
    } finally {
      setIsToggling(false);
    }
  };

  const cancelToggleActive = () => {
    setShowToggleModal(false);
    setCustomerToToggle(null);
  };

  // Check if user has permission to view customers (only after loading is complete)
  if (!authLoading && !permissionsLoading && !canViewCustomers) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="text-gray-500 mt-2">
          You don't have permission to view customer management.
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Only Admin and Manager roles with proper permissions can access
          customer management.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 p-4 sm:p-6 lg:p-8 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Customer Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage your bank customers
          </p>
        </div>
        {canCreateCustomer && (
          <button
            onClick={() => navigate("/customers/new")}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl flex items-center justify-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add Customer</span>
          </button>
        )}
      </div>

      {/* Search and Filters - Memoized Component */}
      <SearchFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearchChange={handleSearchChange}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        clearFilters={clearFilters}
      />

      {/* Customers Table */}
      <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl overflow-hidden border border-white/20 max-w-full relative">
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="text-sm text-gray-600">Loading customers...</p>
            </div>
          </div>
        )}
        {customers.length === 0 && !loading ? (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No customers
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? "No customers match your search."
                : "Get started by adding a new customer."}
            </p>
            {canCreateCustomer && !searchTerm && (
              <div className="mt-6 w-full flex items-center justify-center">
                <button
                  onClick={() => navigate("/customers/new")}
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Add Customer</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card Layout (visible on small screens and tablets) */}
            <div className="block md:hidden space-y-3">
              {customers.map((customer, index) => (
                <div
                  key={customer.id}
                  className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 hover:shadow-xl transition-all duration-200"
                >
                  {/* Header with Avatar and Actions */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-inner">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-semibold text-gray-900 flex items-center">
                          <span className="mr-1">{customer.name}</span>
                          {customer?.is_active ? (
                            <BadgeCheck className="text-green-400"/>
                          ) : (
                            <BadgeX className="text-red-400" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {customer.id}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {hasViewPermission && (
                        <button
                          onClick={() =>
                            navigate(`/customers/${customer.id}/accounts`)
                          }
                          className="p-2 text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!canViewCustomerAccounts(customer)}
                          title="View accounts"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                      )}
                      {hasEditPermission && (
                        <button
                          onClick={() =>
                            navigate(`/customers/${customer.id}/edit`)
                          }
                          className="p-2 text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!canEditCustomer(customer)}
                          title="Edit customer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {hasToggleActivePermission && user?.role === "admin" && (
                        <button
                          onClick={() => handleToggleActive(customer)}
                          disabled={!canToggleActiveCustomer(customer)}
                          className={`p-2 rounded-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                            customer.is_active
                              ? "text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100"
                              : "text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100"
                          }`}
                          title={
                            customer.is_active
                              ? "Deactivate customer"
                              : "Approve customer"
                          }
                        >
                          {customer.is_active ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                          <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Role Badge and Assigned Manager */}
                  <div className="mb-3 flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm ${
                        customer.role === "manager"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-green-100 text-green-800 border border-green-200"
                      }`}
                    >
                      {customer.role === "manager" ? "Manager" : "Staff"}
                    </span>
                    {customer.assigned_manager_name && (
                      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        Manager: {customer.assigned_manager_name}
                      </span>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-3">
                    {customer.email !== null && customer.email !== "" && (
                      <div className="text-sm text-gray-900 flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="truncate" title={customer.email}>
                          {customer.email}
                        </span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="text-sm text-gray-500 flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="truncate" title={customer.phone}>
                          {customer.phone}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Account Types */}
                  {customer.role === "staff" && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        Accounts:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {customer.accounts?.length > 0 ? (
                          customer.accounts.map((account) => (
                            <span
                              key={account.id}
                              className="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100"
                            >
                              {account.account_type?.toUpperCase()} #
                              {account.id}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            No accounts
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer Info */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex flex-col gap-1 text-xs text-gray-500">
                      <div className="flex justify-between items-center">
                        <span>
                          Created:{" "}
                          {new Date(customer.created_at).toLocaleDateString()}
                        </span>
                        <span>By: {customer.creator_name}</span>
                      </div>
                      {customer.last_updater_name && (
                        <div className="flex justify-between items-center">
                          <span>
                            Last Updated:{" "}
                            {customer.updated_at
                              ? new Date(
                                  customer.updated_at
                                ).toLocaleDateString()
                              : "N/A"}
                          </span>
                          <span>
                            By: {customer.last_updater_name}
                            {customer.last_updater_role && (
                              <span className="ml-1 text-xs text-gray-400">
                                (
                                {customer.last_updater_role === "manager"
                                  ? "Manager"
                                  : "Admin"}
                                )
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout (hidden on small screens) */}
            <div className="hidden md:block overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Staff
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] hidden">
                      Role
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px] hidden lg:table-cell">
                      Account Types
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] hidden xl:table-cell">
                      Assigned Manager
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px] hidden xl:table-cell">
                      Contact
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] hidden 2xl:table-cell">
                      Date
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer, index) => (
                    <tr
                      key={customer.id}
                      className={`transition-all duration-200 hover:bg-blue-50 hover:shadow-md ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      {/* Staff */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-inner">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-3 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate flex items-center">
                              {/* {customer.name} */}
                              <span className="mr-1">{customer.name}</span>{" "}
                              {customer?.is_active ? (
                                <BadgeCheck className="text-green-400" />
                              ) : (
                                <BadgeX className="text-red-400" />
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {customer.id}
                            </div>
                            <div className="text-xs text-gray-500 xl:hidden truncate max-w-[200px]">
                              {customer.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm ${
                            customer.role === "manager"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-green-100 text-green-800 border border-green-200"
                          }`}
                        >
                          {customer.role === "manager" ? "Manager" : "Staff"}
                        </span>
                      </td>

                      {/* Account Types */}
                      <td className="px-3 py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1.5">
                          {customer.role === "manager" ? (
                            <span className="text-xs text-gray-400 italic">
                              No accounts
                            </span>
                          ) : customer.accounts?.length > 0 ? (
                            customer.accounts.map((account) => (
                              <>
                                {hasViewPermission ? (
                                  <Link
                                    key={account.id}
                                    to={`/customers/${customer.id}/accounts/${account.id}`}
                                  >
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                                      {account.account_type?.toUpperCase()} #
                                      {account.id}
                                    </span>
                                  </Link>
                                ) : (
                                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                                    {account.account_type?.toUpperCase()} #
                                    {account.id}
                                  </span>
                                )}
                              </>
                            ))
                          ) : (
                            <div className="flex flex-col gap-1 text-xs text-gray-400">
                              <span className="italic">No accounts yet</span>
                              <Link
                                to={`/customers/${customer.id}/accounts/new`}
                                className="inline-flex w-fit items-center gap-1 rounded-full border border-dashed border-indigo-200 bg-indigo-50/60 px-3 py-1 font-medium text-indigo-600 transition-all hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700"
                                disabled={!customer.is_active}
                              >
                                <span className="text-[10px] font-semibold uppercase tracking-wide">
                                  + Create account
                                </span>
                              </Link>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assigned Manager */}
                      <td className="px-3 py-4 hidden xl:table-cell">
                        {customer.assigned_manager_name ? (
                          <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            {customer.assigned_manager_name}
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1 text-xs text-gray-400">
                            <span className="italic">No manager</span>
                            <Link
                              to={`/customers/${customer.id}/edit`}
                              className="inline-flex w-fit min-w-[140px] items-center gap-1 rounded-full border border-dashed border-indigo-200 bg-indigo-50/60 px-3 py-1 font-medium text-indigo-600 transition-all hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700"
                            >
                              <span className="text-[10px] font-semibold uppercase tracking-wide">
                                + Assign Manager
                              </span>
                            </Link>
                          </div>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-3 py-4 hidden xl:table-cell">
                        {customer.email !== null && customer.email !== "" && (
                          <div className="text-sm text-gray-900 flex items-center space-x-2 min-w-0">
                            <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span
                              className="truncate max-w-[160px]"
                              title={customer.email}
                            >
                              {customer.email}
                            </span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="text-sm text-gray-500 flex items-center space-x-2 mt-1 min-w-0">
                            <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span
                              className="truncate max-w-[160px]"
                              title={customer.phone}
                            >
                              {customer.phone}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-4 text-sm text-gray-500 hidden 2xl:table-cell">
                        <div className="flex flex-col gap-1">
                          <div>
                            <span className="text-xs text-gray-400">
                              Created:{" "}
                            </span>
                            {new Date(customer.created_at).toLocaleDateString()}
                            {customer.creator_name && (
                              <span className="text-xs text-gray-400 ml-1">
                                by {customer.creator_name}
                              </span>
                            )}
                          </div>
                          {customer.last_updater_name &&
                            customer.updated_at && (
                              <div>
                                <span className="text-xs text-gray-400">
                                  Updated:{" "}
                                </span>
                                {new Date(
                                  customer.updated_at
                                ).toLocaleDateString()}
                                <span className="text-xs text-gray-400 ml-1">
                                  by {customer.last_updater_name}
                                  {customer.last_updater_role && (
                                    <span className="ml-1">
                                      (
                                      {customer.last_updater_role === "manager"
                                        ? "Manager"
                                        : "Admin"}
                                      )
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {hasViewPermission && (
                            <button
                              onClick={() =>
                                navigate(`/customers/${customer.id}/accounts`)
                              }
                              className="p-2 text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-all duration-150 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={
                                !canViewCustomerAccounts(customer) ||
                                !customer.is_active
                              }
                              title="View accounts"
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                          )}
                          {hasEditPermission && (
                            <button
                              onClick={() =>
                                navigate(`/customers/${customer.id}/edit`)
                              }
                              className="p-2 text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md transition-all duration-150 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!canEditCustomer(customer)}
                              title="Edit customer"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {hasEditPermission && user?.role === "admin" && (
                            <button
                              onClick={() => handleToggleActive(customer)}
                              className={`p-2 rounded-md transition-all duration-150 ${
                                customer.is_active
                                  ? "text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 "
                                  : " text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100"
                              }`}
                              title={
                                customer.is_active
                                  ? "Deactivate customer"
                                  : "Approve customer"
                              }
                            >
                              {customer.is_active ? (
                                <ToggleRight className="h-4 w-4" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}

      <div className="bg-white/95 backdrop-blur-sm p-3 sm:p-4 rounded-2xl shadow-lg border border-white/20">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 gap-4">
          {/* Pagination Info */}
          <div className="text-xs sm:text-sm text-gray-700 text-center lg:text-left">
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {(pagination.current_page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-900">
              {Math.min(
                pagination.current_page * pagination.limit,
                pagination.total_count
              )}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900">
              {pagination.total_count}
            </span>{" "}
            results
          </div>

          {/* Items Per Page and Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Items Per Page */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Show:
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) =>
                  handleItemsPerPageChange(Number(e.target.value))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[80px]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-500">per page</span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* First Page - Hidden on mobile */}
              <button
                onClick={goToFirstPage}
                disabled={!pagination.has_prev}
                className="hidden sm:block p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              {/* Previous Page */}
              <button
                onClick={goToPreviousPage}
                disabled={!pagination.has_prev}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {getPageNumbers().map((page, index) =>
                  page === "..." ? (
                    <span
                      key={index}
                      className="px-2 sm:px-3 py-2 text-gray-500 text-sm"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={index}
                      onClick={() => handlePageChange(page)}
                      className={`px-2 sm:px-3 py-2 rounded-lg border transition-colors text-sm ${
                        page === pagination.current_page
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              {/* Next Page */}
              <button
                onClick={goToNextPage}
                disabled={!pagination.has_next}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Last Page - Hidden on mobile */}
              <button
                onClick={goToLastPage}
                disabled={!pagination.has_next}
                className="hidden sm:block p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Customer Approval Confirmation Modal */}
      <ConfirmationModal
        isOpen={showToggleModal}
        onClose={cancelToggleActive}
        onConfirm={confirmToggleActive}
        title={
          customerToToggle
            ? customerToToggle.is_active
              ? "Disapprove Customer"
              : "Approve Customer"
            : "Customer Approval"
        }
        message={
          customerToToggle
            ? customerToToggle.is_active
              ? `Are you sure you want to disapprove "${customerToToggle.name}"?`
              : `Are you sure you want to approve "${customerToToggle.name}"?`
            : ""
        }
        confirmText={
          customerToToggle
            ? customerToToggle.is_active
              ? "Disapprove Customer"
              : "Approve Customer"
            : "Confirm"
        }
        cancelText="Cancel"
        type={customerToToggle?.is_active ? "danger" : "success"}
        isLoading={isToggling}
      />
    </div>
  );
}

export default CustomerList;
