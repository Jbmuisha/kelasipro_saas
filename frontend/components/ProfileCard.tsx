"use client";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const ROLE_CONFIG: Record<string, {
  label: string; idLabel: string; emoji: string;
  gradient: string; gradientDark: string; accent: string; accentLight: string; accentBorder: string;
}> = {
  TEACHER:      { label: "Enseignant",    idLabel: "Teacher ID",      emoji: "👨‍🏫", gradient: "linear-gradient(135deg,#0f4c3a,#10b981)", gradientDark: "linear-gradient(135deg,#064e3b,#059669)", accent: "#059669", accentLight: "#ecfdf5", accentBorder: "#a7f3d0" },
  SECRETARY:    { label: "Secrétaire",    idLabel: "Secretary ID",    emoji: "📋", gradient: "linear-gradient(135deg,#1e3a5f,#2575fc)", gradientDark: "linear-gradient(135deg,#1e3a5f,#1d4ed8)", accent: "#2563eb", accentLight: "#eff6ff", accentBorder: "#bfdbfe" },
  STUDENT:      { label: "Élève",         idLabel: "Student ID",      emoji: "🎓", gradient: "linear-gradient(135deg,#7c2d12,#f59e0b)", gradientDark: "linear-gradient(135deg,#7c2d12,#d97706)", accent: "#d97706", accentLight: "#fffbeb", accentBorder: "#fde68a" },
  PARENT:       { label: "Parent",        idLabel: "Parent ID",       emoji: "👨‍👩‍👧", gradient: "linear-gradient(135deg,#4c1d95,#8b5cf6)", gradientDark: "linear-gradient(135deg,#4c1d95,#7c3aed)", accent: "#7c3aed", accentLight: "#f5f3ff", accentBorder: "#c4b5fd" },
  SCHOOL_ADMIN: { label: "Admin École",   idLabel: "School Admin ID", emoji: "🏫", gradient: "linear-gradient(135deg,#1e293b,#475569)", gradientDark: "linear-gradient(135deg,#0f172a,#334155)", accent: "#475569", accentLight: "#f8fafc", accentBorder: "#cbd5e1" },
  SUPER_ADMIN:  { label: "Super Admin",   idLabel: "Admin ID",        emoji: "⚡", gradient: "linear-gradient(135deg,#7f1d1d,#dc2626)", gradientDark: "linear-gradient(135deg,#7f1d1d,#b91c1c)", accent: "#dc2626", accentLight: "#fef2f2", accentBorder: "#fecaca" },
  ASSISTANT:    { label: "Assistant",     idLabel: "Assistant ID",    emoji: "🤝", gradient: "linear-gradient(135deg,#164e63,#06b6d4)", gradientDark: "linear-gradient(135deg,#164e63,#0891b2)", accent: "#0891b2", accentLight: "#ecfeff", accentBorder: "#a5f3fc" },
};

type ProfileCardProps = {
  user: any;
  onImageUpdated?: (newUrl: string) => void;
  onPasswordSaved?: () => void;
  editable?: boolean;
};

export default function ProfileCard({ user, onImageUpdated, onPasswordSaved, editable = true }: ProfileCardProps) {
  const [profileImage, setProfileImage] = useState(user?.profile_image || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: string } | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const role = user?.role || "TEACHER";
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.TEACHER;

  const handleImageUpload = async (file: File) => {
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/api/uploads/profile-image`, {
        method: "POST", headers: { Authorization: `Bearer ${token || ""}` }, body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const url = (data.url as string) || "";
      const absoluteUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
      setProfileImage(absoluteUrl);
      await fetch(`${API_URL}/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ profile_image: absoluteUrl }),
      });
      const updated = { ...user, profile_image: absoluteUrl };
      localStorage.setItem("user", JSON.stringify(updated));
      onImageUpdated?.(absoluteUrl);
      setMsg({ text: "Photo mise à jour!", type: "success" });
    } catch (err: any) { setMsg({ text: err.message || "Upload failed", type: "error" }); }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!password.trim()) { setMsg({ text: "Entrez un nouveau mot de passe", type: "error" }); return; }
    if (password !== confirmPassword) { setMsg({ text: "Les mots de passe ne correspondent pas", type: "error" }); return; }
    setSaving(true); setMsg(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed"); }
      setPassword(""); setConfirmPassword(""); setShowEdit(false);
      setMsg({ text: "Mot de passe mis à jour!", type: "success" });
      onPasswordSaved?.();
    } catch (err: any) { setMsg({ text: err.message || "Error", type: "error" }); }
    finally { setSaving(false); }
  };

  if (!user) return null;

  return (
    <div>
      <style>{`
        .idcard {
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04);
          background: #fff;
          font-family: 'Inter', system-ui, sans-serif;
          aspect-ratio: 86 / 54; /* credit-card ratio */
          max-width: 600px;
          display: flex;
          flex-direction: column;
        }

        /* ── Top bar ── */
        .idcard-top {
          padding: 14px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          flex-shrink: 0;
        }
        .idcard-top-pattern {
          position: absolute; inset: 0; opacity: .06;
          background-image:
            radial-gradient(circle at 15% 50%, #fff 1px, transparent 1px),
            radial-gradient(circle at 85% 30%, #fff 1.2px, transparent 1.2px);
          background-size: 40px 40px, 55px 55px;
        }
        .idcard-org { display: flex; align-items: center; gap: 8px; color: #fff; position: relative; z-index: 1; }
        .idcard-org-logo { font-size: 20px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.2)); }
        .idcard-org-name { font-weight: 900; font-size: 15px; letter-spacing: .3px; }
        .idcard-org-sub { font-size: 8px; opacity: .7; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; }
        .idcard-badge {
          position: relative; z-index: 1;
          background: rgba(255,255,255,.18); backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,.28); color: #fff;
          padding: 3px 12px; border-radius: 16px;
          font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
        }

        /* ── Body: horizontal layout ── */
        .idcard-body {
          flex: 1;
          display: flex;
          gap: 18px;
          padding: 16px 22px 14px;
          align-items: flex-start;
        }

        /* Left: photo */
        .idcard-photo-col {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .idcard-photo-wrap { position: relative; }
        .idcard-photo {
          width: 90px; height: 90px; border-radius: 14px; object-fit: cover;
          border: 3px solid; box-shadow: 0 4px 16px rgba(0,0,0,.1);
        }
        .idcard-photo-ph {
          width: 90px; height: 90px; border-radius: 14px;
          border: 3px solid; display: flex; align-items: center; justify-content: center;
          font-size: 36px; box-shadow: 0 4px 16px rgba(0,0,0,.1);
        }
        .idcard-cam {
          position: absolute; bottom: -4px; right: -4px;
          width: 26px; height: 26px; border-radius: 50%;
          color: #fff; border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,.2);
          transition: transform .15s;
        }
        .idcard-cam:hover { transform: scale(1.1); }

        /* Right: info */
        .idcard-info-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }
        .idcard-name {
          font-size: 20px; font-weight: 900; color: #111827;
          margin: 0 0 2px; letter-spacing: -.3px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .idcard-role-text {
          font-size: 11px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 1.5px; margin-bottom: 10px;
        }

        /* ID badge inline */
        .idcard-id-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 10px; border-radius: 10px;
          margin-bottom: 8px;
        }
        .idcard-id-label {
          font-size: 8px; font-weight: 900; text-transform: uppercase;
          letter-spacing: 1px; white-space: nowrap;
        }
        .idcard-id-value {
          font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
          font-size: 18px; font-weight: 900; letter-spacing: 3px;
        }

        /* Detail rows */
        .idcard-details {
          display: flex; flex-direction: column; gap: 3px;
        }
        .idcard-detail {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; color: #6b7280;
        }
        .idcard-detail-icon { font-size: 12px; width: 16px; text-align: center; }
        .idcard-detail-val { font-weight: 600; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* ── Footer ── */
        .idcard-footer {
          padding: 8px 22px;
          display: flex; justify-content: space-between; align-items: center;
          flex-shrink: 0;
        }
        .idcard-footer-left { color: rgba(255,255,255,.65); font-size: 8px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; }
        .idcard-footer-right { color: #fff; font-size: 11px; font-weight: 900; letter-spacing: .5px; }

        /* ── Responsive: stack on very small ── */
        @media (max-width: 420px) {
          .idcard { aspect-ratio: auto; }
          .idcard-body { flex-direction: column; align-items: center; text-align: center; gap: 12px; }
          .idcard-info-col { align-items: center; }
          .idcard-name { white-space: normal; text-align: center; }
          .idcard-id-row { justify-content: center; }
          .idcard-details { align-items: center; }
        }
      `}</style>

      {msg && (
        <div style={{
          background: msg.type === "success" ? "#dcfce7" : "#fee2e2",
          border: `1px solid ${msg.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: msg.type === "success" ? "#166534" : "#991b1b",
          borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 14,
        }}>{msg.text}</div>
      )}

      {/* ═══════ ID CARD ═══════ */}
      <div className="idcard">
        {/* Top bar */}
        <div className="idcard-top" style={{ background: cfg.gradient }}>
          <div className="idcard-top-pattern" />
          <div className="idcard-org">
            <span className="idcard-org-logo">📚</span>
            <div>
              <div className="idcard-org-name">SP!K</div>
              <div className="idcard-org-sub">KelasiPro SaaS</div>
            </div>
          </div>
          <div className="idcard-badge">{cfg.label}</div>
        </div>

        {/* Body: photo left, info right */}
        <div className="idcard-body">
          {/* Photo */}
          <div className="idcard-photo-col">
            <div className="idcard-photo-wrap">
              {profileImage ? (
                <img src={profileImage} alt={user.name} className="idcard-photo" style={{ borderColor: cfg.accentBorder }} />
              ) : (
                <div className="idcard-photo-ph" style={{ borderColor: cfg.accentBorder, background: cfg.accentLight, color: cfg.accent }}>
                  {cfg.emoji}
                </div>
              )}
              {editable && (
                <label className="idcard-cam" style={{ background: cfg.accent }} title="Changer la photo">
                  📷
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                </label>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="idcard-info-col">
            <div className="idcard-name">{user.name}</div>
            <div className="idcard-role-text" style={{ color: cfg.accent }}>{cfg.label}</div>

            {user.unique_id && (
              <div className="idcard-id-row" style={{ background: cfg.accentLight, border: `1.5px solid ${cfg.accentBorder}` }}>
                <div className="idcard-id-label" style={{ color: cfg.accent }}>{cfg.idLabel}</div>
                <div className="idcard-id-value" style={{ color: cfg.accent }}>{user.unique_id}</div>
              </div>
            )}

            <div className="idcard-details">
              {user.email && (
                <div className="idcard-detail">
                  <span className="idcard-detail-icon">✉️</span>
                  <span className="idcard-detail-val">{user.email}</span>
                </div>
              )}
              <div className="idcard-detail">
                <span className="idcard-detail-icon">{cfg.emoji}</span>
                <span className="idcard-detail-val">{cfg.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="idcard-footer" style={{ background: cfg.gradientDark }}>
          <div className="idcard-footer-left">Carte d&apos;identité scolaire</div>
          <div className="idcard-footer-right">{new Date().getFullYear()}</div>
        </div>
      </div>

      {/* ═══════ PASSWORD CHANGE ═══════ */}
      {editable && !showEdit && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => setShowEdit(true)} style={{
            background: cfg.gradient, color: "#fff", border: "none",
            padding: "12px 28px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 14,
            boxShadow: `0 4px 14px ${cfg.accent}40`,
          }}>🔑 Modifier mon mot de passe</button>
        </div>
      )}

      {editable && showEdit && (
        <div style={{ marginTop: 20, background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "20px 24px", boxShadow: "0 4px 16px rgba(0,0,0,.04)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>🔑 Changer le mot de passe</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Nouveau mot de passe</label>
            <div style={{ position: "relative" }}>
              <input type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Entrez le nouveau mot de passe" style={{ width: "100%", padding: "10px 44px 10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b7280" }}>{showPwd ? "🙈" : "👁️"}</button>
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Confirmer</label>
            <input type={showPwd ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmez" style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={() => { setShowEdit(false); setPassword(""); setConfirmPassword(""); }} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", padding: "10px 20px", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Annuler</button>
            <button onClick={handleSave} disabled={saving} style={{ background: cfg.gradient, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 10, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 14, opacity: saving ? 0.6 : 1 }}>{saving ? "Enregistrement..." : "💾 Enregistrer"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
