import { useState, useRef, useEffect, useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import {
  Users,
  Building2,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Bell,
  Search,
  Shield,
  UserCheck,
  Home,
  BarChart3,
  CreditCard,
  TrendingUp,
  Wallet,
  FileText,
} from "lucide-react";

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeIndicatorStyle, setActiveIndicatorStyle] = useState({});
  const navRefs = useRef({});
  const { user, logout, loading: authLoading } = useAuth();
  const { canView, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  // Role-based navigation
  const getNavigation = () => {
    const baseNav = [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: Building2,
        current:
          location.pathname === "/dashboard" || location.pathname === "/",
      },
    ];

    // Admin and Manager with permission can see customer management
    // Only check permissions after they've loaded (not during loading)
    if (
      !authLoading &&
      !permissionsLoading &&
      (user?.role === "admin" ||
        (user?.role === "manager" && canView("customers_management")))
    ) {
      baseNav.push({
        name: "Customer Management",
        href: "/customers",
        icon: Users,
        current: location.pathname.startsWith("/customers"),
      });
    }

    // Admin and Manager with permissions can see account types management (M2)
    if (
      user?.role === "admin" ||
      (user?.role === "manager" && canView("account_types"))
    ) {
      baseNav.push({
        name: "Account Types",
        href: "/accounts/types",
        icon: CreditCard,
        current: location.pathname.startsWith("/accounts/types"),
      });
    }

    // Admin can always see transactions, Manager only if they have permission
    if (
      user?.role === "admin" ||
      (user?.role === "manager" && canView("transactions"))
    ) {
      baseNav.push({
        name: "Transactions",
        href: "/transactions",
        icon: BarChart3,
        current: location.pathname.startsWith("/transactions"),
      });
    }

    // Only Admin can see manage access
    if (user?.role === "admin") {
      baseNav.push({
        name: "Manage Access",
        href: "/manage-access",
        icon: Shield,
        current: location.pathname.startsWith("/manage-access"),
      });
      baseNav.push({
        name: "Interest History",
        href: "/interest-history",
        icon: TrendingUp,
        current: location.pathname.startsWith("/interest-history"),
      });
    }

    // Only Staff can see their accounts and profile
    if (user?.role === "staff") {
      baseNav.push({
        name: "My Accounts",
        href: "/my-accounts",
        icon: Wallet,
        current: location.pathname.startsWith("/my-accounts"),
      });
      baseNav.push({
        name: "My Transactions",
        href: "/my-transactions",
        icon: BarChart3,
        current: location.pathname.startsWith("/my-transactions"),
      });
      baseNav.push({
        name: "My Profile",
        href: "/profile",
        icon: User,
        current: location.pathname.startsWith("/profile"),
      });
    }

    return baseNav;
  };

  // Memoize navigation to prevent infinite loops
  // Note: canView is a function, so we check permissions inside getNavigation instead
  const navigation = useMemo(
    () => getNavigation(),
    [location.pathname, user?.role, user?.id, authLoading, permissionsLoading]
  );

  // Update active indicator position when route changes or window resizes
  useEffect(() => {
    const updateActiveIndicator = () => {
      const activeItem = navigation.find((item) => item.current);
      if (activeItem && navRefs.current[activeItem.name]) {
        const element = navRefs.current[activeItem.name];
        const navContainer = element.closest("nav");
        if (navContainer) {
          // Get the exact position and dimensions of the button element
          const navRect = navContainer.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();

          // Calculate position relative to nav container
          const top = elementRect.top - navRect.top + navContainer.scrollTop;
          const left = elementRect.left - navRect.left;
          const width = elementRect.width;
          const height = elementRect.height;

          // Use requestAnimationFrame for smoother updates
          requestAnimationFrame(() => {
            setActiveIndicatorStyle({
              top: `${top}px`,
              left: `${left}px`,
              width: `${width}px`,
              height: `${height}px`,
              opacity: 1,
              transition:
                "top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease",
            });
          });
        }
      } else {
        // Reset if no active item found
        setActiveIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    // Add a small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(() => {
      updateActiveIndicator();
    }, 10);

    // Update on window resize with debounce
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          updateActiveIndicator();
        });
      }, 100);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
    };
  }, [location.pathname, navigation]);

  // Handle nav item click
  const handleNavClick = (item) => {
    navigate(item.href);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: {
        label: "Administrator",
        color: "bg-red-100 text-red-800 border-red-200",
        icon: Shield,
      },
      manager: {
        label: "Manager",
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Building2,
      },
      staff: {
        label: "Staff Member",
        color: "bg-green-100 text-green-800 border-green-200",
        icon: UserCheck,
      },
    };

    const config = roleConfig[role] || roleConfig.staff;
    const IconComponent = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}
      >
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-gradient-to-b from-white via-white to-slate-50/50 backdrop-blur-xl shadow-2xl border-r border-slate-200/60 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-screen overflow-hidden">
          {/* Logo and close button */}
          <div className="flex items-center justify-between h-20 px-5 sm:px-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-100">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Mahadev Welfare Society
                </h1>
                <p className="text-[10px] sm:text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                  Banking System
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 sm:px-4 py-6 sm:py-8 space-y-1.5 overflow-y-auto relative">
            {/* Active indicator background - smooth slide animation */}
            <div
              className="nav-active-indicator absolute rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-blue-500/30 pointer-events-none z-0"
              style={activeIndicatorStyle}
            />

            <div className="mb-2 px-2 relative z-10">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Navigation
              </p>
            </div>
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  ref={(el) => {
                    if (el) navRefs.current[item.name] = el;
                  }}
                  onClick={() => handleNavClick(item)}
                  className={`nav-item group w-full flex items-center px-2 sm:px-4 py-3 sm:py-3.5 text-sm font-semibold rounded-xl relative z-10 ${
                    item.current
                      ? "text-white"
                      : "text-slate-600 hover:text-blue-700"
                  }`}
                >
                  {/* Icon container */}
                  <div
                    className={`nav-item-bg flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-lg mr-3 transition-all duration-300 ${
                      item.current
                        ? "bg-white/20"
                        : "bg-slate-100 group-hover:bg-blue-100"
                    }`}
                  >
                    <Icon
                      className={`nav-item-icon h-3 w-3 sm:h-5 sm:w-5 transition-colors duration-300 ${
                        !item.current && "group-hover:text-blue-600"
                      }`}
                      style={{
                        color: item.current ? "#ffffff" : "#475569",
                      }}
                    />
                  </div>

                  {/* Text */}
                  <span
                    className="nav-item-text truncate flex-1 text-left transition-colors duration-300"
                    style={{
                      color: item.current ? "#ffffff" : "#475569",
                    }}
                  >
                    {item.name}
                  </span>

                  {/* Active indicator dot */}
                  {item.current && (
                    <div className="absolute right-3 w-2 h-2 bg-white rounded-full"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen ml-0 lg:ml-72">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl shadow-md border-b border-slate-200/60">
          <div className="flex items-center justify-between h-16 sm:h-18 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center sm:space-x-3">
                <div className="h-1.5 w-1.5 hidden sm:block rounded-full bg-blue-500 animate-pulse"></div>
                <h2
                  key={
                    navigation.find((item) => item.current)?.name || "Dashboard"
                  }
                  className="text-lg sm:text-2xl hidden sm:block font-bold text-slate-900 truncate animate-fadeIn"
                >
                  {navigation.find((item) => item.current)?.name || "Dashboard"}
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border border-transparent hover:border-blue-100"
                >
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-100">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-slate-900 truncate max-w-32">
                      {user?.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-32 capitalize">
                      {user?.role}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                      userMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* User dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200/60 py-2 z-50 overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200/60">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {user?.name}
                      </p>
                      <p className="text-xs text-slate-600 truncate mt-0.5">
                        {user?.email}
                      </p>
                      <div className="mt-2">{getRoleBadge(user?.role)}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 flex items-center space-x-2 transition-all duration-200"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div key={location.pathname} className="page-transition min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  );
}

export default DashboardLayout;
