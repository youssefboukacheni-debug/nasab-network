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
  { key: 'gender', label: 'الجنس', type: 'select', options: ['ذكر', 'أنثى'] },
  { key: 'birthYear', label: 'سنة الازدياد' },
  { key: 'lastName', label: 'اللقب' },
  { key: 'tribe', label: 'القبيلة' },
  { key: 'origin', label: 'الأصل' },
  { key: 'spouseCin', label: 'رقم بطاقة الزوج/الزوجة (اختياري)' },
  { key: 'fatherName', label: 'اسم الأب الكامل' },
  { key: 'fatherCin', label: 'رقم بطاقة الأب' },
  { key: 'fatherBirthYear', label: 'سنة ازدياد الأب' },
  { key: 'motherName', label: 'اسم الأم الكامل' },
  { key: 'motherCin', label: 'رقم بطاقة الأم' },
  { key: 'motherBirthYear', label: 'سنة ازدياد الأم' },
  { key: 'paternalGrandfatherCin', label: 'رقم بطاقة جد الأب' },
  { key: 'paternalGrandmotherCin', label: 'رقم بطاقة جدة الأب' },
  { key: 'maternalGrandfatherCin', label: 'رقم بطاقة جد الأم' },
  { key: 'maternalGrandmotherCin', label: 'رقم بطاقة جدة الأم' },
];

const emptyForm = Object.fromEntries(fields.map(f => [f.key, '']));

function getRelation(me, other) {
  const isMale = other.gender === 'ذكر';
  const relations = [];

  // أب / أم
  if (me.fatherCin && me.fatherCin === other.cin) return isMale ? '👨 أب' : '👩 أم';
  if (me.motherCin && me.motherCin === other.cin) return isMale ? '👨 أب' : '👩 أم';

  // ابن / ابنة
  if (other.fatherCin && other.fatherCin === me.cin) return isMale ? '👦 ابن' : '👧 ابنة';
  if (other.motherCin && other.motherCin === me.cin) return isMale ? '👦 ابن' : '👧 ابنة';

  // زوج / زوجة
  if (me.spouseCin && me.spouseCin === other.cin) return isMale ? '💍 زوج' : '💍 زوجة';
  if (other.spouseCin && other.spouseCin === me.cin) return isMale ? '💍 زوج' : '💍 زوجة';

  // أخ / أخت شقيق
  const sameFather = me.fatherCin && other.fatherCin && me.fatherCin === other.fatherCin;
  const sameMother = me.motherCin && other.motherCin && me.motherCin === other.motherCin;
  if (sameFather && sameMother) return isMale ? '👨‍👧 أخ شقيق' : '👩‍👧 أخت شقيقة';
  if (sameFather) return isMale ? '👨‍👧 أخ من الأب' : '👩‍👧 أخت من الأب';
  if (sameMother) return isMale ? '👨‍👧 أخ من الأم' : '👩‍👧 أخت من الأم';

  // جد / جدة
  if (me.paternalGrandfatherCin && me.paternalGrandfatherCin === other.cin) return '👴 جد (من جهة الأب)';
  if (me.paternalGrandmotherCin && me.paternalGrandmotherCin === other.cin) return '👵 جدة (من جهة الأب)';
  if (me.maternalGrandfatherCin && me.maternalGrandfatherCin === other.cin) return '👴 جد (من جهة الأم)';
  if (me.maternalGrandmotherCin && me.maternalGrandmotherCin === other.cin) return '👵 جدة (من جهة الأم)';

  // حفيد / حفيدة
  if (other.paternalGrandfatherCin && other.paternalGrandfatherCin === me.cin) return isMale ? '👦 حفيد' : '👧 حفيدة';
  if (other.paternalGrandmotherCin && other.paternalGrandmotherCin === me.cin) return isMale ? '👦 حفيد' : '👧 حفيدة';
  if (other.maternalGrandfatherCin && other.maternalGrandfatherCin === me.cin) return isMale ? '👦 حفيد' : '👧 حفيدة';
  if (other.maternalGrandmotherCin && other.maternalGrandmotherCin === me.cin) return isMale ? '👦 حفيد' : '👧 حفيدة';

  // عم / عمة (أخ/أخت الأب)
  if (me.fatherCin && other.fatherCin && me.fatherCin !== other.cin) {
    const fatherSameFather = me.paternalGrandfatherCin && other.paternalGrandfatherCin &&
      me.paternalGrandfatherCin === other.paternalGrandfatherCin;
    if (fatherSameFather && other.cin !== me.fatherCin) {
      return isMale ? '👨 عم' : '👩 عمة';
    }
  }

  // خال / خالة (أخ/أخت الأم)
  if (me.motherCin && other.motherCin && me.motherCin !== other.cin) {
    const motherSameMother = me.maternalGrandmotherCin && other.maternalGrandmotherCin &&
      me.maternalGrandmotherCin === other.maternalGrandmotherCin;
    if (motherSameMother && other.cin !== me.motherCin) {
      return isMale ? '👨 خال' : '👩 خالة';
    }
  }

  // ابن/ابنة عم أو عمة
  if (me.paternalGrandfatherCin && other.paternalGrandfatherCin &&
    me.paternalGrandfatherCin === other.paternalGrandfatherCin &&
    me.fatherCin !== other.fatherCin) {
    return isMale ? '👦 ابن عم/عمة' : '👧 ابنة عم/عمة';
  }

  // ابن/ابنة خال أو خالة
  if (me.maternalGrandfatherCin && other.maternalGrandfatherCin &&
    me.maternalGrandfatherCin === other.maternalGrandfatherCin &&
    me.motherCin !== other.motherCin) {
    return isMale ? '👦 ابن خال/خالة' : '👧 ابنة خال/خالة';
  }

  // أخ/أخت الزوج أو الزوجة
  if (me.spouseCin) {
    if (other.fatherCin && me.spouseCin) {
      // نفس أب الزوج/الزوجة
    }
  }

  // نفس اللقب فقط
  if (me.lastName && other.lastName && me.lastName === oth
