import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getFirestore, collection, getDocs, query, where, doc, getDoc, updateDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';

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
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (error) {
  console.error('Error inicializando Firebase:', error);
  throw error;
}

const auth = getAuth(app);
const db = getFirestore(app);

async function configurePersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error('Error al configurar persistencia:', error);
    throw error;
  }
}

const entregadosTableBody = document.querySelector('#entregados-sub-table tbody');
const consumidosTableBody = document.querySelector('#consumidos-sub-table tbody');
const entregadosSummary = document.getElementById('entregados-summary');
const consumidosSummary = document.getElementById('consumidos-summary');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const returnModal = document.getElementById('return-modal');
const returnDetails = document.getElementById('return-details');
const returnQuantity = document.getElementById('return-quantity');
const confirmReturnBtn = document.getElementById('confirm-return-btn');
const cancelReturnBtn = document.getElementById('cancel-return-btn');

async function loadTransito() {
  try {
    const entregadosQuery = query(collection(db, 'transito'), where('estado', '==', 'Entregado'));
    const entregadosSnapshot = await getDocs(entregadosQuery);
    const entregadosData = entregadosSnapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

    const groupedEntregados = {};
    entregadosData.forEach(item => {
      const ref = item.referencia || 'N/A';
      if (!groupedEntregados[ref]) {
        groupedEntregados[ref] = {
          referencia: ref,
          codigo: item.codigo || 'N/A',
          descripcion: item.descripcion || 'N/A',
          proveedor: item.proveedor || 'N/A',
          cantidad: 0,
          items: [],
          fechaActualizacion: item.fechaActualizacion,
          docIds: []
        };
      }
      groupedEntregados[ref].cantidad += item.cantidad || 0;
      groupedEntregados[ref].items.push(...(item.items || []));
      groupedEntregados[ref].docIds.push(item.docId);
      if (item.fechaActualizacion && (!groupedEntregados[ref].fechaActualizacion || item.fechaActualizacion.toDate() > groupedEntregados[ref].fechaActualizacion.toDate())) {
        groupedEntregados[ref].fechaActualizacion = item.fechaActualizacion;
      }
    });
    const entregadosGroupedData = Object.values(groupedEntregados);
    const consumidosQuery = query(collection(db, 'transito'), where('estado', '==', 'Consumido'));
    const consumidosSnapshot = await getDocs(consumidosQuery);
    const consumidosData = consumidosSnapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

    renderEntregados(entregadosGroupedData);
    renderConsumidos(consumidosData);
    updateSummaries(entregadosGroupedData, consumidosData);
  } catch (error) {
    console.error('Error al cargar datos de Tránsito:', error.message);
    showSuccessMessage('Error al cargar registros: ' + error.message, false);
  }
}

function showSuccessMessage(message, isSuccess = true) {
  if (!successModal || !successIcon || !successMessage) {
    console.warn('Modal de mensaje no encontrado, usando alert');
    alert(message);
    return;
  }
  successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
  const modalContent = successModal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.className = `modal-content success-message-container ${isSuccess ? 'success' : 'error'}`;
  }
  successIcon.className = `fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
  successMessage.textContent = message;
  successModal.style.display = 'flex';
  setTimeout(() => {
    successModal.style.display = 'none';
  }, 5000);
}

function showModal(modal) {
  if (modal) {
    modal.style.display = 'flex';
  }
}

function hideModal(modal) {
  if (modal) {
    modal.style.display = 'none';
  }
}

function formatDate(dateObj) {
  if (!dateObj) return 'N/A';
  if (typeof dateObj.toDate === 'function') {
    const date = dateObj.toDate();
    return date && !isNaN(date) ? date.toLocaleDateString('es-ES') : 'N/A';
  }
  if (dateObj instanceof Date && !isNaN(dateObj)) {
    return dateObj.toLocaleDateString('es-ES');
  }
  const parsedDate = new Date(dateObj);
  return parsedDate && !isNaN(parsedDate) ? parsedDate.toLocaleDateString('es-ES') : 'N/A';
}

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function handleReturn(transitoIds, itemIndex, quantityToReturn) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    const fullName = await getUserFullName();
    const batch = writeBatch(db);

    let transitoDocId, transitoData, itemToReturn;
    for (const id of transitoIds) {
      const transitoRef = doc(db, 'transito', id);
      const transitoDoc = await getDoc(transitoRef);
      if (transitoDoc.exists()) {
        const data = transitoDoc.data();
        if (data.items[itemIndex]) {
          transitoDocId = id;
          transitoData = data;
          itemToReturn = data.items[itemIndex];
          break;
        }
      }
    }

    if (!transitoDocId || !itemToReturn) {
      throw new Error('Ítem no encontrado en Tránsito');
    }

    if (quantityToReturn < 1 || quantityToReturn > itemToReturn.cantidad) {
      throw new Error(`Cantidad inválida: debe ser entre 1 y ${itemToReturn.cantidad}`);
    }


    let updatedItems = [...transitoData.items];
    if (quantityToReturn === itemToReturn.cantidad) {
      updatedItems.splice(itemIndex, 1); 
    } else {
      updatedItems[itemIndex] = {
        ...itemToReturn,
        cantidad: itemToReturn.cantidad - quantityToReturn
      };
    }
    const newCantidad = updatedItems.reduce((sum, item) => sum + item.cantidad, 0);

    const transitoRef = doc(db, 'transito', transitoDocId);
    batch.update(transitoRef, {
      items: updatedItems,
      cantidad: newCantidad,
      fechaActualizacion: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    const transitoLogRef = doc(collection(db, 'transito', transitoDocId, 'logs'));
    batch.set(transitoLogRef, {
      action: 'modified',
      details: `Devueltas ${quantityToReturn} unidades del ítem con lote "${itemToReturn.lote}" a Mantenedor`,
      timestamp: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    const mantenedorQuery = query(
      collection(db, 'mantenedor'),
      where('referencia', '==', transitoData.referencia)
    );
    const mantenedorSnapshot = await getDocs(mantenedorQuery);
    if (mantenedorSnapshot.empty) {
      throw new Error(`No se encontró un mantenedor para la referencia ${transitoData.referencia}`);
    }

    const mantenedorDoc = mantenedorSnapshot.docs[0];
    const mantenedorRef = doc(db, 'mantenedor', mantenedorDoc.id);
    const mantenedorData = mantenedorDoc.data();

    let mantenedorItems = [...(mantenedorData.items || [])];
    const existingItemIndex = mantenedorItems.findIndex(
      item => item.lote === itemToReturn.lote && item.fechaVencimiento === itemToReturn.fechaVencimiento
    );
    if (existingItemIndex !== -1) {
      mantenedorItems[existingItemIndex] = {
        ...mantenedorItems[existingItemIndex],
        cantidad: mantenedorItems[existingItemIndex].cantidad + quantityToReturn,
        entregado: false
      };
    } else {
      mantenedorItems.push({
        lote: itemToReturn.lote,
        fechaVencimiento: itemToReturn.fechaVencimiento,
        cantidad: quantityToReturn,
        entregado: false
      });
    }
    const mantenedorCantidad = mantenedorItems.reduce((sum, item) => sum + (item.entregado ? 0 : item.cantidad), 0);
    const mantenedorPrecioTotal = (mantenedorData.precio || 0) * mantenedorCantidad;

    batch.update(mantenedorRef, {
      items: mantenedorItems,
      cantidad: mantenedorCantidad,
      precioTotal: mantenedorPrecioTotal
    });

    const mantenedorLogRef = doc(collection(db, 'mantenedor', mantenedorDoc.id, 'logs'));
    batch.set(mantenedorLogRef, {
      action: 'modified',
      details: `Recibidas ${quantityToReturn} unidades del ítem con lote "${itemToReturn.lote}" desde Tránsito`,
      timestamp: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    await batch.commit();

    showSuccessMessage(`${quantityToReturn} unidades devueltas a Mantenedor`);
    await loadTransito(); 
  } catch (error) {
    console.error('Error al procesar devolución:', error);
    showSuccessMessage('Error al devolver ítem: ' + error.message, false);
  }
}

function renderEntregados(data) {
  entregadosTableBody.innerHTML = '';
  data.forEach(item => {
    const row = document.createElement('tr');
    const fecha = formatDate(item.fechaActualizacion);
    row.innerHTML = `
      <td class="referencia" data-id="${item.docIds.join(',')}">${item.referencia || 'N/A'}</td>
      <td>${item.codigo || 'N/A'}</td>
      <td>${item.descripcion || 'N/A'}</td>
      <td>${item.proveedor || 'N/A'}</td>
      <td>${item.cantidad || 0}</td>
      <td>${fecha}</td>
    `;
    row.classList.add('expandable');
    entregadosTableBody.appendChild(row);

    const detailRow = document.createElement('tr');
    detailRow.className = 'item-details';
    detailRow.style.display = 'none';
    detailRow.innerHTML = `
      <td colspan="6">
        <table class="sub-table-details">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Fecha de Vencimiento</th>
              <th>Cantidad</th>
              <th>Entregado</th>
              <th>Fecha de Traspaso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${item.items && item.items.length > 0 ? item.items.map((subItem, index) => `
              <tr>
                <td>${subItem.lote || 'N/A'}</td>
                <td>${formatDate(subItem.fechaVencimiento)}</td>
                <td>${subItem.cantidad || 0}</td>
                <td>${subItem.entregado ? 'Sí' : 'No'}</td>
                <td>${formatDate(subItem.fechaTraspaso)}</td>
                <td>
                  <button class="paciente-btn" data-transito-ids="${item.docIds.join(',')}" data-item-index="${index}">Paciente</button>
                  <button class="traspasar-btn" data-transito-ids="${item.docIds.join(',')}" data-item-index="${index}">Traspasar</button>
                  <button class="devolucion-btn" data-transito-ids="${item.docIds.join(',')}" data-item-index="${index}">Devolución</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="6">No hay ítems registrados</td></tr>'}
          </tbody>
        </table>
      </td>
    `;
    entregadosTableBody.appendChild(detailRow);

    row.addEventListener('click', () => {
      detailRow.style.display = detailRow.style.display === 'none' ? 'table-row' : 'none';
    });
  });

  document.querySelectorAll('.paciente-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const transitoIds = btn.dataset.transitoIds.split(',');
      const itemIndex = parseInt(btn.dataset.itemIndex);
      showSuccessMessage('Funcionalidad Paciente no implementada aún', false);
    });
  });

  document.querySelectorAll('.traspasar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const transitoIds = btn.dataset.transitoIds.split(',');
      const itemIndex = parseInt(btn.dataset.itemIndex);
      showSuccessMessage('Funcionalidad Traspasar no implementada aún', false);
    });
  });

  document.querySelectorAll('.devolucion-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const transitoIds = btn.dataset.transitoIds.split(',');
      const itemIndex = parseInt(btn.dataset.itemIndex);

      let transitoData, itemToReturn;
      for (const id of transitoIds) {
        const transitoRef = doc(db, 'transito', id);
        const transitoDoc = await getDoc(transitoRef);
        if (transitoDoc.exists()) {
          const data = transitoDoc.data();
          if (data.items[itemIndex]) {
            transitoData = data;
            itemToReturn = data.items[itemIndex];
            break;
          }
        }
      }

      if (!itemToReturn) {
        showSuccessMessage('Error: Ítem no encontrado', false);
        return;
      }

      returnDetails.textContent = `Referencia: ${transitoData.referencia || 'N/A'}, Lote: ${itemToReturn.lote || 'N/A'}, Fecha de Vencimiento: ${formatDate(itemToReturn.fechaVencimiento)}, Cantidad Disponible: ${itemToReturn.cantidad || 0}`;
      returnQuantity.value = 1;
      returnQuantity.max = itemToReturn.cantidad;
      returnQuantity.min = 1;
      showModal(returnModal);

      confirmReturnBtn.onclick = async () => {
        const quantity = parseInt(returnQuantity.value);
        if (quantity >= 1 && quantity <= itemToReturn.cantidad) {
          await handleReturn(transitoIds, itemIndex, quantity);
          hideModal(returnModal);
        } else {
          showSuccessMessage(`La cantidad debe estar entre 1 y ${itemToReturn.cantidad}`, false);
        }
      };
      cancelReturnBtn.onclick = () => hideModal(returnModal);
    });
  });
}

function renderConsumidos(data) {
  consumidosTableBody.innerHTML = '';
  data.forEach(item => {
    item.items.forEach(subItem => {
      const fecha = formatDate(subItem.fechaVencimiento);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.referencia || 'N/A'}</td>
        <td>${item.codigo || 'N/A'}</td>
        <td>${item.descripcion || 'N/A'}</td>
        <td>${item.proveedor || 'N/A'}</td>
        <td>${subItem.cantidad || 0}</td>
        <td>${fecha}</td>
      `;
      consumidosTableBody.appendChild(row);
    });
  });
}

function updateSummaries(entregadosData, consumidosData) {
  const entregadosTotal = entregadosData.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  const consumidosTotal = consumidosData.reduce((sum, item) => 
    sum + (item.items ? item.items.reduce((subSum, subItem) => subSum + (subItem.cantidad || 0), 0) : 0), 0);
  entregadosSummary.textContent = `Total: ${entregadosTotal} unidades`;
  consumidosSummary.textContent = `Total: ${consumidosTotal} unidades`;
}

async function init() {
  const container = document.querySelector('.transito-container');
  if (!container) {
    console.error('Contenedor .transito-container no encontrado');
    return;
  }

  await configurePersistence();

  try {
    const user = await new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          console.warn('No se encontró usuario autenticado');
          resolve(null);
        }
      }, (error) => {
        console.error('Error en onAuthStateChanged:', error);
        reject(error);
      });
    });

    if (!user) {
      container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión nuevamente.</p>';
      setTimeout(() => {
        window.location.href = 'index.html?error=403';
      }, 2000);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    let userData = { role: '', permissions: [] };
    if (userDoc.exists()) {
      userData = userDoc.data();
    } else {
      console.warn('Documento de usuario no encontrado para UID:', user.uid);
    }

    const hasAccess = userData.role === 'Administrador' || (userData?.permissions && userData.permissions.includes('Implantes:Transito'));
    if (!hasAccess) {
      console.error('Usuario sin permisos para Implantes:Transito');
      container.innerHTML = '<p>Acceso no autorizado.</p>';
      return;
    }

    await loadTransito();
  } catch (error) {
    console.error('Error en init:', error);
    container.innerHTML = `<p>Error al inicializar la aplicación: ${error.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => init(), 1);
}