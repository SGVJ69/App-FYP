import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC2TdlpeypgnpRjTei9N0ivpVaqUAur4Cs",
  authDomain: "fyp-k-learn.firebaseapp.com",
  projectId: "fyp-k-learn",
  storageBucket: "fyp-k-learn.firebasestorage.app",
  messagingSenderId: "416430704892",
  appId: "1:416430704892:web:93bd8fe5a2231c90536f79"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
