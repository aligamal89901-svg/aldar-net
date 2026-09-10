import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC86qwx6gqH1zVYRvmXmn3ERa-qU1lolpQ",
  authDomain: "aldar-1b4a6.firebaseapp.com",
  projectId: "aldar-1b4a6",
  storageBucket: "aldar-1b4a6.firebasestorage.app",
  messagingSenderId: "86064955948",
  appId: "1:86064955948:web:4825bddffe34dacee34789"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);