
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

/**
 * Updated with user-provided Firebase configuration.
 */
const firebaseConfig = {
  apiKey: "AIzaSyD5s_LfhfJe88y5BYo7ahSCAnPCux2lhio",
  authDomain: "gen-lang-client-0712022367.firebaseapp.com",
  projectId: "gen-lang-client-0712022367",
  storageBucket: "gen-lang-client-0712022367.firebasestorage.app",
  messagingSenderId: "705408184509",
  appId: "1:705408184509:web:fa1fce97fdb43efcab47d4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
