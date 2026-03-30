"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type ClassItem = { id: number; name: string };
type StudentRow = {
  id: string; name: string; unique_id: string; email: string;
  class_id: string; status: string; profile_image: string;
  children?: any[]; parents?: any[];
};

export default function SecretaryStudentsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add student+parent modal
  const [showModal, setShowModal] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentPassword, setStudentPassword] = useState("default123");
  const [parentName, setParentName] = useState("");
  const [parentPassword, setParentPassword] = useState("default123");
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Edit modal
  const [editStudent, setEditStudent] = useState<StudentRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  const fetchClasses = async () => {
    if (!currentUser?.school_id) return;
    try {
      const res = await fetch(`${API_URL}/api/classes/?school_id=${currentUser.school_id}`);
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchStudents = async () => {
    if (!currentUser?.school_id || !selectedClassId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/users/?school_id=${currentUser.school_id}&requester_id=${currentUser.id}&requester_role=${currentUser.role}`
      );
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const all = (data.users || [])
        .filter((u: any) => u.role === "STUDENT" && String(u.class_id) === String(selectedClassId))
        .map((u: any) => ({
          id: String(u.id),
          name: u.name || "",
          unique_id: u.unique_id || "",
          email: u.email || "",
          class_id: String(u.class_id || ""),
          status: u.status || "active",
          profile_image: u.profile_image || "",
          parents: u.parents || [],
        }));
      setStudents(all);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (currentUser?.school_id) fetchClasses();
  }, [currentUser]);

  useEffect(() => {
    if (selectedClassId) fetchStudents();
    else setStudents([]);
  }, [selectedClassId, currentUser]);

  // Create student + parent
  const handleCreate = async () => {
    if (!studentName.trim()) { setError("Student name required"); return; }
    if (!selectedClassId) { setError("Select a class"); return; }
    setSaving(true); setError(null); setSuccessMsg(null);
    try {
      const token = localStorage.getItem("token");

      // 1. Create student
      const studentRes = await fetch(`${API_URL}/api/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: studentName,
          role: "STUDENT",
          password: studentPassword || "default123",
          school_id: currentUser?.school_id,
          class_id: selectedClassId,
          requester_id: currentUser?.id,
        }),
      });
      if (!studentRes.ok) {
        const b = await studentRes.json().catch(() => ({}));
        throw new Error(b.error || "Failed to create student");
      }
      const studentData = await studentRes.json();
      const studentId = studentData.id;
      const studentUniqueId = studentData.unique_id || "";

      let parentUniqueId = "";

      // 2. Create parent if name provided
      if (parentName.trim()) {
        const parentRes = await fetch(`${API_URL}/api/users/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: parentName,
            role: "PARENT",
            password: parentPassword || "default123",
            school_id: currentUser?.school_id,
            children_ids: [studentId],
            requester_id: currentUser?.id,
          }),
        });
        if (!parentRes.ok) {
          const b = await parentRes.json().catch(() => ({}));
          throw new Error(b.error || "Failed to create parent");
        }
        const parentData = await parentRes.json();
        parentUniqueId = parentData.unique_id || "";
      }

      let msg = `✅ Élève créé! ID: ${studentUniqueId}`;
      if (parentUniqueId) msg += ` | Parent ID: ${parentUniqueId}`;
      msg += ` | Mot de passe par défaut: ${studentPassword || "default123"}`;
      setSuccessMsg(msg);
      setStudentName("");
      setParentName("");
      setStudentPassword("default123");
      setParentPassword("default123");
      setShowModal(false);
      fetchStudents();
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  // Edit student
  const openEdit = (s: StudentRow) => {
    setEditStudent(s);
    setEditName(s.name);
    setEditPassword("");
  };

  const handleUpdate = async () => {
    if (!editStudent) return;
    setEditSaving(true); setError(null); setSuccessMsg(null);
    try {
      const token = localStorage.getItem("token");
      const body: any = { name: editName };
      if (editPassword.trim()) body.password = editPassword;

      const res = await fetch(`${API_URL}/api/users/${editStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed");
      }
      setSuccessMsg("Student updated!");
      setEditStudent(null);
      fetchStudents();
    } catch (err: any) {
      setError(err.message);
    } finally { setEditSaving(false); }
  };

  // Delete student
  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet élève ?")) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/users/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMsg("Deleted");
      fetchStudents();
    } catch (err: any) { setError(err.message); }
  };

  const selectedClassName = classes.find(c => c.id === selectedClassId)?.name || "";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <h2 style={{ marginBottom: 4 }}>🎓 Gestion des Élèves</h2>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 20 }}>
        Sélectionnez une classe, puis ajoutez des élèves avec leurs parents.
      </p>

      {error && <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "10px 16px", marginBottom: 14, fontSize: 14 }}>{error}</div>}
      {successMsg && <div style={{ background: "#dcfce7", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 12, padding: "10px 16px", marginBottom: 14, fontSize: 14 }}>{successMsg}</div>}

      {/* Class selector */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <select
          value={selectedClassId ?? ""}
          onChange={e => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, minWidth: 200 }}
        >
          <option value="">-- Choisir une classe --</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {selectedClassId && (
          <button
            onClick={() => { setStudentName(""); setParentName(""); setStudentPassword("default123"); setParentPassword("default123"); setShowModal(true); }}
            style={{
              background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", border: "none",
              padding: "10px 20px", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14,
              boxShadow: "0 4px 14px rgba(34,197,94,0.25)",
            }}
          >
            + Ajouter Élève
          </button>
        )}
      </div>

      {/* Students table */}
      {loading && <p>Chargement...</p>}

      {!loading && selectedClassId && students.length > 0 && (
        <div style={{ border: "1px solid rgba(17,24,39,0.08)", borderRadius: 16, overflow: "hidden", background: "#fff", boxShadow: "0 4px 16px rgba(17,24,39,0.04)" }}>
          <div style={{ background: "#f9fafb", padding: "10px 16px", borderBottom: "1px solid rgba(17,24,39,0.06)", fontWeight: 700, fontSize: 14, color: "#374151" }}>
            {selectedClassName} — {students.length} élève{students.length !== 1 ? "s" : ""}
          </div>
          {students.map((s, idx) => (
            <div key={s.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px", borderBottom: idx < students.length - 1 ? "1px solid rgba(17,24,39,0.04)" : "none",
              flexWrap: "wrap", gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                {s.profile_image ? (
                  <img src={s.profile_image} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #e5e7eb" }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {s.unique_id && <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#166534", background: "#f0fdf4", padding: "1px 6px", borderRadius: 4, marginRight: 6 }}>ID: {s.unique_id}</span>}
                    {s.parents && s.parents.length > 0 && (
                      <span style={{ color: "#4338ca" }}>Parent: {s.parents.map((p: any) => p.name).join(", ")}</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => openEdit(s)} style={{
                  background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe",
                  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>✏️ Edit</button>
                <button onClick={() => handleDelete(s.id)} style={{
                  background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca",
                  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && selectedClassId && students.length === 0 && (
        <p style={{ color: "#666", fontSize: 13 }}>Aucun élève dans cette classe. Cliquez sur "+ Ajouter Élève".</p>
      )}

      {!selectedClassId && !loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📚</div>
          <p>Sélectionnez une classe pour voir et gérer les élèves.</p>
        </div>
      )}

      {/* ===== ADD STUDENT MODAL ===== */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }} onClick={() => setShowModal(false)}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 0" }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>➕ Ajouter Élève + Parent</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#6b7280" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#1e40af" }}>
                Classe: <strong>{selectedClassName}</strong>
              </div>

              {/* Student section */}
              <div style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 14, border: "1px solid #e5e7eb" }}>
                <h4 style={{ margin: "0 0 12px", fontSize: 15, color: "#111827" }}>🎓 Élève</h4>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Nom de l&apos;élève *</label>
                  <input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Nom complet" style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Mot de passe</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPwd ? "text" : "password"} value={studentPassword} onChange={e => setStudentPassword(e.target.value)} style={{ width: "100%", padding: "10px 44px 10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b7280" }}>{showPwd ? "🙈" : "👁️"}</button>
                  </div>
                  <small style={{ color: "#9ca3af", fontSize: 12 }}>Par défaut: default123. L&apos;élève pourra le changer.</small>
                </div>
              </div>

              {/* Parent section */}
              <div style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 14, border: "1px solid #e5e7eb" }}>
                <h4 style={{ margin: "0 0 12px", fontSize: 15, color: "#111827" }}>👨‍👩‍👧 Parent (optionnel)</h4>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Nom du parent</label>
                  <input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Nom du parent (laisser vide si pas de parent)" style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Mot de passe parent</label>
                  <input type={showPwd ? "text" : "password"} value={parentPassword} onChange={e => setParentPassword(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                  <small style={{ color: "#9ca3af", fontSize: 12 }}>Par défaut: default123</small>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button onClick={() => setShowModal(false)} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", padding: "10px 20px", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Annuler</button>
                <button onClick={handleCreate} disabled={saving} style={{
                  background: "linear-gradient(135deg, #6a11cb, #2575fc)", color: "#fff", border: "none",
                  padding: "10px 24px", borderRadius: 10, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                  fontSize: 14, opacity: saving ? 0.6 : 1,
                }}>
                  {saving ? "Création..." : "Créer Élève"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT STUDENT MODAL ===== */}
      {editStudent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }} onClick={() => setEditStudent(null)}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 0" }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>✏️ Modifier Élève</h3>
              <button onClick={() => setEditStudent(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#6b7280" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              {editStudent.unique_id && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 14, color: "#166534" }}>
                  <strong>ID:</strong> <code style={{ fontWeight: 700, fontSize: 16 }}>{editStudent.unique_id}</code>
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Nom</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Nouveau mot de passe (laisser vide pour garder)</label>
                <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Nouveau mot de passe" style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button onClick={() => setEditStudent(null)} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", padding: "10px 20px", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Annuler</button>
                <button onClick={handleUpdate} disabled={editSaving} style={{
                  background: "linear-gradient(135deg, #6a11cb, #2575fc)", color: "#fff", border: "none",
                  padding: "10px 24px", borderRadius: 10, fontWeight: 700, cursor: editSaving ? "not-allowed" : "pointer",
                  fontSize: 14, opacity: editSaving ? 0.6 : 1,
                }}>
                  {editSaving ? "Saving..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
