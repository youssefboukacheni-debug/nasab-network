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
const genColors = ['#8e44ad','#2980b9','#27ae60','#e67e22','#e74c3c','#16a085'];

function getGeneration(member) {
  var year = parseInt(member.birthYear);
  if (!year) return 0;
  if (year < 1950) return 0;
  if (year <= 1980) return 1;
  if (year <= 1999) return 2;
  if (year <= 2030) return 3;
  return 4;
}

function getRelation(me, other, all) {
  var male = other.gender === 'ذكر';
  if (me.fatherCin && me.fatherCin === other.cin) return male ? 'أب' : 'أم';
  if (me.motherCin && me.motherCin === other.cin) return male ? 'أب' : 'أم';
  if (other.fatherCin && other.fatherCin === me.cin) return male ? 'ابن' : 'ابنة';
  if (other.motherCin && other.motherCin === me.cin) return male ? 'ابن' : 'ابنة';
  if (me.spouseCin && me.spouseCin === other.cin) return male ? 'زوج' : 'زوجة';
  if (other.spouseCin && other.spouseCin === me.cin) return male ? 'زوج' : 'زوجة';
  var sf = me.fatherCin && other.fatherCin && me.fatherCin === other.fatherCin;
  var sm = me.motherCin && other.motherCin && me.motherCin === other.motherCin;
  if (sf && sm) return male ? 'أخ شقيق' : 'أخت شقيقة';
  if (sf) return male ? 'أخ من الأب' : 'أخت من الأب';
  if (sm) return male ? 'أخ من الأم' : 'أخت من الأم';
  var myF = all.find(function(m) { return m.cin === me.fatherCin; });
  var myM = all.find(function(m) { return m.cin === me.motherCin; });
  if (myF) {
    if (myF.fatherCin && myF.fatherCin === other.cin) return male ? 'جد من الأب' : 'جدة من الأب';
    if (myF.motherCin && myF.motherCin === other.cin) return male ? 'جد من الأب' : 'جدة من الأب';
  }
  if (myM) {
    if (myM.fatherCin && myM.fatherCin === other.cin) return male ? 'جد من الأم' : 'جدة من الأم';
    if (myM.motherCin && myM.motherCin === other.cin) return male ? 'جد من الأم' : 'جدة من الأم';
  }
  var oF = all.find(function(m) { return m.cin === other.fatherCin; });
  var oM = all.find(function(m) { return m.cin === other.motherCin; });
  if (oF && (oF.fatherCin === me.cin || oF.motherCin === me.cin)) return male ? 'حفيد' : 'حفيدة';
  if (oM && (oM.fatherCin === me.cin || oM.motherCin === me.cin)) return male ? 'حفيد' : 'حفيدة';
  if (myF && other.fatherCin && myF.fatherCin && other.fatherCin === myF.fatherCin && other.cin !== me.fatherCin) return male ? 'عم' : 'عمة';
  if (myM && other.fatherCin && myM.fatherCin && other.fatherCin === myM.fatherCin && other.cin !== me.motherCin) return male ? 'خال' : 'خالة';
  if (myF && oF && myF.fatherCin && oF.fatherCin === myF.fatherCin && oF.cin !== me.fatherCin) return male ? 'ابن عم' : 'ابنة عم';
  if (myM && oM && myM.fatherCin && oM.fatherCin === myM.fatherCin && oM.cin !== me.motherCin) return male ? 'ابن خال' : 'ابنة خال';
  if (me.lastName && other.lastName && me.lastName === other.lastName) return 'قريب';
  return '';
}

export default function App() {
  var s1 = useState('members'); var page = s1[0]; var setPage = s1[1];
  var s2 = useState(emptyForm); var form = s2[0]; var setForm = s2[1];
  var s3 = useState([]); var relatives = s3[0]; var setRelatives = s3[1];
  var s4 = useState([]); var allMembers = s4[0]; var setAllMembers = s4[1];
  var s5 = useState(''); var message = s5[0]; var setMessage = s5[1];
  var s6 = useState('#27ae60'); var msgColor = s6[0]; var setMsgColor = s6[1];
  var s7 = useState(false); var loading = s7[0]; var setLoading = s7[1];
  var s8 = useState(null); var selected = s8[0]; var setSelected = s8[1];

  useEffect(function() { loadMembers(); }, []);

  function loadMembers() {
    getDocs(collection(db, 'people')).then(function(snapshot) {
      setAllMembers(snapshot.docs.map(function(d) { return d.data(); }));
    });
  }

  function handleSubmit() {
    if (!form.fullName || !form.cin || !form.lastName) {
      setMsgColor('#e74c3c'); setMessage('يرجى ملء الاسم الكامل ورقم البطاقة واللقب'); return;
    }
    setLoading(true);
    getDocs(query(collection(db, 'people'), where('cin', '==', form.cin))).then(function(cinCheck) {
      if (!cinCheck.empty) { setMsgColor('#e74c3c'); setMessage('رقم البطاقة مسجل مسبقاً'); setLoading(false); return; }
      addDoc(collection(db, 'people'), form).then(function() {
        getDocs(collection(db, 'people')).then(function(snapshot) {
          var all = snapshot.docs.map(function(d) { return d.data(); });
          var results = all.filter(function(r) { return r.cin !== form.cin && getRelation(form, r, all) !== ''; })
            .map(function(r) { return Object.assign({}, r, { relation: getRelation(form, r, all) }); });
          setRelatives(results); setAllMembers(all); setMsgColor('#27ae60');
          setMessage(results.length > 0 ? 'تم الحفظ! وجدنا ' + results.length + ' قريب' : 'تم الحفظ! لم نجد أقارب بعد');
          setLoading(false); setPage('members');
        });
      });
    }).catch(function() { setMsgColor('#e74c3c'); setMessage('خطأ في الاتصال'); setLoading(false); });
  }

  function btnStyle(active) {
    return { padding: '9px 16px', margin: '0 3px', background: active ? '#2c3e50' : '#ecf0f1', color: active ? 'white' : '#2c3e50', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 'bold' };
  }

  function CoupleNode(props) {
    var father = props.father;
    var mother = props.mother;
    var depth = props.depth || 0;
    var color = genColors[getGeneration(father || mother) % genColors.length];
    var children = allMembers.filter(function(m) {
      var hasFather = father && m.fatherCin === father.cin;
      var hasMother = mother && m.motherCin === mother.cin;
      if (!hasFather && !hasMother) return false;
      // لا تعرض الابن إذا كان زوجه/زوجته مسجلة (سيظهر كزوج في مستوى أعمق)
      var childSpouse = allMembers.find(function(s) { return s.cin === m.spouseCin; });
      if (childSpouse && m.gender === 'أنثى') return false;
      return true;
    });
    var seen = {};
    children = children.filter(function(c) { if (seen[c.cin]) return false; seen[c.cin] = true; return true; });

    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 10px' } },
      React.createElement('div', { style: { display: 'flex', flexDirection: 'row', alignItems: 'center' } },
        father && React.createElement('div', {
          onClick: function() { setSelected(father); },
          style: { background: color, color: 'white', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }
        }, (father.fullName || '') + '\n(' + (father.birthYear || '?') + ')'),
        father && mother && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px' } },
          React.createElement('span', { style: { fontSize: 16 } }, '💑'),
          React.createElement('div', { style: { width: 30, height: 2, background: '#e74c3c' } })
        ),
        mother && React.createElement('div', {
          onClick: function() { setSelected(mother); },
          style: { background: '#c0392b', color: 'white', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }
        }, (mother.fullName || '') + '\n(' + (mother.birthYear || '?') + ')')
      ),
      children.length > 0 && React.createElement('div', { style: { width: 2, height: 24, background: '#95a5a6' } }),
      children.length > 0 && React.createElement('div', { style: { position: 'relative', display: 'flex', flexDirection: 'row', alignItems: 'flex-start' } },
        children.length > 1 && React.createElement('div', { style: { position: 'absolute', top: 0, right: '10%', left: '10%', height: 2, background: '#95a5a6' } }),
        children.map(function(child) {
          var spouse = allMembers.find(function(m) { return m.cin === child.spouseCin; });
          var isMale = child.gender === 'ذكر';
          return React.createElement('div', { key: child.cin, style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
            React.createElement('div', { style: { width: 2, height: 20, background: '#95a5a6' } }),
            React.createElement(CoupleNode, {
              father: isMale ? child : spouse,
              mother: isMale ? spouse : child,
              depth: depth + 1
            })
          );
        })
      )
    );
  }

  function ProfileModal() {
    if (!selected) return null;
    var rels = allMembers.filter(function(r) { return r.cin !== selected.cin && getRelation(selected, r, allMembers) !== ''; })
      .map(function(r) { return Object.assign({}, r, { relation: getRelation(selected, r, allMembers) }); });
    var gen = getGeneration(selected, allMembers, 0);
    var color = genColors[gen % genColors.length];
    return React.createElement('div', {
      style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
      onClick: function(e) { if (e.target === e.currentTarget) setSelected(null); }
    },
      React.createElement('div', { style: { background: 'white', borderRadius: 16, padding: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', direction: 'rtl' } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
          React.createElement('h2', { style: { color: color, margin: 0, fontSize: 20 } }, selected.fullName),
          React.createElement('button', { onClick: function() { setSelected(null); }, style: { background: '#ecf0f1', border: 'none', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 18 } }, 'x')
        ),
        React.createElement('div', { style: { background: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
          ['gender:الجنس', 'birthYear:سنة الازدياد', 'tribe:القبيلة', 'origin:الأصل', 'lastName:اللقب'].map(function(item) {
            var parts = item.split(':');
            return React.createElement('div', { key: parts[0] },
              React.createElement('div', { style: { color: '#7f8c8d', fontSize: 11 } }, parts[1]),
              React.createElement('div', { style: { fontWeight: 'bold', fontSize: 14 } }, selected[parts[0]] || '—')
            );
          })
        ),
        rels.length > 0 && React.createElement('div', null,
          React.createElement('h3', { style: { color: '#2c3e50', marginBottom: 10 } }, 'العلاقات العائلية'),
          rels.map(function(r, i) {
            var rColor = genColors[getGeneration(r, allMembers, 0) % genColors.length];
            return React.createElement('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, marginBottom: 6 } },
              React.createElement('span', { style: { fontWeight: 'bold' } }, r.fullName),
              React.createElement('span', { style: { background: rColor, color: 'white', borderRadius: 10, padding: '2px 10px', fontSize: 12 } }, r.relation)
            );
          })
        )
      )
    );
  }

  return React.createElement('div', { style: { maxWidth: 600, margin: '0 auto', padding: 16, fontFamily: 'Arial', direction: 'rtl', background: '#f0f4f8', minHeight: '100vh' } },
    React.createElement('div', { style: { background: 'linear-gradient(135deg, #2c3e50, #3498db)', borderRadius: 16, padding: '20px 16px', marginBottom: 20, textAlign: 'center' } },
      React.createElement('h1', { style: { color: 'white', margin: 0, fontSize: 24 } }, 'شبكة النسب 🌳'),
      React.createElement('p', { style: { color: 'rgba(255,255,255,0.8)', margin: '4px 0 0' } }, 'اجمالي الأعضاء: ' + allMembers.length)
    ),
    React.createElement('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 20, background: 'white', borderRadius: 10, padding: 6 } },
      React.createElement('button', { style: btnStyle(page === 'members'), onClick: function() { setPage('members'); loadMembers(); } }, 'الأعضاء'),
      React.createElement('button', { style: btnStyle(page === 'tree'), onClick: function() { setPage('tree'); loadMembers(); } }, 'شجرة العائلة'),
      React.createElement('button', { style: btnStyle(page === 'register'), onClick: function() { setPage('register'); } }, 'تسجيل')
    ),

    page === 'members' && React.createElement('div', null,
      allMembers.map(function(r, i) {
        var gen = getGeneration(r, allMembers, 0);
        var color = genColors[gen % genColors.length];
        return React.createElement('div', { key: i, onClick: function() { setSelected(r); }, style: { background: 'white', borderRadius: 10, padding: 14, marginBottom: 10, borderRight: '5px solid ' + color, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer' } },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement('strong', { style: { fontSize: 16, color: '#2c3e50' } }, r.fullName),
            React.createElement('span', { style: { background: color, color: 'white', borderRadius: 12, padding: '2px 10px', fontSize: 12 } }, 'الجيل ' + (gen + 1))
          ),
          React.createElement('div', { style: { color: '#7f8c8d', fontSize: 13, marginTop: 4 } }, (r.gender || '') + ' | ' + (r.birthYear || '') + ' | ' + (r.tribe || '')),
          React.createElement('div', { style: { color: '#95a5a6', fontSize: 12, marginTop: 2 } }, 'الأب: ' + (r.fatherName || '—') + ' | الأم: ' + (r.motherName || '—'))
        );
      })
    ),

    page === 'tree' && React.createElement('div', { style: { overflowX: 'auto', overflowY: 'auto', padding: 16 } },
      React.createElement('div', { style: { display: 'flex', flexDirection: 'row', minWidth: 'max-content', justifyContent: 'center', paddingBottom: 20 } },
        (function() {
          var rootMales = allMembers.filter(function(m) {
            return m.gender === 'ذكر' && !allMembers.find(function(p) { return p.cin === m.fatherCin; });
          });
          var rootFemalesAlone = allMembers.filter(function(m) {
            if (m.gender !== 'أنثى') return false;
            var fatherRegistered = allMembers.find(function(p) { return p.cin === m.fatherCin; });
            var spouseRegistered = allMembers.find(function(p) { return p.cin === m.spouseCin; });
            var husbandHasHerAsMother = allMembers.find(function(p) { return p.spouseCin === m.cin; });
            return !spouseRegistered && !husbandHasHerAsMother && !fatherRegistered;
          });
          var nodes = rootMales.map(function(male) {
            var female = allMembers.find(function(m) { return m.cin === male.spouseCin; });
            return React.createElement(CoupleNode, { key: male.cin, father: male, mother: female, depth: 0 });
          });
          rootFemalesAlone.forEach(function(female) {
            nodes.push(React.createElement(CoupleNode, { key: female.cin, father: null, mother: female, depth: 0 }));
          });
          return nodes;
        })()
      )
    ),

    page === 'register' && React.createElement('div', { style: { background: 'white', borderRadius: 16, padding: 20 } },
      React.createElement('h2', { style: { color: '#2c3e50', textAlign: 'center', marginBottom: 20 } }, 'تسجيل عضو جديد'),
      fields.map(function(f) {
        return React.createElement('div', { key: f.key, style: { marginBottom: 14 } },
          React.createElement('label', { style: { display: 'block', marginBottom: 4, fontWeight: 'bold', color: '#2c3e50', fontSize: 14 } }, f.label),
          f.type === 'select'
            ? React.createElement('select', { value: form[f.key], onChange: function(e) { var v = e.target.value; setForm(function(prev) { return Object.assign({}, prev, { [f.key]: v }); }); }, style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 15 } },
                React.createElement('option', { value: '' }, 'اختر...'),
                f.options.map(function(o) { return React.createElement('option', { key: o, value: o }, o); })
              )
            : React.createElement('input', { value: form[f.key], onChange: function(e) { var v = e.target.value; setForm(function(prev) { return Object.assign({}, prev, { [f.key]: v }); }); }, style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box' } })
        );
      }),
      React.createElement('button', { onClick: handleSubmit, disabled: loading, style: { width: '100%', padding: 14, background: 'linear-gradient(135deg, #2c3e50, #3498db)', color: 'white', border: 'none', borderRadius: 10, fontSize: 17, cursor: 'pointer', marginTop: 8 } }, loading ? 'جاري الحفظ...' : 'حفظ وبحث عن الأقارب'),
      message && React.createElement('p', { style: { textAlign: 'center', marginTop: 12, color: msgColor, fontWeight: 'bold' } }, message),
      relatives.length > 0 && React.createElement('div', { style: { marginTop: 16 } },
        React.createElement('h3', { style: { color: '#2c3e50' } }, 'الأقارب المكتشفون:'),
        relatives.map(function(r, i) {
          var color = genColors[getGeneration(r, allMembers, 0) % genColors.length];
          return React.createElement('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8f9fa', borderRadius: 8, marginBottom: 6, borderRight: '4px solid ' + color } },
            React.createElement('span', { style: { fontWeight: 'bold' } }, r.fullName),
            React.createElement('span', { style: { background: color, color: 'white', borderRadius: 10, padding: '2px 10px', fontSize: 12 } }, r.relation)
          );
        })
      )
    ),

    React.createElement(ProfileModal, null)
  );
}
