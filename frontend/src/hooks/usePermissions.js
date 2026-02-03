import { useState, useEffect } from "react";
import { useAuth } from "../store/AuthContext";
import { api } from "../services/api";

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "manager" && user?.id) {
      fetchManagerPermissions();
    } else {
      setLoading(false);
      setPermissions({});
    }
  }, [user]);

  const fetchManagerPermissions = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        `/user-management/managers/${user.id}/permissions`,
        {}
      );
      if (response.data.success) {
        const permissionMap = {};
        response.data.data.forEach((perm) => {
          permissionMap[perm.module] = {
            can_view: perm.can_view,
            can_create: perm.can_create,
            can_update: perm.can_update,
            can_delete: perm.can_delete,
          };
        });
        setPermissions(permissionMap);
      } else {
        setPermissions({});
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module, action) => {
    // If still loading, return false to prevent premature access
    if (loading && user?.role === "manager") {
      return false;
    }

    // Admin has all permissions
    if (user?.role === "admin") {
      return true;
    }

    // Staff has no module permissions (only their assigned account types)
    if (user?.role === "staff") {
      return false;
    }

    // Manager permissions are checked against their assigned permissions
    if (user?.role === "manager") {
      return permissions[module]?.[action] || false;
    }

    return false;
  };

  const canView = (module) => hasPermission(module, "can_view");
  const canCreate = (module) => hasPermission(module, "can_create");
  const canUpdate = (module) => hasPermission(module, "can_update");
  const canDelete = (module) => hasPermission(module, "can_delete");

  return {
    permissions,
    loading,
    hasPermission,
    canView,
    canCreate,
    canUpdate,
    canDelete,
  };
};
