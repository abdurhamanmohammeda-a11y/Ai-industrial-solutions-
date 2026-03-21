// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, addDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Firebase config (yours)
const firebaseConfig = {
    apiKey: "AIzaSyAvc4himvhDw9sKhZZhrPjwnmssIgYAEDE",
    authDomain: "michu-treading.firebaseapp.com",
    projectId: "michu-treading",
    storageBucket: "michu-treading.firebasestorage.app",
    messagingSenderId: "879964128368",
    appId: "1:879964128368:web:92a88628ecf0eb05e9e0b5",
    measurementId: "G-WWF5P0LCND"
};

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const authSection = document.getElementById('authSection');
const mainApp = document.getElementById('mainApp');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const toggleMode = document.getElementById('toggleMode');
const authMessage = document.getElementById('authMessage');
const logoutButton = document.getElementById('logoutButton');

let isLoginMode = true; // true = login, false = signup
let currentUser = null;
let maintenanceHistory = [];

// ---------- Helper: Firestore collection for current user ----------
function getHistoryCollection() {
    if (!currentUser) return null;
    return collection(db, 'users', currentUser.uid, 'maintenanceHistory');
}

// ---------- Load history from Firestore ----------
async function loadHistory() {
    const colRef = getHistoryCollection();
    if (!colRef) return;
    const q = query(colRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    maintenanceHistory = [];
    snapshot.forEach(docSnap => {
        maintenanceHistory.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderHistoryTable();
    updatePrediction();
}
async function analyzeImage(file) {
    // Mobilenet model fe'i (yoo hin fe'amne)
    if (!window.mobilenetModel) {
        window.mobilenetModel = await mobilenet.load();
    }
    const img = new Image();
    img.src = URL.createObjectURL(file);
    return new Promise((resolve) => {
        img.onload = async () => {
            const canvas = document.getElementById('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const predictions = await window.mobilenetModel.classify(canvas);
            const top = predictions[0].className.toLowerCase();
            let diag = "✅ Maashiniin kee fayyaa jira.";
            if (top.includes("motor") || top.includes("engine")) diag = "⚠️ Mootorii: overheating ykn vibration ta'uu danda'a.";
            else if (top.includes("fan")) diag = "🔄 Faaniin: bearing ykn jiidhina sakatta'i.";
            else if (top.includes("pump")) diag = "💧 Pump: leakage ykn hojiin hir'achuu sakatta'i.";
            else if (top.includes("conveyor")) diag = "⚙️ Conveyor: belttiin gadi fageenya, vibration jiraachuu danda'a.";
            resolve({ diag, topClass: predictions[0].className });
            URL.revokeObjectURL(img.src);
        };
    });
        }
// ---------- Add new entry ----------
async function addHistoryEntry(entry) {
    const colRef = getHistoryCollection();
    if (!colRef) return;
    const docRef = await addDoc(colRef, entry);
    maintenanceHistory.unshift({ id: docRef.id, ...entry });
    renderHistoryTable();
    updatePrediction();
}

// ---------- Delete all entries ----------
async function deleteAllHistory() {
    const colRef = getHistoryCollection();
    if (!colRef) return;
    const snapshot = await getDocs(colRef);
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'users', currentUser.uid, 'maintenanceHistory', d.id)));
    await Promise.all(deletePromises);
    maintenanceHistory = [];
    renderHistoryTable();
    updatePrediction();
}

// ---------- Delete single entry ----------
async function deleteHistoryEntry(entryId) {
    const entryRef = doc(db, 'users', currentUser.uid, 'maintenanceHistory', entryId);
    await deleteDoc(entryRef);
    maintenanceHistory = maintenanceHistory.filter(e => e.id !== entryId);
    renderHistoryTable();
    updatePrediction();
}

// ---------- Render table with delete buttons ----------
function renderHistoryTable() {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    maintenanceHistory.forEach(entry => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = entry.date;
        row.insertCell(1).innerText = entry.machine;
        row.insertCell(2).innerText = entry.issue;
        row.insertCell(3).innerText = entry.recommendation;
        const delCell = row.insertCell(4);
        const delBtn = document.createElement('button');
        delBtn.innerText = '🗑️';
        delBtn.style.background = '#e07c3c';
        delBtn.style.padding = '4px 8px';
        delBtn.style.fontSize = '12px';
        delBtn.onclick = () => deleteHistoryEntry(entry.id);
        delCell.appendChild(delBtn);
    });
}

// ---------- Predictive maintenance ----------
function calculateAvgInterval(history) {
    if (history.length < 2) return 30;
    let total = 0;
    for (let i = 1; i < history.length; i++) {
        const prev = new Date(history[i-1].date);
        const curr = new Date(history[i].date);
        total += (curr - prev) / (1000*60*60*24);
    }
    return Math.round(total / (history.length - 1));
}
function predictNextMaintenance() {
    if (maintenanceHistory.length === 0) return { avgInterval: 30, nextDate: "Hamma ammaatti seenaan hin jiru" };
    const avg = calculateAvgInterval(maintenanceHistory);
    const lastDate = new Date(maintenanceHistory[0].date);
    const next = new Date(lastDate);
    next.setDate(next.getDate() + avg);
    return { avgInterval: avg, nextDate: next.toLocaleDateString() };
}
function updatePrediction() {
    const div = document.getElementById('predictionArea');
    if (maintenanceHistory.length === 0) {
        div.innerHTML = "📊 Seenaa kunuunsa tokko iyyuu hin jiru. Yeroo jalqabaaf galmaa'i.";
    } else {
        const { avgInterval, nextDate } = predictNextMaintenance();
        div.innerHTML = `📅 Giddugaleessa guyyaa ${avgInterval} keessatti kunuunsa barbaachisa.<br>🔮 Kunuunsa itti aanu: <strong>${nextDate}</strong>`;
    }
}

// ---------- Recommendation logic ----------
function getRecommendation(machine, issue) {
    const map = {
        "Motor-Overheating": "Kunoo motorii fi qilleensa naanna'aa sakatta'i.",
        "Motor-Vibration": "Bearing fi footing motorii sakatta'i.",
        "Motor-Noise": "Gurmuu motorii: bearing yoo diigde jijjiiri.",
        "Conveyor-Vibration": "Belttiin fi roller madaali. Tension sirreessi.",
        "Conveyor-Overheating": "Load xiqqeessi, qilleensa fooyyeessi.",
        "Pump-Leakage": "Seals fi gasket jijjiiri.",
        "Pump-Noise": "Cavitation ta'uu danda'a. Impeller sakatta'i.",
        "Fan-Vibration": "Faaniin balansiitii fi bearing sakatta'i.",
        "Compressor-Overheating": "Cooling system fi refrigerant madaali."
    };
    let key = `${machine}-${issue}`;
    return map[key] || "Gorsa waliigalaa: meeshaa qulqulleessi, bearing fi lubriikeeshinii madaali.";
}

// ---------- AI Diagnosis (TensorFlow) ----------
let mobilenetModel;
async function analyzeImage(file) {
    if (!mobilenetModel) {
        mobilenetModel = await mobilenet.load();
    }
    const img = new Image();
    img.src = URL.createObjectURL(file);
    return new Promise((resolve) => {
        img.onload = async () => {
            const canvas = document.getElementById('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const predictions = await mobilenetModel.classify(canvas);
            const top = predictions[0].className.toLowerCase();
            let diag = "✅ Maashiniin kee fayyaa jira.";
            if (top.includes("motor") || top.includes("engine")) diag = "⚠️ Mootorii: overheating ykn vibration ta'uu danda'a.";
            else if (top.includes("fan")) diag = "🔄 Faaniin: bearing ykn jiidhina sakatta'i.";
            else if (top.includes("pump")) diag = "💧 Pump: leakage ykn hojiin hir'achuu sakatta'i.";
            else if (top.includes("conveyor")) diag = "⚙️ Conveyor: belttiin gadi fageenya, vibration jiraachuu danda'a.";
            resolve({ diag, topClass: predictions[0].className });
            URL.revokeObjectURL(img.src);
        };
    });
}

// ---------- Bind UI events after login ----------
function bindEvents() {
    document.getElementById('analyzeBtn').onclick = async () => {
        const file = document.getElementById('imageUpload').files[0];
        if (!file) {
            document.getElementById('aiResult').innerHTML = "⚠️ Suuraa fili.";
            return;
        }
        const { diag, topClass } = await analyzeImage(file);
        document.getElementById('aiResult').innerHTML = `<strong>🔬 AI Diagnosis:</strong> ${diag}<br><small>(${topClass})</small>`;
    };
    document.getElementById('getRecBtn').onclick = () => {
        const machine = document.getElementById('machineType').value;
        const issue = document.getElementById('issueType').value;
        document.getElementById('recommendationBox').innerHTML = `💡 ${getRecommendation(machine, issue)}`;
    };
    document.getElementById('saveHistoryBtn').onclick = async () => {
        const machine = document.getElementById('machineType').value;
        const issue = document.getElementById('issueType').value;
        let rec = document.getElementById('recommendationBox').innerText;
        if (rec.startsWith('💡')) rec = rec.substring(2).trim();
        const date = new Date().toLocaleString();
        await addHistoryEntry({ date, machine, issue, recommendation: rec });
        alert("Seenaan kaa'ame!");
    };
    document.getElementById('clearHistoryBtn').onclick = async () => {
        if (confirm("Seenaa hunda balleessuu barbaadda?")) await deleteAllHistory();
    };
    document.getElementById('exportCsvBtn').onclick = () => {
        if (!maintenanceHistory.length) return alert("Seenaa hin jiru.");
        let csv = [["Date","Machine","Issue","Recommendation"]];
        maintenanceHistory.forEach(e => csv.push([e.date, e.machine, e.issue, e.recommendation]));
        const blob = new Blob([csv.map(r => r.map(c => `"${c}"`).join(",")).join("\n")], {type:"text/csv"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `history_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    document.getElementById('exportPdfBtn').onclick = () => {
        const el = document.getElementById('historyTable');
        if (!el || !maintenanceHistory.length) return alert("Seenaa PDF'f hin jiru.");
        html2pdf().from(el).set({ margin:0.5, filename:`report_${Date.now()}.pdf`, jsPDF:{unit:'in', format:'a4', orientation:'landscape'} }).save();
    };
    // initial recommendation
    document.getElementById('recommendationBox').innerHTML = `👉 ${getRecommendation(document.getElementById('machineType').value, document.getElementById('issueType').value)}`;
}

// ---------- Authentication ----------
toggleMode.onclick = () => {
    isLoginMode = !isLoginMode;
    toggleMode.innerText = isLoginMode ? "Galmaa’iif" : "Seeniif";
    loginBtn.style.display = "block";
    signupBtn.style.display = "block";
    authMessage.innerText = "";
};
loginBtn.onclick = () => {
    const email = emailInput.value, pwd = passwordInput.value;
    if (!email || !pwd) { authMessage.innerText = "Email fi password guuti."; return; }
    if (isLoginMode) signInWithEmailAndPassword(auth, email, pwd).catch(err => authMessage.innerText = err.message);
    else createUserWithEmailAndPassword(auth, email, pwd).catch(err => authMessage.innerText = err.message);
};
signupBtn.onclick = loginBtn.onclick; // same action, mode decides
logoutButton.onclick = () => signOut(auth);

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authSection.style.display = 'none';
        mainApp.style.display = 'block';
        await loadHistory();
        bindEvents();
    } else {
        currentUser = null;
        authSection.style.display = 'block';
        mainApp.style.display = 'none';
        emailInput.value = '';
        passwordInput.value = '';
        authMessage.innerText = '';
    }
});
