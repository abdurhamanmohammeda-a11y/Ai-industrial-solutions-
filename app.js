import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Config (Michu Treading)
const firebaseConfig = {
  apiKey: "AIzaSyAvc4himvhDw9sKhZZhrPjwnmssIgYAEDE",
  authDomain: "michu-treading.firebaseapp.com",
  projectId: "michu-treading",
  storageBucket: "michu-treading.firebasestorage.app",
  messagingSenderId: "879964128368",
  appId: "1:879964128368:web:92a88628ecf0eb05e9e0b5",
  measurementId: "G-WWF5P0LCND"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Gemini AI Config
const GEMINI_API_KEY = "AIzaSyDkEbbIumdak3kZb3ozZmNfIHVvCoA-wvY"; // Key kee asitti galmeeffameera

// DOM Elements
const analyzeBtn = document.getElementById('analyzeBtn');
const aiResult = document.getElementById('aiResult');
const logsBody = document.getElementById('logsBody');

// --- 1. Real AI Analysis with Gemini ---
async function analyzeWithGemini(base64Image) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const data = {
        contents: [{
            parts: [
                { text: "Ati ogeessa maashinii industiriiti. Suuraa kana xiinxali. Rakkoon jiru maali? Akkamitti suphama? Gabaabsii Afaan Oromootiin 'Part Name', 'Problem', fi 'Recommendation' jedhi deebisi." },
                { inline_data: { mime_type: "image/jpeg", data: base64Image } }
            ]
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await response.json();
    if (result.candidates && result.candidates[0]) {
        return result.candidates[0].content.parts[0].text;
    } else {
        throw new Error("AI deebii kennuu hin dandeenye.");
    }
}

// --- 2. Main Logic ---
async function analyzeMachinePart() {
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert("Maaloo dura suuraa meeshaa sanaa filadhu!");
        return;
    }

    aiResult.innerHTML = "<div class='loader'>AI'n suuraa xiinxalaa jira... Maaloo obsi.</div>";

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64Image = reader.result.split(',')[1];
        
        try {
            const description = await analyzeWithGemini(base64Image);
            aiResult.innerHTML = `<strong>Gabaasa AI:</strong> <br><pre style="white-space: pre-wrap;">${description}</pre>`;
            
            // Firebase irratti save goona
            await addDoc(collection(db, "industrial_logs"), {
                date: new Date().toLocaleString(),
                part: "Maashinii Scan Ta'e",
                status: "AI Analyzed",
                recommendation: description
            });
            loadLogs();
        } catch (error) {
            aiResult.innerHTML = "Dogoggora: API Key kee ykn internet kee mirkaneeffadhu.";
            console.error(error);
        }
    };
    reader.readAsDataURL(file);
}

// --- 3. Load Logs ---
async function loadLogs() {
    logsBody.innerHTML = "Loading history...";
    try {
        const q = query(collection(db, "industrial_logs"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        logsBody.innerHTML = "";
        querySnapshot.forEach((doc) => {
            const d = doc.data();
            logsBody.innerHTML += `<tr>
                <td>${d.date}</td>
                <td>${d.part}</td>
                <td>${d.status}</td>
                <td>${d.recommendation.substring(0, 100)}...</td>
            </tr>`;
        });
    } catch (e) {
        console.error("Error loading: ", e);
    }
}

analyzeBtn.addEventListener('click', analyzeMachinePart);
window.onload = loadLogs;
