// --- CONFIGURATION ---
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

// --- STATE ---
let currentFormFields = []; 

// --- CORE NAVIGATION ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

function showPage(page) {
    const main = document.getElementById('app-content');
    // Auto-close sidebar on mobile
    if (!document.getElementById('sidebar').classList.contains('-translate-x-full')) toggleSidebar();
    
    main.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>`;

    if (page === 'user-home') renderUserHome(main);
    if (page === 'admin-login') renderAdminLogin(main);
    if (page === 'admin-dash') renderAdminDashboard(main);
    if (page === 'about') renderAbout(main);
}

// --- USER PORTAL (Fixed Loading) ---
async function renderUserHome(container) {
    try {
        const snap = await db.collection('forms').where('visible', '==', true).get();
        container.innerHTML = `<h2 class="text-3xl font-bold mb-10 text-center">Available Forms</h2><div id="forms-grid" class="grid md:grid-cols-3 gap-6"></div>`;
        const grid = document.getElementById('forms-grid');

        if (snap.empty) {
            grid.innerHTML = `<div class="col-span-full text-center py-10 bg-white rounded-2xl border border-dashed text-slate-400">No active forms available at the moment.</div>`;
            return;
        }

        snap.forEach(doc => {
            const f = doc.data();
            const card = document.createElement('div');
            card.className = "bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-xl cursor-pointer transition-all animate-in";
            card.innerHTML = `<h3 class="text-xl font-bold">${f.name}</h3><p class="text-blue-500 mt-4 text-sm font-bold">Open Form &rarr;</p>`;
            card.onclick = () => openFormConfirm(doc.id, f.name);
            grid.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<div class="text-red-500 text-center py-10">Error loading forms. Please ensure Firestore rules are set to public for reading.</div>`;
    }
}

// --- ADMIN DASHBOARD (With Create/Edit/Delete) ---
async function renderAdminDashboard(container) {
    if (!auth.currentUser) return showPage('admin-login');

    container.innerHTML = `
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
            <h2 class="text-3xl font-bold">Admin Portal</h2>
            <div class="flex gap-3">
                <button onclick="openFormBuilder()" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition">+ Create New Form</button>
                <button onclick="logout()" class="text-slate-500 font-bold px-4">Logout</button>
            </div>
        </div>
        <div id="admin-form-list" class="grid gap-4"></div>
    `;

    const list = document.getElementById('admin-form-list');
    const snap = await db.collection('forms').get();
    list.innerHTML = "";

    snap.forEach(doc => {
        const f = doc.data();
        const item = document.createElement('div');
        item.className = "bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition";
        item.innerHTML = `
            <div>
                <h4 class="font-bold text-lg">${f.name}</h4>
                <p class="text-xs ${f.visible ? 'text-green-500' : 'text-slate-400'} font-bold uppercase">${f.visible ? 'Visible' : 'Hidden'}</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button onclick="viewResponses('${doc.id}', '${f.name}')" class="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold">Responses</button>
                <button onclick="toggleVisibility('${doc.id}', ${f.visible})" class="px-4 py-2 ${f.visible ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'} rounded-lg text-xs font-bold">${f.visible ? 'Hide' : 'Show'}</button>
                <button onclick="deleteForm('${doc.id}')" class="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold">Delete</button>
            </div>
        `;
        list.appendChild(item);
    });
}

// --- FORM BUILDER MODAL ---
function openFormBuilder() {
    currentFormFields = [];
    const modal = document.getElementById('modal-overlay');
    const box = document.getElementById('modal-box');
    modal.classList.remove('hidden');
    
    box.innerHTML = `
        <h3 class="text-2xl font-bold mb-4">Create New Form</h3>
        <input type="text" id="new-form-name" placeholder="Form Name (e.g. Job Application)" class="w-full p-3 border rounded-xl mb-4 outline-none focus:ring-2 focus:ring-blue-500">
        
        <div class="bg-slate-50 p-4 rounded-xl mb-4">
            <p class="text-sm font-bold mb-3">Add Input Fields:</p>
            <div class="grid grid-cols-2 gap-2">
                <button onclick="addField('text')" class="p-2 bg-white border rounded-lg text-xs hover:bg-blue-50 transition">+ Text Input</button>
                <button onclick="addField('textarea')" class="p-2 bg-white border rounded-lg text-xs hover:bg-blue-50 transition">+ Text Area</button>
                <button onclick="addField('checkbox')" class="p-2 bg-white border rounded-lg text-xs hover:bg-blue-50 transition">+ Checkbox</button>
                <button onclick="addField('tel')" class="p-2 bg-white border rounded-lg text-xs hover:bg-blue-50 transition">+ Mobile No.</button>
            </div>
        </div>

        <div id="builder-preview" class="max-h-60 overflow-auto mb-6 space-y-2 border-t pt-4"></div>

        <div class="flex gap-3">
            <button onclick="closeModal()" class="flex-1 py-3 text-slate-500">Cancel</button>
            <button onclick="saveNewForm()" class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Save & Publish</button>
        </div>
    `;
}

function addField(type) {
    const label = prompt("Enter label for this field:");
    if (!label) return;
    
    let field = { type, label, id: Date.now() };
    if (type === 'textarea') field.limit = prompt("Character limit? (e.g. 200)", "200");
    
    currentFormFields.push(field);
    renderBuilderPreview();
}

function renderBuilderPreview() {
    const pre = document.getElementById('builder-preview');
    pre.innerHTML = currentFormFields.map((f, index) => `
        <div class="flex justify-between items-center bg-white p-2 border rounded-lg text-sm">
            <span>${f.label} <small class="text-slate-400">(${f.type})</small></span>
            <button onclick="removeField(${index})" class="text-red-500">&times;</button>
        </div>
    `).join('');
}

function removeField(idx) {
    currentFormFields.splice(idx, 1);
    renderBuilderPreview();
}

async function saveNewForm() {
    const name = document.getElementById('new-form-name').value;
    if (!name || currentFormFields.length === 0) return alert("Enter form name and add at least one field");

    await db.collection('forms').add({
        name: name,
        fields: currentFormFields,
        visible: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    closeModal();
    renderAdminDashboard(document.getElementById('app-content'));
}

async function deleteForm(id) {
    if(confirm("Delete this form and all its configuration?")) {
        await db.collection('forms').doc(id).delete();
        showPage('admin-dash');
    }
}

// --- SYSTEM INITIALIZATION ---
function logout() { auth.signOut().then(() => showPage('user-home')); }
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

// Run
showPage('user-home');
