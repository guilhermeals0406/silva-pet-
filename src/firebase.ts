import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, setDoc, getDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc,
  updateDoc,
  increment
};
