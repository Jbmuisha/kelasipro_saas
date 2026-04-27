"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ContractDocument, ContractData, SchoolData, SubscriptionData } from "@/components/ContractPDF";
  import { PDFDownloadLink as PDFDownloadLinkRaw, BlobProvider } from '@react-pdf/renderer';
  const PDFDownloadLink: any = PDFDownloadLinkRaw;
import "@/styles/dashboard.css";

const API_URL = "http://localhost:5000";

type ContractWithRelations = ContractData & {
  school?: SchoolData;
  subscription?: SubscriptionData;
};

export default function SchoolContractPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<ContractWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedContract, setSelectedContract] = useState<ContractWithRelations | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Get school ID from user session
  const getSchoolId = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return null;
      }
      
      const response = await fetch(`${API_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.user?.school_id;
      }
    } catch (err) {
      console.error("Get user error:", err);
    }
    return null;
  };

  // Fetch contracts for the school
  const fetchContracts = async (schoolId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/subscriptions/contracts/school/${schoolId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts || []);
      } else if (response.status === 404) {
        setContracts([]);
      } else {
        setError("Erreur lors du chargement des contrats");
      }
    } catch (err) {
      console.error("Fetch contracts error:", err);
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  // Sign contract (by school)
  const handleSignContract = async (contractId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir signer ce contrat ? Cette action est irréversible.")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/subscriptions/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          signed_by_school: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Échec de la signature");
      }

      // Update local state
      setContracts(prev => prev.map(c => 
        c.id === contractId 
          ? { ...c, signed_by_school: true, school_signature_date: new Date().toISOString() }
          : c
      ));
      
      if (selectedContract && selectedContract.id === contractId) {
        setSelectedContract({ ...selectedContract, signed_by_school: true, school_signature_date: new Date().toISOString() });
      }

      alert("Contrat signé avec succès !");
    } catch (err: any) {
      console.error("Sign contract error:", err);
      alert(`Erreur: ${err.message}`);
    }
  };

  // Initialize
  useEffect(() => {
    const init = async () => {
      const schoolId = await getSchoolId();
      if (schoolId) {
        await fetchContracts(schoolId);
      } else {
        setError("Impossible de déterminer l'école. Veuillez vous reconnecter.");
        setLoading(false);
      }
    };
    init();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'draft': 'status-warning',
      'pending': 'status-warning',
      'signed': 'status-success',
      'active': 'status-success',
      'cancelled': 'status-error',
      'expired': 'status-error',
    };
    return `<span class="status-badge ${statusMap[status] || 'status-warning'}">${status}</span>`;
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Chargement des contrats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="no-data">{error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📄 Mes Contrats</h1>
        <button className="btn-primary" onClick={() => fetchContracts(selectedContract?.school?.id || 0)}>
          🔄 Actualiser
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="dashboard-content">
          <div className="no-data">
            <p>Aucun contrat disponible pour votre établissement.</p>
            <p>Les contrats seront créés par l'administrateur Kelasi_Pro.</p>
          </div>
        </div>
      ) : (
        <div className="dashboard-content">
          <div className="table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>N° Contrat</th>
                  <th>Plan</th>
                  <th>Montant Mensuel</th>
                  <th>Période</th>
                  <th>Statut</th>
                  <th>Signatures</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td><strong>{contract.contract_number}</strong></td>
                    <td>{contract.subscription?.plan_type || 'N/A'}</td>
                    <td>
                      <strong>{contract.subscription ? `${contract.subscription.amount} EUR` : 'N/A'}</strong>
                    </td>
                    <td>
                      {contract.start_date} - {contract.end_date}
                    </td>
                    <td dangerouslySetInnerHTML={{ __html: getStatusBadge(contract.status) }} />
                    <td>
                      {contract.signed_by_school ? '✅ École' : '❌ École'} 
                      {' | '}
                      {contract.signed_by_platform ? '✅ Kelasi_Pro' : '⏳ Kelasi_Pro'}
                    </td>
                    <td>
                      <div className="actions">
                        <button 
                          className="btn-view" 
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowPreview(true);
                          }}
                        >
                          Voir Détails
                        </button>
                        {!contract.signed_by_school && contract.status === 'draft' && (
                          <button 
                            className="btn-sign" 
                            onClick={() => handleSignContract(contract.id)}
                          >
                            ✍️ Signer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contract Preview Modal */}
      {showPreview && selectedContract && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '90vw', maxHeight: '90vh', width: '90%' }}>
            <div className="modal-header">
              <h2>Contrat: {selectedContract.contract_number}</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowPreview(false);
                  setSelectedContract(null);
                }}
              >×</button>
            </div>

            <div className="dashboard-content" style={{ marginBottom: '20px' }}>
              {/* Contract Info */}
              <div className="table-container" style={{ marginBottom: '20px' }}>
                <table className="dashboard-table">
                  <tbody>
                    <tr>
                      <td><strong>École</strong></td>
                      <td>{selectedContract.school?.name || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Type</strong></td>
                      <td>{selectedContract.school?.school_type || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Email</strong></td>
                      <td>{selectedContract.school?.email || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Plan</strong></td>
                      <td>{selectedContract.subscription?.plan_type || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Montant Mensuel</strong></td>
                      <td><strong>{selectedContract.subscription ? `${selectedContract.subscription.amount} EUR` : 'N/A'}</strong></td>
                    </tr>
                    <tr>
                      <td><strong>Période d'abonnement</strong></td>
                      <td>Du {selectedContract.start_date} au {selectedContract.end_date}</td>
                    </tr>
                    <tr>
                      <td><strong>Statut du Contrat</strong></td>
                      <td dangerouslySetInnerHTML={{ __html: getStatusBadge(selectedContract.status) }} />
                    </tr>
                    <tr>
                      <td><strong>Signatures</strong></td>
                      <td>
                        <div>École: {selectedContract.signed_by_school ? '✅ Signé' : '❌ En attente'}</div>
                        <div>Kelasi_Pro: {selectedContract.signed_by_platform ? '✅ Signé' : '⏳ En attente'}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* PDF Preview would go here - for now just download option */}
              <div className="form-actions">
                 {selectedContract.subscription && (
                   <PDFDownloadLink
                     document={
                       <ContractDocument 
                         contract={selectedContract}
                         school={selectedContract.school || { id: 0, name: '' }}
                         subscription={selectedContract.subscription}
                       />
                     }
                     fileName={`contrat-${selectedContract.contract_number}.pdf`}
                     className="btn-download btn-sm"
                   >
                     {({ loading }: { loading: boolean }) => (loading ? 'Génération...' : 'Télécharger le PDF')}
                   </PDFDownloadLink>
                 )}
                 
                 {!selectedContract.signed_by_school && selectedContract.status === 'draft' && (
                   <button 
                     className="btn-sign btn-sm" 
                     onClick={() => {
                       if (window.confirm("En signant ce contrat, vous acceptez les conditions générales d'utilisation de Kelasi_Pro. Continuer ?")) {
                         handleSignContract(selectedContract.id);
                       }
                     }}
                   >
                     Modifier
                   </button>
                 )}
                 <button 
                   className="btn-cancel btn-sm" 
                   onClick={() => {
                     setShowPreview(false);
                     setSelectedContract(null);
                   }}
                 >
                   Fermer
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
