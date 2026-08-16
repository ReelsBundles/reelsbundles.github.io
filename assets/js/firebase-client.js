import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {

     apiKey: "AIzaSyB6mlCK9Bmj4bJpiHRBPY1Q25H-intBhYc",
    authDomain: "reelsbundles-48840.firebaseapp.com",
    projectId: "reelsbundles-48840",
    storageBucket: "reelsbundles-48840.firebasestorage.app",
    messagingSenderId: "407765463373",
    appId: "1:407765463373:web:2680d5770d203ea04ac704"

};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

export { auth };