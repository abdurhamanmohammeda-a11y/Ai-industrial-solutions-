import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration (Akkuma ati naaf ergite)
const firebaseConfig = {
  apiKey: "AIzaSyAvc4himvhDw9sKhZZhrPjwnmssIgYAEDE",
  authDomain: "michu-treading.firebaseapp.com",
  projectId: "michu-treading",
  storageBucket: "michu-treading.firebasestorage.app",
  messagingSenderId: "879964128368",
  appId: "1:879964128368:web:92a88628ecf0eb05e9e0b5",
  measurementId: "G-WWF5P0LCND"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const analyzeBtn = document.getElementById('analyzeBtn');
const aiResult = document.getElementById('aiResult');
const logsBody = document.getElementById('logsBody');

// --- 1. AI Analysis Function (Mock-up for Gemini API) ---
async function analyzeMachinePart() {
    const file = document.getElementById('imageInput').files[0];
    if (!file) {
        alert("Maaloo dura suuraa filadhu!");
        return;
    }

    aiResult.innerHTML = "AI'n xiinxalaa jira... Maaloo obsi.";

    // Asitti Gemini API ykn AI Model kee waamta.
    // Fakkeenyaaf, AI'n akka waan hojjeteetti 'result' haa fudhannu:
    setTimeout(async () => {
        const mockResult = {
            part: "Crusher Jaw Plate",
            status: "High Wear Detected",
            recommendation: "Replace within 5 days to avoid breakdown."
        };

        aiResult.innerHTML = `<strong>Result:</strong> ${mockResult.status} <br> <strong>Plan:</strong> ${mockResult.recommendation}`;
        
        // Bu'aa kana Firebase irratti "save" goona
        await saveToFirebase(mockResult);
        loadLogs(); // Table sana update gochuuf
    }, 2000);
}

// --- 2. Save Data to Firebase ---
async function saveToFirebase(data) {
    try {
        await addDoc(collection(db, "industrial_logs"), {
            date: new Date().toLocaleString(),
            part: data.part,
            status: data.status,
            recommendation: data.recommendation
        });
        console.log("Data saved successfully!");
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

// --- 3. Load Data from Firebase ---
async function loadLogs() {
    logsBody.innerHTML = ""; // Qulqulleessi
    const q = query(collection(db, "industrial_logs"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
        const d = doc.data();
        const row = `<tr>
            <td>${d.date}</td>
            <td>${d.part}</td>
            <td>${d.status}</td>
            <td>${d.recommendation}</td>
        </tr>`;
        logsBody.innerHTML += row;
    });
}

// Events
analyzeBtn.addEventListener('click', analyzeMachinePart);
window.onload = loadLogs;
