import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, where, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import * as XLSX from "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

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

const nombrePrevisionInput = document.getElementById('nombre-prevision');
const registrarBtn = document.getElementById('registrar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editNombrePrevisionInput = document.getElementById('edit-nombre-prevision');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const previsionesTableBody = document.querySelector('#previsiones-table tbody');
const tableContainer = document.getElementById('table-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
const logModal = document.getElementById('log-modal');
const closeLogBtn = document.getElementById('close-log-btn');
const logContent = document.getElementById('log-content');

let currentPage = 1;
const recordsPerPage = 50;
let lastVisible = null;
let firstVisible = null;
let totalPages = 1;
let previsiones = [];
let currentEditId = null;
let filters = {};
let lastPrevisionId = 0;

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function checkDuplicate(nombrePrevision, excludeDocId = null) {
  const previsionesCollection = collection(db, 'previsiones');
  const nombreQuery = query(previsionesCollection, where('nombrePrevision', '==', nombrePrevision));
  const nombreSnapshot = await getDocs(nombreQuery);
  if (!nombreSnapshot.empty) {
    const existingDoc = nombreSnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'nombrePrevision', value: nombrePrevision };
  }
  return { isDuplicate: false };
}

async function getNextPrevisionId() {
  if (lastPrevisionId > 0) {
    lastPrevisionId++;
    return lastPrevisionId.toString().padStart(3, '0');
  }
  const previsionesCollection = collection(db, 'previsiones');
  const q = query(previsionesCollection, orderBy('id', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastPrevision = querySnapshot.docs[0].data();
    nextId = (parseInt(lastPrevision.id) || 0) + 1;
  }
  lastPrevisionId = nextId;
  return nextId.toString().padStart(3, '0');
}

function showModal(modal, progressElement, percentage) {
  modal.style.display = 'flex';
  if (progressElement) {
    progressElement.textContent = `${percentage}%`;
  }
}

function hideModal(modal) {
  modal.style.display = 'none';
}

function showSuccessMessage(message, isSuccess = true) {
  successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
  successIcon.className = `fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
  successMessage.textContent = message;
  successModal.style.display = 'flex';
  setTimeout(() => hideModal(successModal), 2000);
}

async function loadPrevisiones() {
  try {
    showModal(loadingModal, loadingProgress, 0);
    const previsionesCollection = collection(db, 'previsiones');
    const countSnapshot = await getDocs(previsionesCollection);
    const totalRecordsCount = countSnapshot.size;
    totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
    totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
    let q = query(previsionesCollection, orderBy('id', 'asc'), limit(recordsPerPage));
    if (lastVisible && currentPage > 1) {
      q = query(previsionesCollection, orderBy('id', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
    }
    const querySnapshot = await getDocs(q);
    previsiones = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      previsiones.push({ docId: doc.id, ...data });
    });
    if (previsiones.length > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      firstVisible = querySnapshot.docs[0];
    }
    renderTable();
    updatePagination();
    tableContainer.style.display = 'block';
    hideModal(loadingModal);
  } catch (error) {
    showSuccessMessage('Error al cargar previsiones: ' + error.message, false);
    hideModal(loadingModal);
  }
}

document.getElementById('success-modal').style.right = '20px';
document.getElementById('success-modal').style.left = 'auto';

function renderTable() {
  let filteredPrevisiones = [...previsiones];
  Object.keys(filters).forEach(column => {
    if (filters[column]) {
      filteredPrevisiones = filteredPrevisiones.filter(prevision => {
        const value = prevision[column]?.toString().toLowerCase() || '';
        return value.includes(filters[column].toLowerCase());
      });
    }
  });
  previsionesTableBody.innerHTML = '';
  filteredPrevisiones.forEach(prevision => {
    const fechaCreacion = prevision.fechaCreacion && typeof prevision.fechaCreacion.toDate === 'function'
      ? prevision.fechaCreacion.toDate()
      : prevision.fechaCreacion instanceof Date
      ? prevision.fechaCreacion
      : null;
    const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
      ? fechaCreacion.toLocaleString('es-ES')
      : 'Sin fecha';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${prevision.id}</td>
      <td>
        <i class="fas fa-edit action-icon" data-id="${prevision.docId}" title="Editar"></i>
        <i class="fas fa-trash action-icon" data-id="${prevision.docId}" title="Eliminar"></i>
        <i class="fas fa-history action-icon" data-id="${prevision.docId}" title="Historial"></i>
      </td>
      <td>${prevision.nombrePrevision}</td>
      <td>${fechaDisplay}</td>
      <td>${prevision.usuario}</td>
    `;
    previsionesTableBody.appendChild(tr);
  });

  // Actualizar íconos de filtro según el estado de filters
  document.querySelectorAll('.filter-icon').forEach(icon => {
    const column = icon.dataset.column;
    if (filters[column]) {
      icon.classList.remove('fa-filter');
      icon.classList.add('fa-filter-circle-xmark', 'active');
    } else {
      icon.classList.remove('fa-filter-circle-xmark', 'active');
      icon.classList.add('fa-filter');
    }
  });
}

function updatePagination() {
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

async function loadLogs(previsionId) {
  const logsCollection = collection(db, 'previsiones', previsionId, 'logs');
  const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
  const logsSnapshot = await getDocs(logsQuery);
  logContent.innerHTML = '';
  logsSnapshot.forEach((doc) => {
    const data = doc.data();
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `<strong>${data.action}</strong> - ${data.message} <small>${data.timestamp.toDate().toLocaleString('es-ES')}</small>`;
    logContent.appendChild(logEntry);
  });
  logModal.style.display = 'flex';
}

async function init() {
  const container = document.querySelector('.previsiones-container');
  if (!container) {
    console.error('Contenedor .previsiones-container no encontrado');
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión nuevamente.</p>';
      window.location.href = 'main.html?error=auth-required';
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        container.innerHTML = '<p>Error: Tu cuenta no está registrada en la base de datos. Contacta al administrador.</p>';
        return;
      }

      const userData = userDoc.data();
      const hasAccess = userData.role === 'Administrador' ||
                        (userData.permissions && userData.permissions.includes('Prestaciones:Previsiones'));
      if (!hasAccess) {
        container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
        return;
      }

      loadPrevisiones();

      registrarBtn.addEventListener('click', async () => {
        const nombrePrevision = nombrePrevisionInput.value.trim();
        if (!nombrePrevision) {
          showSuccessMessage('Por favor, complete el campo Nombre de la Previsión', false);
          return;
        }
        try {
          showModal(registerModal, registerProgress, 0);
          const duplicateCheck = await checkDuplicate(nombrePrevision);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe una previsión con el nombre "${duplicateCheck.value}"`, false);
            hideModal(registerModal);
            return;
          }
          const user = auth.currentUser;
          if (!user) throw new Error('Usuario no autenticado');
          const fullName = await getUserFullName();
          const previsionId = await getNextPrevisionId();
          const fechaCreacion = new Date();
          const previsionRef = doc(collection(db, 'previsiones'));
          const previsionData = {
            id: previsionId,
            nombrePrevision,
            fechaCreacion,
            usuario: fullName,
            uid: user.uid
          };
          const batch = writeBatch(db);
          batch.set(previsionRef, previsionData);
          const logRef = doc(collection(db, 'previsiones', previsionRef.id, 'logs'));
          batch.set(logRef, {
            action: 'Creación',
            message: `Previsión ${nombrePrevision} creada por ${fullName}`,
            timestamp: new Date(),
            uid: user.uid
          });
          await batch.commit();
          showModal(registerModal, registerProgress, 100);
          setTimeout(() => {
            hideModal(registerModal);
            showSuccessMessage('Previsión registrada exitosamente');
            nombrePrevisionInput.value = '';
            previsiones.push({ docId: previsionRef.id, ...previsionData });
            renderTable();
          }, 300);
        } catch (error) {
          showSuccessMessage('Error al registrar previsión: ' + error.message, false);
          hideModal(registerModal);
        }
      });

      saveEditBtn.addEventListener('click', async () => {
        const nombrePrevision = editNombrePrevisionInput.value.trim();
        if (!nombrePrevision) {
          showSuccessMessage('Por favor, complete el campo Nombre de la Previsión', false);
          return;
        }
        try {
          const duplicateCheck = await checkDuplicate(nombrePrevision, currentEditId);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe una previsión con el nombre "${duplicateCheck.value}"`, false);
            return;
          }
          const previsionRef = doc(db, 'previsiones', currentEditId);
          const previsionSnap = await getDoc(previsionRef);
          const oldData = previsionSnap.data();
          const fullName = await getUserFullName();
          const batch = writeBatch(db);
          batch.update(previsionRef, {
            nombrePrevision,
            usuario: fullName,
            fechaActualizacion: new Date()
          });
          const logRef = doc(collection(db, 'previsiones', currentEditId, 'logs'));
          batch.set(logRef, {
            action: 'Edición',
            message: `Previsión ${oldData.nombrePrevision} editada a ${nombrePrevision} por ${fullName}`,
            timestamp: new Date(),
            uid: user.uid
          });
          await batch.commit();
          hideModal(editModal);
          showSuccessMessage('Previsión actualizada exitosamente');
          const index = previsiones.findIndex(prev => prev.docId === currentEditId);
          if (index !== -1) {
            previsiones[index] = { ...previsiones[index], nombrePrevision, usuario: fullName, fechaActualizacion: new Date() };
            renderTable();
          }
        } catch (error) {
          showSuccessMessage('Error al actualizar previsión: ' + error.message, false);
        }
      });

      cancelEditBtn.addEventListener('click', () => {
        hideModal(editModal);
      });

      confirmDeleteBtn.addEventListener('click', async () => {
        const id = confirmDeleteBtn.dataset.id;
        try {
          const previsionRef = doc(db, 'previsiones', id);
          const fullName = await getUserFullName();
          const batch = writeBatch(db);
          batch.delete(previsionRef);
          const logRef = doc(collection(db, 'previsiones', id, 'logs'));
          batch.set(logRef, {
            action: 'Eliminación',
            message: `Previsión eliminada por ${fullName}`,
            timestamp: new Date(),
            uid: auth.currentUser.uid
          });
          await batch.commit();
          hideModal(deleteModal);
          showSuccessMessage('Previsión eliminada exitosamente');
          previsiones = previsiones.filter(prev => prev.docId !== id);
          renderTable();
          totalRecords.textContent = `Total de registros: ${previsiones.length}`;
          totalPages = Math.ceil(previsiones.length / recordsPerPage);
          updatePagination();
        } catch (error) {
          showSuccessMessage('Error al eliminar previsión: ' + error.message, false);
        }
      });

      cancelDeleteBtn.addEventListener('click', () => {
        hideModal(deleteModal);
      });

      previsionesTableBody.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const prevision = previsiones.find(prev => prev.docId === id);
        if (!prevision) return;
        if (e.target.classList.contains('fa-edit')) {
          openEditModal(prevision);
        } else if (e.target.classList.contains('fa-trash')) {
          openDeleteModal(prevision);
        } else if (e.target.classList.contains('fa-history')) {
          loadLogs(prevision.docId);
        }
      });

      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          lastVisible = firstVisible;
          loadPrevisiones();
        }
      });

      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          loadPrevisiones();
        }
      });

      exportExcelBtn.addEventListener('click', () => {
        const data = previsiones.map(prevision => {
          const fechaCreacion = prevision.fechaCreacion && typeof prevision.fechaCreacion.toDate === 'function'
            ? prevision.fechaCreacion.toDate()
            : prevision.fechaCreacion instanceof Date
            ? prevision.fechaCreacion
            : null;
          return {
            ID: prevision.id,
            'Nombre de la Previsión': prevision.nombrePrevision,
            'Fecha de Creación': fechaCreacion && !isNaN(fechaCreacion)
              ? fechaCreacion.toLocaleString('es-ES')
              : 'Sin fecha',
            Usuario: prevision.usuario
          };
        });
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Previsiones');
        XLSX.writeFile(workbook, 'previsiones.xlsx');
      });

      document.querySelectorAll('.filter-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
          const column = e.target.dataset.column;
          if (column === 'acciones') return;

          // Si el ícono indica un filtro activo, limpiarlo
          if (e.target.classList.contains('fa-filter-circle-xmark')) {
            delete filters[column];
            renderTable();
            return;
          }

          // Remueve cualquier contenedor de filtro existente
          document.querySelectorAll('.filter-input-container').forEach(input => input.remove());

          // Crea el nuevo contenedor de filtro
          const container = document.createElement('div');
          container.className = 'filter-input-container';
          const input = document.createElement('input');
          input.type = 'text';
          input.placeholder = `Filtrar por ${column}`;
          input.value = filters[column] || '';
          input.addEventListener('input', () => {
            const value = input.value.trim();
            if (value) {
              filters[column] = value;
            } else {
              delete filters[column];
            }
            renderTable();
          });
          container.appendChild(input);
          e.target.parentElement.appendChild(container);
          input.focus();
        });
      });

      document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('fa-filter') && !e.target.classList.contains('fa-filter-circle-xmark') && !e.target.closest('.filter-input-container')) {
          document.querySelectorAll('.filter-input-container').forEach(input => input.remove());
        }
      });

      closeLogBtn.addEventListener('click', () => {
        hideModal(logModal);
      });

    } catch (error) {
      container.innerHTML = `<p>Error al verificar permisos: ${error.message}</p>`;
    }
  });
}

function openEditModal(prevision) {
  currentEditId = prevision.docId;
  editNombrePrevisionInput.value = prevision.nombrePrevision;
  editModal.style.display = 'flex';
}

function openDeleteModal(prevision) {
  deleteMessage.textContent = `¿Estás seguro de que deseas eliminar la previsión "${prevision.nombrePrevision}" (ID: ${prevision.id})?`;
  confirmDeleteBtn.dataset.id = prevision.docId;
  deleteModal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}