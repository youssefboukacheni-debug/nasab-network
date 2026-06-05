import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "nasab-network"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function App() {
  const [form, setForm] = useState({
    cin: '', fatherName: '', motherName: '',
    lastName: '', tribe: '', origin: ''
  });
  const [relatives, setRelatives] = useState([]);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    await addDoc(collection(db, 'people'), form);
    const q = query(collection(db, 'people'), where('lastName', '==', form.lastName));
    const snapshot = await getDocs(q);
    setRelatives(snapshot.docs.map(d => d.data()));
    setMessage('تم الحفظ! وجدنا أقاربك:');
  };

  return (
    <div style={{padding:20, fontFamily:'Arial', direction:'rtl'}}>
      <h1>شبكة النسب</h1>
      {['cin','fatherName','motherName','lastName','tribe','origin'].map(f => (
        <input key={f} placeholder={f} value={form[f]}
          onChange={e => setForm({...form, [f]: e.target.value})}
          style={{display:'block', margin:'8px 0', padding:8, width:'100%'}}
        />
      ))}
      <button onClick={handleSubmit} style={{padding:'10px 20px'}}>حفظ وبحث</button>
      <p>{message}</p>
      {relatives.map((r,i) => <div key={i}>{r.fatherName} - {r.tribe}</div>)}
    </div>
  );
}

export default App;
