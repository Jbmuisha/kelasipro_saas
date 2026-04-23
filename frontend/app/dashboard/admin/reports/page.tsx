"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5000";

type Contract = {
  id: string;
  school_id: string;
  subscription_id?: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  terms?: string;
  status: string;
  signed_by_school: boolean;
  signed_by_platform: boolean;
  school_signature_date?: string;
  platform_signature_date?: string;
  pdf_url?: string;
  created_at: string;
  school?: {
    id: string;
    name: string;
    email: string;
    address?: string;
  };
  subscription?: {
    id: string;
    plan_type: string;
    amount: number;
  };
};

type School = {
  id: string;
  name: string;
  email?: string;
  address?: string;
};

// Simple toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => (
  <div className={`toast toast-${type}`}>
    <span>{message}</span>
    <button className="toast-close" onClick={onClose}>×</button>
  </div>
);

export default function AdminReportsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    school_id: "",
    subscription_id: "",
    start_date: "",
    end_date: "",
    terms: ""
  });
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [generatingContract, setGeneratingContract] = useState<string | null>(null);

  // ================= SHOW TOAST =================
  const showToast = (message: string, type: string = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // ================= FETCH CONTRACTS =================
  const fetchContracts = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/subscriptions/contracts/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch contracts: ${response.status}`);
      }

      const data = await response.json();
      setContracts(data.contracts || []);
    } catch (err: any) {
      console.error("Fetch contracts error:", err);
      setError("Could not load contracts. Please check if the backend server is running on port 5000.");
      setContracts([]);
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
      subscription_id: "",
      start_date: "",
      end_date: "",
      terms: ""
    });
  };

  // ================= CREATE CONTRACT =================
  const handleCreateContract = async () => {
    try {
      if (!formData.school_id || !formData.start_date || !formData.end_date) {
        showToast("Please fill in all required fields", "error");
        return;
      }

      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_URL}/api/subscriptions/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          school_id: formData.school_id,
          subscription_id: formData.subscription_id || null,
          start_date: new Date(formData.start_date).toISOString(),
          end_date: new Date(formData.end_date).toISOString(),
          terms: formData.terms || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create contract");
      }

      fetchContracts();
      setShowModal(false);
      resetForm();
      showToast("Contract created successfully!", "success");
    } catch (err: any) {
      console.error("Create contract error:", err);
      showToast(err.message || "Failed to create contract", "error");
    }
  };

  // ================= UPDATE CONTRACT =================
  const handleUpdateContract = async () => {
    if (!editingContract) return;
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_URL}/api/subscriptions/contracts/${editingContract.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          start_date: new Date(formData.start_date).toISOString(),
          end_date: new Date(formData.end_date).toISOString(),
          terms: formData.terms || null,
          status: editingContract.status
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update contract");
      }

      fetchContracts();
      setEditingContract(null);
      setShowModal(false);
      resetForm();
      showToast("Contract updated successfully!", "success");
    } catch (err: any) {
      console.error("Update contract error:", err);
      showToast(err.message || "Failed to update contract", "error");
    }
  };

  // ================= GENERATE CONTRACT PDF =================
  const handleGenerateContract = async (contract: Contract) => {
    setGeneratingContract(contract.id);

    try {
      // Generate contract content
      const contractContent = `
KELASIPRO - CONTRACT AGREEMENT

Contract Number: ${contract.contract_number}
Date: ${new Date().toLocaleDateString()}

BETWEEN:
Kelasipro (Platform Provider)
Address: [Platform Address]

AND:
${contract.school?.name || 'School Name'}
Address: ${contract.school?.address || 'N/A'}

SUBSCRIPTION DETAILS:
- Plan: ${contract.subscription?.plan_type || 'N/A'}
- Amount: $${contract.subscription?.amount || 'N/A'}
- Start Date: ${new Date(contract.start_date).toLocaleDateString()}
- End Date: ${new Date(contract.end_date).toLocaleDateString()}

TERMS AND CONDITIONS:
${contract.terms || 'Standard terms and conditions apply.'}

This contract governs the use of Kelasipro platform services.

Signatures:
Platform: ${contract.signed_by_platform ? 'SIGNED on ' + new Date(contract.platform_signature_date!).toLocaleDateString() : 'PENDING'}
School: ${contract.signed_by_school ? 'SIGNED on ' + new Date(contract.school_signature_date!).toLocaleDateString() : 'PENDING'}

Generated on: ${new Date().toLocaleString()}
      `;

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Contract ${contract.contract_number}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
                h1 { color: #333; }
                .header { text-align: center; margin-bottom: 40px; }
                .section { margin-bottom: 20px; }
                .signature { margin-top: 60px; }
                .signature-line { border-top: 1px solid #000; width: 300px; padding-top: 10px; }
                @media print {
                  button { display: none; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>KELASIPRO - CONTRACT AGREEMENT</h1>
              </div>
              <div class="section">
                <p><strong>Contract Number:</strong> ${contract.contract_number}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <div class="section">
                <h3>BETWEEN:</h3>
                <p><strong>Kelasipro (Platform Provider)</strong><br/>
                Address: [Platform Address]</p>
              </div>
              <div class="section">
                <h3>AND:</h3>
                <p><strong>${contract.school?.name || 'School Name'}</strong><br/>
                Address: ${contract.school?.address || 'N/A'}<br/>
                Email: ${contract.school?.email || 'N/A'}</p>
              </div>
              <div class="section">
                <h3>SUBSCRIPTION DETAILS:</h3>
                <p><strong>Plan:</strong> ${contract.subscription?.plan_type || 'N/A'}</p>
                <p><strong>Amount:</strong> $${contract.subscription?.amount || 'N/A'}</p>
                <p><strong>Start Date:</strong> ${new Date(contract.start_date).toLocaleDateString()}</p>
                <p><strong>End Date:</strong> ${new Date(contract.end_date).toLocaleDateString()}</p>
              </div>
              <div class="section">
                <h3>TERMS AND CONDITIONS:</h3>
                <p>${contract.terms || 'Standard terms and conditions apply.'}</p>
              </div>
              <div class="signature">
                <p><strong>Signatures:</strong></p>
                <p>Platform: ${contract.signed_by_platform ? 'SIGNED on ' + new Date(contract.platform_signature_date!).toLocaleDateString() : 'PENDING'}</p>
                <p>School: ${contract.signed_by_school ? 'SIGNED on ' + new Date(contract.school_signature_date!).toLocaleDateString() : 'PENDING'}</p>
              </div>
              <div style="margin-top: 40px;">
                <button onclick="window.print()">Print / Save as PDF</button>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }

      showToast("Contract opened in new window. Use Print to save as PDF.", "success");
    } catch (err: any) {
      console.error("Generate contract error:", err);
      showToast("Failed to generate contract", "error");
    } finally {
      setGeneratingContract(null);
    }
  };

  // ================= SIGN CONTRACT =================
  const handleSignContract = async (contractId: string, signer: 'school' | 'platform') => {
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_URL}/api/subscriptions/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          [signer === 'school' ? 'signed_by_school' : 'signed_by_platform']: true
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sign contract");
      }

      fetchContracts();
      showToast(`Contract signed by ${signer === 'school' ? 'school' : 'platform'}!`, "success");
    } catch (err: any) {
      console.error("Sign contract error:", err);
      showToast(err.message || "Failed to sign contract", "error");
    }
  };

  // ================= OPEN CREATE MODAL =================
  const openCreateModal = () => {
    resetForm();
    setEditingContract(null);
    setShowModal(true);
  };

  // ================= OPEN EDIT MODAL =================
  const openEditModal = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      school_id: contract.school_id,
      subscription_id: contract.subscription_id || "",
      start_date: new Date(contract.start_date).toISOString().split('T')[0],
      end_date: new Date(contract.end_date).toISOString().split('T')[0],
      terms: contract.terms || ""
    });
    setShowModal(true);
  };

  // ================= GET STATUS BADGE =================
  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'draft': 'status-info',
      'active': 'status-success',
      'expired': 'status-danger',
      'cancelled': 'status-warning'
    };
    return statusMap[status] || 'status-info';
  };

  // ================= FORMAT DATE =================
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    fetchContracts();
    fetchSchools();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Reports & Contracts</h1>
        <div className="header-actions">
          <button className="btn-add" onClick={openCreateModal}>
            + Create Contract
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && <p className="no-data">{error}</p>}

      {/* LOADING */}
      {loading && <p className="loading">Loading contracts...</p>}

      {/* CONTRACTS TABLE */}
      {!loading && contracts.length > 0 && (
        <div className="dashboard-content">
          <div className="table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Contract #</th>
                  <th>School</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>School Signed</th>
                  <th>Platform Signed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td>
                      <strong>{contract.contract_number}</strong>
                    </td>
                    <td>
                      {contract.school?.name || 'Unknown School'}
                      <br />
                      <small>{contract.school?.email}</small>
                    </td>
                    <td>{formatDate(contract.start_date)}</td>
                    <td>{formatDate(contract.end_date)}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadge(contract.status)}`}>
                        {contract.status}
                      </span>
                    </td>
                    <td>
                      {contract.signed_by_school ? (
                        <span className="status-badge status-success">Yes</span>
                      ) : (
                        <button
                          className="btn-save"
                          onClick={() => handleSignContract(contract.id, 'school')}
                          style={{ padding: '4px 8px', fontSize: 12 }}
                        >
                          Sign
                        </button>
                      )}
                    </td>
                    <td>
                      {contract.signed_by_platform ? (
                        <span className="status-badge status-success">Yes</span>
                      ) : (
                        <button
                          className="btn-save"
                          onClick={() => handleSignContract(contract.id, 'platform')}
                          style={{ padding: '4px 8px', fontSize: 12 }}
                        >
                          Sign
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn-edit"
                          onClick={() => openEditModal(contract)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-save"
                          onClick={() => handleGenerateContract(contract)}
                          disabled={generatingContract === contract.id}
                          style={{ marginLeft: 5 }}
                        >
                          {generatingContract === contract.id ? 'Generating...' : 'Generate PDF'}
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

      {!loading && contracts.length === 0 && (
        <p className="no-data">No contracts found.</p>
      )}

      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      )}

      {/* CONTRACT MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>{editingContract ? "Edit Contract" : "Create Contract"}</h2>
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
                  disabled={!!editingContract}
                  required
                >
                  <option value="">Select a school</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
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

              {/* Terms */}
              <div className="form-group">
                <label>Terms and Conditions</label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="Enter contract terms..."
                  rows={6}
                />
              </div>

              {/* ACTIONS */}
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={editingContract ? handleUpdateContract : handleCreateContract}
                >
                  {editingContract ? "Save Changes" : "Create Contract"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style jsx>{`
        .status-success { background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; }
        .status-danger { background: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; }
        .status-warning { background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; }
        .status-info { background: #d1ecf1; color: #0c5460; padding: 4px 8px; border-radius: 4px; }
      `}</style>
    </div>
  );
}
