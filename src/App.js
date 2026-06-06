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
  { key: 'cin', label: 'رقم البطاقة CIN' },
  { key: 'gender', label: 'الجنس', type: 'select', options: ['ذكر', 'أنثى'] },
  { key: 'birthYear', label: 'سنة الازدياد' },
  { key: 'lastName', label: 'اللقب' },
  { key: 'tribe', label: 'القبيلة' },
  { key: 'origin', label: 'الأصل' },
  { key: 'spouseCin', label: 'رقم بطاقة الزوج أو الزوجة' },
  { key: 'fatherName', label: 'اسم الأب الكامل' },
  { key: 'fatherCin', label: 'رقم بطاقة الأب' },
  { key: 'fatherBirthYear', label: 'سنة ازدياد الأب' },
  { key: 'motherName', label: 'اسم الأم الكامل' },
  { key: 'motherCin', label: 'رقم بطاقة الأم' },
  { key: 'motherBirthYear', label: 'سنة ازدياد الأم' },
];

const emptyForm = Object.fromEntries(fields.map(function(f) { return [f.key, '']; }));

function getRelation(me, other, allMembers) {
  var male = other.gender === 'ذكر';

  // أب / أم مباشر
  if (me.fatherCin && me.fatherCin === other.cin) { return male ? 'أب' : 'أم'; }
  if (me.motherCin && me.motherCin === other.cin) { return male ? 'أب' : 'أم'; }

  // ابن / ابنة مباشر
  if (other.fatherCin && other.fatherCin === me.cin) { return male ? 'ابن' : 'ابنة'; }
  if (other.motherCin && other.motherCin === me.cin) { return male ? 'ابن' : 'ابنة'; }

  // زوج / زوجة
  if (me.spouseCin && me.spouseCin === other.cin) { return male ? 'زوج' : 'زوجة'; }
  if (other.spouseCin && other.spouseCin === me.cin) { return male ? 'زوج' : 'زوجة'; }

  // أخ / أخت
  var sameFather = me.fatherCin && other.fatherCin && me.fatherCin === other.fatherCin;
  var sameMother = me.motherCin && other.motherCin && me.motherCin === other.motherCin;
  if (sameFather && sameMother) { return male ? 'أخ شقيق' : 'أخت شقيقة'; }
  if (sameFather) { return male ? 'أخ من الأب' : 'أخت من الأب'; }
  if (sameMother) { return male ? 'أخ من الأم' : 'أخت من الأم'; }

  // جد / جدة (من بيانات الأب المسجل)
  var myFather = allMembers.find(function(m) { return m.cin === me.fatherCin; });
  var myMother = allMembers.find(function(m) { return m.cin === me.motherCin; });

  if (myFather) {
    if (myFather.fatherCin && myFather.fatherCin === other.cin) { return male ? 'جد من الأب' : 'جدة من الأب'; }
    if (myFather.motherCin && myFather.motherCin === other.cin) { return male ? 'جد من الأب' : 'جدة من الأب'; }
  }
  if (myMother) {
    if (myMother.fatherCin && myMother.fatherCin === other.cin) { return male ? 'جد من الأم' : 'جدة من الأم'; }
    if (myMother.motherCin && myMother.motherCin === other.cin) { return male ? 'جد من الأم' : 'جدة من الأم'; }
  }

  // حفيد / حفيدة
  var otherFather = allMembers.find(function(m) { return m.cin === other.fatherCin; });
  var otherMother = allMembers.find(function(m) { return m.cin === other.motherCin; });
  if (otherFather) {
    if (otherFather.fatherCin === me.cin || otherFather.motherCin === me.cin) { return male ? 'حفيد' : 'حفيدة'; }
  }
  if (otherMother) {
    if (otherMother.fatherCin === me.cin || otherMother.motherCin === me.cin) { return male ? 'حفيد' : 'حفيدة'; }
  }

  // عم / عمة (أخ الأب)
  if (myFather && other.fatherCin && myFather.fatherCin && other.fatherCin === myFather.fatherCin && other.cin !== me.fatherCin) {
    return male ? 'عم' : 'عمة';
  }

  // خال / خالة (أخ الأم)
  if (myMother && other.fatherCin && myMother.fatherCin && other.fatherCin === myMother.fatherCin && other.cin !== me.motherCin) {
    return male ? 'خال' : 'خالة';
  }

  // ابن/ابنة عم أو عمة
  if (myFather && other.fatherCin) {
    var otherParent = allMembers.find(function(m) { return m.cin === other.fatherCin || m.cin === other.motherCin; });
    if (otherParent && myFather.fatherCin && otherParent.fatherCin === myFather.fatherCin && otherParent.cin !== me.fatherCin) {
      return male ? 'ابن عم' : 'ابنة عم';
    }
  }

  // ابن/ابنة خال أو خالة
  if (myMother && other.motherCin) {
    var otherParent2 = allMembers.find(function(m) { return m.cin === other.fatherCin || m.cin === other.motherCin; });
    if (otherParent2 && myMother.fatherCin && otherParent2.fatherCin === myMother.fatherCin && otherParent2.cin !== me.motherCin) {
      return male ? 'ابن خال' : 'ابنة خال';
    }
  }

  // أخ/أخت الزوج أو الزوجة
  if (me.spouseCin) {
    var spouse = allMembers.find(function(m) { return m.cin === me.spouseCin; });
    if (spouse) {
      var spouseSameFather = spouse.fatherCin && other.fatherCin && spouse.fatherCin === other.fatherCin;
      var spouseSameMother = spouse.motherCin && other.motherCin && spouse.motherCin === other.motherCin;
      if (spouseSameFather || spouseSameMother) { return male ? 'أخ الزوج/الزوجة' : 'أخت الزوج/الزوجة'; }
    }
  }

  // نفس اللقب
  if (me.lastName && other.lastName && me.lastName === other.lastName) { return 'قريب'; }

  return '';
}

export default function App() {
  var s1 = useState('home'); var page = s1[0]; var setPage = s1[1];
  var s2 = useState(emptyForm); var form = s2[0]; var setForm = s2[1];
  var s3 = useState([]); var relatives = s3[0]; var setRelatives = s3[1];
  var s4 = useState([]); var allMembers = s4[0]; var setAllMembers = s4[1];
  var s5 = useState(''); var message = s5[0]; var setMessage = s5[1];
  var s6 = useState('#27ae60'); var msgColor = s6[0]; var setMsgColor = s6[1];
  var s7 = useState(false); var loading = s7[0]; var setLoading = s7[1];

  useEffect(function() { loadMembers(); }, []);

  function loadMembers() {
    getDocs(collection(db, 'people')).then(function(snapshot) {
      setAllMembers(snapshot.docs.map(function(d) { return d.data(); }));
    });
  }

  function handleSubmit() {
    if (!form.fullName || !form.cin || !form.lastName) {
      setMsgColor('#e74c3c');
      setMessage('يرجى ملء الاسم الكامل ورقم البطاقة واللقب');
      return;
    }
    setLoading(true);
    getDocs(query(collection(db, 'people'), where('cin', '==', form.cin))).then(function(cinCheck) {
      if (!cinCheck.empty) {
        setMsgColor('#e74c3c');
        setMessage('رقم البطاقة مسجل مسبقاً');
        setLoading(false);
        return;
      }
      addDoc(collection(db, 'people'), form).then(function() {
        getDocs(collection(db, 'people')).then(function(snapshot) {
          var all = snapshot.docs.map(function(d) { return d.data(); });
          var results = all.filter(function(r) {
            if (r.cin === form.cin) { return false; }
            return getRelation(form, r, all) !== '';
          }).map(function(r) {
            return Object.assign({}, r, { relation: getRelation(form, r, all) });
          });
          setRelatives(results);
          setAllMembers(all);
          setMsgColor('#27ae60');
          setMessage(results.length > 0 ? 'تم الحفظ! وجدنا ' + results.length + ' قريب' : 'تم الحفظ! لم نجد أقارب بعد');
          setLoading(false);
        });
      });
    }).catch(function() {
      setMsgColor('#e74c3c');
      setMessage('خطأ في الاتصال');
      setLoading(false);
    });
  }

  function btnStyle(active) {
    return { padding: '10px 20px', margin: '0 4px', background: active ? '#3498db' : '#ecf0f1', color: active ? 'white' : '#2c3e50', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 'bold' };
  }

  return React.createElement('div', { style: { maxWidth: 550, margin: '0 auto', padding: 20, fontFamily: 'Arial', direction: 'rtl' } },
    React.createElement('h1', { style: { textAlign: 'center', color: '#2c3e50', borderBottom: '3px solid #3498db', paddingBottom: 12 } }, 'شبكة النسب'),
    React.createElement('div', { style: { textAlign: 'center', marginBottom: 24 } },
      React.createElement('button', { style: btnStyle(page === 'home'), onClick: function() { setPage('home'); } }, 'تسجيل'),
      React.createElement('button', { style: btnStyle(page === 'members'), onClick: function() { setPage('members'); loadMembers(); } }, 'الأعضاء (' + allMembers.length + ')')
    ),
    page === 'home' && React.createElement('div', null,
      React.createElement('p', { style: { textAlign: 'center', color: '#7f8c8d' } }, 'سجل بياناتك واكتشف أقاربك'),
      fields.map(function(f) {
        return React.createElement('div', { key: f.key, style: { marginBottom: 12 } },
          React.createElement('label', { style: { display: 'block', marginBottom: 4, fontWeight: 'bold', color: '#2c3e50' } }, f.label),
          f.type === 'select'
            ? React.createElement('select', { value: form[f.key], onChange: function(e) { var v = e.target.value; setForm(function(prev) { return Object.assign({}, prev, { [f.key]: v }); }); }, style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #bdc3c7', fontSize: 16, boxSizing: 'border-box' } },
                React.createElement('option', { value: '' }, 'اختر...'),
                f.options.map(function(o) { return React.createElement('option', { key: o, value: o }, o); })
              )
            : React.createElement('input', { value: form[f.key], onChange: function(e) { var v = e.target.value; setForm(function(prev) { return Object.assign({}, prev, { [f.key]: v }); }); }, style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #bdc3c7', fontSize: 16, boxSizing: 'border-box' } })
        );
      }),
      React.createElement('button', { onClick: handleSubmit, disabled: loading, style: { width: '100%', padding: 14, background: '#3498db', color: 'white', border: 'none', borderRadius: 8, fontSize: 18, cursor: 'pointer', marginTop: 8 } }, loading ? 'جاري الحفظ...' : 'حفظ وبحث عن الأقارب'),
      message && React.createElement('p', { style: { textAlign: 'center', marginTop: 16, fontSize: 16, color: msgColor } }, message),
      relatives.length > 0 && React.createElement('div', { style: { marginTop: 20 } },
        React.createElement('h3', { style: { color: '#2c3e50' } }, 'الأقارب المكتشفون:'),
        relatives.map(function(r, i) {
          return React.createElement('div', { key: i, style: { background: '#ecf0f1', borderRadius: 8, padding: 12, marginBottom: 8, borderRight: '4px solid #3498db' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between' } },
              React.createElement('strong', null, r.fullName),
              React.createElement('span', { style: { background: '#3498db', color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: 13 } }, r.relation)
            ),
            React.createElement('div', { style: { color: '#7f8c8d', fontSize: 14, marginTop: 4 } }, 'اللقب: ' + r.lastName + ' | القبيلة: ' + r.tribe),
            React.createElement('div', { style: { color: '#7f8c8d', fontSize: 14 } }, 'الأب: ' + r.fatherName + ' | الأم: ' + r.motherName)
          );
        })
      )
    ),
    page === 'members' && React.createElement('div', null,
      React.createElement('h2', { style: { textAlign: 'center', color: '#2c3e50' } }, 'اجمالي الأعضاء: ' + allMembers.length),
      allMembers.map(function(r, i) {
        return React.createElement('div', { key: i, style: { background: '#ecf0f1', borderRadius: 8, padding: 12, marginBottom: 8 } },
          React.createElement('strong', null, (i + 1) + '. ' + r.fullName),
          React.createElement('span', { style: { marginRight: 8, fontSize: 13, color: '#7f8c8d' } }, r.gender),
          React.createElement('div', { style: { color: '#7f8c8d', fontSize: 14 } }, 'اللقب: ' + r.lastName + ' | سنة الازدياد: ' + r.birthYear),
          React.createElement('div', { style: { color: '#7f8c8d', fontSize: 14 } }, 'الأب: ' + r.fatherName + ' | الأم: ' + r.motherName)
        );
      })
    )
  );
}
