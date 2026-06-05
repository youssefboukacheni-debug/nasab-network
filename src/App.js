import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyBm4iTPpTawBfrfQLZJd1GfjsAIvytAUFs",
  authDomain: "nasab-network.firebaseapp.com",
  projectId: "nasab-network",
  storageBucket: "nasab-network.firebasestorage.app",
  messagingSenderId: "67334973520",
  appId: "1:67334973520:web:7e6329df88f321a491c955"
});
const db = getFirestore(app);

const EMPTY = {
  // Identité
  name: "", cin: "", birthYear: "", birthCity: "",
  gender: "",
  // Filiation
  fatherName: "", fatherCin: "", fatherBirthYear: "",
  motherName: "", motherCin: "", motherBirthYear: "",
  // Lignée
  lineage: "", tribe: "", origin: "",
  // Conjoint
  spouseName: "", spouseCin: "",
  // Contact
  phone: "", city: "",
  notes: ""
};

const DELETE_PASSWORD = "Nasab2026";
const CY = new Date().getFullYear();

// ── Détection des liens ──────────────────────────────────────────
function findConnections(member, all) {
  const connections = [];
  const mid = member.id;
  const mCin = (member.cin || "").trim().toUpperCase();
  const mFatherCin = (member.fatherCin || "").trim().toUpperCase();
  const mMotherCin = (member.motherCin || "").trim().toUpperCase();
  const mFatherName = (member.fatherName || "").toLowerCase().trim();
  const mMotherName = (member.motherName || "").toLowerCase().trim();
  const mSpouseCin = (member.spouseCin || "").trim().toUpperCase();
  const mLineage = (member.lineage || "").toLowerCase().trim();
  const mTribe = (member.tribe || "").toLowerCase().trim();
  const mOrigin = (member.origin || "").toLowerCase().trim();
  const mFatherBirth = (member.fatherBirthYear || "").trim();
  const mMotherBirth = (member.motherBirthYear || "").trim();

  const add = (m, link, strength) => {
    if (m.id === mid) return;
    if (connections.find(c => c.member.id === m.id)) return;
    connections.push({ member: m, link, strength });
  };

  all.forEach(m => {
    if (m.id === mid) return;
    const oCin = (m.cin || "").trim().toUpperCase();
    const oFatherCin = (m.fatherCin || "").trim().toUpperCase();
    const oMotherCin = (m.motherCin || "").trim().toUpperCase();
    const oFatherName = (m.fatherName || "").toLowerCase().trim();
    const oMotherName = (m.motherName || "").toLowerCase().trim();
    const oSpouseCin = (m.spouseCin || "").trim().toUpperCase();
    const oLineage = (m.lineage || "").toLowerCase().trim();
    const oTribe = (m.tribe || "").toLowerCase().trim();
    const oOrigin = (m.origin || "").toLowerCase().trim();
    const oFatherBirth = (m.fatherBirthYear || "").trim();
    const oMotherBirth = (m.motherBirthYear || "").trim();
    const oName = m.name.toLowerCase().trim();

    // 1. PÈRE (CIN exact)
    if (mFatherCin && oCin && mFatherCin === oCin) { add(m, "Votre père", 10); return; }
    // 2. MÈRE (CIN exact)
    if (mMotherCin && oCin && mMotherCin === oCin) { add(m, "Votre mère", 10); return; }
    // 3. FILS/FILLE (son fatherCin = moi)
    if (oFatherCin && mCin && oFatherCin === mCin) {
      add(m, m.gender === "F" ? "Votre fille" : "Votre fils", 10); return;
    }
    // 4. FILS/FILLE (son motherCin = moi)
    if (oMotherCin && mCin && oMotherCin === mCin) {
      add(m, m.gender === "F" ? "Votre fille" : "Votre fils", 10); return;
    }
    // 5. ÉPOUX/ÉPOUSE (CIN exact)
    if (mSpouseCin && oCin && mSpouseCin === oCin) {
      add(m, m.gender === "F" ? "Votre épouse" : "Votre époux", 10); return;
    }
    if (oSpouseCin && mCin && oSpouseCin === mCin) {
      add(m, m.gender === "F" ? "Votre épouse" : "Votre époux", 10); return;
    }

    // 6. FRÈRE/SŒUR — même père CIN + même mère CIN
    const sameFatherCin = mFatherCin && oFatherCin && mFatherCin === oFatherCin;
    const sameMotherCin = mMotherCin && oMotherCin && mMotherCin === oMotherCin;
    if (sameFatherCin && sameMotherCin) {
      add(m, m.gender === "F" ? "Votre sœur (même père & mère)" : "Votre frère (même père & mère)", 9); return;
    }
    if (sameFatherCin) {
      add(m, m.gender === "F" ? "Demi-sœur (même père)" : "Demi-frère (même père)", 8); return;
    }
    if (sameMotherCin) {
      add(m, m.gender === "F" ? "Demi-sœur (même mère)" : "Demi-frère (même mère)", 8); return;
    }

    // 7. MÊME GRAND-PÈRE PATERNEL (CIN)
    const myGPCin = mFatherCin ? (all.find(x => (x.cin||"").trim().toUpperCase() === mFatherCin)?.fatherCin||"").trim().toUpperCase() : "";
    const oGPCin = oFatherCin ? (all.find(x => (x.cin||"").trim().toUpperCase() === oFatherCin)?.fatherCin||"").trim().toUpperCase() : "";
    if (myGPCin && oGPCin && myGPCin === oGPCin) {
      add(m, "Cousin(e) — même grand-père paternel", 7); return;
    }

    // 8. MÊME GRAND-PÈRE via nom+année (si pas de CIN)
    const sameFatherName = mFatherName && oFatherName && mFatherName === oFatherName;
    const sameFatherBirth = mFatherBirth && oFatherBirth && mFatherBirth === oFatherBirth;
    const sameMotherName = mMotherName && oMotherName && mMotherName === oMotherName;
    const sameMotherBirth = mMotherBirth && oMotherBirth && mMotherBirth === oMotherBirth;

    if (sameFatherName && sameFatherBirth) {
      add(m, m.gender === "F" ? "Demi-sœur (même père — nom+année)" : "Demi-frère (même père — nom+année)", 7); return;
    }
    if (sameMotherName && sameMotherBirth) {
      add(m, m.gender === "F" ? "Demi-sœur (même mère — nom+année)" : "Demi-frère (même mère — nom+année)", 7); return;
    }

    // 9. PÈRE via nom (si pas CIN renseigné)
    if (mFatherName && oName && mFatherName === oName) {
      add(m, "Votre père (par nom)", 6); return;
    }
    if (mMotherName && oName && mMotherName === oName) {
      add(m, "Votre mère (par nom)", 6); return;
    }

    // 10. MÊME LIGNÉE
    if (mLineage && oLineage && mLineage === oLineage) {
      add(m, "Même lignée / نفس النسب — " + member.lineage, 3);
      return;
    }

    // 11. MÊME TRIBU
    if (mTribe && oTribe && mTribe === oTribe) {
      add(m, "Même tribu — " + member.tribe, 2);
      return;
    }

    // 12. MÊME ORIGINE
    if (mOrigin && oOrigin && mOrigin === oOrigin) {
      add(m, "Même origine — " + member.origin, 1);
    }
  });

  return connections.sort((a, b) => b.strength - a.strength);
}

const STRENGTH_COLOR = {
  10: "#52b788", 9: "#52b788", 8: "#74c69d",
  7: "#f59e0b", 6: "#f59e0b",
  3: "#6c8ebf", 2: "#6c8ebf", 1: "#555"
};

// ── Components ───────────────────────────────────────────────────
function ConnectionBadge({ link, strength }) {
  const color = STRENGTH_COLOR[strength] || "#555";
  return (
    <span style={{ background: color + "15", border: `1px solid ${color}40`, color, borderRadius: 20, padding: "2px 10px", fontSize: 11, whiteSpace: "nowrap" }}>
      {link}
    </span>
  );
}

function MemberCard({ member, onView, onDelete, deleting }) {
  const age = member.birthYear ? CY - parseInt(member.birthYear) : null;
  return (
    <div style={{ background: "#0d0f1e", border: "1.5px solid #1a1a35", borderRadius: 14, padding: "14px 18px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#dce8ff" }}>
            {member.gender === "F" ? "👩 " : member.gender === "M" ? "👨 " : "👤 "}{member.name}
            {age && <span style={{ color: "#555", fontSize: 13, fontWeight: 400, marginLeft: 8 }}>{age} ans</span>}
          </div>
          <div style={{ color: "#444", fontSize: 12, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span>🪪 {member.cin}</span>
            {member.lineage && <span>📜 {member.lineage}</span>}
            {member.tribe && <span>🏕️ {member.tribe}</span>}
            {member.origin && <span>📍 {member.origin}</span>}
          </div>
          {(member.fatherName || member.motherName) && (
            <div style={{ color: "#3a4a6a", fontSize: 11, marginTop: 3 }}>
              {member.fatherName && <span>👨 {member.fatherName} </span>}
              {member.motherName && <span>👩 {member.motherName}</span>}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
          <button onClick={() => onView(member)} style={{ background: "#1a1f3a", border: "1px solid #3a4a7a", color: "#6c8ebf", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>
            👁 Voir
          </button>
          <button onClick={() => onDelete(member.id)} disabled={deleting === member.id}
            style={{ background: "#2a0f1a", border: "1px solid #7f1d3a", color: "#fca5a5", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────
export default function NasabApp() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [view, setView] = useState("home");
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePass, setDeletePass] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [step, setStep] = useState(1);

  const showToast = m => { setToast(m); setTimeout(() => setToast(null), 3500); };
  const sf = (f, v) => { setForm(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: "" })); };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "members"), snap => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Requis";
    if (!form.cin.trim()) e.cin = "Requis";
    else if (!/^[A-Za-z]\d{6}$/.test(form.cin.trim())) e.cin = "Ex: A123456";
    if (!form.gender) e.gender = "Requis";
    return e;
  };

  const handleAdd = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (members.find(m => m.cin.trim().toUpperCase() === form.cin.trim().toUpperCase())) {
      showToast("⚠️ Ce numéro CIN est déjà enregistré!"); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "members"), {
        ...form,
        cin: form.cin.trim().toUpperCase(),
        fatherCin: form.fatherCin.trim().toUpperCase(),
        motherCin: form.motherCin.trim().toUpperCase(),
        spouseCin: form.spouseCin.trim().toUpperCase(),
        createdAt: new Date().toLocaleDateString("fr-FR"),
        ts: serverTimestamp()
      });
      setForm({ ...EMPTY }); setErrors({}); setStep(1);
      showToast("✅ Profil enregistré!"); setView("home");
    } catch { showToast("❌ Erreur!"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (deletePass !== DELETE_PASSWORD) { setDeleteError("Mot de passe incorrect!"); return; }
    setDeleting(deleteTarget);
    try {
      await deleteDoc(doc(db, "members", deleteTarget));
      if (profile?.id === deleteTarget) setProfile(null);
      showToast("🗑️ Supprimé");
    } catch { showToast("❌ Erreur!"); }
    setDeleting(null); setDeleteTarget(null); setDeletePass(""); setDeleteError("");
  };

  const filtered = members.filter(m =>
    [m.name, m.cin, m.lineage, m.tribe, m.origin, m.fatherName, m.motherName, m.birthCity]
      .some(v => (v || "").toLowerCase().includes(search.toLowerCase()))
  );

  const S = { bg: "#070810", card: "#0d0f1e", border: "#1a1a35", text: "#dce8ff", sub: "#6c8ebf" };
  const inp = f => ({ width: "100%", padding: "11px 14px", background: "#0a0c1a", border: `1.5px solid ${errors[f] ? "#f87171" : S.border}`, borderRadius: 8, color: S.text, fontFamily: "sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" });

  const Field = ({ f, label, req, ph, type, maxLen }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ color: S.sub, fontSize: 12, display: "block", marginBottom: 5 }}>{label}{req && <span style={{ color: "#f87171" }}> *</span>}</label>
      <input type={type || "text"} value={form[f]} maxLength={maxLen}
        onChange={e => sf(f, f === "cin" || f === "fatherCin" || f === "motherCin" || f === "spouseCin"
          ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
          : f.includes("Year") ? e.target.value.replace(/\D/g, "").slice(0, 4)
          : e.target.value)}
        placeholder={ph || ""} style={inp(f)} />
      {errors[f] && <div style={{ color: "#f87171", fontSize: 11, marginTop: 3 }}>{errors[f]}</div>}
    </div>
  );

  const navBtn = (v, l, icon) => (
    <button onClick={() => setView(v)} style={{
      padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${view === v ? S.sub : S.border}`,
      background: view === v ? "#1a1f3a" : "transparent", color: view === v ? S.text : "#444",
      cursor: "pointer", fontSize: 13
    }}>{icon} {l}</button>
  );

  const connections = profile ? findConnections(profile, members) : [];
  const strongLinks = connections.filter(c => c.strength >= 6);
  const familyLinks = connections.filter(c => c.strength === 3 || c.strength === 2);
  const originLinks = connections.filter(c => c.strength === 1);

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#0d0f1e", borderBottom: `1px solid ${S.border}`, padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ cursor: "pointer" }} onClick={() => setView("home")}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>🌿 شبكة النسب · Réseau Nasab</div>
            <div style={{ color: "#444", fontSize: 13, marginTop: 4 }}>{members.length} membres · Liens familiaux automatiques</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {navBtn("home", "Accueil", "🏠")}
            {navBtn("list", "Membres", "👥")}
            {navBtn("form", "S'inscrire", "➕")}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px" }}>

        {/* HOME */}
        {view === "home" && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🌿</div>
            <div style={{ fontSize: 64, fontWeight: 700, color: S.sub }}>{members.length}</div>
            <div style={{ fontSize: 20, marginBottom: 8 }}>membres inscrits</div>
            <div style={{ color: "#444", fontSize: 14, marginBottom: 32 }}>
              Inscrivez-vous pour découvrir vos liens familiaux automatiquement
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
              <button onClick={() => setView("form")} style={{ padding: "14px 28px", background: "linear-gradient(135deg,#1a3a2a,#2d6a4f)", border: "none", borderRadius: 12, color: "#d8f3dc", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                ➕ S'inscrire
              </button>
              <button onClick={() => setView("list")} style={{ padding: "14px 28px", background: "transparent", border: `1.5px solid ${S.sub}`, borderRadius: 12, color: S.sub, fontSize: 16, cursor: "pointer" }}>
                👥 Voir les membres
              </button>
            </div>
            {members.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                {[
                  ["Lignées", new Set(members.map(m => m.lineage).filter(Boolean)).size, "📜"],
                  ["Tribus", new Set(members.map(m => m.tribe).filter(Boolean)).size, "🏕️"],
                  ["Origines", new Set(members.map(m => m.origin).filter(Boolean)).size, "📍"],
                  ["Villes", new Set(members.map(m => m.city).filter(Boolean)).size, "🏙️"],
                ].map(([label, val, icon]) => (
                  <div key={label} style={{ minWidth: 110, background: S.card, border: `1.5px solid ${S.border}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 20 }}>{icon}</div>
                    <div style={{ color: S.sub, fontSize: 24, fontWeight: 700 }}>{val}</div>
                    <div style={{ color: "#444", fontSize: 11 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FORM */}
        {view === "form" && (
          <div style={{ background: S.card, border: `1.5px solid ${S.border}`, borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Inscription · التسجيل</div>
            <div style={{ color: "#444", fontSize: 13, marginBottom: 24 }}>Étape {step} / 3</div>

            {/* Progress */}
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ flex: 1, height: 4, borderRadius: 4, background: n <= step ? S.sub : S.border }} />
              ))}
            </div>

            {step === 1 && (
              <div>
                <div style={{ color: S.sub, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Identité personnelle</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                  <Field f="name" label="Nom complet" req ph="Prénom et nom" />
                  <Field f="cin" label="N° CIN" req ph="A123456" maxLen={7} />
                  <Field f="birthYear" label="Année de naissance" ph="1980" maxLen={4} />
                  <Field f="birthCity" label="Ville de naissance" ph="Casablanca" />
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ color: S.sub, fontSize: 12, display: "block", marginBottom: 5 }}>Genre <span style={{ color: "#f87171" }}>*</span></label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[["M", "👨 Homme"], ["F", "👩 Femme"]].map(([v, l]) => (
                        <button key={v} onClick={() => sf("gender", v)} style={{
                          flex: 1, padding: "10px", borderRadius: 8,
                          border: `1.5px solid ${form.gender === v ? S.sub : S.border}`,
                          background: form.gender === v ? "#1a1f3a" : "transparent",
                          color: form.gender === v ? S.text : "#444", cursor: "pointer", fontSize: 14
                        }}>{l}</button>
                      ))}
                    </div>
                    {errors.gender && <div style={{ color: "#f87171", fontSize: 11, marginTop: 3 }}>{errors.gender}</div>}
                  </div>
                  <Field f="city" label="Ville actuelle" ph="Rabat" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div style={{ color: S.sub, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Filiation parentale</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                  <Field f="fatherName" label="Nom complet du père" ph="Prénom et nom" />
                  <Field f="fatherCin" label="CIN du père" ph="A123456" maxLen={7} />
                  <Field f="fatherBirthYear" label="Année naissance père" ph="1950" maxLen={4} />
                  <div />
                  <Field f="motherName" label="Nom complet de la mère" ph="Prénom et nom" />
                  <Field f="motherCin" label="CIN de la mère" ph="A123456" maxLen={7} />
                  <Field f="motherBirthYear" label="Année naissance mère" ph="1955" maxLen={4} />
                  <div />
                  <Field f="spouseName" label="Nom du conjoint(e)" ph="Prénom et nom" />
                  <Field f="spouseCin" label="CIN du conjoint(e)" ph="A123456" maxLen={7} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div style={{ color: S.sub, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Lignée & Origine</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                  <Field f="lineage" label="Lignée / Nasab / نسب" ph="Ex: Alaoui, Boukacheni..." />
                  <Field f="tribe" label="Tribu / Fraction / قبيلة" ph="Ex: Beni Mellal, Ait Youssef..." />
                  <Field f="origin" label="Région d'origine / أصل" ph="Ex: Fès, Souss, Rif..." />
                  <Field f="phone" label="Téléphone (optionnel)" ph="06XXXXXXXX" />
                  <div style={{ gridColumn: "1/-1", marginBottom: 14 }}>
                    <label style={{ color: S.sub, fontSize: 12, display: "block", marginBottom: 5 }}>Notes</label>
                    <textarea value={form.notes} onChange={e => sf("notes", e.target.value)} rows={2}
                      placeholder="Informations complémentaires..."
                      style={{ ...inp(""), resize: "vertical" }} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {step > 1 && (
                <button onClick={() => setStep(s => s - 1)} style={{ padding: "12px 20px", background: "transparent", border: `1.5px solid ${S.border}`, borderRadius: 10, color: S.sub, cursor: "pointer" }}>
                  ← Retour
                </button>
              )}
              {step < 3 ? (
                <button onClick={() => {
                  if (step === 1) {
                    const e = validate();
                    if (Object.keys(e).length) { setErrors(e); return; }
                  }
                  setStep(s => s + 1);
                }} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg,#1a3a5a,#2a5a8a)", border: "none", borderRadius: 10, color: S.text, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                  Suivant →
                </button>
              ) : (
                <button onClick={handleAdd} disabled={saving} style={{ flex: 1, padding: "13px", background: saving ? "#1a2a3a" : "linear-gradient(135deg,#1a3a2a,#2d6a4f)", border: "none", borderRadius: 10, color: "#d8f3dc", fontSize: 16, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "⏳ Enregistrement..." : "✅ S'inscrire"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* LIST */}
        {view === "list" && (
          <div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher par nom, CIN, lignée, tribu, origine..."
              style={{ ...inp(""), marginBottom: 20, padding: "13px 16px", borderRadius: 12, width: "100%", boxSizing: "border-box" }} />
            {filtered.length === 0
              ? <div style={{ textAlign: "center", padding: "60px 0", color: S.border, fontSize: 18 }}>
                  {members.length === 0 ? "Aucun membre. Soyez le premier ! 🌿" : "Aucun résultat."}
                </div>
              : filtered.map(m => (
                <MemberCard key={m.id} member={m} onView={setProfile} onDelete={id => { setDeleteTarget(id); setDeletePass(""); setDeleteError(""); }} deleting={deleting} />
              ))
            }
          </div>
        )}
      </div>

      {/* PROFILE MODAL */}
      {profile && (
        <div style={{ position: "fixed", inset: 0, background: "#000c", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16, overflowY: "auto" }}>
          <div style={{ background: "#0d0f1e", border: `2px solid ${S.sub}`, borderRadius: 18, padding: 24, maxWidth: 500, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{profile.name}</div>
                <div style={{ color: "#444", fontSize: 13, marginTop: 2 }}>{profile.cin} · {profile.birthYear || "?"} · {profile.city || ""}</div>
              </div>
              <button onClick={() => setProfile(null)} style={{ background: "none", border: "none", color: "#444", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>

            {/* Fiche */}
            <div style={{ background: "#070810", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ color: S.sub, fontSize: 11, marginBottom: 12, letterSpacing: 1 }}>FICHE PERSONNELLE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
                {[
                  ["Nom", profile.name], ["CIN", profile.cin],
                  ["Naissance", profile.birthYear || "—"], ["Ville naissance", profile.birthCity || "—"],
                  ["Père", profile.fatherName || "—"], ["CIN père", profile.fatherCin || "—"],
                  ["Mère", profile.motherName || "—"], ["CIN mère", profile.motherCin || "—"],
                  ["Conjoint(e)", profile.spouseName || "—"], ["CIN conjoint(e)", profile.spouseCin || "—"],
                  ["Lignée", profile.lineage || "—"], ["Tribu", profile.tribe || "—"],
                  ["Origine", profile.origin || "—"], ["Ville", profile.city || "—"],
                ].map(([k, v]) => (
                  <div key={k}><div style={{ color: "#3a4a6a", fontSize: 11 }}>{k}</div><div style={{ color: S.text, fontSize: 13, marginTop: 1 }}>{v}</div></div>
                ))}
              </div>
            </div>

            {/* Connexions */}
            {connections.length === 0 ? (
              <div style={{ textAlign: "center", color: "#3a4a6a", padding: "20px 0", fontSize: 14 }}>
                Aucun lien détecté pour l'instant — revenez quand plus de membres seront inscrits!
              </div>
            ) : (
              <div>
                {strongLinks.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: "#52b788", fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>👨‍👩‍👧 LIENS DIRECTS ({strongLinks.length})</div>
                    {strongLinks.map(c => (
                      <div key={c.member.id} onClick={() => setProfile(c.member)}
                        style={{ background: "#070810", border: "1px solid #1a3a1a", borderRadius: 10, padding: "10px 14px", marginBottom: 6, cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.member.name}</div>
                            <div style={{ color: "#444", fontSize: 11, marginTop: 2 }}>{c.member.cin} · {c.member.lineage || ""}</div>
                          </div>
                          <ConnectionBadge link={c.link} strength={c.strength} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {familyLinks.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: "#6c8ebf", fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>📜 MÊME LIGNÉE / TRIBU ({familyLinks.length})</div>
                    {familyLinks.map(c => (
                      <div key={c.member.id} onClick={() => setProfile(c.member)}
                        style={{ background: "#070810", border: "1px solid #1a1a3a", borderRadius: 10, padding: "10px 14px", marginBottom: 6, cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.member.name}</div>
                            <div style={{ color: "#444", fontSize: 11, marginTop: 2 }}>{c.member.cin} · {c.member.lineage || c.member.tribe || ""}</div>
                          </div>
                          <ConnectionBadge link={c.link} strength={c.strength} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {originLinks.length > 0 && (
                  <div>
                    <div style={{ color: "#555", fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>📍 MÊME ORIGINE ({originLinks.length})</div>
                    {originLinks.map(c => (
                      <div key={c.member.id} onClick={() => setProfile(c.member)}
                        style={{ background: "#070810", border: "1px solid #222", borderRadius: 10, padding: "10px 14px", marginBottom: 6, cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.member.name}</div>
                            <div style={{ color: "#444", fontSize: 11, marginTop: 2 }}>{c.member.cin} · {c.member.origin || ""}</div>
                          </div>
                          <ConnectionBadge link={c.link} strength={c.strength} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, padding: 20 }}>
          <div style={{ background: S.card, border: `1.5px solid ${S.border}`, borderRadius: 16, padding: 28, maxWidth: 320, width: "100%" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Confirmer la suppression</div>
            <div style={{ color: "#444", fontSize: 13, marginBottom: 20 }}>Mot de passe administrateur requis.</div>
            <input type="password" value={deletePass} onChange={e => { setDeletePass(e.target.value); setDeleteError(""); }}
              placeholder="Mot de passe" style={{ ...inp(""), marginBottom: 8 }} autoFocus />
            {deleteError && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{deleteError}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={handleDelete} style={{ flex: 1, padding: "12px", background: "#7f1d1d", border: "none", borderRadius: 10, color: "#fca5a5", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Supprimer</button>
              <button onClick={() => { setDeleteTarget(null); setDeletePass(""); setDeleteError(""); }} style={{ flex: 1, padding: "12px", background: "transparent", border: `1.5px solid ${S.border}`, borderRadius: 10, color: S.sub, cursor: "pointer" }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#1a1a2e", color: "#a8c0e8", padding: "12px 24px", borderRadius: 10, border: "1px solid #3a4a7a", zIndex: 9999, whiteSpace: "nowrap" }}>{toast}</div>}
    </div>
  );
}
