import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./store/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import CustomerList from "./pages/CustomerList";
import CustomerForm from "./pages/CustomerForm";
import ProfilePage from "./pages/ProfilePage";
import Dashboard from "./pages/Dashboard";
import AccountTypeList from "./pages/accounts/AccountTypeList";
import AccountTypeForm from "./pages/accounts/AccountTypeForm";
import MyAccounts from "./pages/MyAccounts";
import MyTransactions from "./pages/MyTransactions";
import ManageAccess from "./pages/ManageAccess";
import TransactionList from "./pages/transactions/TransactionList";
import TransactionForm from "./pages/transactions/TransactionForm";
import TransactionDetail from "./pages/transactions/TransactionDetail";
import EditRequests from "./pages/transactions/EditRequests";
import MyEditRequests from "./pages/transactions/MyEditRequests";
import CustomerAccounts from "./pages/accounts/CustomerAccounts";
import CreateAccountForm from "./pages/accounts/CreateAccountForm";
import AccountDetails from "./pages/accounts/AccountDetails";
import InterestHistory from "./pages/InterestHistory";


function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<CustomerList />} />
                <Route path="/customers/new" element={<CustomerForm />} />
                <Route path="/customers/:id/edit" element={<CustomerForm />} />
                <Route
                  path="/customers/:id/accounts"
                  element={<CustomerAccounts />}
                />
                <Route
                  path="/customers/:id/accounts/new"
                  element={<CreateAccountForm />}
                />
                <Route
                  path="customers/:id/accounts/:id"
                  element={<AccountDetails />}
                />
                <Route path="/accounts/types" element={<AccountTypeList />} />
                <Route
                  path="/accounts/types/new"
                  element={<AccountTypeForm />}
                />
                <Route
                  path="/accounts/types/:id/edit"
                  element={<AccountTypeForm />}
                />
                <Route path="/my-accounts" element={<MyAccounts />} />
                <Route path="/my-transactions" element={<MyTransactions />} />
                <Route path="/manage-access" element={<ManageAccess />} />
                <Route path="/interest-history" element={<InterestHistory />} />
                <Route path="/transactions" element={<TransactionList />} />
                <Route path="/transactions/new" element={<TransactionForm />} />
                <Route
                  path="/transactions/:id"
                  element={<TransactionDetail />}
                />
                <Route
                  path="/transactions/edit-requests"
                  element={<EditRequests />}
                />
                <Route
                  path="/transactions/my-edit-requests"
                  element={<MyEditRequests />}
                />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />; // ✅ render nested routes here
}

export default App;
