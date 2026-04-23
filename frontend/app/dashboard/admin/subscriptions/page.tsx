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
        <h1>Subscriptions Management</h1>
        <div className="header-actions">
          <button className="btn-add" onClick={openCreateModal}>
            + Add Subscription
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filters" style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
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
          <div className="modal-content" style={{ maxWidth: 500, width: '90%', margin: '20px' }}>
            <div className="modal-header">
              <h2>{editingSubscription ? "Edit Subscription" : "Add Subscription"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="school-form" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* School */}
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>School *</label>
                <select
                  value={formData.school_id}
                  onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                  disabled={!!editingSubscription}
                  required
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
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
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Plan Type *</label>
                <select
                  value={formData.plan_type}
                  onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                  required
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
                >
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              {/* End Date */}
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>End Date *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box' }}
                />
              </div>

              {/* Amount */}
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box' }}
                />
              </div>

              {/* Payment Method */}
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Payment Method</label>
                <input
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  placeholder="e.g., Credit Card, Bank Transfer"
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box' }}
                />
              </div>

              {/* Transaction ID */}
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Transaction ID</label>
                <input
                  value={formData.transaction_id}
                  onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                  placeholder="Transaction reference"
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box' }}
                />
              </div>

              {/* Notes */}
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              {/* ACTIONS */}
              <div className="form-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn-cancel" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', background: '#f8f9fa', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={editingSubscription ? handleUpdateSubscription : handleCreateSubscription}
                  style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#007bff', color: 'white', cursor: 'pointer' }}
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
        .filters button {
          padding: 8px 16px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .filters button.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }
        .expired-row {
          background-color: #fff3cd !important;
        }
        .status-success { background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; }
        .status-danger { background: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; }
        .status-warning { background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; }
        .status-info { background: #d1ecf1; color: #0c5460; padding: 4px 8px; border-radius: 4px; }
      `}</style>
    </div>
  );
}
