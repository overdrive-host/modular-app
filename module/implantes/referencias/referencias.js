import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, getDoc, writeBatch, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmAf-vi7PhzzQkPZh89q9p3Mz4vGGPtd0",
  authDomain: "modular-app-387da.firebaseapp.com",
  projectId: "modular-app-387da",
  storageBucket: "modular-app-387da.firebasestorage.app",
  messagingSenderId: "271561966774",
  appId: "1:271561966774:web:e197c00e2abd67b4f0d217",
  measurementId: "G-7YT6MMR47X"
};

try {
    let app;
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    setPersistence(auth, browserLocalPersistence).catch(error => {
        console.error('Error al configurar persistencia:', error);
    });

    const container = document.querySelector('.referencias-container');
    const newTab = document.querySelector('input[name="form-type"][value="new"]');
    const existingTab = document.querySelector('input[name="form-type"][value="existing"]');
    const newCodeForm = document.getElementById('new-code-form');
    const existingCodeForm = document.getElementById('existing-code-form');
    const referenciaInput = document.getElementById('referencia');
    const detallesInput = document.getElementById('detalles');
    const precioInput = document.getElementById('precio');
    const codigoInput = document.getElementById('codigo');
    const proveedorInput = document.getElementById('proveedor');
    const proveedorSearch = document.getElementById('proveedor-search');
    const proveedorList = document.getElementById('proveedor-list');
    const modalidadSelect = document.getElementById('modalidad');
    const categoriaSelect = document.getElementById('categoria');
    const estadoSelect = document.getElementById('estado');
    const descripcionInput = document.getElementById('descripcion');
    const registrarBtn = document.getElementById('registrar-btn');
    const existReferenciaInput = document.getElementById('exist-referencia');
    const existDescripcionInput = document.getElementById('exist-descripcion');
    const existPrecioInput = document.getElementById('exist-precio');
    const existCodigoInput = document.getElementById('exist-codigo');
    const existProveedorInput = document.getElementById('exist-proveedor');
    const existProveedorSearch = document.getElementById('exist-proveedor-search');
    const existProveedorList = document.getElementById('exist-proveedor-list');
    const existModalidadSelect = document.getElementById('exist-modalidad');
    const existCategoriaSelect = document.getElementById('exist-categoria');
    const existEstadoSelect = document.getElementById('exist-estado');
    const existRegistrarBtn = document.getElementById('exist-registrar-btn');
    const registerModal = document.getElementById('register-modal');
    const registerProgress = document.getElementById('register-progress');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const editModal = document.getElementById('edit-modal');
    const editReferenciaInput = document.getElementById('edit-referencia');
    const editDescripcionInput = document.getElementById('edit-descripcion');
    const editPrecioInput = document.getElementById('edit-precio');
    const editCodigoInput = document.getElementById('edit-codigo');
    const editProveedorInput = document.getElementById('edit-proveedor');
    const editProveedorSearch = document.getElementById('edit-proveedor-search');
    const editProveedorList = document.getElementById('edit-proveedor-list');
    const editModalidadSelect = document.getElementById('edit-modalidad');
    const editCategoriaSelect = document.getElementById('edit-categoria');
    const editEstadoSelect = document.getElementById('edit-estado');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const deleteModal = document.getElementById('delete-modal');
    const deleteMessage = document.getElementById('delete-message');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const logModal = document.getElementById('log-modal');
    const logContent = document.getElementById('log-content');
    const closeLogBtn = document.getElementById('close-log-btn');
    const loadingModal = document.getElementById('loading-modal');
    const loadingProgress = document.getElementById('loading-progress');
    const tableContainer = document.querySelector('.table-container');
    const referenciasTableBody = document.querySelector('#referencias-table tbody');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const totalRecords = document.getElementById('total-records');
    const exportExcelBtn = document.getElementById('export-excel-btn');

    if (!container) console.error('Contenedor .referencias-container no encontrado');
    if (!newTab) console.error('Pestaña newTab no encontrada');
    if (!existingTab) console.error('Pestaña existingTab no encontrada');
    if (!newCodeForm) console.error('Formulario newCodeForm no encontrado');
    if (!registrarBtn) console.error('Botón registrarBtn no encontrado');
    if (!tableContainer) console.error('Contenedor tableContainer no encontrado');
    if (!referenciasTableBody) console.error('Cuerpo de la tabla referenciasTableBody no encontrado');
    if (!editModal) console.error('Modal de edición no encontrado');
    if (!deleteModal) console.error('Modal de eliminación no encontrado');
    if (!logModal) console.error('Modal de logs no encontrado');
    if (!existRegistrarBtn) console.error('Botón existRegistrarBtn no encontrado');
    if (!existReferenciaInput) console.error('Input exist-referencia no encontrado');
    if (!existDescripcionInput) console.error('Input exist-descripcion no encontrado');
    if (!existPrecioInput) console.error('Input exist-precio no encontrado');
    if (!existCodigoInput) console.error('Input exist-codigos no encontrado');
    if (!existProveedorInput) console.error('Input exist-proveedor no encontrado');
    if (!existModalidadSelect) console.error('Select exist-modalidad no encontrado');
    if (!existCategoriaSelect) console.error('Select exist-categoria no encontrado');
    if (!existEstadoSelect) console.error('Select exist-estado no encontrado');

    let currentPage = 1;
    const recordsPerPage = 50;
    let lastVisible = null;
    let totalPages = 1;
    let referencias = [];
    let currentEditId = null;
    let lastReferenciaId = 0;

    function formatPrice(input) {
        if (!input) return;
        input.addEventListener('input', () => {
            let value = input.value.replace(/[^0-9]/g, '');
            if (value) {
                value = value.slice(0, 7);
                value = parseInt(value).toLocaleString('es-CL', { minimumFractionDigits: 0 });
                input.value = value;
            } else {
                input.value = '';
            }
        });
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.value = '0';
                return;
            }
            let value = input.value.replace(/[^0-9]/g, '');
            value = value ? parseInt(value).toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '0';
            input.value = value;
        });
    }

    function formatDate(date) {
        return date.toLocaleString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    async function loadEmpresas() {
        try {
            const empresasCollection = collection(db, 'empresas');
            const querySnapshot = await getDocs(empresasCollection);
            const empresas = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (data.nombreEmpresa && data.estado === 'Activo') {
                    empresas.push(data.nombreEmpresa);
                }
            });
            return empresas.sort();
        } catch (error) {
            console.error('Error al cargar empresas:', error);
            showSuccessMessage('Error al cargar empresas: ' + error.message, false);
            return [];
        }
    }

    function filterAndRenderSuggestions(input, suggestionsList, empresas, showAll = false) {
        suggestionsList.innerHTML = '';
        const inputValue = input.value.trim();
        let filteredEmpresas = showAll || !inputValue ? empresas : empresas.filter(emp => emp.toLowerCase().includes(inputValue.toLowerCase()));
        if (filteredEmpresas.length === 0 && !showAll) {
            suggestionsList.style.display = 'none';
            return;
        }
        filteredEmpresas.forEach(emp => {
            const li = document.createElement('li');
            li.textContent = emp;
            li.addEventListener('click', () => {
                input.value = emp;
                suggestionsList.innerHTML = '';
                suggestionsList.style.display = 'none';
            });
            suggestionsList.appendChild(li);
        });
        suggestionsList.style.display = filteredEmpresas.length > 0 ? 'block' : 'none';
    }

    async function setupProveedorAutocomplete(inputId, suggestionsListId, searchIconId) {
        const input = document.getElementById(inputId);
        const suggestionsList = document.getElementById(suggestionsListId);
        const icon = document.getElementById(searchIconId);
        if (!input || !suggestionsList || !icon) {
            console.error('Elementos no encontrados:', { inputId, suggestionsListId, searchIconId });
            return;
        }

        const empresas = await loadEmpresas();
        input.addEventListener('input', () => filterAndRenderSuggestions(input, suggestionsList, empresas, false));
        input.addEventListener('focus', () => {
            if (input.value.trim()) filterAndRenderSuggestions(input, suggestionsList, empresas, false);
        });
        icon.addEventListener('click', () => filterAndRenderSuggestions(input, suggestionsList, empresas, true));
        document.addEventListener('click', e => {
            if (!input.contains(e.target) && !suggestionsList.contains(e.target) && !icon.contains(e.target)) {
                suggestionsList.innerHTML = '';
                suggestionsList.style.display = 'none';
            }
        });
    }

    async function getNextReferenciaId() {
        if (lastReferenciaId > 0) {
            lastReferenciaId++;
            return lastReferenciaId.toString().padStart(4, '0');
        }
        const referenciasCollection = collection(db, 'referencias');
        const q = query(referenciasCollection, orderBy('referenciaId', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        let nextId = 1;
        if (!querySnapshot.empty) {
            const lastRef = querySnapshot.docs[0].data();
            nextId = parseInt(lastRef.referenciaId || '0') + 1;
        }
        lastReferenciaId = nextId;
        return nextId.toString().padStart(4, '0');
    }

    async function getUserFullName() {
        const user = auth.currentUser;
        if (!user) throw new Error('No se encontró el usuario autenticado');
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
        return userSnap.data().fullName || 'Usuario Desconocido';
    }

    function showModal(modal, progressElement = null, percentage = null) {
        if (!modal) {
            console.warn('Modal no encontrado');
            return;
        }
        modal.style.display = 'flex';
        if (progressElement && percentage !== null) {
            progressElement.textContent = `${percentage}%`;
        }
    }

    function hideModal(modal) {
        if (!modal) {
            console.warn('Modal no encontrado');
            return;
        }
        modal.style.display = 'none';
    }

    function showSuccessMessage(message, isSuccess = true) {
        if (!successModal || !successIcon || !successMessage) {
            console.warn('Elementos de éxito no encontrados');
            alert(message);
            return;
        }
        successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
        successMessage.textContent = message;
        showModal(successModal);
        setTimeout(() => hideModal(successModal), 2000);
    }

    async function loadReferencias() {
        try {
            if (!tableContainer || !loadingModal || !loadingProgress) {
                console.error('Elementos esenciales no encontrados:', { tableContainer, loadingModal, loadingProgress });
                showSuccessMessage('Error: No se encontraron elementos necesarios', false);
                return;
            }

            showModal(loadingModal, loadingProgress, 0);
            const referenciasCollection = collection(db, 'referencias');
            const countSnapshot = await getDocs(referenciasCollection);
            const totalRecordsCount = countSnapshot.size;
            totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
            totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
            let q = query(referenciasCollection, orderBy('referenciaId', 'asc'), limit(recordsPerPage));
            if (lastVisible && currentPage > 1) {
                q = query(referenciasCollection, orderBy('referenciaId', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
            }
            const querySnapshot = await getDocs(q);
            referencias = [];
            querySnapshot.forEach(doc => {
                referencias.push({ docId: doc.id, ...doc.data() });
            });
            if (referencias.length > 0) {
                lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            }
            renderTable();
            updatePagination();
            tableContainer.style.display = 'block';
            hideModal(loadingModal);
        } catch (error) {
            console.error('Error en loadReferencias:', error);
            showSuccessMessage('Error al cargar referencias: ' + error.message, false);
            hideModal(loadingModal);
        }
    }

    function renderTable() {
        if (!referenciasTableBody) {
            console.error('Tabla de referencias no encontrada');
            return;
        }
        referenciasTableBody.innerHTML = '';
        referencias.forEach(ref => {
            const fechaDisplay = ref.fechaActualizada ? `Modificado ${formatDate(ref.fechaActualizada.toDate())}` : 
                               ref.fechaCreacion ? formatDate(ref.fechaCreacion.toDate()) : '-';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ref.referenciaId}</td>
                <td>
                    <i class="fas fa-edit action-icon" data-id="${ref.docId}" title="Editar"></i>
                    <i class="fas fa-trash action-icon" data-id="${ref.docId}" title="Eliminar"></i>
                    <i class="fas fa-history action-icon" data-id="${ref.docId}" title="Historial"></i>
                </td>
                <td>${ref.referencia || '-'}</td>
                <td>${ref.descripcion || '-'}</td>
                <td>${ref.precio ? ref.precio.toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '-'}</td>
                <td>${ref.codigo || '-'}</td>
                <td>${ref.proveedor || '-'}</td>
                <td>${ref.modalidad || '-'}</td>
                <td>${ref.categoria || '-'}</td>
                <td>${ref.estado || 'Activo'}</td>
                <td>${fechaDisplay}</td>
                <td>${ref.usuario || '-'}</td>
            `;
            referenciasTableBody.appendChild(tr);
        });
    }

    function updatePagination() {
        if (!pageInfo) return;
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }

    async function loadLogs(referenciaId) {
        if (!logContent) {
            console.error('Contenedor de logs no encontrado');
            return;
        }
        try {
            const logsCollection = collection(db, 'referencias', referenciaId, 'logs');
            const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
            const logsSnapshot = await getDocs(logsQuery);
            logContent.innerHTML = '';
            if (logsSnapshot.empty) {
                logContent.innerHTML = '<p>No hay registros de cambios.</p>';
            } else {
                logsSnapshot.forEach(doc => {
                    const logData = doc.data();
                    const timestamp = logData.timestamp?.toDate?.() || new Date();
                    const fechaDisplay = timestamp ? formatDate(timestamp) : 'Sin fecha';
                    let action = logData.action;
                    if (action.startsWith('Creado:')) {
                        action = 'Creación';
                    } else if (action.startsWith('Actualizado:')) {
                        action = 'Modificado';
                    } else if (action.startsWith('Eliminado:')) {
                        action = 'Eliminado';
                    }
                    const logEntry = document.createElement('div');
                    logEntry.className = 'log-entry';
                    logEntry.innerHTML = `
                        <strong>${action}</strong>: 
                        ${logData.details || '-'}<br>
                        <small>Fecha: ${fechaDisplay} | Usuario: ${logData.user || '-'}</small>
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

    function openEditModal(ref) {
        if (!editModal) return;
        currentEditId = ref.docId;
        editReferenciaInput.value = ref.referencia || '';
        editDescripcionInput.value = ref.descripcion || '';
        editPrecioInput.value = ref.precio ? ref.precio.toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '0';
        editCodigoInput.value = ref.codigo || '';
        editProveedorInput.value = ref.proveedor || '';
        editModalidadSelect.value = ref.modalidad || 'Cotización';
        editCategoriaSelect.value = ref.categoria || 'Implantes';
        editEstadoSelect.value = ref.estado || 'Activo';
        showModal(editModal);
    }

    function openDeleteModal(ref) {
        if (!deleteMessage) return;
        deleteMessage.textContent = `¿Estás seguro de que quieres eliminar la referencia "${ref.referencia}"?`;
        confirmDeleteBtn.dataset.id = ref.docId;
        showModal(deleteModal);
    }

    function exportToExcel() {
        const data = referencias.map(ref => ({
            ID: ref.referenciaId,
            Referencia: ref.referencia || '-',
            Descripción: ref.descripcion || '-',
            Precio: ref.precio ? ref.precio.toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '-',
            Código: ref.codigo || '-',
            Proveedor: ref.proveedor || '-',
            Modalidad: ref.modalidad || '-',
            Categoría: ref.categoria || '-',
            Estado: ref.estado || 'Activo',
            'Fecha Creación': ref.fechaActualizada ? `Modificado ${formatDate(ref.fechaActualizada.toDate())}` : 
                             ref.fechaCreacion ? formatDate(ref.fechaCreacion.toDate()) : '-',
            Usuario: ref.usuario || '-'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Referencias');
        XLSX.write(wb, 'referencias.xlsx');
    }

    async function init() {
        if (!container) {
            console.error('Contenedor .referencias-container no encontrado');
            return;
        }

        formatPrice(precioInput);
        formatPrice(editPrecioInput);
        formatPrice(existPrecioInput);

        if (referenciaInput && detallesInput && descripcionInput) {
            const updateDescription = () => {
                const referencia = referenciaInput.value.trim().toUpperCase();
                const detalles = detallesInput.value.trim().toUpperCase();
                descripcionInput.value = referencia && detalles ? `${referencia} ${detalles}` : referencia || detalles || '';
            };
            referenciaInput.addEventListener('input', updateDescription);
            detallesInput.addEventListener('input', updateDescription);
        }

        await setupProveedorAutocomplete('proveedor', 'proveedor-list', 'proveedor-search');
        await setupProveedorAutocomplete('exist-proveedor', 'exist-proveedor-list', 'exist-proveedor-search');
        await setupProveedorAutocomplete('edit-proveedor', 'edit-proveedor-list', 'edit-proveedor-search');

        try {
            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    console.error('No hay usuario autenticado');
                    container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
                    setTimeout(() => {
                        window.location.href = 'index.html?error=auth-required';
                    }, 2000);
                    return;
                }

                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (!userDoc.exists()) {
                        console.error('Documento de usuario no encontrado');
                        container.innerHTML = '<p>Error: Tu cuenta no está registrada. Contacta al administrador.</p>';
                        return;
                    }

                    const userData = userDoc.data();
                    const hasAccess = userData.role === 'Administrador' ||
                        (userData.permissions && userData.permissions.includes('Implantes:Referencias'));
                    if (!hasAccess) {
                        console.error('Acceso denegado');
                        container.innerHTML = '<p>Acceso denegado. No tienes permisos para este módulo.</p>';
                        return;
                    }

                    await loadReferencias();

                    if (newTab && existingTab && newCodeForm && existingCodeForm) {
                        newTab.addEventListener('change', () => {
                            newCodeForm.style.display = 'block';
                            existingCodeForm.style.display = 'none';
                        });
                        existingTab.addEventListener('change', () => {
                            newCodeForm.style.display = 'none';
                            existingCodeForm.style.display = 'block';
                        });
                    }

                    if (registrarBtn) {
                        registrarBtn.addEventListener('click', async () => {
                            const referencia = referenciaInput.value.trim().toUpperCase();
                            const detalles = detallesInput.value.trim().toUpperCase();
                            let precio = precioInput.value.replace(/[^0-9]/g, '');
                            precio = precio ? parseInt(precio) : 0;
                            const codigo = codigoInput.value.trim() || "Pendiente";
                            const proveedor = proveedorInput.value.trim();
                            const modalidad = modalidadSelect.value;
                            const categoria = categoriaSelect.value;
                            const estado = estadoSelect.value;
                            const descripcion = descripcionInput.value.trim().toUpperCase();

                            if (!referencia || !detalles || !proveedor || !precio) {
                                showSuccessMessage('Complete todos los campos obligatorios (referencia, detalles, proveedor, precio)', false);
                                return;
                            }

                            if (precio > 9999999) {
                                showSuccessMessage('El precio no puede superar 9.999.999', false);
                                return;
                            }

                            try {
                                showModal(registerModal, registerProgress, 20);
                                const referenciaId = await getNextReferenciaId();
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());
                                const refRef = doc(collection(db, 'referencias'));
                                const batch = writeBatch(db);
                                batch.set(refRef, {
                                    referenciaId,
                                    referencia,
                                    descripcion,
                                    precio,
                                    codigo,
                                    proveedor,
                                    modalidad,
                                    categoria,
                                    estado,
                                    usuario: fullName,
                                    fechaCreacion: now,
                                    lastAction: `Creado: ${formatDate(new Date(now.toMillis()))}`,
                                    uid: auth.currentUser.uid
                                });
                                const logRef = doc(collection(db, 'referencias', refRef.id, 'logs'));
                                batch.set(logRef, {
                                    action: `Creado: ${formatDate(new Date(now.toMillis()))}`,
                                    details: `Referencia "${referencia}" creada`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: auth.currentUser.uid
                                });
                                await batch.commit();
                                showModal(registerModal, registerProgress, 100);
                                setTimeout(() => {
                                    hideModal(registerModal);
                                    showSuccessMessage('Referencia registrada');
                                    loadReferencias();
                                    [referenciaInput, detallesInput, precioInput, codigoInput, proveedorInput, descripcionInput].forEach(input => input.value = '');
                                    precioInput.value = '0';
                                    modalidadSelect.value = 'Cotización';
                                    categoriaSelect.value = 'Implantes';
                                    estadoSelect.value = 'Activo';
                                }, 500);
                            } catch (error) {
                                console.error('Error al registrar:', error);
                                showSuccessMessage('Error al registrar: ' + error.message, false);
                                hideModal(registerModal);
                            }
                        });
                    }

                    if (existRegistrarBtn) {
                        existRegistrarBtn.addEventListener('click', async () => {
                            if (!existReferenciaInput || !existDescripcionInput || !existPrecioInput || !existCodigoInput || 
                                !existProveedorInput || !existModalidadSelect || !existCategoriaSelect || !existEstadoSelect) {
                                console.error('Uno o más elementos del formulario no encontrados');
                                showSuccessMessage('Error: Formulario incompleto. Contacta al administrador.', false);
                                return;
                            }

                            const referencia = existReferenciaInput.value.trim().toUpperCase();
                            const descripcion = existDescripcionInput.value.trim().toUpperCase();
                            let precio = existPrecioInput.value.replace(/[^0-9]/g, '');
                            precio = precio ? parseInt(precio) : 0;
                            const codigo = existCodigoInput.value.trim();
                            const proveedor = existProveedorInput.value.trim();
                            const modalidad = existModalidadSelect.value;
                            const categoria = existCategoriaSelect.value;
                            const estado = existEstadoSelect.value;

                            if (!referencia || !descripcion || !precio || !codigo || !proveedor) {
                                showSuccessMessage('Complete todos los campos obligatorios', false);
                                return;
                            }

                            if (precio > 9999999) {
                                showSuccessMessage('El precio no puede superar 9.999.999', false);
                                return;
                            }

                            try {
                                showModal(registerModal, registerProgress, 20);

                                const empresas = await loadEmpresas();
                                if (!empresas.includes(proveedor)) {
                                    showSuccessMessage('El proveedor ingresado no existe o no está activo', false);
                                    hideModal(registerModal);
                                    return;
                                }

                                const referenciaId = await getNextReferenciaId();
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());
                                const refRef = doc(collection(db, 'referencias'));
                                const batch = writeBatch(db);

                                batch.set(refRef, {
                                    referenciaId,
                                    referencia,
                                    descripcion,
                                    precio,
                                    codigo,
                                    proveedor,
                                    modalidad,
                                    categoria,
                                    estado,
                                    usuario: fullName,
                                    fechaCreacion: now,
                                    lastAction: `Creado: ${formatDate(new Date(now.toMillis()))}`,
                                    uid: auth.currentUser.uid
                                });

                                const logRef = doc(collection(db, 'referencias', refRef.id, 'logs'));
                                batch.set(logRef, {
                                    action: `Creado: ${formatDate(new Date(now.toMillis()))}`,
                                    details: `Referencia "${referencia}" creada`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: auth.currentUser.uid
                                });

                                await batch.commit();
                                showModal(registerModal, registerProgress, 100);
                                setTimeout(() => {
                                    hideModal(registerModal);
                                    showSuccessMessage('Referencia registrada');
                                    loadReferencias();
                                    [existReferenciaInput, existDescripcionInput, existPrecioInput, existCodigoInput, existProveedorInput].forEach(input => {
                                        if (input) input.value = '';
                                    });
                                    if (existPrecioInput) existPrecioInput.value = '0';
                                    if (existModalidadSelect) existModalidadSelect.value = 'Cotización';
                                    if (existCategoriaSelect) existCategoriaSelect.value = 'Implantes';
                                    if (existEstadoSelect) existEstadoSelect.value = 'Activo';
                                }, 500);
                            } catch (error) {
                                console.error('Error al registrar:', error);
                                showSuccessMessage('Error al registrar: ' + error.message, false);
                                hideModal(registerModal);
                            }
                        });
                    }

                    if (saveEditBtn) {
                        saveEditBtn.addEventListener('click', async () => {
                            const referencia = editReferenciaInput.value.trim().toUpperCase();
                            const descripcion = editDescripcionInput.value.trim().toUpperCase();
                            let precio = editPrecioInput.value.replace(/[^0-9]/g, '');
                            precio = precio ? parseInt(precio) : 0;
                            const codigo = editCodigoInput.value.trim();
                            const proveedor = editProveedorInput.value.trim();
                            const modalidad = editModalidadSelect.value;
                            const categoria = editCategoriaSelect.value;
                            const estado = editEstadoSelect.value;

                            if (!referencia || !descripcion || !precio || !codigo || !proveedor) {
                                showSuccessMessage('Complete todos los campos obligatorios', false);
                                return;
                            }

                            if (precio > 9999999) {
                                showSuccessMessage('El precio no puede superar 9.999.999', false);
                                return;
                            }

                            try {
                                const refRef = doc(db, 'referencias', currentEditId);
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());
                                const batch = writeBatch(db);
                                batch.update(refRef, {
                                    referencia,
                                    descripcion,
                                    precio,
                                    codigo,
                                    proveedor,
                                    modalidad,
                                    categoria,
                                    estado,
                                    usuario: fullName,
                                    fechaActualizada: now,
                                    lastAction: `Actualizado: ${formatDate(new Date(now.toMillis()))}`,
                                    uid: auth.currentUser.uid
                                });
                                const logRef = doc(collection(db, 'referencias', refRef.id, 'logs'));
                                batch.set(logRef, {
                                    action: `Actualizado: ${formatDate(new Date(now.toMillis()))}`,
                                    details: `Referencia "${referencia}" actualizada`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: auth.currentUser.uid
                                });
                                await batch.commit();
                                hideModal(editModal);
                                showSuccessMessage('Referencia actualizada');
                                loadReferencias();
                            } catch (error) {
                                console.error('Error al actualizar:', error);
                                showSuccessMessage('Error al actualizar: ' + error.message, false);
                            }
                        });
                    }

                    if (cancelEditBtn) {
                        cancelEditBtn.addEventListener('click', () => {
                            hideModal(editModal);
                        });
                    }

                    if (confirmDeleteBtn) {
                        confirmDeleteBtn.addEventListener('click', async () => {
                            const id = confirmDeleteBtn.dataset.id;
                            try {
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());
                                const batch = writeBatch(db);
                                batch.delete(doc(db, 'referencias', id));
                                const logRef = doc(collection(db, 'referencias', id, 'logs'));
                                batch.set(logRef, {
                                    action: `Eliminado: ${formatDate(new Date(now.toMillis()))}`,
                                    details: `Referencia eliminada`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: auth.currentUser.uid
                                });
                                await batch.commit();
                                hideModal(deleteModal);
                                showSuccessMessage('Referencia eliminada');
                                loadReferencias();
                            } catch (error) {
                                console.error('Error al eliminar:', error);
                                showSuccessMessage('Error al eliminar: ' + error.message, false);
                            }
                        });
                    }

                    if (cancelDeleteBtn) {
                        cancelDeleteBtn.addEventListener('click', () => {
                            hideModal(deleteModal);
                        });
                    }

                    if (closeLogBtn) {
                        closeLogBtn.addEventListener('click', () => {
                            hideModal(logModal);
                        });
                    }

                    if (referenciasTableBody) {
                        referenciasTableBody.addEventListener('click', (e) => {
                            const id = e.target.dataset.id;
                            if (!id) return;
                            const ref = referencias.find(r => r.docId === id);
                            if (!ref) return;
                            if (e.target.classList.contains('fa-edit')) {
                                openEditModal(ref);
                            } else if (e.target.classList.contains('fa-trash')) {
                                openDeleteModal(ref);
                            } else if (e.target.classList.contains('fa-history')) {
                                loadLogs(ref.docId);
                            }
                        });
                    }

                    if (prevBtn) {
                        prevBtn.addEventListener('click', () => {
                            if (currentPage > 1) {
                                currentPage--;
                                loadReferencias();
                            }
                        });
                    }

                    if (nextBtn) {
                        nextBtn.addEventListener('click', () => {
                            if (currentPage < totalPages) {
                                currentPage++;
                                loadReferencias();
                            }
                        });
                    }

                    if (exportExcelBtn) {
                        exportExcelBtn.addEventListener('click', () => {
                            exportToExcel();
                        });
                    }
                } catch (error) {
                    console.error('Error en verificación de usuario:', error);
                    container.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
                }
            });
        } catch (error) {
            console.error('Error en init:', error);
            container.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        init();
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => init(), 1);
    }
} catch (error) {
    console.error('Error al inicializar Firebase:', error);
}