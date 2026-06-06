import React, { useState } from 'react';
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

const labels = {
  cin: 'رقم الهوية (CIN)',
  fatherName: 'اسم الأب',
  motherName: 'اسم الأم',
  lastName: 'اللقب',
  tribe: 'القبيلة',
  origin: 'الأصل'
};

function App() {
  const [form, setForm] = useState({
    cin: '', fatherName: '', motherName: '',
    lastName: '', tribe: '', origin: ''
  });
  const [relatives, setRelatives] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.cin || !form.lastName) {
      setMessage('⚠️ يرجى ملء رقم الهوية واللقب على الأقل');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'people'), form);
      const q = query(collection(db, 'people'), where('lastName', '==', form.lastName));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(d => d.data()).filter(r => r.cin !== form.cin);
      setRelatives(results);
      setMessage(results.length > 0 ? `✅ تم الحفظ! وجدنا ${results.length} قريب` : '✅ تم الحفظ! لم نجد أقارب بعد');
    } catch (e) {
      setMessage('❌ خطأ في الاتصال بقاعدة البيانات');
    }
    setLoading(false);
  };

  return (
    <div style={{maxWidth:500, margin:'0 auto', padding:24, fontFamily:'Arial', direction:'rtl'}}>
      <h1 style={{textAlign:'center', color:'#2c3e50', borderBottom:'3px solid #3498db', paddingBottom:12}}>
        🌳 شبكة النسب
      </h1>
      <p style={{textAlign:'center', color:'#7f8c8d'}}>سجّل بياناتك واكتشف أقاربك</p>

      {Object.keys(labels).map(field => (
        <div key={field} style={{marginBottom:12}}>
          <label style={{display:'block', marginBottom:4, fontWeight:'bold', color:'#2c3e50'}}>
            {labels[field]}
          </label>
          <input
            value={form[field]}
            onChange={e => setForm({...form, [field]: e.target.value})}
            style={{width:'100%', padding:10, borderRadius:8, border:'1px solid #bdc3c7', fontSize:16, boxSizing:'border-box'}}
          />
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{width:'100%', padding:14, background:'#3498db', color:'white', border:'none', borderRadius:8, fontSize:18, cursor:'pointer', marginTop:8}}
      >
        {loading ? '⏳ جاري الحفظ...' : '💾 حفظ وبحث عن الأقارب'}
      </button>

      {message && <p style={{textAlign:'center', marginTop:16, fontSize:16, color:'#27ae60'}}>{message}</p>}

      {relatives.length > 0 && (
        <div style={{marginTop:20}}>
          <h3 style={{color:'#2c3e50'}}>الأقارب المكتشفون:</h3>
          {relatives.map((r, i) => (
            <div key={i} style={{background:'#ecf0f1', borderRadius:8, padding:12, marginBottom:8}}>
              <strong>{r.fatherName} {r.lastName}</strong>
              <div style={{color:'#7f8c8d', fontSize:14}}>القبيلة: {r.tribe} | الأصل: {r.origin}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
