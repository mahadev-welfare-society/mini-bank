import { useState, useEffect } from "react";
import { useAuth } from "../store/AuthContext";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { User, Mail, Phone, MapPin, Edit, Save, X } from "lucide-react";

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const { user, logout, setUser } = useAuth();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.post("/auth/profile/get", {});
      if (response.data.success) {
        setProfile(response.data.data);
        setFormData({
          name: response.data.data.name,
          email: response.data.data.email,
          phone: response.data.data.phone || "",
          address: response.data.data.address || "",
        });
      } else {
        toast.error("Failed to fetch profile");
      }
    } catch (error) {
      toast.error("Error fetching profile");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      name: profile.name,
      email: profile.email,
      phone: profile.phone || "",
      address: profile.address || "",
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Call API to update profile
      const response = await api.put("/auth/profile", {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        // Note: email is not sent as it cannot be changed
      });

      if (response.data.success) {
        // Update local state with response data
        const updatedProfile = response.data.data;
        setProfile(updatedProfile);
        setFormData({
          name: updatedProfile.name,
          email: updatedProfile.email,
          phone: updatedProfile.phone || "",
          address: updatedProfile.address || "",
        });

        // Update AuthContext user data if setUser is available
        if (setUser) {
          setUser(updatedProfile);
        }

        setEditing(false);
        toast.success("Profile updated successfully");
      } else {
        toast.error(response.data.message || "Failed to update profile");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating profile");
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 md:p-8">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <div className="mb-3 sm:mb-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            My Profile
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          Manage your account information
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-sm bg-opacity-95">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
              <div className="w-1 h-5 sm:h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full mr-2 sm:mr-3"></div>
              Profile Information
            </h2>
            {!editing ? (
              <button
                onClick={handleEdit}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 sm:px-5 rounded-xl transition-all duration-300 transform hover:scale-[1.02] sm:hover:scale-[1.05] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl hover:shadow-blue-500/30 flex items-center justify-center group"
              >
                <Edit className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                <span className="text-sm sm:text-base">Edit Profile</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={handleSave}
                  className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2.5 px-4 sm:px-5 rounded-xl transition-all duration-300 transform hover:scale-[1.02] sm:hover:scale-[1.05] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-lg hover:shadow-xl hover:shadow-green-500/30 flex items-center justify-center group"
                >
                  <Save className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-sm sm:text-base">Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 sm:px-5 rounded-xl transition-all duration-300 transform hover:scale-[1.02] sm:hover:scale-[1.05] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 shadow-md hover:shadow-lg flex items-center justify-center group"
                >
                  <X className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="text-sm sm:text-base">Cancel</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Name */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-2.5 flex items-center">
                <div className="p-1.5 bg-blue-100 rounded-lg mr-2 group-hover:bg-blue-200 transition-colors duration-200 flex-shrink-0">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-xs sm:text-sm">Full Name</span>
              </label>
              {editing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 focus:bg-white shadow-sm hover:shadow-md hover:border-gray-300"
                  placeholder="Enter your full name"
                />
              ) : (
                <p className="text-gray-900 font-medium text-sm sm:text-base py-2 px-1 break-words">
                  {profile?.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                <div className="flex items-center flex-wrap gap-1">
                  <div className="p-1.5 bg-gray-100 rounded-lg mr-2 group-hover:bg-gray-200 transition-colors duration-200">
                    <Mail className="h-4 w-4 text-gray-500" />
                  </div>
                  <span>Email Address</span>
                  <span className="text-xs text-gray-400 font-normal">
                    (Cannot be changed)
                  </span>
                </div>
              </label>
              {editing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed transition-all duration-200 shadow-inner"
                  title="Email cannot be changed"
                />
              ) : (
                <p className="text-gray-900 font-medium text-sm sm:text-base py-2 px-1 break-all">
                  {profile?.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-2.5 flex items-center">
                <div className="p-1.5 bg-indigo-100 rounded-lg mr-2 group-hover:bg-indigo-200 transition-colors duration-200 flex-shrink-0">
                  <Phone className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-xs sm:text-sm">Phone Number</span>
              </label>
              {editing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 focus:bg-white shadow-sm hover:shadow-md hover:border-gray-300"
                  placeholder="Enter your phone number"
                />
              ) : (
                <p className="text-gray-900 font-medium text-sm sm:text-base py-2 px-1 break-words">
                  {profile?.phone || (
                    <span className="text-gray-400 italic">Not provided</span>
                  )}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="group xl:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center">
                <div className="p-1.5 bg-purple-100 rounded-lg mr-2 group-hover:bg-purple-200 transition-colors duration-200">
                  <MapPin className="h-4 w-4 text-purple-600" />
                </div>
                Address
              </label>
              {editing ? (
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 focus:bg-white shadow-sm hover:shadow-md hover:border-gray-300 resize-none"
                  placeholder="Enter your address"
                />
              ) : (
                <p className="text-gray-900 font-medium text-sm sm:text-base py-2 px-1 break-words">
                  {profile?.address || (
                    <span className="text-gray-400 italic">Not provided</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Role Information */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t-2 border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2.5 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg flex-shrink-0">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Account Role
                  </h3>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 capitalize mt-1">
                    {profile?.role}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 sm:space-x-4 sm:justify-end">
                <div className="p-2.5 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg flex-shrink-0">
                  <div className="h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                    📅
                  </div>
                </div>
                <div className="min-w-0 flex-1 sm:flex-none">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Member Since
                  </h3>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 mt-1 break-words">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
