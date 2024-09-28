// src/firebase.tsx
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBpAi0QKn3fi9j743onKbxwGZSj_iauYzA",
  authDomain: "storges-ded74.firebaseapp.com",
  projectId: "storges-ded74",
  storageBucket: "storges-ded74.appspot.com",
  messagingSenderId: "889575435029",
  appId: "1:889575435029:web:264689ab7e6d194663d71c",
  measurementId: "G-EZB9977CHJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
