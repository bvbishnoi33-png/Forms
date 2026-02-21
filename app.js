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

let activeFormId = null;

// Navigation
const toggleSidebar = () => document.getElementById('sidebar').classList.toggle('-translate-x-full');

function showPage(page) {
    const main = document.getElementById('app-content');
    document.getElementById('sidebar').classList.add('-translate-x-full');
    main.innerHTML = '<div class="text-center py-20">Loading...</div>';

    if (page === 'user-home') renderUserHome(main);
    if (page === 'admin-login') renderAdminLogin(main);
    if (page === 'about') renderAbout(main);
}

// User Portal
async function renderUserHome(container) {
    container.innerHTML = `<h2 class="text-3xl font-bold mb-10 text-center">Open Submission Portals</h2><div id="forms-grid" class="grid md:grid-cols-3 gap-6"></div>`;
    const snap = await db.collection('forms').where('visible', '==', true).get();
    const grid = document.getElementById('forms-grid');
    
    if (snap.empty) grid.innerHTML = `<p class="col-span-full text-center text-slate-400">No forms currently active.</p>`;
    
    snap.forEach(doc => {
        const f = doc.data();
        const card = document.createElement('div');
        card.className = "bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl cursor-pointer transition-all";
        card.innerHTML = `<h3 class="text-xl font-bold">${f.name}</h3><p class="text-blue-500 mt-2">Click to Open &rarr;</p>`;
        card.onclick = () => openFormConfirm(doc.id, f.name);
        grid.appendChild(card);
    });
}

function openFormConfirm(id, name) {
    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('hidden');
    document.getElementById('modal-box').innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Confirmation</h2>
        <p class="mb-8">Are you sure you want to fill out <b>${name}</b>?</p>
        <div class="flex gap-4">
            <button onclick="closeModal()" class="flex-1 py-3 text-slate-500">Cancel</button>
            <button onclick="startForm('${id}')" class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Confirm</button>
        </div>
    `;
}

// Submissions & Data Management (Admin Side)
async function viewResponses(formId, formName) {
    activeFormId = formId;
    document.getElementById('response-view-modal').classList.remove('hidden');
    document.getElementById('response-title').innerText = `Submissions: ${formName}`;
    loadResponseTable();
}

async function loadResponseTable() {
    const table = document.getElementById('response-table');
    table.innerHTML = `<tr><td class="p-4">Fetching data...</td></tr>`;
    
    const snap = await db.collection('submissions').doc(activeFormId).collection('entries').get();
    
    if (snap.empty) {
        table.innerHTML = `<tr><td class="p-10 text-center text-slate-400">No responses yet.</td></tr>`;
        return;
    }

    let headers = ['Select', ...Object.keys(snap.docs[0].data()).filter(k => k !== 'timestamp'), 'Action'];
    let html = `<thead class="bg-white sticky top-0 border-b"><tr>`;
    headers.forEach(h => html += `<th class="p-4 text-xs uppercase font-bold text-slate-500">${h}</th>`);
    html += `</tr></thead><tbody>`;

    snap.forEach(doc => {
        const data = doc.data();
        html += `<tr class="border-b bg-white hover:bg-slate-50">
            <td class="p-4"><input type="checkbox" class="resp-check" value="${doc.id}"></td>
            ${headers.slice(1, -1).map(h => `<td class="p-4 text-sm">${data[h] || '-'}</td>`).join('')}
            <td class="p-4 text-red-500"><button onclick="deleteSingle('${doc.id}')">Delete</button></td>
        </tr>`;
    });
    table.innerHTML = html + `</tbody>`;
}

async function deleteSingle(docId) {
    if(confirm("Delete this specific response?")) {
        await db.collection('submissions').doc(activeFormId).collection('entries').doc(docId).delete();
        loadResponseTable();
    }
}

async function deleteSelected() {
    const checks = document.querySelectorAll('.resp-check:checked');
    if(checks.length === 0) return alert("Select responses first");
    if(confirm(`Delete ${checks.length} selected items?`)) {
        const batch = db.batch();
        checks.forEach(c => {
            const ref = db.collection('submissions').doc(activeFormId).collection('entries').doc(c.value);
            batch.delete(ref);
        });
        await batch.commit();
        loadResponseTable();
    }
}

async function deleteAllResponses() {
    if(confirm("DANGER: This will wipe ALL records for this form. Continue?")) {
        const snap = await db.collection('submissions').doc(activeFormId).collection('entries').get();
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        loadResponseTable();
    }
}

function exportToCSV() {
    const table = document.getElementById('response-table');
    let csv = [];
    const rows = table.querySelectorAll("tr");
    for (let i = 0; i < rows.length; i++) {
        const row = [], cols = rows[i].querySelectorAll("td, th");
        // Skip 'Select' and 'Action' columns
        for (let j = 1; j < cols.length - 1; j++) row.push(`"${cols[j].innerText}"`);
        csv.push(row.join(","));
    }
    const blob = new Blob([csv.join("\n")], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Responses_${activeFormId}.csv`);
    a.click();
}

// About Page
function renderAbout(container) {
    container.innerHTML = `
        <div class="max-w-xl mx-auto bg-white p-10 rounded-3xl shadow-xl text-center">
            <h2 class="text-3xl font-bold mb-6">Contact Developer</h2>
            <p class="text-lg font-semibold">Vipul Bishnoi</p>
            <p class="text-slate-500 mb-6">Full Stack Developer</p>
            <div class="space-y-4 mb-8">
                <p>📞 +91 94xxxxxx07</p>
                <a href="mailto:vipulbishnoi2992@gmail.com" class="block text-blue-600">vipulbishnoi2992@gmail.com</a>
            </div>
            <a href="https://resume-vipul.netlify.app/" target="_blank" class="block w-full py-4 bg-slate-900 text-white rounded-xl font-bold">View My Portfolio</a>
        </div>
    `;
}

function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }
function closeResponseModal() { document.getElementById('response-view-modal').classList.add('hidden'); }

// Run User Portal by default
showPage('user-home');
