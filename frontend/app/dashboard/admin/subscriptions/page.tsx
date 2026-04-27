"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Subscription = {
  id: string;
  school_id: string;
  plan_type: string;
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
  amount: number;
  payment_method?: string;
  transaction_id?: string;
  notes?: string;
  school?: {
    id: string;
    name: string;
    email: string;
    school_type: string;
  };
  plan?: {
    id: string;
    name: string;
    price: number;
    duration_months: number;
  };
};

type School = {
  id: string;
  name: string;
  email?: string;
  school_type?: string;
  full_access?: boolean;
};

// Simple toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => (
  <div className={`toast toast-${type}`}>
    <span>{message}</span>
    <button className="toast-close" onClick={onClose}>×</button>
  </div>
);

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    school_id: "",
    plan_type: "basic",
    end_date: "",
    amount: "",
    payment_method: "",
    transaction_id: "",
    notes: ""
  });
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("subscriptions");

  // ================= SHOW TOAST =================
  const showToast = (message: string, type: string = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // ================= FETCH SUBSCRIPTIONS =================
  const fetchSubscriptions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subscriptions: ${response.status}`);
      }

      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err: any) {
      console.error("Fetch subscriptions error:", err);
      setError("Could not load subscriptions. Please check if the backend server is running on port 5000.");
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= FETCH SCHOOLS =================
  const fetchSchools = async () => {
    try {
      const response = await fetch(`${API_URL}/api/schools`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) throw new Error("Failed to fetch schools");

      const data = await response.json();
      setSchools(data.schools || []);
    } catch (err) {
      console.error("Fetch schools error:", err);
    }
  };

  // ================= RESET FORM =================
  const resetForm = () => {
    setFormData({
      school_id: "",
      plan_type: "basic",
      end_date: "",
      amount: "",
      payment_method: "",
      transaction_id: "",
      notes: ""
    });
  };

  // ================= CREATE SUBSCRIPTION =================
  const handleCreateSubscription = async () => {
    try {
      if (!formData.school_id || !formData.end_date || !formData.amount) {
        showToast("Please fill in all required fields", "error");
        return;
      }

      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_URL}/api/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          school_id: formData.school_id,
          plan_type: formData.plan_type,
          end_date: new Date(formData.end_date).toISOString(),
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method || null,
          transaction_id: formData.transaction_id || null,
          notes: formData.notes || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create subscription");
      }

      fetchSubscriptions();
      setShowModal(false);
      resetForm();
      showToast("Subscription created successfully!", "success");
    } catch (err: any) {
      console.error("Create subscription error:", err);
      showToast(err.message || "Failed to create subscription", "error");
    }
  };

  // ================= UPDATE SUBSCRIPTION =================
  const handleUpdateSubscription = async () => {
    if (!editingSubscription) return;
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_URL}/api/subscriptions/${editingSubscription.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_type: formData.plan_type,
          end_date: new Date(formData.end_date).toISOString(),
          status: editingSubscription.status,
          payment_status: editingSubscription.payment_status,
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method || null,
          transaction_id: formData.transaction_id || null,
          notes: formData.notes || null
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update subscription");
      }

      fetchSubscriptions();
      setEditingSubscription(null);
      setShowModal(false);
      resetForm();
      showToast("Subscription updated successfully!", "success");
    } catch (err: any) {
      console.error("Update subscription error:", err);
      showToast(err.message || "Failed to update subscription", "error");
    }
  };

  // ================= ACTIVATE SUBSCRIPTION =================
  const handleActivateSubscription = async (id: string) => {
    if (!confirm("Are you sure you want to activate this subscription? This will mark it as paid.")) {
      return;
    }

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_URL}/api/subscriptions/${id}/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to activate subscription");
      }

      fetchSubscriptions();
      showToast("Subscription activated successfully!", "success");
    } catch (err: any) {
      console.error("Activate subscription error:", err);
      showToast(err.message || "Failed to activate subscription", "error");
    }
  };

  // ================= CANCEL SUBSCRIPTION =================
  const handleCancelSubscription = async (id: string) => {
    const reason = prompt("Please enter the reason for cancellation (optional):");

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_URL}/api/subscriptions/${id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel subscription");
      }

      fetchSubscriptions();
      showToast("Subscription cancelled successfully!", "success");
    } catch (err: any) {
      console.error("Cancel subscription error:", err);
      showToast(err.message || "Failed to cancel subscription", "error");
    }
  };

  // ================= DELETE SUBSCRIPTION =================
  const handleDeleteSubscription = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscription? This action cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_URL}/api/subscriptions/${id}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete subscription");
      }

      fetchSubscriptions();
      showToast("Subscription deleted successfully!", "success");
    } catch (err: any) {
      console.error("Delete subscription error:", err);
      showToast(err.message || "Failed to delete subscription", "error");
    }
  };

  // ================= UPDATE SCHOOL FULL ACCESS =================
  const handleUpdateSchoolFullAccess = async (schoolId: string, fullAccess: boolean) => {
    if (!confirm(`Are you sure you want to ${fullAccess ? 'grant' : 'revoke'} full access for this school? ${!fullAccess ? 'Students and teachers from this school will not be able to log in.' : ''}`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_URL}/api/schools/${schoolId}/full-access`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ full_access: fullAccess })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to update school full access`);
      }

      fetchSchools();
      showToast(`School ${fullAccess ? 'full access granted' : 'disconnected'} successfully!`, "success");
    } catch (err: any) {
      console.error("Update school full access error:", err);
      showToast(err.message || "Failed to update school full access", "error");
    }
  };

  // ================= OPEN CREATE MODAL =================
  const openCreateModal = () => {
    resetForm();
    setEditingSubscription(null);
    setShowModal(true);
  };

  // ================= OPEN EDIT MODAL =================
  const openEditModal = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      school_id: subscription.school_id,
      plan_type: subscription.plan_type,
      end_date: subscription.end_date ? new Date(subscription.end_date).toISOString().split('T')[0] : "",
      amount: subscription.amount.toString(),
      payment_method: subscription.payment_method || "",
      transaction_id: subscription.transaction_id || "",
      notes: subscription.notes || ""
    });
    setShowModal(true);
  };

  // ================= GET STATUS BADGE =================
  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'active': 'status-success',
      'expired': 'status-danger',
      'cancelled': 'status-warning',
      'pending': 'status-info'
    };
    return statusMap[status] || 'status-info';
  };

  // ================= GET PAYMENT STATUS BADGE =================
  const getPaymentStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'paid': 'status-success',
      'pending': 'status-warning',
      'failed': 'status-danger'
    };
    return statusMap[status] || 'status-info';
  };

  // ================= FILTER SUBSCRIPTIONS =================
  const filteredSubscriptions = filterStatus === "all"
    ? subscriptions
    : subscriptions.filter(sub => sub.status === filterStatus);

  // ================= FORMAT DATE =================
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  // ================= CHECK IF EXPIRED =================
  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchSchools();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Subscriptions & Schools Management</h1>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscriptions')}
        >
          Subscriptions ({subscriptions.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'schools' ? 'active' : ''}`}
          onClick={() => setActiveTab('schools')}
        >
          Schools ({schools.length})
        </button>
      </div>

      {/* SUBSCRIPTIONS TAB */}
      {activeTab === 'subscriptions' && (
        <>
          {/* FILTERS */}
          <div className="filters">
            <button
              className={`btn-filter ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button
              className={`btn-filter ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              Active
            </button>
            <button
              className={`btn-filter ${filterStatus === 'expired' ? 'active' : ''}`}
              onClick={() => setFilterStatus('expired')}
            >
              Expired
            </button>
            <button
              className={`btn-filter ${filterStatus === 'cancelled' ? 'active' : ''}`}
              onClick={() => setFilterStatus('cancelled')}
            >
              Cancelled
            </button>
          </div>

          {/* ERROR */}
          {error && <p className="no-data">{error}</p>}

          {/* LOADING */}
          {loading && <p className="loading">Loading subscriptions...</p>}

          {/* SUBSCRIPTIONS TABLE */}
          {!loading && filteredSubscriptions.length > 0 && (
            <div className="dashboard-content">
              <div className="table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>School</th>
                      <th>Plan Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscriptions.map((subscription) => (
                      <tr key={subscription.id} className={isExpired(subscription.end_date) && subscription.status === 'active' ? 'expired-row' : ''}>
                        <td>
                          <strong>{subscription.school?.name || 'Unknown School'}</strong>
                          <br />
                          <small>{subscription.school?.school_type}</small>
                        </td>
                        <td>{subscription.plan_type}</td>
                        <td>{formatDate(subscription.start_date)}</td>
                        <td>
                          {formatDate(subscription.end_date)}
                          {isExpired(subscription.end_date) && subscription.status === 'active' && (
                            <span className="status-badge status-danger" style={{ marginLeft: 5 }}>Expired!</span>
                          )}
                        </td>
                        <td>${subscription.amount?.toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${getStatusBadge(subscription.status)}`}>
                            {subscription.status}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${getPaymentStatusBadge(subscription.payment_status)}`}>
                            {subscription.payment_status}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="btn-edit"
                              onClick={() => openEditModal(subscription)}
                            >
                              Edit
                            </button>
                            {subscription.status === 'active' && subscription.payment_status !== 'paid' && (
                              <button
                                className="btn-save"
                                onClick={() => handleActivateSubscription(subscription.id)}
                                style={{ marginLeft: 5 }}
                              >
                                Activate
                              </button>
                            )}
                            {subscription.status === 'active' && (
                              <button
                                className="btn-delete"
                                onClick={() => handleCancelSubscription(subscription.id)}
                                style={{ marginLeft: 5 }}
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              className="btn-delete"
                              onClick={() => handleDeleteSubscription(subscription.id)}
                              style={{ marginLeft: 5 }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && filteredSubscriptions.length === 0 && (
            <p className="no-data">No subscriptions found.</p>
          )}
        </>
      )}

      {/* SCHOOLS TAB */}
      {activeTab === 'schools' && (
        <div className="dashboard-content">
          <div className="table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>School Name</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Full Access</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id} className={!school.full_access ? 'expired-row' : ''}>
                    <td>
                      <strong>{school.name}</strong>
                    </td>
                    <td>{school.school_type}</td>
                    <td>{school.email || '-'}</td>
                    <td>
                      <span className={`status-badge ${school.full_access ? 'status-success' : 'status-danger'}`}>
                        {school.full_access ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        {school.full_access ? (
                          <button
                            className="btn-delete"
                            onClick={() => handleUpdateSchoolFullAccess(school.id, false)}
                            title="Disconnect school - users will not be able to login"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            className="btn-save"
                            onClick={() => handleUpdateSchoolFullAccess(school.id, true)}
                            title="Grant full access - users will be able to login"
                          >
                            Grant Access
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {schools.length === 0 && (
            <p className="no-data">No schools found.</p>
          )}
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      )}

      {/* SUBSCRIPTION MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingSubscription ? "Edit Subscription" : "Add Subscription"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="school-form">
              {/* School */}
              <div className="form-group">
                <label>School *</label>
                <select
                  value={formData.school_id}
                  onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                  disabled={!!editingSubscription}
                  required
                >
                  <option value="">Select a school</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name} ({school.school_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Type */}
              <div className="form-group">
                <label>Plan Type *</label>
                <select
                  value={formData.plan_type}
                  onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                  required
                >
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              {/* End Date */}
              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>

              {/* Amount */}
              <div className="form-group">
                <label>Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label>Payment Method</label>
                <input
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  placeholder="e.g., Credit Card, Bank Transfer"
                />
              </div>

              {/* Transaction ID */}
              <div className="form-group">
                <label>Transaction ID</label>
                <input
                  value={formData.transaction_id}
                  onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                  placeholder="Transaction reference"
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              {/* ACTIONS */}
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={editingSubscription ? handleUpdateSubscription : handleCreateSubscription}
                >
                  {editingSubscription ? "Save Changes" : "Create Subscription"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style jsx>{`
        .dashboard-container {
          padding: 20px;
          background: #f5f6fa;
          min-height: 100vh;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e0e0e0;
        }

        .dashboard-header h1 {
          font-size: 28px;
          font-weight: 600;
          color: #030213;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn-add {
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-add:hover {
          background: #0056b3;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 0;
        }

        .tab-btn {
          padding: 12px 24px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: #007bff;
          background: rgba(0, 123, 255, 0.05);
        }

        .tab-btn.active {
          color: #007bff;
          border-bottom-color: #007bff;
          background: rgba(0, 123, 255, 0.05);
        }

        .filters {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .btn-filter {
          padding: 8px 16px;
          border: 1px solid #d0d5dd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #344054;
          transition: all 0.2s;
        }

        .btn-filter:hover {
          border-color: #007bff;
          color: #007bff;
        }

        .btn-filter.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .dashboard-content {
          background: white;
          border-radius: 12px;
          border: 1px solid #e0e0e0;
          overflow: hidden;
        }

        .table-container {
          overflow-x: auto;
        }

        .dashboard-table {
          width: 100%;
          border-collapse: collapse;
        }

        .dashboard-table th,
        .dashboard-table td {
          padding: 16px;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        .dashboard-table th {
          background: #f8f9fa;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #666;
        }

        .dashboard-table td {
          font-size: 14px;
          color: #333;
        }

        .dashboard-table tr:hover {
          background: #f8f9fa;
        }

        .expired-row {
          background-color: #fff3cd !important;
        }

        .expired-row:hover {
          background-color: #ffeaa7 !important;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-success {
          background: #d4edda;
          color: #155724;
        }

        .status-danger {
          background: #f8d7da;
          color: #721c24;
        }

        .status-warning {
          background: #fff3cd;
          color: #856404;
        }

        .status-info {
          background: #d1ecf1;
          color: #0c5460;
        }

        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn-edit,
        .btn-save,
        .btn-delete,
        .btn-cancel {
          padding: 6px 12px;
          border: 1px solid;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-edit {
          background: #fff3cd;
          border-color: #ffeaa7;
          color: #856404;
        }

        .btn-edit:hover {
          background: #ffeaa7;
        }

        .btn-save {
          background: #d4edda;
          border-color: #c3e6cb;
          color: #155724;
        }

        .btn-save:hover {
          background: #c3e6cb;
        }

        .btn-delete {
          background: #f8d7da;
          border-color: #f5c6cb;
          color: #721c24;
        }

        .btn-delete:hover {
          background: #f5c6cb;
        }

        .btn-cancel {
          background: #e9ecef;
          border-color: #dee2e6;
          color: #495057;
        }

        .btn-cancel:hover {
          background: #dee2e6;
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 14px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 14px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          margin: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #030213;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: #f5f5f5;
          color: #333;
        }

        .school-form {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          font-size: 14px;
          color: #333;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d0d5dd;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1001;
          animation: slideIn 0.3s ease;
        }

        .toast-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: inherit;
          opacity: 0.6;
          padding: 0;
          margin-left: 12px;
        }

        .toast-close:hover {
          opacity: 1;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
