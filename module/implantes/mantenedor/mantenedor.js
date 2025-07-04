import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, where, getDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import * as XLSX from 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

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
  }
}

const referenciaInput = document.getElementById('referencia');
const codigoInput = document.getElementById('codigo');
const descripcionInput = document.getElementById('descripcion');
const precioInput = document.getElementById('precio');
const proveedorInput = document.getElementById('proveedor');
const registrarBtn = document.getElementById('registrar-btn');
const referenciaSuggestions = document.getElementById('referencia-suggestions');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const deliveryModal = document.getElementById('delivery-modal');
const deliveryDetails = document.getElementById('delivery-details');
const deliveryQuantity = document.getElementById('delivery-quantity');
const confirmDeliveryBtn = document.getElementById('confirm-delivery-btn');
const cancelDeliveryBtn = document.getElementById('cancel-delivery-btn');
const mantenedorTableBody = document.querySelector('#mantenedor-table tbody');
const tableContainer = document.getElementById('table-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
const logModal = document.getElementById('log-modal');
const logContent = document.getElementById('log-content');
const closeLogBtn = document.getElementById('close-log-btn');
const totalSumElement = document.getElementById('total-sum');

let currentPage = 1;
const recordsPerPage = 50;
let lastVisible = null;
let firstVisible = null;
let totalPages = 1;
let mantenedores = [];
let currentEditId = null;
let filters = {};
let lastMantenedorId = 0;
let expandedRows = new Set();
let referenciasCache = null;
let scanner = null;

function formatPrice(number) {
  if (!number && number !== 0) return '';
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^0-9]/g, '');
  return parseInt(cleaned) || 0;
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

async function checkDuplicate(referencia, excludeDocId = null) {
  const mantenedoresCollection = collection(db, 'mantenedor');
  const refQuery = query(mantenedoresCollection, where('referencia', '==', referencia));
  const querySnapshot = await getDocs(refQuery);
  if (!querySnapshot.empty) {
    const existingDoc = querySnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isExists: true, field: 'referencia', value: referencia };
  }
  return { isExists: false };
}

async function getNextMantenedorId() {
  if (lastMantenedorId > 0) {
    lastMantenedorId++;
    return lastMantenedorId.toString().padStart(6, '0');
  }
  const mantenedoresCollection = collection(db, 'mantenedor');
  const queryRef = query(mantenedoresCollection, orderBy('mantenedorId', 'desc'), limit(1));
  const querySnapshot = await getDocs(queryRef);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastMantenedor = querySnapshot.docs[0].data();
    nextId = parseInt(lastMantenedor.mantenedorId || 0) + 1;
  }
  lastMantenedorId = nextId;
  return nextId.toString().padStart(6, '0');
}

async function getNextTransitoId() {
  const transitoCollection = collection(db, 'transito');
  const queryRef = query(transitoCollection, orderBy('transitoId', 'desc'), limit(1));
  const querySnapshot = await getDocs(queryRef);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastTransito = querySnapshot.docs[0].data();
    nextId = parseInt(lastTransito.transitoId || 0) + 1;
  }
  return nextId.toString().padStart(6, '0');
}

function showModal(modal, progressElement, percentage) {
  if (modal) {
    modal.style.display = 'flex';
    if (progressElement) {
      progressElement.textContent = `${percentage}%`;
    }
  }
}

function hideModal(modal) {
  if (modal) {
    modal.style.display = 'none';
  }
}

function showSuccessMessage(message, isSuccess = true) {
  if (!successModal || !successIcon || !successMessage) {
    console.error('Modal de éxito no encontrado');
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
  showModal(successModal);
  setTimeout(() => hideModal(successModal), 2000);
}

function addItemRow(item = { lote: '', fechaVencimiento: '', cantidad: 0, entregado: false }, container) {
  if (!container) {
    console.error('Contenedor de ítems no encontrado');
    return;
  }
  const divItem = document.createElement('div');
  divItem.className = 'item-row';
  const fechaVencimiento = item.fechaVencimiento ? new Date(item.fechaVencimiento).toISOString().split('T')[0] : '';
  divItem.innerHTML = `
    <input type="text" class="item-lote" placeholder="Lote" value="${item.lote || ''}" autocomplete="off">
    <input type="date" class="item-fecha-vencimiento" placeholder="Fecha de Vencimiento" value="${fechaVencimiento}">
    <input type="number" class="item-cantidad" placeholder="Cantidad" min="0" step="1" value="${item.cantidad || 0}" autocomplete="off">
    <button class="scan-item-btn"><i class="fas fa-qrcode"></i></button>
    <button class="remove-item-btn"><i class="fas fa-trash"></i></button>
  `;
  container.appendChild(divItem);
  divItem.querySelector('.remove-item-btn').addEventListener('click', () => divItem.remove());
  divItem.querySelector('.scan-item-btn').addEventListener('click', () => initBarcodeScanner(divItem));
}

async function initBarcodeScanner(itemRow) {
  const barcodeScannerModal = document.getElementById('barcodeScanner');
  const scannerContainer = document.getElementById('scanner-container');
  const scannerResult = document.getElementById('scanner-result');
  const closeScannerBtn = document.getElementById('close-scanner');

  if (!barcodeScannerModal || !scannerContainer || !scannerResult || !closeScannerBtn) {
    console.error('Elementos del escáner no encontrados:', { barcodeScannerModal, scannerContainer, scannerResult, closeScannerBtn });
    showSuccessMessage('Error: Configuración del escáner no encontrada', false);
    return;
  }

  try {
    console.log('Iniciando escáner de códigos...');
    // Configurar la licencia de Dynamsoft (reemplaza con tu propia licencia si es necesario)
    Dynamsoft.DBR.BarcodeReader.license = 'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==';
    showModal(barcodeScannerModal);
    scanner = await Dynamsoft.DBR.BarcodeScanner.createInstance();
    scanner.onFrameRead = results => {
      if (results.length > 0) {
        console.log('Código escaneado:', results[0]);
        const result = results[0];
        const barcodeText = result.barcodeText;
        const [lote, fecha] = barcodeText.split('|');
        itemRow.querySelector('.item-lote').value = lote || '';
        itemRow.querySelector('.item-fecha-vencimiento').value = fecha || '';
        scannerResult.textContent = `Lote: ${lote || 'N/A'}, Fecha: ${fecha || 'N/A'}`;
        scanner.hide();
        hideModal(barcodeScannerModal);
      }
    };
    await scanner.show();
  } catch (ex) {
    console.error('Error al iniciar el escáner:', ex);
    showSuccessMessage('Error al iniciar el escáner. Asegúrate de usar HTTPS y permitir el acceso a la cámara.', false);
    hideModal(barcodeScannerModal);
  }

  closeScannerBtn.addEventListener('click', async () => {
    console.log('Cerrando escáner...');
    if (scanner) {
      await scanner.hide();
      hideModal(barcodeScannerModal);
    }
  }, { once: true });
}

async function handleDelivery(mantenedorId, itemIndex, quantityToDeliver) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    const fullName = await getUserFullName();
    const mantenedorRef = doc(db, 'mantenedor', mantenedorId);
    const batch = writeBatch(db);

    const mantenedor = mantenedores.find(p => p.docId === mantenedorId);
    if (!mantenedor || !mantenedor.items[itemIndex]) {
      throw new Error('Ítem no encontrado');
    }

    const itemToDeliver = mantenedor.items[itemIndex];
    if (quantityToDeliver < 1 || quantityToDeliver > itemToDeliver.cantidad) {
      throw new Error(`Cantidad inválida: debe ser entre 1 y ${itemToDeliver.cantidad}`);
    }

    let updatedItems = [...mantenedor.items];
    if (quantityToDeliver === itemToDeliver.cantidad) {
      updatedItems = mantenedor.items.filter((_, index) => index !== itemIndex);
    } else {
      updatedItems[itemIndex] = {
        ...itemToDeliver,
        cantidad: itemToDeliver.cantidad - quantityToDeliver
      };
    }
    const cantidad = updatedItems.reduce((sum, item) => sum + (item.entregado ? 0 : item.cantidad), 0);
    const precioTotal = mantenedor.precio * cantidad;

    batch.update(mantenedorRef, {
      items: updatedItems,
      cantidad,
      precioTotal
    });

    const mantenedorLogRef = doc(collection(db, 'mantenedor', mantenedorId, 'logs'));
    batch.set(mantenedorLogRef, {
      action: 'modified',
      details: `Trasladadas ${quantityToDeliver} unidades del ítem con lote "${itemToDeliver.lote}" a Tránsito`,
      timestamp: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    const transitoQuery = query(
      collection(db, 'transito'),
      where('referencia', '==', mantenedor.referencia),
      where('estado', '==', 'Entregado')
    );
    const transitoSnapshot = await getDocs(transitoQuery);
    let transitoRef, transitoData;

    if (!transitoSnapshot.empty) {
      transitoRef = doc(db, 'transito', transitoSnapshot.docs[0].id);
      const existingTransito = transitoSnapshot.docs[0].data();
      transitoData = {
        ...existingTransito,
        items: [
          ...existingTransito.items,
          {
            lote: itemToDeliver.lote,
            fechaVencimiento: itemToDeliver.fechaVencimiento,
            cantidad: quantityToDeliver,
            entregado: true,
            fechaTraspaso: new Date()
          }
        ],
        cantidad: existingTransito.cantidad + quantityToDeliver,
        fechaActualizacion: new Date(),
        usuario: fullName,
        uid: user.uid
      };
      batch.update(transitoRef, transitoData);
    } else {
      const transitoId = await getNextTransitoId();
      transitoRef = doc(collection(db, 'transito'));
      transitoData = {
        transitoId,
        referencia: mantenedor.referencia,
        codigo: mantenedor.codigo,
        descripcion: mantenedor.descripcion,
        proveedor: mantenedor.proveedor,
        precio: mantenedor.precio,
        items: [{
          lote: itemToDeliver.lote,
          fechaVencimiento: itemToDeliver.fechaVencimiento,
          cantidad: quantityToDeliver,
          entregado: true,
          fechaTraspaso: new Date()
        }],
        cantidad: quantityToDeliver,
        estado: 'Entregado',
        fechaActualizacion: new Date(),
        usuario: fullName,
        uid: user.uid
      };
      batch.set(transitoRef, transitoData);
    }

    const transitoLogRef = doc(collection(db, 'transito', transitoRef.id, 'logs'));
    batch.set(transitoLogRef, {
      action: transitoSnapshot.empty ? 'created' : 'modified',
      details: `Recibidas ${quantityToDeliver} unidades del ítem con lote "${itemToDeliver.lote}" desde Mantenedor`,
      timestamp: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    await batch.commit();

    mantenedor.items = updatedItems;
    mantenedor.cantidad = cantidad;
    mantenedor.precioTotal = precioTotal;

    showSuccessMessage(`${quantityToDeliver} unidades trasladadas a Tránsito`);
    renderTable();
  } catch (error) {
    console.error('Error al trasladar ítem a Tránsito:', error);
    showSuccessMessage('Error al trasladar ítem: ' + error.message, false);
  }
}

async function loadReferencias() {
  if (referenciasCache) return referenciasCache;
  try {
    console.log('Cargando referencias desde Firestore...');
    const referenciasCollection = collection(db, 'referencias');
    const queryRef = query(referenciasCollection, where('estado', '==', 'Activo'));
    const querySnapshot = await getDocs(queryRef);
    referenciasCache = querySnapshot.docs.map(docData => docData.data());
    console.log('Referencias cargadas:', referenciasCache);
    return referenciasCache;
  } catch (error) {
    console.error('Error al cargar referencias:', error);
    showSuccessMessage('Error al cargar datos: ' + error.message, false);
    return [];
  }
}

async function setupReferenciaAutocomplete(inputElement, suggestionsListElement) {
  const input = inputElement instanceof HTMLElement ? inputElement : document.getElementById(inputElement);
  const suggestionsList = suggestionsListElement instanceof HTMLElement ? suggestionsListElement : document.getElementById(suggestionsListElement);
  const icon = input?.parentElement.querySelector('.icon-list');
  if (!input || !suggestionsList || !icon) {
    console.error('Elementos no encontrados para autocompletado de referencia:', { input, suggestionsList, icon });
    return;
  }

  console.log('Configurando autocompletado para:', input.id);
  const referencias = await loadReferencias();
  const referenciasFiltradas = referencias.map(r => r.referencia);

  input.addEventListener('input', () => filterAndRenderReferenciaSuggestions(input, suggestionsList, referenciasFiltradas, false));
  input.addEventListener('focus', () => {
    if (input.value.trim()) filterAndRenderReferenciaSuggestions(input, suggestionsList, referenciasFiltradas, false);
  });
  input.addEventListener('click', () => filterAndRenderReferenciaSuggestions(input, suggestionsList, referenciasFiltradas, true));

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestionsList.contains(e.target) && !icon.contains(e.target)) {
      suggestionsList.innerHTML = '';
      suggestionsList.style.display = 'none';
    }
  });

  input.addEventListener('change', () => updateFieldsFromReferencia(input));
}

function filterAndRenderReferenciaSuggestions(input, suggestionsList, referencias, showAll = false) {
  suggestionsList.innerHTML = '';
  const inputValue = input.value.trim();
  const filteredReferencias = showAll || !inputValue ? referencias : referencias.filter(ref => ref.toLowerCase().includes(inputValue.toLowerCase()));
  if (filteredReferencias.length === 0 && !showAll) {
    suggestionsList.style.display = 'none';
    return;
  }
  filteredReferencias.forEach(ref => {
    const li = document.createElement('li');
    li.textContent = ref;
    li.addEventListener('click', () => {
      input.value = ref;
      suggestionsList.innerHTML = '';
      suggestionsList.style.display = 'none';
      updateFieldsFromReferencia(input);
    });
    suggestionsList.appendChild(li);
  });
  suggestionsList.style.display = filteredReferencias.length > 0 ? 'block' : 'none';
}

async function updateFieldsFromReferencia(input) {
  try {
    const referencia = input.value.trim();
    const referencias = await loadReferencias();
    const referenciaData = referencias.find(r => r.referencia === referencia);
    if (referenciaData && input.id === 'referencia') {
      codigoInput.value = referenciaData.codigo || '';
      descripcionInput.value = referenciaData.descripcion || '';
      precioInput.value = formatPrice(referenciaData.precio) || '0';
      proveedorInput.value = referenciaData.proveedor || '';
    } else if (input.id === 'referencia') {
      codigoInput.value = '';
      descripcionInput.value = '';
      precioInput.value = '0';
      proveedorInput.value = '';
    }
    if (referenciaData && input.id === 'edit-referencia') {
      const editCodigo = document.getElementById('edit-codigo');
      const editDescripcion = document.getElementById('edit-descripcion');
      const editPrecio = document.getElementById('edit-precio');
      const editProveedor = document.getElementById('edit-proveedor');
      if (editCodigo) editCodigo.value = referenciaData.codigo || '';
      if (editDescripcion) editDescripcion.value = referenciaData.descripcion || '';
      if (editPrecio) editPrecio.value = formatPrice(referenciaData.precio) || '0';
      if (editProveedor) editProveedor.value = referenciaData.proveedor || '';
    } else if (input.id === 'edit-referencia') {
      const editCodigo = document.getElementById('edit-codigo');
      const editDescripcion = document.getElementById('edit-descripcion');
      const editPrecio = document.getElementById('edit-precio');
      const editProveedor = document.getElementById('edit-proveedor');
      if (editCodigo) editCodigo.value = '';
      if (editDescripcion) editDescripcion.value = '';
      if (editPrecio) editPrecio.value = '0';
      if (editProveedor) editProveedor.value = '';
    }
  } catch (error) {
    console.error('Error al buscar referencia:', error);
    showSuccessMessage('Error al buscar referencia: ' + error.message, false);
  }
}

async function loadMantenedores() {
  try {
    console.log('Cargando mantenedores...');
    showModal(loadingModal, loadingProgress, 0);
    const mantenedoresCollection = collection(db, 'mantenedor');
    const countSnapshot = await getDocs(mantenedoresCollection);
    const totalRecordsCount = countSnapshot.size;
    totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
    totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
    let q = query(mantenedoresCollection, orderBy('mantenedorId', 'asc'), limit(recordsPerPage));
    if (lastVisible && currentPage > 1) {
      q = query(mantenedoresCollection, orderBy('mantenedorId', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
    }
    const querySnapshot = await getDocs(q);
    mantenedores = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const cantidad = data.items ? data.items.reduce((sum, item) => sum + (item.entregado ? 0 : item.cantidad), 0) : 0;
      const precioTotal = (data.precio || 0) * cantidad;
      mantenedores.push({
        docId: docSnapshot.id,
        ...data,
        cantidad,
        precioTotal
      });
    });
    if (mantenedores.length > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      firstVisible = querySnapshot.docs[0];
    }
    renderTable();
    updatePagination();
    tableContainer.style.display = 'block';
    hideModal(loadingModal);
    console.log('Mantenedores cargados:', mantenedores);
  } catch (error) {
    console.error('Error al cargar mantenedores:', error);
    showSuccessMessage('Error al cargar registros: ' + error.message, false);
    hideModal(loadingModal);
  }
}

function updateTotalSum() {
  if (!totalSumElement) {
    console.error('Elemento #total-sum no encontrado');
    return;
  }
  const totalSum = mantenedores.reduce((sum, mantenedor) => sum + (mantenedor.precioTotal || 0), 0);
  totalSumElement.textContent = `Total General: $${formatPrice(totalSum)}`;
}

function renderTable() {
  mantenedorTableBody.innerHTML = '';
  let filteredMantenedores = [...mantenedores];
  Object.keys(filters).forEach(column => {
    if (filters[column]) {
      filteredMantenedores = filteredMantenedores.filter(mantenedor => {
        const value = mantenedor?.[column]?.toString()?.toLowerCase() || '';
        return value.includes(filters[column].toLowerCase());
      });
    }
  });

  filteredMantenedores.forEach(mantenedor => {
    const fechaCreacion = mantenedor.fechaCreacion && typeof mantenedor.fechaCreacion.toDate === 'function'
      ? mantenedor.fechaCreacion.toDate()
      : mantenedor.fechaCreacion instanceof Date
        ? mantenedor.fechaCreacion
        : null;
    const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
      ? fechaCreacion.toLocaleString('es-ES')
      : 'Sin fecha';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${mantenedor.mantenedorId || 'N/A'}</td>
      <td>
        <i class="fas fa-edit action-icon" data-id="${mantenedor.docId}" title="Editar"></i>
        <i class="fas fa-trash action-icon" data-id="${mantenedor.docId}" title="Eliminar"></i>
        <i class="fas fa-history action-icon" data-id="${mantenedor.docId}" title="Historial"></i>
      </td>
      <td><span class="referencia" data-id="${mantenedor.docId}">${mantenedor.referencia || 'N/A'}</span></td>
      <td>${mantenedor.codigo || 'N/A'}</td>
      <td>${mantenedor.descripcion || 'N/A'}</td>
      <td>${mantenedor.proveedor || 'N/A'}</td>
      <td>${mantenedor.cantidad || 0}</td>
      <td>$${formatPrice(mantenedor?.precio || 0)}</td>
      <td>$${formatPrice(mantenedor?.precioTotal || 0)}</td>
      <td>${fechaDisplay}</td>
      <td>${mantenedor?.usuario || 'N/A'}</td>
    `;
    mantenedorTableBody.appendChild(tr);

    if (expandedRows.has(mantenedor.docId)) {
      const detailRow = document.createElement('tr');
      detailRow.className = 'item-details';
      detailRow.style.display = 'table-row';
      detailRow.innerHTML = `
        <td colspan="11">
          <table>
            <thead>
              <tr>
                <th>Lote</th>
                <th>Fecha de Vencimiento</th>
                <th>Cantidad</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              ${mantenedor.items && mantenedor.items.length > 0 ? mantenedor.items.map((item, index) => `
                <tr>
                  <td>${item?.lote || 'N/A'}</td>
                  <td>${item?.fechaVencimiento ? formatDate(item.fechaVencimiento) : 'N/A'}</td>
                  <td>${item?.cantidad || '0'}</td>
                  <td>
                    <button class="entregar-item-btn" data-mantenedor-id="${mantenedor.docId}" data-item-index="${index}" ${item?.entregado ? 'disabled' : ''}>
                      ${item?.entregado ? 'Entregado' : 'Entregar'}
                    </button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="4">No hay ítems registrados</td></tr>'}
            </tbody>
          </table>
        </td>
      `;
      mantenedorTableBody.appendChild(detailRow);
    }
  });

  document.querySelectorAll('.entregar-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mantenedorId = btn.dataset.mantenedorId;
      const itemIndex = parseInt(btn.dataset.itemIndex);
      const mantenedor = mantenedores.find(m => m.docId === mantenedorId);
      const item = mantenedor?.items?.[itemIndex];
      if (item) {
        deliveryDetails.textContent = `Lote: ${item.lote || 'N/A'}, Fecha de Vencimiento: ${formatDate(item.fechaVencimiento)}, Cantidad Disponible: ${item.cantidad || 0}`;
        deliveryQuantity.value = 1;
        deliveryQuantity.max = item.cantidad;
        deliveryQuantity.min = '1';
        showModal(deliveryModal);
        confirmDeliveryBtn.onclick = () => {
          const quantity = parseInt(deliveryQuantity.value);
          if (quantity >= 1 && quantity <= item.cantidad) {
            handleDelivery(mantenedorId, itemIndex, quantity);
            hideModal(deliveryModal);
          } else {
            showSuccessMessage(`La cantidad debe estar entre 1 y ${item.cantidad}`, false);
          }
        };
        cancelDeliveryBtn.onclick = () => hideModal(deliveryModal);
      }
    });
  });

  document.querySelectorAll('.filter-icon').forEach(icon => {
    const column = icon.dataset.column;
    if (filters[column]) {
      icon.classList.remove('fa-filter');
      icon.classList.add('fa-filter-circle-x', 'active');
    } else {
      icon.classList.remove('fa-filter-circle-x', 'active');
      icon.classList.add('fa-filter');
    }
  });

  updateTotalSum();
}

function updatePagination() {
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

async function loadLogs(mantenedorId) {
  try {
    console.log('Cargando logs para mantenedor:', mantenedorId);
    const logsCollection = collection(db, 'mantenedor', mantenedorId, 'logs');
    const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
    const logsSnapshot = await getDocs(logsQuery);
    logContent.innerHTML = '';
    if (logsSnapshot.empty) {
      logContent.innerHTML = '<p>No hay registros de cambios.</p>';
    } else {
      logsSnapshot.forEach(docSnapshot => {
        const data = docSnapshot.data();
        const timestamp = data.timestamp && typeof data.timestamp.toDate === 'function'
          ? data.timestamp.toDate()
          : data.timestamp instanceof Date
            ? data.timestamp
            : null;
        const fechaDisplay = timestamp && !isNaN(timestamp)
          ? timestamp.toLocaleString('es-ES')
          : 'Sin fecha';
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
          <strong>${data.action === 'created' ? 'Creado' : data.action === 'modified' ? 'Modificado' : 'Eliminado'}</strong>: 
          ${data.details || 'Sin detalles'}<br>
          <small>Fecha: ${fechaDisplay} | usuario: ${data?.usuario || 'N/A'}</small>
        `;
        logContent.appendChild(logEntry);
      });
    }
    showModal(logModal);
  } catch (error) {
    console.error('Error al cargar logs:', error);
    showSuccessMessage('Error al cargar historial: ' + error.message, false);
  }
}

function openEditModal(mantenedor) {
  currentEditId = mantenedor.docId;
  const modalContent = editModal.querySelector('.modal-content');
  modalContent.innerHTML = `
    <h2>Editar Registro</h2>
    <div class="edit-form-container">
      <div class="edit-form-grid">
        <div class="form-group">
          <label for="edit-referencia">Referencia</label>
          <div class="input-with-icon">
            <input type="text" id="edit-referencia" value="${mantenedor?.referencia || ''}" autocomplete="off">
            <i class="fas fa-list icon-list"></i>
          </div>
          <ul id="edit-referencia-suggestions" class="suggestions-list"></ul>
        </div>
        <div class="form-group">
          <label for="edit-codigo">Código</label>
          <input type="text" id="edit-codigo" value="${mantenedor?.codigo || ''}" readonly>
        </div>
        <div class="form-group">
          <label for="edit-descripcion">Descripción</label>
          <input type="text" id="edit-descripcion" value="${mantenedor?.descripcion || ''}" readonly>
        </div>
        <div class="form-group">
          <label for="edit-proveedor">Proveedor</label>
          <input type="text" id="edit-proveedor" value="${mantenedor?.proveedor || ''}" readonly>
        </div>
        <div class="form-group">
          <label for="edit-precio">Precio</label>
          <input type="text" id="edit-precio" value="${formatPrice(mantenedor?.precio || 0)}" readonly>
        </div>
        <div class="form-group">
          <label for="edit-precio-total">Total</label>
          <input type="text" id="edit-precio-total" value="${formatPrice(mantenedor?.precioTotal || 0)}" readonly>
        </div>
        <div class="form-group">
          <label>Estado</label>
          <div class="estado-container">
            <label>
              <input type="radio" id="edit-estado-activo" name="estado" value="Activo" ${mantenedor?.estado === 'Activo' ? 'checked' : ''}>
              Activo
            </label>
            <label>
              <input type="radio" id="edit-estado-inactivo" name="estado" value="Inactivo" ${mantenedor?.estado === 'Inactivo' ? 'checked' : ''}>
              Inactivo
            </label>
          </div>
        </div>
      </div>
      <hr class="divider">
      <h3>Ítems</h3>
      <div id="items-container"></div>
      <button id="add-item-btn">Agregar Ítem</button>
      <div class="modal-buttons">
        <button id="save-edit-btn">Guardar</button>
        <button id="cancel-edit-btn">Cancelar</button>
      </div>
    </div>
    <div id="barcodeScanner" class="modal" style="display: none;">
      <div class="modal-content">
        <div id="scanner-container"></div>
        <div>Resultado: <span id="scanner-result">N/A</span></div>
        <button id="close-scanner">Cerrar Escáner</button>
      </div>
    </div>
  `;

  const itemsContainer = modalContent.querySelector('#items-container');
  const addItemBtn = modalContent.querySelector('#add-item-btn');
  const saveEditBtn = modalContent.querySelector('#save-edit-btn');
  const cancelEditBtn = modalContent.querySelector('#cancel-edit-btn');

  if (mantenedor?.items && mantenedor.items.length > 0) {
    mantenedor.items.forEach(item => addItemRow(item, itemsContainer));
  } else {
    addItemRow({}, itemsContainer);
  }

  setupReferenciaAutocomplete('edit-referencia', 'edit-referencia-suggestions');

  addItemBtn.addEventListener('click', () => addItemRow({}, itemsContainer));

  saveEditBtn.addEventListener('click', async () => {
    try {
      const referencia = modalContent.querySelector('#edit-referencia')?.value?.trim() || '';
      const codigo = modalContent.querySelector('#edit-codigo')?.value?.trim() || '';
      const descripcion = modalContent.querySelector('#edit-descripcion')?.value?.trim() || '';
      const proveedor = modalContent.querySelector('#edit-proveedor')?.value?.trim() || '';
      const precio = parsePrice(modalContent.querySelector('#edit-precio')?.value || '0');
      const items = Array.from(itemsContainer?.querySelectorAll('.item-row') || []).map(row => ({
        lote: row.querySelector('.item-lote')?.value?.trim() || '',
        fechaVencimiento: row.querySelector('.item-fecha-vencimiento')?.value || '',
        cantidad: parseInt(row.querySelector('.item-cantidad')?.value || 0) || 0,
        entregado: false
      })).filter(item => item.lote && item.fechaVencimiento && item.cantidad > 0);
      const cantidad = items.reduce((sum, item) => sum + (item?.entregado ? 0 : item.cantidad), 0);
      const precioTotal = precio * cantidad;

      if (!referencia || !codigo || !descripcion || !proveedor || precio <= 0 || items.length === 0) {
        showSuccessMessage('Por favor, completa todos los campos correctamente', false);
        return;
      }

      const duplicateCheck = await checkDuplicate(referencia, currentEditId);
      if (duplicateCheck.isExists) {
        showSuccessMessage(`Error: Ya existe un registro con la referencia "${duplicateCheck.value}"`, false);
        return;
      }

      const referencias = await loadReferencias();
      const refData = referencias.find(p => p.referencia === referencia);
      if (!refData) {
        showSuccessMessage('Error: La referencia ingresada no está registrada o no está activa', false);
        return;
      }

      const userRef = auth.currentUser;
      if (!userRef) throw new Error('Usuario no válido');
      const fullName = await getUserFullName();
      const mantenedorRef = doc(db, 'mantenedor', currentEditId);
      const currentMantent = mantenedores.find(p => p.docId === currentEditId);
      const mantenedorData = {
        mantenedorId: currentMantent?.mantenedorId || '',
        referencia,
        codigo,
        descripcion,
        precio,
        proveedor,
        items,
        cantidad,
        precioTotal,
        estado: modalContent.querySelector('#edit-estado-activo')?.checked ? 'Activo' : 'Inactivo',
        usuario: fullName || 'Desconocido',
        uid: userRef?.uid || '',
        fechaCreacion: currentMantent?.fechaCreacion || null,
        fechaActualizacion: new Date()
      };

      const batch = writeBatch(db);
      batch.update(mantenedorRef, mantenedorData);
      const logRef = doc(collection(db, 'mantenedor', currentEditId, 'logs'));
      batch.set(logRef, {
        action: 'modified',
        details: `Registro "${referencia}" modificado`,
        timestamp: new Date(),
        usuario: fullName || 'Desconocido',
        uid: userRef?.uid || ''
      });

      await batch.commit();
      showSuccessMessage('Registro actualizado exitosamente');
      hideModal(editModal);
      const index = mantenedores.findIndex(p => p.docId === currentEditId);
      mantenedores[index] = { docId: currentEditId, ...mantenedorData };
      renderTable();
    } catch (error) {
      console.error('Error al actualizar registro:', error);
      showSuccessMessage('Error al actualizar registro: ' + error.message, false);
    }
  });

  cancelEditBtn.addEventListener('click', () => {
    hideModal(editModal);
    itemsContainer.innerHTML = '';
  });

  showModal(editModal);
}

async function exportToExcel() {
  console.log('Exportando a Excel...');
  const exportData = mantenedores.map(m => ({
    ID: m?.mantenedorId || 'N/A',
    Referencia: m?.referencia || 'N/A',
    Código: m?.codigo || 'N/A',
    Descripción: m?.descripcion || 'N/A',
    Proveedor: m?.proveedor || 'N/A',
    Cantidad: m?.cantidad || 0,
    Precio: formatPrice(m?.precio || 0),
    Total: formatPrice(m?.precioTotal || 0),
    Estado: m?.estado || 'Activo',
    'Fecha Creación': m?.fechaCreacion && typeof m?.fechaCreacion?.toDate === 'function'
      ? m.fechaCreacion.toDate().toLocaleString('es-ES')
      : m?.fechaCreacion instanceof Date
        ? m.fechaCreacion.toLocaleString('es-ES')
        : 'Sin fecha',
    usuario: m?.usuario || 'N/A',
    Ítems: m.items && m?.items?.length > 0
      ? m.items.map(item => `Lote: ${item?.lote || 'N/A'}, Fecha Venc.: ${item?.fechaVencimiento ? new Date(item.fechaVencimiento)?.toLocaleDateString('es-ES') : 'N/A'}, Cantidad: ${item?.cantidad || 0}, Entregado: ${item?.entregado ? 'Sí' : 'No'}`).join('; ')
      : 'No hay ítems registrados'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mantenedor');
  XLSX.writeFile(workbook, 'mantenedor.xlsx');
}

async function updateAllRecordsFromReferencias() {
  try {
    console.log('Actualizando registros desde referencias...');
    const referencias = await loadReferencias();
    const mantenedoresCollection = collection(db, 'mantenedor');
    const querySnapshot = await getDocs(mantenedoresCollection);
    const batch = writeBatch(db);
    let updatedCount = 0;

    querySnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const refData = referencias.find(ref => ref.referencia === data.referencia);
      if (refData) {
        const cantidad = data.items ? data.items.reduce((sum, item) => sum + (item.entregado ? 0 : item.cantidad), 0) : 0;
        const precioTotal = (refData?.precio || 0) * cantidad;
        const updatedItems = data?.items ? data.items.map(item => ({
          lote: item?.lote || '',
          fechaVencimiento: item?.fechaVencimiento || '',
          cantidad: item?.cantidad || 0,
          entregado: item?.entregado || false
        })) : [];
        const needsUpdate = data.codigo !== refData?.codigo ||
          data.descripcion !== refData?.descripcion ||
          data.price !== refData?.precio ||
          data.proveedor !== refData?.proveedor ||
          data.precioTotal !== precioTotal ||
          JSON.stringify(data?.items) !== JSON.stringify(updatedItems);
        if (needsUpdate) {
          batch.update(docSnapshot.ref, {
            codigo: refData.codigo || '',
            descripcion: refData.descripcion || '',
            precio: refData.precio || 0,
            proveedor: refData.proveedor || '',
            items: updatedItems,
            cantidad,
            precioTotal
          });
          const logRef = doc(collection(db, 'mantenedor', docSnapshot.id, 'logs'));
          batch.set(logRef, {
            action: 'modified',
            details: `Registro "${data?.referencia || 'N/A'}" actualizado desde referencias`,
            timestamp: new Date(),
            usuario: 'Sistema',
            uid: 'system'
          });
          updatedCount++;
          const index = mantenedores.findIndex(p => p.docId === docSnapshot.id);
          if (index !== -1) {
            mantenedores[index] = {
              ...mantenedores[index],
              codigo: refData.codigo || '',
              descripcion: refData.descripcion || '',
              precio: refData.precio || 0,
              proveedor: refData.proveedor || '',
              items: updatedItems,
              cantidad,
              precioTotal
            };
          }
        }
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      renderTable();
      showSuccessMessage(`Se actualizaron ${updatedCount} registros desde referencias`);
    }
    console.log('Actualización de referencias completada, registros actualizados:', updatedCount);
  } catch (error) {
    console.error('Error al actualizar registros:', error);
    showSuccessMessage('Error al actualizar registros: ' + error.message, false);
  }
}

async function init() {
  const container = document.querySelector('.mantenedor-container');
  if (!container) {
    console.error('Contenedor .mantenedor-container no encontrado');
    return;
  }

  console.log('Iniciando aplicación...');
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

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      console.error('Documento de usuario no encontrado:', user.uid);
      container.innerHTML = '<p>Error: Tu cuenta no está registrada en el sistema. Contacte al administrador.</p>';
      return;
    }

    const userData = userDoc.data();
    const hasAccess = userData.role === 'Administrador' || (userData?.permissions && userData.permissions.includes('Implantes:Mantenedor'));
    if (!hasAccess) {
      console.error('Usuario sin permisos para Implantes:Mantenedor');
      container.innerHTML = '<p>Acceso no autorizado.</p>';
      return;
    }

    console.log('Usuario autenticado con permisos, cargando datos...');
    await setupReferenciaAutocomplete('referencia', 'referencia-suggestions');
    await loadMantenedores();
    await updateAllRecordsFromReferencias();

    registrarBtn.addEventListener('click', async () => {
      const referencia = referenciaInput?.value?.trim() || '';
      const codigo = codigoInput?.value?.trim() || '';
      const descripcion = descripcionInput?.value?.trim() || '';
      const precio = parsePrice(precioInput?.value || '0');
      const proveedor = proveedorInput?.value?.trim() || '';

      if (!referencia || !codigo || !descripcion || !proveedor || precio <= 0) {
        showSuccessMessage('Por favor, completa todos los campos', false);
        return;
      }

      try {
        console.log('Registrando nuevo mantenedor:', referencia);
        showModal(registerModal, registerProgress, 0);
        const duplicateCheck = await checkDuplicate(referencia);
        if (duplicateCheck.isExists) {
          showSuccessMessage(`Error: Ya existe el registro con la referencia "${duplicateCheck.value}"`, false);
          hideModal(registerModal);
          return;
        }

        const referencias = await loadReferencias();
        const refData = referencias.find(m => m.referencia === referencia);
        if (!refData) {
          showSuccessMessage('Error: La referencia no está registrada o no está activa', false);
          hideModal(registerModal);
          return;
        }

        const userRef = auth.currentUser;
        if (!userRef) throw new Error('Usuario no válido');
        const fullName = await getUserFullName();
        const mantenedorId = await getNextMantenedorId();
        const fechaCreacion = new Date();

        const mantenedorRef = doc(collection(db, 'mantenedor'));
        const mantenedorData = {
          mantenedorId,
          referencia,
          codigo,
          descripcion,
          precio,
          proveedor,
          items: [],
          cantidad: 0,
          precioTotal: 0,
          estado: 'Activo',
          fechaCreacion,
          usuario: fullName || 'Desconocido',
          uid: userRef?.uid || ''
        };

        const batch = writeBatch(db);
        batch.set(mantenedorRef, mantenedorData);
        const logRef = doc(collection(db, 'mantenedor', mantenedorRef.id, 'logs'));
        batch.set(logRef, {
          action: 'created',
          details: `Registro "${referencia}" creado`,
          timestamp: new Date(),
          usuario: fullName,
          uid: userRef?.uid || ''
        });

        await batch.commit();
        showSuccessMessage('Registro creado exitosamente');
        hideModal(registerModal);
        referenciaInput.value = '';
        codigoInput.value = '';
        descripcionInput.value = '';
        precioInput.value = '';
        proveedorInput.value = '';
        mantenedores.push({ docId: mantenedorRef.id, ...mantenedorData });
        renderTable();
        console.log('Mantenedor registrado:', mantenedorData);
      } catch (error) {
        console.error('Error al registrar:', error);
        showSuccessMessage('Error al registrar el registro: ' + error.message, false);
        hideModal(registerModal);
      }
    });

    prevBtn.addEventListener('click', async () => {
      if (currentPage > 1) {
        currentPage--;
        await loadMantenedores();
      }
    });

    nextBtn.addEventListener('click', async () => {
      if (currentPage < totalPages) {
        currentPage++;
        await loadMantenedores();
      }
    });

    exportExcelBtn.addEventListener('click', exportToExcel);

    closeLogBtn.addEventListener('click', () => {
      hideModal(logModal);
    });

    cancelDeleteBtn.addEventListener('click', () => {
      hideModal(deleteModal);
    });

    document.querySelectorAll('.filter-icon').forEach(button => {
      button.addEventListener('click', e => {
        const column = e.target.dataset.column;
        if (filters[column]) {
          delete filters[column];
          renderTable();
          return;
        }
        const existingInput = document.querySelector('.mant-row-input-container');
        if (existingInput) existingInput.remove();
        const inputContainer = document.createElement('div');
        inputContainer.className = 'mant-row-input-container';
        inputContainer.innerHTML = `<input type="text" placeholder="Filtrar por ${column}" autocomplete="off">`;
        e.target.parentElement.appendChild(inputContainer);
        const input = inputContainer.querySelector('input');
        input.focus();
        input.addEventListener('input', ev => {
          filters[column] = ev.target.value;
          renderTable();
        });
        input.addEventListener('blur', () => {
          if (!input.value) {
            delete filters[column];
            renderTable();
            inputContainer.remove();
          }
        });
      });
    });

    mantenedorTableBody.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      if (!id) return;

      if (e.target.classList.contains('fa-edit')) {
        const mantenedor = mantenedores.find(p => p.docId === id);
        if (mantenedor) openEditModal(mantenedor);
      } else if (e.target.classList.contains('fa-trash')) {
        const mantenedor = mantenedores.find(p => p.docId === id);
        if (mantenedor) {
          deleteMessage.textContent = `¿Estás seguro de que deseas eliminar el registro "${mantenedor?.referencia || 'N/A'}"?`;
          showModal(deleteModal);
          confirmDeleteBtn.onclick = async () => {
            try {
              const userRef = auth.currentUser;
              if (!userRef) throw new Error('Usuario no válido');
              const fullName = await getUserFullName();
              const batch = writeBatch(db);
              batch.delete(doc(db, 'mantenedor', id));
              const logRef = doc(collection(db, 'mantenedor', id, 'logs'));
              batch.set(logRef, {
                action: 'deleted',
                details: `Registro "${mantenedor?.referencia || 'N/A'}" eliminado`,
                timestamp: new Date(),
                usuario: fullName || ' ',
                uid: userRef?.uid || ''
              });
              await batch.commit();
              showSuccessMessage('Registro eliminado exitosamente');
              hideModal(deleteModal);
              mantenedores = mantenedores.filter(p => p.docId !== id);
              renderTable();
              const countSnapshot = await getDocs(collection(db, 'mantenedor'));
              totalPages = Math.ceil(countSnapshot.size / recordsPerPage);
              totalRecords.textContent = `Total de registros: ${countSnapshot.size}`;
              updatePagination();
            } catch (error) {
              console.error('Error al eliminar:', error);
              showSuccessMessage('Error al eliminar registro: ' + error.message, false);
              hideModal(deleteModal);
            }
          };
        }
      } else if (e.target.classList.contains('fa-history')) {
        await loadLogs(id);
      } else if (e.target.classList.contains('referencia')) {
        const mantenedorId = e.target.dataset.id;
        if (expandedRows.has(mantenedorId)) {
          expandedRows.delete(mantenedorId);
        } else {
          expandedRows.add(mantenedorId);
        }
        renderTable();
      }
    });

  } catch (error) {
    console.error('Error en init:', error);
    container.innerHTML = `<p>Error al inicializar la aplicación: ${error.message}</p>`;
    showSuccessMessage('Error al inicializar la aplicación: ' + error.message, false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM cargado, iniciando aplicación...');
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => {
    console.log('Iniciando aplicación con timeout...');
    init();
  }, 100);
}