import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBm4iTpPTawBfrfQLZJd1GfjsAIvyt",
  authDomain: "nasab-network.firebaseapp.com",
  projectId: "nasab-network",
  storageBucket: "nasab-network.firebasestorage.app",
  messagingSenderId: "67334973520",
  appId: "1:67334973520:web:7e6329df88f321a491c955"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const fields = [
  { key: 'fullName', label: 'الاسم الكامل' },
  { key: 'cin', label: 'رقم البطاقة (CIN)' },
  { key: 'birthYear', label: 'سنة الازدياد' },
  { key: 'fatherName', label: 'اسم الأب الكامل' },
  { key: 'fatherCin', label: 'رقم بطاقة الأب' },
  { key: 'fatherBirthYear', label: 'سنة ازدياد الأب' },
  { key: 'motherName', label: 'اسم الأم الكامل' },
  { key: 'motherCin', label: 'رقم بطاقة الأم' },
  { key: 'motherBirthYear', label: 'سنة ازدياد الأم' },
  { key: 'lastName', label: 'اللقب' },
  { key: 'tribe', label: 'القبيلة' },
  { key: 'origin', label: 'الأصل' },
];

const emptyForm = Object.fromEntries(fields.map(f => [f.key, '']));

export default function App() {
  const [page, setPage] = useState('home');
  const [form, setForm] = useState(emptyForm);
  const [relatives, setRelatives] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const snapshot = await getDocs(collection(db, 'people'));
    setAllMembers(snapshot.docs.map(d => d.data()));
  };

  const handleSubmit = async () => {
    if (!form.fullName || !form.lastName) {
      setMessage('⚠️ يرجى ملء الاسم الكامل واللقب على الأقل');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'people'), form);

      const snapshot = await getDocs(collection(db, 'people'));
      const all = snapshot.docs.map(d => d.data());

      const results = all.filter(r => {
        if (r.cin === form.cin) return false;
        return (
          (form.fatherCin && r.fatherCin === form.fatherCin) ||
          (form.motherCin && r.motherCin === form.motherCin) ||
          (form.lastName && r.lastName === form.lastName)
        );
      });

      setRelatives(results);
      setAllMembers(all);
      setMessage(results.length > 0
        ? `✅ تم الحفظ! وجدنا ${results.length} قريب`
        : '✅ تم الحفظ! لم نجد أقارب بعد');
    } catch (e) {
      setMessage('❌ خطأ في الاتصال بقاعدة البيانات');
    }
    setLoading(false);
  };

  const btnStyle = (active) => ({
    padding: '10px 20px',
    margin: '0 4px',
    background: active ? '#3498db' : '#ecf0f1',
    color: active ? 'white' : '#2c3e50',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    cursor: 'pointer',
    fontWeight: 'bold'
  });

  return (
    <div style={{maxWidth: 550, margin: '0 auto', padding: 20, fontFamily: 'Arial', direction: 'rtl'}}>
      <h1 style={{textAlign: 'center', color: '#2c3e50', borderBottom: '3px solid #3498db', paddingBottom: 12}}>
        🌳 شبكة النسب
      </h1>

      <div style={{textAlign: 'center', marginBottom: 24}}>
        <button style={btnStyle(page === 'home')} onClick={() => setPage('home')}>تسجيل</button>
        <button style={btnStyle(page === 'members')} onClick={() => { setPage('members'); loadMembers(); }}>
          الأعضاء ({allMembers.length})
        </button>
      </div>

      {page === 'home' && (
        <div>
          <p style={{textAlign: 'center', color: '#7f8c8d'}}>سجّل بياناتك واكتشف أقاربك</p>
          {fields.map(f => (
            <div key={f.key} style={{marginBottom: 12}}>
              <label style={{display: 'block', marginBottom: 4, fontWeight: 'bold', color: '#2c3e50'}}>
                {f.label}
              </label>
              <input
                value={form[f.key]}
                onChange={e => setForm({...form, [f.key]: e.target.value})}
                style={{width: '100%', padding: 10, borderRadius: 8, border: '1px solid #bdc3c7', fontSize: 16, boxSizing: 'border-box'}}
              />
            </div>
          ))}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{width: '100%', padding: 14, background: '#3498db', color: 'white', border: 'none', borderRadius: 8, fontSize: 18, cursor: 'pointer', marginTop: 8}}
          >
            {loading ? '⏳ جاري الحفظ...' : '💾 حفظ وبحث عن الأقارب'}
          </button>

          {message && <p style={{textAlign: 'center', marginTop: 16, fontSize: 16, color: '#27ae60'}}>{message}</p>}

          {relatives.length > 0 && (
            <div style={{marginTop: 20}}>
              <h3 style={{color: '#2c3e50'}}>الأقارب المكتشفون:</h3>
              {relatives.map((r, i) => (
                <div key={i} style={{background: '#ecf0f1', borderRadius: 8, padding: 12, marginBottom: 8}}>
                  <strong>{r.fullName}</strong>
                  <div style={{color: '#7f8c8d', fontSize: 14}}>اللقب: {r.lastName} | القبيلة: {r.tribe}</div>
                  <div style={{color: '#7f8c8d', fontSize: 14}}>الأب: {r.fatherName} | الأم: {r.motherName}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {page === 'members' && (
        <div>
          <h2 style={{textAlign: 'center', color: '#2c3e50'}}>
            إجمالي الأعضاء: {allMembers.length}
          </h2>
          {allMembers.map((r, i) => (
            <div key={i} style={{background: '#ecf0f1', borderRadius: 8, padding: 12, marginBottom: 8}}>
              <strong>{i + 1}. {r.fullName}</strong>
              <div style={{color: '#7f8c8d', fontSize: 14}}>
                اللقب: {r.lastName} | سنة الازدياد: {r.birthYear}
              </div>
              <div style={{color: '#7f8c8d', fontSize: 14}}>
                الأب: {r.fatherName} | الأم: {r.motherName}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
