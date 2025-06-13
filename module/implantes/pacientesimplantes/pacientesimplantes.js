import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, where, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as XLSX from "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

// Load jsPDF and autoTable dynamically
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadLibraries() {
  try {
    await Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js')
    ]);
    if (!window.jspdf || !window.jspdf.jsPDF || !window.jspdf.jsPDF.prototype.autoTable) {
      throw new Error('jsPDF or autoTable not loaded correctly.');
    }
    return true;
  } catch (error) {
    console.error('Error loading PDF libraries:', error);
    showSuccessMessage('Error al cargar las librerías para generar PDF.', false);
    return false;
  }
}

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDmAf-vi7PhzzQkPZh89q9p3Mz4vGGPtd0",
  authDomain: "modular-app-387da.firebaseapp.com",
  projectId: "modular-app-387da",
  storageBucket: "modular-app-387da.firebasestorage.app",
  messagingSenderId: "271561966774",
  appId: "1:271561966774:web:e197c00e2abd67b4f0d217",
  measurementId: "G-7YT6MMR47X"
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(error => console.error('Persistence error:', error));

// DOM elements
const nombrePacienteInput = document.getElementById('nombre-paciente');
const identificacionInput = document.getElementById('identificacion');
const registrarBtn = document.getElementById('registrar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editNombrePacienteInput = document.getElementById('edit-nombre-paciente');
const editIdentificacionInput = document.getElementById('edit-identificacion');
const implantesContainer = document.getElementById('implantes-container');
const addImplanteBtn = document.getElementById('add-implante-btn');
const editCostoTotalInput = document.getElementById('edit-costo-total');
const editEstadoActivo = document.getElementById('edit-estado-activo');
const editEstadoInactivo = document.getElementById('edit-estado-inactivo');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const pacientesTableBody = document.querySelector('#pacientesimplantes-table tbody');
const tableContainer = document.getElementById('table-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
const logModal = document.getElementById('log-modal');
const logContent = document.getElementById('log-content');
const closeLogBtn = document.getElementById('close-log-btn');
const printModal = document.getElementById('print-modal');
const printTableBody = document.getElementById('print-table-body');
const printTitle = document.querySelector('#print-modal .print-title');
const printConfirmBtn = document.getElementById('print-confirm-btn');
const printCancelBtn = document.getElementById('print-cancel-btn');

// State variables
let currentPage = 1;
const recordsPerPage = 50;
let lastVisible = null;
let firstVisible = null;
let totalPages = 1;
let pacientes = [];
let currentEditId = null;
let filters = {};
let lastPacienteId = 0;
let implantesCache = null;
let currentPaciente = null;

// Utility functions
function formatPrice(number) {
  if (!number && number !== 0) return '';
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function parsePrice(priceStr) {
  if (!priceStr) return 0;
  return parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User document not found');
  return userSnap.data().fullName || 'Unknown User';
}

async function checkDuplicate(nombrePaciente, identificacion, excludeDocId = null) {
  const pacientesCollection = collection(db, 'pacientesimplantes');
  const nombreQuery = query(pacientesCollection, where('nombrePaciente', '==', nombrePaciente));
  const idQuery = query(pacientesCollection, where('identificacion', '==', identificacion));
  const [nombreSnapshot, idSnapshot] = await Promise.all([getDocs(nombreQuery), getDocs(idQuery)]);
  if (!nombreSnapshot.empty) {
    const existingDoc = nombreSnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'nombrePaciente', value: nombrePaciente };
  }
  if (!idSnapshot.empty) {
    const existingDoc = idSnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'identificacion', value: identificacion };
  }
  return { isDuplicate: false };
}

async function getNextPacienteId() {
  if (lastPacienteId > 0) {
    lastPacienteId++;
    return lastPacienteId.toString().padStart(4, '0');
  }
  const pacientesCollection = collection(db, 'pacientesimplantes');
  const q = query(pacientesCollection, orderBy('pacienteId', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastPaciente = querySnapshot.docs[0].data();
    nextId = (parseInt(lastPaciente.pacienteId) || 0) + 1;
  }
  lastPacienteId = nextId;
  return nextId.toString().padStart(4, '0');
}

function showModal(modal, progressElement = null, percentage = 0) {
  if (modal) {
    modal.style.display = 'flex';
    if (progressElement) progressElement.textContent = `${percentage}%`;
  }
}

function hideModal(modal) {
  if (modal) modal.style.display = 'none';
}

function showSuccessMessage(message, isSuccess = true) {
  successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
  successIcon.className = `fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
  successMessage.textContent = message;
  showModal(successModal);
  setTimeout(() => hideModal(successModal), 2000);
}

// Implant row management
function addImplanteRow(implante = { referencia: '', descripcion: '', cantidad: '', precio: '' }) {
  const div = document.createElement('div');
  div.className = 'item-row';
  div.innerHTML = `
    <div class="input-with-icon">
      <input type="text" class="implante-referencia" placeholder="Referencia" value="${implante.referencia || ''}" autocomplete="off">
      <i class="fas fa-list icon-list"></i>
      <ul class="suggestions-list implante-referencia-suggestions"></ul>
    </div>
    <input type="text" class="implante-descripcion" placeholder="Descripción" value="${implante.descripcion || ''}" readonly autocomplete="off">
    <input type="number" class="implante-cantidad" placeholder="Cantidad" min="1" step="1" value="${implante.cantidad || 1}" autocomplete="off">
    <input type="text" class="implante-precio" placeholder="Precio" value="${formatPrice(implante.precio) || ''}" readonly autocomplete="off">
    <button class="remove-item-btn"><i class="fas fa-trash"></i></button>
  `;
  implantesContainer.appendChild(div);

  div.querySelector('.remove-item-btn').addEventListener('click', () => {
    div.remove();
    updateCostoTotal();
  });

  setupReferenciaAutocomplete(div);

  div.querySelector('.implante-cantidad').addEventListener('input', updateCostoTotal);
  updateCostoTotal();
}

function updateCostoTotal() {
  let total = 0;
  implantesContainer.querySelectorAll('.item-row').forEach(row => {
    const cantidad = parseInt(row.querySelector('.implante-cantidad').value) || 0;
    const precio = parsePrice(row.querySelector('.implante-precio').value);
    total += cantidad * precio;
  });
  editCostoTotalInput.value = formatPrice(total);
}

async function loadImplantes() {
  if (implantesCache) return implantesCache;
  const implantesCollection = collection(db, 'implantes');
  const q = query(implantesCollection, where('estado', '==', 'Activo'));
  const querySnapshot = await getDocs(q);
  implantesCache = querySnapshot.docs.map(doc => doc.data());
  return implantesCache;
}

async function setupReferenciaAutocomplete(row) {
  const input = row.querySelector('.implante-referencia');
  const suggestionsList = row.querySelector('.suggestions-list');
  const icon = row.querySelector('.icon-list');
  if (!input || !suggestionsList || !icon) return;

  const implantes = await loadImplantes();
  const referencias = implantes.map(r => r.referencia);

  input.addEventListener('input', () => filterSuggestions(input, suggestionsList, referencias));
  input.addEventListener('focus', () => filterSuggestions(input, suggestionsList, referencias));
  icon.addEventListener('click', () => filterSuggestions(input, suggestionsList, referencias, true));

  input.addEventListener('change', () => updateImplanteFields(input, row));
  document.addEventListener('click', e => {
    if (!row.contains(e.target)) suggestionsList.style.display = 'none';
  });
}

function filterSuggestions(input, list, suggestions, showAll = false) {
  list.innerHTML = '';
  const value = input.value.trim().toLowerCase();
  let filtered = showAll ? suggestions : suggestions.filter(s => s.toLowerCase().includes(value));
  if (!filtered.length) {
    list.style.display = 'none';
    return;
  }
  filtered.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    li.addEventListener('click', () => {
      input.value = s;
      list.innerHTML = '';
      list.style.display = 'none';
      updateImplanteFields(input, input.closest('.item-row'));
    });
    list.appendChild(li);
  });
  list.style.display = 'block';
}

async function updateImplanteFields(input, row) {
  const referencia = input.value.trim();
  const implantes = await loadImplantes();
  const implante = implantes.find(i => i.referencia === referencia);
  const descripcionInput = row.querySelector('.implante-descripcion');
  const precioInput = row.querySelector('.implante-precio');
  if (implante) {
    descripcionInput.value = implante.descripcion || '';
    precioInput.value = formatPrice(implante.precio) || '';
    descripcionInput.disabled = true;
    precioInput.disabled = true;
  } else {
    descripcionInput.value = '';
    precioInput.value = '';
    descripcionInput.disabled = false;
    precioInput.disabled = false;
  }
  updateCostoTotal();
}

// Table rendering
async function loadPacientes() {
  try {
    showModal(loadingModal, loadingProgress, 0);
    const pacientesCollection = collection(db, 'pacientesimplantes');
    const countSnapshot = await getDocs(pacientesCollection);
    totalPages = Math.ceil(countSnapshot.size / recordsPerPage);
    totalRecords.textContent = `Total de registros: ${countSnapshot.size}`;
    let q = query(pacientesCollection, orderBy('pacienteId'), limit(recordsPerPage));
    if (lastVisible && currentPage > 1) {
      q = query(pacientesCollection, orderBy('pacienteId'), startAfter(lastVisible), limit(recordsPerPage));
    }
    const querySnapshot = await getDocs(q);
    pacientes = [];
    const implantes = await loadImplantes();
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const updatedImplantes = (data.implantes || []).map(implante => ({
        ...implante,
        descripcion: implantes.find(i => i.referencia === implante.referencia)?.descripcion || implante.descripcion,
        precio: implantes.find(i => i.referencia === implante.referencia)?.precio || implante.precio
      }));
      pacientes.push({
        docId: doc.id,
        ...data,
        implantes: updatedImplantes,
        numImplantes: updatedImplantes.length
      });
    });
    if (querySnapshot.size > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.size - 1];
      firstVisible = querySnapshot.docs[0];
    }
    renderTable();
    updatePagination();
    tableContainer.style.display = 'block';
  } catch (error) {
    showSuccessMessage('Error al cargar pacientes: ' + error.message, false);
  } finally {
    hideModal(loadingModal);
  }
}

function renderTable() {
  pacientesTableBody.innerHTML = '';
  pacientes.forEach(paciente => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${paciente.pacienteId}</td>
      <td>
        <i class="fas fa-edit action-icon" data-id="${paciente.docId}" title="Editar"></i>
        <i class="fas fa-trash action-icon-delete" data-id="${paciente.docId}" title="Eliminar"></i>
        <i class="fas fa-history action-icon-log" data-id="${paciente.docId}" title="Historial"></i>
        <i class="fas fa-print action-icon-print" data-id="${paciente.docId}" title="Imprimir"></i>
      </td>
      <td class="nombre-paciente">${paciente.nombrePaciente}</td>
      <td>${paciente.identificacion}</td>
      <td>${paciente.numImplantes || 0}</td>
      <td>${formatPrice(paciente.costoTotal)}</td>
      <td>${paciente.estado}</td>
      <td>${paciente.fechaCreacion}</td>
      <td>${paciente.usuario}</td>
    `;
    pacientesTableBody.appendChild(row);
  });

  // Event listeners for actions
  document.querySelectorAll('.action-icon').forEach(icon => {
    icon.addEventListener('click', () => openEditModal(icon.dataset.id));
  });
  document.querySelectorAll('.action-icon-delete').forEach(icon => {
    icon.addEventListener('click', () => openDeleteModal(icon.dataset.id));
  });
  document.querySelectorAll('.action-icon-log').forEach(icon => {
    icon.addEventListener('click', () => showLogModal(icon.dataset.id));
  });
  document.querySelectorAll('.action-icon-print').forEach(icon => {
    icon.addEventListener('click', () => openPrintModal(icon.dataset.id));
  });
}

// Pagination
function updatePagination() {
  pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

prevBtn.addEventListener('click', async () => {
  if (currentPage > 1) {
    currentPage--;
    lastVisible = firstVisible;
    await loadPacientes();
  }
});

nextBtn.addEventListener('click', async () => {
  if (currentPage < totalPages) {
    currentPage++;
    await loadPacientes();
  }
});

// Register patient
registrarBtn.addEventListener('click', async () => {
  const nombrePaciente = nombrePacienteInput.value.trim();
  const identificacion = identificacionInput.value.trim();

  if (!nombrePaciente || !identificacion) {
    showSuccessMessage('Por favor, complete todos los campos.', false);
    return;
  }

  try {
    showModal(registerModal, registerProgress, 10);
    const duplicate = await checkDuplicate(nombrePaciente, identificacion);
    if (duplicate.isDuplicate) {
      showSuccessMessage(`Error: ${duplicate.field} "${duplicate.value}" ya existe.`, false);
      hideModal(registerModal);
      return;
    }

    const pacienteId = await getNextPacienteId();
    const userName = await getUserFullName();
    const now = new Date();
    const pacienteData = {
      pacienteId,
      nombrePaciente,
      identificacion,
      implantes: [],
      costoTotal: 0,
      estado: 'Activo',
      fechaCreacion: formatDate(now),
      usuario: userName
    };

    registerProgress.textContent = '50%';
    const docRef = await addDoc(collection(db, 'pacientesimplantes'), pacienteData);
    registerProgress.textContent = '90%';

    const logEntry = {
      action: 'create',
      timestamp: now,
      usuario: userName,
      details: pacienteData
    };
    await addDoc(collection(db, `pacientesimplantes_logs/${docRef.id}/logs`), logEntry);

    showSuccessMessage('Paciente registrado correctamente.');
    nombrePacienteInput.value = '';
    identificacionInput.value = '';
    await loadPacientes();
  } catch (error) {
    showSuccessMessage('Error al registrar: ' + error.message, false);
  } finally {
    hideModal(registerModal);
  }
});

// Edit modal
async function openEditModal(id) {
  currentEditId = id;
  const paciente = pacientes.find(p => p.docId === id);
  if (!paciente) return;

  editNombrePacienteInput.value = paciente.nombrePaciente;
  editIdentificacionInput.value = paciente.identificacion;
  editCostoTotalInput.value = formatPrice(paciente.costoTotal);
  editEstadoActivo.checked = paciente.estado === 'Activo';
  editEstadoInactivo.checked = paciente.estado === 'Inactivo';

  implantesContainer.innerHTML = '';
  paciente.implantes.forEach(implante => addImplanteRow(implante));

  showModal(editModal);
}

saveEditBtn.addEventListener('click', async () => {
  const nombrePaciente = editNombrePacienteInput.value.trim();
  const identificacion = editIdentificacionInput.value.trim();
  const costoTotal = parsePrice(editCostoTotalInput.value);
  const estado = editEstadoActivo.checked ? 'Activo' : 'Inactivo';

  if (!nombrePaciente || !identificacion) {
    showSuccessMessage('Por favor, complete todos los campos.', false);
    return;
  }

  try {
    showModal(registerModal, registerProgress, 10);
    const duplicate = await checkDuplicate(nombrePaciente, identificacion, currentEditId);
    if (duplicate.isDuplicate) {
      showSuccessMessage(`Error: ${duplicate.field} "${duplicate.value}" ya existe.`, false);
      hideModal(registerModal);
      return;
    }

    const implantes = [];
    implantesContainer.querySelectorAll('.item-row').forEach(row => {
      implantes.push({
        referencia: row.querySelector('.implante-referencia').value.trim(),
        descripcion: row.querySelector('.implante-descripcion').value.trim(),
        cantidad: parseInt(row.querySelector('.implante-cantidad').value) || 1,
        precio: parsePrice(row.querySelector('.implante-precio').value)
      });
    });

    const updateData = {
      nombrePaciente,
      identificacion,
      implantes,
      costoTotal,
      estado,
      usuario: await getUserFullName(),
      fechaModificacion: formatDate(new Date())
    };

    registerProgress.textContent = '50%';
    const pacienteRef = doc(db, 'pacientesimplantes', currentEditId);
    await updateDoc(pacienteRef, updateData);

    const logEntry = {
      action: 'edit',
      timestamp: new Date(),
      usuario: updateData.usuario,
      details: updateData
    };
    await addDoc(collection(db, `pacientesimplantes_logs/${currentEditId}/logs`), logEntry);

    showSuccessMessage('Paciente actualizado correctamente.');
    hideModal(editModal);
    await loadPacientes();
  } catch (error) {
    showSuccessMessage('Error al actualizar: ' + error.message, false);
  } finally {
    hideModal(registerModal);
  }
});

cancelEditBtn.addEventListener('click', () => hideModal(editModal));

// Delete modal
function openDeleteModal(id) {
  const paciente = pacientes.find(p => p.docId === id);
  if (!paciente) return;
  deleteMessage.textContent = `¿Está seguro de que desea eliminar al paciente ${paciente.nombrePaciente}?`;
  currentEditId = id;
  showModal(deleteModal);
}

confirmDeleteBtn.addEventListener('click', async () => {
  try {
    showModal(registerModal, registerProgress, 10);
    const pacienteRef = doc(db, 'pacientesimplantes', currentEditId);
    const logEntry = {
      action: 'delete',
      timestamp: new Date(),
      usuario: await getUserFullName(),
      details: pacientes.find(p => p.docId === currentEditId)
    };
    await addDoc(collection(db, `pacientesimplantes_logs/${currentEditId}/logs`), logEntry);
    registerProgress.textContent = '50%';
    await deleteDoc(pacienteRef);
    showSuccessMessage('Paciente eliminado correctamente.');
    hideModal(deleteModal);
    await loadPacientes();
  } catch (error) {
    showSuccessMessage('Error al eliminar: ' + error.message, false);
  } finally {
    hideModal(registerModal);
  }
});

cancelDeleteBtn.addEventListener('click', () => hideModal(deleteModal));

// Log modal
async function showLogModal(id) {
  try {
    const logCollection = collection(db, `pacientesimplantes_logs/${id}/logs`);
    const querySnapshot = await getDocs(query(logCollection, orderBy('timestamp', 'desc')));
    logContent.innerHTML = '';
    querySnapshot.forEach(doc => {
      const log = doc.data();
      const entry = document.createElement('div');
      entry.className = 'entry';
      entry.innerHTML = `
        <strong>${log.action.toUpperCase()}</strong> por ${log.usuario} el ${formatDate(log.timestamp.toDate())}<br>
        <small>${JSON.stringify(log.details, null, 2)}</small>
      `;
      logContent.appendChild(entry);
    });
    showModal(logModal);
  } catch (error) {
    showSuccessMessage('Error al cargar historial: ' + error.message, false);
  }
}

closeLogBtn.addEventListener('click', () => hideModal(logModal));

// Print modal
async function openPrintModal(id) {
  const paciente = pacientes.find(p => p.docId === id);
  if (!paciente) return;
  currentPaciente = paciente;
  printTitle.textContent = `Reporte de Paciente: ${paciente.nombrePaciente}`;
  printTableBody.innerHTML = '';
  paciente.implantes.forEach(implante => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${implante.referencia}</td>
      <td>${implante.descripcion}</td>
      <td>${implante.cantidad}</td>
      <td>${formatPrice(implante.precio)}</td>
      <td>${formatPrice(implante.cantidad * implante.precio)}</td>
    `;
    printTableBody.appendChild(row);
  });
  showModal(printModal);
}

printConfirmBtn.addEventListener('click', async () => {
  if (!currentPaciente || !(await loadLibraries())) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Reporte de Paciente: ${currentPaciente.nombrePaciente}`, 14, 20);
  doc.setFontSize(12);
  doc.text(`ID: ${currentPaciente.pacienteId}`, 14, 30);
  doc.text(`Identificación: ${currentPaciente.identificacion}`, 14, 36);
  doc.text(`Estado: ${currentPaciente.estado}`, 14, 42);
  doc.text(`Costo Total: ${formatPrice(currentPaciente.costoTotal)}`, 14, 48);
  doc.autoTable({
    startY: 60,
    head: [['Referencia', 'Descripción', 'Cantidad', 'Precio', 'Total']],
    body: currentPaciente.implantes.map(i => [
      i.referencia,
      i.descripcion,
      i.cantidad,
      formatPrice(i.precio),
      formatPrice(i.cantidad * i.precio)
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [49, 130, 206] },
    margin: { top: 60 }
  });
  doc.save(`paciente_${currentPaciente.pacienteId}.pdf`);
  hideModal(printModal);
});

printCancelBtn.addEventListener('click', () => hideModal(printModal));

// Excel export
exportExcelBtn.addEventListener('click', () => {
  const data = pacientes.map(p => ({
    'ID Paciente': p.pacienteId,
    'Nombre': p.nombrePaciente,
    'Identificación': p.identificacion,
    'No. Implantes': p.numImplantes,
    'Costo Total': formatPrice(p.costoTotal),
    'Estado': p.estado,
    'Fecha Creación': p.fechaCreacion,
    'Usuario': p.usuario
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pacientes');
  XLSX.write_file(workbook, 'pacientes_implantes.xlsx');
});

// Filter handling
function setupFilters() {
  const filterIcons = document.querySelectorAll('#pacientesimplantes-table .fa-filter, #pacientesimplantes-table .fa-filter-circle-xmark');
  filterIcons.forEach(icon => {
    icon.addEventListener('click', e => {
      const th = e.target.closest('th');
      const field = th.dataset.field;
      const existingFilter = document.querySelector(`.filter-input-container[data-field="${field}"]`);
      if (existingFilter) {
        existingFilter.remove();
        delete filters[field];
        icon.classList.remove('active');
        icon.classList.add('fa-filter');
        icon.classList.remove('fa-filter-circle-xmark');
        loadPacientes();
        return;
      }
      filterIcons.forEach(i => {
        const otherField = i.closest('th').dataset.field;
        if (otherField !== field) {
          const otherFilter = document.querySelector(`.filter-input-container[data-field="${otherField}"]`);
          if (otherFilter) otherFilter.remove();
          delete filters[otherField];
          i.classList.remove('active');
          i.classList.add('fa-filter');
          i.classList.remove('fa-filter-circle-xmark');
        }
      });
      const container = document.createElement('div');
      container.className = 'filter-input-container';
      container.dataset.field = field;
      container.innerHTML = `<input type="text" placeholder="Filtrar ${th.textContent.trim()}">`;
      th.appendChild(container);
      const input = container.querySelector('input');
      input.focus();
      input.addEventListener('input', () => {
        filters[field] = input.value.trim().toLowerCase();
        icon.classList.add('active');
        icon.classList.remove('fa-filter');
        icon.classList.add('fa-filter-circle-xmark');
        loadPacientes();
      });
      document.addEventListener('click', e => {
        if (!container.contains(e.target) && !icon.contains(e.target)) {
          container.remove();
          delete filters[field];
          icon.classList.remove('active');
          icon.classList.add('fa-filter');
          icon.classList.remove('fa-filter-circle-xmark');
          loadPacientes();
        }
      }, { once: true });
    });
  });
}

// Initialize
onAuthStateChanged(auth, user => {
  if (user) {
    loadPacientes();
    setupFilters();
    addImplanteBtn.addEventListener('click', () => addImplanteRow());
  } else {
    window.location.href = 'index.html';
  }
});