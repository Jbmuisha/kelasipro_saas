"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ContractDocument, ContractData, SchoolData, SubscriptionData } from "@/components/ContractPDF";
import { PDFDownloadLink as PDFDownloadLinkRaw } from '@react-pdf/renderer';
import "@/styles/dashboard.css";

// Type assertion for @react-pdf/renderer components
const PDFDownloadLink: any = PDFDownloadLinkRaw;

const API_URL = "http://localhost:5000";

type School = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  school_type?: string;
};

type SubscriptionPlan = {
  id: number;
  name: string;
  price: number;
  duration_months: number;
  features: string;
};

type Subscription = {
  id: number;
  school_id: number;
  plan_type: string;
  start_date: string;
  end_date: string;
  amount: number;
  status: string;
  payment_status: string;
  school?: {
    id: number;
    name: string;
  };
};

type Contract = {
  id: number;
  contract_number: string;
  school_id: number;
  subscription_id: number | null;
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
  updated_at?: string;
  school?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    school_type?: string;
  };
  subscription?: {
    id: number;
    plan_type: string;
    amount: number;
    start_date: string;
    end_date: string;
  };
};

// Toast component
const Toast = ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => (
  <div className={`toast toast-${type}`}>
    <span>{message}</span>
    <button className="toast-close" onClick={onClose}>×</button> 
  </div>
);

export default function AdminContractsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    start_date: "",
    end_date: "",
    terms: "",
    status: ""
  });
  
   // Form state
   const [formData, setFormData] = useState({
     school_id: "",
     plan_type: "personnalisé", // Default plan type since plan selection is removed
     start_date: "",
     end_date: "",
     amount: "",
   });

  // Show toast
  const showToast = (message: string, type: string = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // Fetch schools
  const fetchSchools = async () => {
    try {
      const response = await fetch(`${API_URL}/api/schools`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSchools(data.schools || []);
      }
    } catch (err) {
      console.error("Fetch schools error:", err);
    }
  };

  // Fetch subscription plans
  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/api/subscriptions/plans/all`);
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error("Fetch plans error:", err);
    }
  };

  // Fetch subscriptions
  const fetchSubscriptions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (err) {
      console.error("Fetch subscriptions error:", err);
    }
  };

  // Fetch contracts
  const fetchContracts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/subscriptions/contracts/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts || []);
      }
    } catch (err) {
      console.error("Fetch contracts error:", err);
    }
  };

   // Create subscription and automatically create contract
   const handleCreateSubscription = async () => {
     if (!formData.school_id || !formData.end_date || !formData.amount) {
       showToast("Veuillez remplir tous les champs obligatoires", "error");
       return;
     }

    try {
      const startDate = formData.start_date || new Date().toISOString().split('T')[0];
      
      const response = await fetch(`${API_URL}/api/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          school_id: parseInt(formData.school_id),
          plan_type: formData.plan_type,
          start_date: startDate,
          end_date: formData.end_date,
          amount: parseFloat(formData.amount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Échec de la création de l'abonnement", "error");
        return;
      }

      // Automatically create contract for this subscription
      const subscription = data.subscription;
      const contractStartDate = subscription.start_date.split('T')[0];
      const contractEndDate = subscription.end_date.split('T')[0];

      const contractResponse = await fetch(`${API_URL}/api/subscriptions/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          school_id: subscription.school_id,
          subscription_id: subscription.id,
          start_date: contractStartDate,
          end_date: contractEndDate,
          terms: `Contrat d'utilisation du système de gestion scolaire KELASI_PRO`,
          status: 'draft'
        }),
      });

      if (contractResponse.ok) {
        showToast("Abonnement et contrat créés avec succès!", "success");
      } else {
        showToast("Abonnement créé, mais erreur lors de la création du contrat", "error");
      }

      setShowCreateModal(false);
       setFormData({ school_id: "", plan_type: "personnalisé", start_date: "", end_date: "", amount: "" });
       fetchSubscriptions();
      fetchContracts();
    } catch (err) {
      console.error("Create subscription error:", err);
      showToast("Erreur lors de la création de l'abonnement", "error");
    }
  };

  // View contract
  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setEditForm({
      start_date: contract.start_date,
      end_date: contract.end_date,
      terms: contract.terms || "",
      status: contract.status
    });
    setIsEditing(false);
    setShowContractModal(true);
  };

  // Sign contract (by platform)
  const handleSignContract = async (contractId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/subscriptions/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          signed_by_platform: true,
          status: 'signed'
        }),
      });

      if (!response.ok) {
        showToast("Échec de la signature du contrat", "error");
        return;
      }

      showToast("Contrat signé avec succès!", "success");
      fetchContracts();
      if (selectedContract && selectedContract.id === contractId) {
        setSelectedContract({ ...selectedContract, signed_by_platform: true, status: 'signed' });
      }
    } catch (err) {
      console.error("Sign contract error:", err);
      showToast("Erreur lors de la signature", "error");
    }
  };

  // Update contract
  const handleUpdateContract = async () => {
    if (!selectedContract) return;

    try {
      const response = await fetch(`${API_URL}/api/subscriptions/contracts/${selectedContract.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          start_date: editForm.start_date,
          end_date: editForm.end_date,
          terms: editForm.terms,
          status: editForm.status
        }),
      });

      if (!response.ok) {
        showToast("Échec de la mise à jour du contrat", "error");
        return;
      }

      showToast("Contrat mis à jour avec succès!", "success");
      setIsEditing(false);
      fetchContracts();
      // Update selected contract
      const updatedContract = { ...selectedContract, ...editForm };
      setSelectedContract(updatedContract);
    } catch (err) {
      console.error("Update contract error:", err);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  useEffect(() => {
    fetchSchools();
    fetchPlans();
    fetchSubscriptions();
    fetchContracts();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Gestion des Contrats</h1>
        <div className="header-actions">
          <button className="btn-add" onClick={() => setShowCreateModal(true)}>
            + Créer un Abonnement
          </button>
        </div>
      </div>

      {error && <p className="no-data">{error}</p>}

      {/* Contracts Card Grid */}
      {contracts.length > 0 && (
        <div className="dashboard-content">
          <div className="contracts-grid">
            {contracts.map((contract) => (
              <div key={contract.id} className="contract-card">
                <div className="contract-card-header">
                  <h3 className="contract-number">{contract.contract_number}</h3>
                  <span className={`status-badge status-${contract.status === 'signed' ? 'success' : contract.status === 'draft' ? 'warning' : 'error'}`}>
                    {contract.status}
                  </span>
                </div>
                
                <div className="contract-card-body">
                  <div className="contract-info-row">
                    <span className="label">École:</span>
                    <span className="value">{contract.school?.name || 'N/A'}</span>
                  </div>
                  
                  <div className="contract-info-row">
                    <span className="label">Plan:</span>
                    <span className="value">{contract.subscription?.plan_type || 'N/A'}</span>
                  </div>
                  
                  <div className="contract-info-row">
                    <span className="label">Montant:</span>
                    <span className="value amount">
                      {contract.subscription ? `$${contract.subscription.amount.toFixed(2)}` : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="contract-info-row">
                    <span className="label">Période:</span>
                    <span className="value">
                      {contract.start_date} - {contract.end_date}
                    </span>
                  </div>
                  
                  <div className="contract-info-row">
                    <span className="label">Signatures:</span>
                    <span className="value">
                      {contract.signed_by_school ? '✅ École' : '❌ École'} {contract.signed_by_platform ? '✅ Plateforme' : '❌ Plateforme'}
                    </span>
                  </div>
                </div>
                
                <div className="contract-card-actions">
                  <button className="btn-view" onClick={() => handleViewContract(contract)}>
                    👁️ Voir
                  </button>
                  {!contract.signed_by_platform && (
                    <button className="btn-sign" onClick={() => handleSignContract(contract.id)}>
                      ✍️ Signer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {contracts.length === 0 && !loading && (
        <div className="dashboard-content">
          <p className="no-data">Aucun contrat trouvé. Créez d'abord un abonnement pour une école.</p>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      )}

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Créer un Abonnement</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className="school-form">
              {/* School Selection */}
              <div className="form-group">
                <label>École *</label>
                <select
                  value={formData.school_id}
                  onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                  required
                >
                  <option value="">Sélectionner une école</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name} ({school.school_type})
                    </option>
                  ))}
                </select>
              </div>

               {/* Start Date */}
              <div className="form-group">
                <label>Date de début</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              {/* End Date */}
              <div className="form-group">
                <label>Date de fin *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>

               {/* Amount (manual entry) */}
               <div className="form-group">
                 <label>Montant mensuel (USD) *</label>
                 <input
                   type="number"
                   step="0.01"
                   value={formData.amount}
                   onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                   placeholder="0.00"
                   required
                 />
               </div>

              {/* Actions */}
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </button>
                <button className="btn-save" onClick={handleCreateSubscription}>
                  Créer l'Abonnement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Detail Modal */}
      {showContractModal && selectedContract && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Contrat: {selectedContract.contract_number}</h2>
              <button className="modal-close" onClick={() => setShowContractModal(false)}>×</button>
            </div>

            <div className="dashboard-content">
              {isEditing ? (
                // Edit Form
                <div className="school-form">
                  <div className="form-group">
                    <label>Date de début</label>
                    <input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Date de fin *</label>
                    <input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Termes du contrat</label>
                    <textarea
                      value={editForm.terms}
                      onChange={(e) => setEditForm({ ...editForm, terms: e.target.value })}
                      rows={4}
                      style={{ padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem', resize: 'vertical', minHeight: '100px' }}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Statut</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="draft">Brouillon</option>
                      <option value="signed">Signé</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </div>
                  
                  <div className="form-actions">
                    <button className="btn-cancel" onClick={() => setIsEditing(false)}>
                      Annuler
                    </button>
                    <button className="btn-save" onClick={handleUpdateContract}>
                      💾 Enregistrer
                    </button>
                  </div>
                </div>
                ) : (
                // View Mode
                <>
                  <div className="contract-detail">
                    <div className="detail-row">
                      <span className="detail-label">École</span>
                      <span className="detail-value">{selectedContract.school?.name || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Plan</span>
                      <span className="detail-value">{selectedContract.subscription?.plan_type || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Montant</span>
                      <span className="detail-value amount">{selectedContract.subscription ? `$${selectedContract.subscription.amount.toFixed(2)}` : 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Période</span>
                      <span className="detail-value">Du {selectedContract.start_date} au {selectedContract.end_date}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Statut</span>
                      <span className="detail-value">
                        <span className={`status-badge status-${selectedContract.status === 'signed' ? 'success' : selectedContract.status === 'draft' ? 'warning' : 'error'}`}>
                          {selectedContract.status}
                        </span>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Signatures</span>
                      <span className="detail-value">
                        École: {selectedContract.signed_by_school ? '✅ Signé' : '❌ Non signé'} |
                        Plateforme: {selectedContract.signed_by_platform ? '✅ Signé' : '❌ Non signé'}
                      </span>
                    </div>
                  </div>

                  <div className="form-actions">
                    {selectedContract.subscription && selectedContract.school && (
                      <PDFDownloadLink
                        document={
                          <ContractDocument 
                            contract={{
                              ...selectedContract,
                              updated_at: selectedContract.updated_at || selectedContract.created_at
                            }}
                            school={selectedContract.school}
                            subscription={selectedContract.subscription}
                          />
                        }
                        fileName={`contrat-${selectedContract.contract_number}.pdf`}
                        className="btn-download"
                      >
                        {({ loading }: { loading: boolean }) => (loading ? '⏳ Génération...' : '📥 Télécharger le PDF')}
                      </PDFDownloadLink>
                    )}
                    
                    {!selectedContract.signed_by_platform && (
                      <button 
                        className="btn-sign" 
                        onClick={() => {
                          handleSignContract(selectedContract.id);
                        }}
                      >
                        ✍️ Signer le Contrat
                      </button>
                    )}
                    <button 
                      className="btn-view" 
                      onClick={() => setIsEditing(true)}
                      style={{ marginRight: 'auto' }}
                    >
                      ✏️ Modifier
                    </button>
                    <button 
                      className="btn-cancel" 
                      onClick={() => setShowContractModal(false)}
                    >
                      Fermer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
