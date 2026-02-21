// CONFIG (Already contains your Keys)
const firebaseConfig = {
  apiKey: "AIzaSyCXB_3ONshkBQznaLH2xsZZ9kN3meXcvc8",
  authDomain: "form-6cf5d.firebaseapp.com",
  projectId: "form-6cf5d",
  storageBucket: "form-6cf5d.firebasestorage.app",
  messagingSenderId: "557559151440",
  appId: "1:557559151440:web:25690655f29f2434f08a55",
  measurementId: "G-E2MV2BGMW2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// UI CONTROL
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isHidden = sidebar.classList.contains('-translate-x-full');

    if (isHidden) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

function showPage(page) {
    const main = document.getElementById('app-content');
    if (!document.getElementById('sidebar').classList.contains('-translate-x-full')) {
        toggleSidebar();
    }
    
    main.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>`;

    if (page === 'user-home') renderUserHome(main);
    if (page === 'admin-login') renderAdminLogin(main);
    if (page === 'admin-dash') renderAdminDashboard(main); // Fixed Dash Route
    if (page === 'about') renderAbout(main);
}

// ADMIN LOGIN FIX
function renderAdminLogin(container) {
    // If already logged in, skip login
    if (auth.currentUser) {
        showPage('admin-dash');
        return;
    }

    container.innerHTML = `
        <div class="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border border-slate-100 animate-in">
            <h2 class="text-2xl font-bold mb-2">Admin Access</h2>
            <p class="text-slate-500 text-sm mb-8">Enter your credentials to manage forms.</p>
            <input type="email" id="adm-email" placeholder="Email Address" class="w-full p-4 mb-4 rounded-xl border bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 transition">
            <input type="password" id="adm-pass" placeholder="Password" class="w-full p-4 mb-8 rounded-xl border bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 transition">
            <button onclick="handleLogin()" class="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition">Sign In</button>
        </div>
    `;
}

async function handleLogin() {
    const email = document.getElementById('adm-email').value;
    const pass = document.getElementById('adm-pass').value;
    try {
        await auth.signInWithEmailAndPassword(email, pass);
        document.getElementById('auth-status').innerText = "Admin Active";
        showPage('admin-dash');
    } catch (e) {
        alert("Authentication Failed: " + e.message);
        showPage('admin-login');
    }
}

// ADMIN DASHBOARD (The management center)
async function renderAdminDashboard(container) {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-3xl font-bold">Admin Portal</h2>
            <button onclick="logout()" class="text-sm text-red-500 font-bold">Logout</button>
        </div>
        <div class="grid md:grid-cols-2 gap-8">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 class="font-bold mb-4">Form Controls</h3>
                <div id="admin-form-list" class="space-y-4">Loading forms...</div>
            </div>
            <div class="bg-blue-600 p-8 rounded-2xl text-white shadow-xl">
                <h3 class="text-xl font-bold mb-2">Quick Tip</h3>
                <p class="opacity-80">Use the 'Visible' toggle to instantly show or hide forms from the User Portal without deleting them.</p>
            </div>
        </div>
    `;
    
    const list = document.getElementById('admin-form-list');
    const snap = await db.collection('forms').get();
    list.innerHTML = "";

    snap.forEach(doc => {
        const f = doc.data();
        const item = document.createElement('div');
        item.className = "flex justify-between items-center p-4 bg-slate-50 rounded-xl";
        item.innerHTML = `
            <div>
                <p class="font-bold">${f.name}</p>
                <span class="text-[10px] ${f.visible ? 'text-green-600' : 'text-slate-400'}">${f.visible ? 'ACTIVE' : 'HIDDEN'}</span>
            </div>
            <div class="flex gap-2">
                <button onclick="viewResponses('${doc.id}', '${f.name}')" class="text-xs bg-white px-3 py-1 border rounded shadow-sm hover:bg-slate-100">Responses</button>
                <button onclick="toggleVisibility('${doc.id}', ${f.visible})" class="text-xs bg-slate-800 text-white px-3 py-1 rounded shadow-sm">${f.visible ? 'Hide' : 'Show'}</button>
            </div>
        `;
        list.appendChild(item);
    });
}

async function toggleVisibility(id, current) {
    await db.collection('forms').doc(id).update({ visible: !current });
    showPage('admin-dash');
}

async function logout() {
    await auth.signOut();
    document.getElementById('auth-status').innerText = "Guest Mode";
    showPage('user-home');
}

// Initialization
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('auth-status').innerText = "Admin Active";
    }
});

showPage('user-home');
