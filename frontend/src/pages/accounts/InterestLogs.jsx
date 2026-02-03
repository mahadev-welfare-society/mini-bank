import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { api } from "../../services/api";

export default function InterestLogsTable({ accountId }) {
  const [interestLogs, setInterestLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    account_id: accountId || "",
    start_date: "",
    end_date: "",
  });

  const fetchInterestLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get("/interest-logs", { params: filters });
      setInterestLogs(response.data.logs || []);
    } catch (error) {
      toast.error("Error fetching interest logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterestLogs();
  }, [filters]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="date"
          name="start_date"
          value={filters.start_date}
          onChange={handleFilterChange}
          className="border px-2 py-1 rounded"
        />
        <input
          type="date"
          name="end_date"
          value={filters.end_date}
          onChange={handleFilterChange}
          className="border px-2 py-1 rounded"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Date</th>
              <th className="px-4 py-2 text-left font-semibold">Account ID</th>
              <th className="px-4 py-2 text-left font-semibold">
                Account Type
              </th>
              <th className="px-4 py-2 text-right font-semibold">
                Balance Before
              </th>
              <th className="px-4 py-2 text-right font-semibold">
                Interest Earned
              </th>
              <th className="px-4 py-2 text-right font-semibold">
                Balance After
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : interestLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4 text-gray-500">
                  No interest logs found
                </td>
              </tr>
            ) : (
              interestLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {new Date(log.calculated_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">{log.account_id}</td>
                  <td className="px-4 py-2">{log.account_type || "DDS"}</td>
                  <td className="px-4 py-2 text-right">
                    ₹{log.balance_before.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-green-600">
                    ₹{log.interest_amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">
                    ₹{log.balance_after.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
