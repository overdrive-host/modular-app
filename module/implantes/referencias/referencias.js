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
        showSuccessMessage('Error al configurar persistencia: ' + error.message, false);
    });

    // Elementos del DOM
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
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    // Verificaciones iniciales de elementos del DOM
    const requiredElements = {
        container, newTab, existingTab, newCodeForm, existingCodeForm,
        referenciaInput, detallesInput, precioInput, codigoInput, proveedorInput,
        proveedorSearch, proveedorList, modalidadSelect, categoriaSelect, estadoSelect,
        descripcionInput, registrarBtn, existReferenciaInput, existDescripcionInput,
        existPrecioInput, existCodigoInput, existProveedorInput, existProveedorSearch,
        existProveedorList, existModalidadSelect, existCategoriaSelect, existEstadoSelect,
        existRegistrarBtn, registerModal, registerProgress, successModal, successIcon,
        successMessage, editModal, editReferenciaInput, editDescripcionInput, editPrecioInput,
        editCodigoInput, editProveedorInput, editProveedorSearch, editProveedorList,
        editModalidadSelect, editCategoriaSelect, editEstadoSelect, saveEditBtn,
        cancelEditBtn, deleteModal, deleteMessage, confirmDeleteBtn, cancelDeleteBtn,
        logModal, logContent, closeLogBtn, loadingModal, loadingProgress, tableContainer,
        referenciasTableBody, prevBtn, nextBtn, pageInfo, totalRecords, exportExcelBtn,
        clearFiltersBtn
    };

    for (const [key, element] of Object.entries(requiredElements)) {
        if (!element) {
            showSuccessMessage(`Elemento ${key} no encontrado en el DOM`, false);
        }
    }

    let currentPage = 1;
    const recordsPerPage = 50;
    let totalPages = 1;
    let referencias = [];
    let allReferencias = [];
    let currentEditId = null;
    let lastReferenciaId = 0;
    let filters = {};
    let isLoading = false;

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
        if (!(date instanceof Date) || isNaN(date)) {
            return '-';
        }
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
            showSuccessMessage('Error al cargar empresas: ' + error.message, false);
            return [];
        }
    }

    function filterAndRenderSuggestions(input, suggestionsList, empresas, showAll = false) {
        if (!input || !suggestionsList) return;
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
            showSuccessMessage('Elementos de autocompletado no encontrados', false);
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
            return;
        }
        modal.style.display = 'flex';
        if (progressElement && percentage !== null) {
            progressElement.textContent = `${percentage}%`;
        }
    }

    function hideModal(modal) {
        if (!modal) {
            return;
        }
        modal.style.display = 'none';
    }

    function showSuccessMessage(message, isSuccess = true) {
        if (!successModal || !successIcon || !successMessage) {
            alert(message);
            return;
        }
        successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
        successMessage.textContent = message;
        successModal.classList.toggle('success', isSuccess);
        successModal.classList.toggle('error', !isSuccess);
        showModal(successModal);
        setTimeout(() => hideModal(successModal), 2000);
    }

    async function checkDuplicateReferenciaOrCodigo(referencia, codigo) {
        try {
            const referenciasCollection = collection(db, 'referencias');
            let queries = [];
            if (referencia) {
                queries.push(query(referenciasCollection, where('referencia', '==', referencia.toUpperCase()), limit(1)));
            }
            if (codigo && codigo !== 'Pendiente') {
                queries.push(query(referenciasCollection, where('codigo', '==', codigo), limit(1)));
            }

            const results = await Promise.all(queries.map(q => getDocs(q)));
            let errorMessage = '';

            if (referencia && results[0] && !results[0].empty) {
                errorMessage += `La referencia "${referencia}" ya está registrada. `;
            }
            if (codigo && codigo !== 'Pendiente' && results[referencia ? 1 : 0] && !results[referencia ? 1 : 0].empty) {
                errorMessage += `El código "${codigo}" ya está registrado.`;
            }

            if (errorMessage) {
                return { isDuplicate: true, message: errorMessage };
            }
            return { isDuplicate: false };
        } catch (error) {
            return { isDuplicate: true, message: 'Error al verificar duplicados: ' + error.message };
        }
    }

    async function loadReferencias() {
        if (isLoading) {
            return;
        }
        isLoading = true;

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Tiempo de espera agotado en loadReferencias')), 15000);
        });

        try {
            if (!tableContainer || !loadingModal || !loadingProgress || !referenciasTableBody) {
                showSuccessMessage('Elementos esenciales no encontrados', false);
                throw new Error('No se encontraron elementos necesarios');
            }

            showModal(loadingModal, loadingProgress, 0);
            const referenciasCollection = collection(db, 'referencias');
            const filterConstraints = [];

            Object.keys(filters).forEach(column => {
                const filterValue = filters[column]?.trim();
                if (!filterValue) return;
                if (column === 'precio') {
                    const numericValue = parseInt(filterValue.replace(/[^0-9]/g, '')) || 0;
                    if (!isNaN(numericValue)) {
                        filterConstraints.push(where(column, '>=', numericValue));
                        filterConstraints.push(where(column, '<=', numericValue));
                    }
                } else if (column === 'estado' || column === 'modalidad' || column === 'categoria') {
                    filterConstraints.push(where(column, '==', filterValue));
                } else if (column !== 'fechaCreacion' && column !== 'fechaActualizada' && column !== 'proveedor' && column !== 'descripcion') {
                    filterConstraints.push(where(column, '>=', filterValue.toLowerCase()));
                    filterConstraints.push(where(column, '<=', filterValue.toLowerCase() + '\uf8ff'));
                }
            });

            const q = query(referenciasCollection, ...filterConstraints, orderBy('referenciaId', 'asc'));
            const querySnapshot = await Promise.race([getDocs(q), timeoutPromise]);
            allReferencias = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                allReferencias.push({
                    docId: doc.id,
                    referenciaId: data.referenciaId || '',
                    referencia: data.referencia || '',
                    descripcion: data.descripcion || '',
                    precio: data.precio || 0,
                    codigo: data.codigo || '',
                    proveedor: data.proveedor || '',
                    proveedorLowerCase: data.proveedorLowerCase || data.proveedor?.toLowerCase() || '',
                    modalidad: data.modalidad || '',
                    categoria: data.categoria || '',
                    estado: data.estado || 'Activo',
                    fechaCreacion: data.fechaCreacion || null,
                    fechaActualizada: data.fechaActualizada || null,
                    usuario: data.usuario || '',
                    uid: data.uid || ''
                });
            });

            referencias = allReferencias.filter(ref => {
                let match = true;
                Object.keys(filters).forEach(column => {
                    const filterValue = filters[column]?.toLowerCase()?.trim();
                    if (!filterValue) return;
                    if (column === 'proveedor') {
                        match = match && (ref.proveedorLowerCase?.toLowerCase().includes(filterValue) || ref.proveedor?.toLowerCase().includes(filterValue));
                    } else if (column === 'descripcion') {
                        match = match && ref.descripcion?.toLowerCase().includes(filterValue);
                    } else if (column === 'fechaCreacion') {
                        const fechaDisplay = ref.fechaCreacion ? formatDate(ref.fechaCreacion.toDate()) : '-';
                        match = match && fechaDisplay.toLowerCase().includes(filterValue);
                    } else if (column === 'fechaActualizada') {
                        const fechaDisplay = ref.fechaActualizada ? `Modificado ${formatDate(ref.fechaActualizada.toDate())}` : '-';
                        match = match && fechaDisplay.toLowerCase().includes(filterValue);
                    }
                });
                return match;
            });

            const totalRecordsCount = referencias.length;
            totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
            totalPages = Math.ceil(totalRecordsCount / recordsPerPage);

            const startIndex = (currentPage - 1) * recordsPerPage;
            const endIndex = startIndex + recordsPerPage;
            referencias = referencias.slice(startIndex, endIndex);

            renderTable();
            updatePagination();
            tableContainer.style.display = 'block';
            hideModal(loadingModal);
        } catch (error) {
            showSuccessMessage('Error al cargar referencias: ' + error.message, false);
            hideModal(loadingModal);
        } finally {
            isLoading = false;
        }
    }

    function renderTable() {
        if (!referenciasTableBody) {
            showSuccessMessage('Tabla de referencias no encontrada', false);
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
        nextBtn.disabled = currentPage >= totalPages;
    }

    async function loadLogs(referenciaId) {
        if (!logContent) {
            showSuccessMessage('Contenedor de logs no encontrado', false);
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
                    const fechaDisplay = formatDate(timestamp);
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

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function setupFilters() {
        const filterIcons = document.querySelectorAll('.filter-icon');
        const filterState = new Map();

        filterIcons.forEach(icon => {
            const column = icon.dataset.column;
            if (!column) {
                showSuccessMessage('Atributo data-column no definido para el ícono de filtro', false);
                return;
            }

            filterState.set(column, {
                filterInputContainer: null,
                lastFilterValue: null,
                isApplyingFilter: false,
                clickOutsideHandler: null
            });

            const createFilterInput = () => {
                const state = filterState.get(column);
                state.filterInputContainer = document.createElement('div');
                state.filterInputContainer.className = 'filter-input-container';
                let input;
                if (column === 'estado' || column === 'modalidad' || column === 'categoria') {
                    input = document.createElement('select');
                    let options = [];
                    if (column === 'estado') {
                        options = ['Activo', 'Inactivo'];
                    } else if (column === 'modalidad') {
                        options = ['Cotización', 'Consignación'];
                    } else if (column === 'categoria') {
                        options = ['Implantes', 'Insumos'];
                    }
                    options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt;
                        option.textContent = opt;
                        input.appendChild(option);
                    });
                    input.value = filters[column] || '';
                } else {
                    input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = `Filtrar por ${column}`;
                    input.value = filters[column] || '';
                    if (column === 'precio') {
                        formatPrice(input);
                    }
                }
                state.filterInputContainer.appendChild(input);
                icon.parentElement.appendChild(state.filterInputContainer);
                filterState.set(column, state);
                return input;
            };

            const removeFilterInput = () => {
                const state = filterState.get(column);
                if (state.filterInputContainer && state.filterInputContainer.parentElement) {
                    try {
                        state.filterInputContainer.remove();
                    } catch (e) {
                        showSuccessMessage('Error al remover contenedor de filtro: ' + e.message, false);
                    }
                    state.filterInputContainer = null;
                }
                if (state.clickOutsideHandler) {
                    document.removeEventListener('click', state.clickOutsideHandler);
                    state.clickOutsideHandler = null;
                }
                state.lastFilterValue = null;
                state.isApplyingFilter = false;
                filterState.set(column, state);
            };

            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const state = filterState.get(column);

                if (icon.classList.contains('fa-filter-circle-xmark')) {
                    delete filters[column];
                    icon.classList.remove('fa-filter-circle-xmark', 'active');
                    icon.classList.add('fa-filter');
                    removeFilterInput();
                    currentPage = 1;
                    loadReferencias();
                    return;
                }

                if (state.filterInputContainer) {
                    const input = state.filterInputContainer.querySelector('input, select');
                    if (input) input.focus();
                    return;
                }

                const input = createFilterInput();
                icon.classList.remove('fa-filter');
                icon.classList.add('fa-filter-circle-xmark', 'active');

                const applyFilter = debounce((filterValue) => {
                    const currentState = filterState.get(column);
                    if (currentState.isApplyingFilter) {
                        return;
                    }
                    currentState.isApplyingFilter = true;
                    filterState.set(column, currentState);

                    if (filterValue === currentState.lastFilterValue) {
                        setTimeout(removeFilterInput, 0);
                        currentState.isApplyingFilter = false;
                        filterState.set(column, currentState);
                        return;
                    }
                    currentState.lastFilterValue = filterValue;
                    if (filterValue) {
                        filters[column] = filterValue;
                        icon.classList.add('active');
                    } else {
                        delete filters[column];
                        icon.classList.remove('fa-filter-circle-xmark', 'active');
                        icon.classList.add('fa-filter');
                    }
                    currentPage = 1;
                    setTimeout(removeFilterInput, 0);
                    loadReferencias();
                    currentState.isApplyingFilter = false;
                    filterState.set(column, currentState);
                }, 300);

                if (input.tagName === 'SELECT') {
                    input.addEventListener('change', () => {
                        const filterValue = input.value;
                        applyFilter(filterValue);
                    });
                } else {
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            const filterValue = input.value.trim();
                            applyFilter(filterValue);
                        }
                    });
                    input.addEventListener('blur', () => {
                        const filterValue = input.value.trim();
                        applyFilter(filterValue);
                    });
                }

                input.focus();

                state.clickOutsideHandler = (e) => {
                    if (state.filterInputContainer && !icon.contains(e.target) && !state.filterInputContainer.contains(e.target)) {
                        const filterValue = input.tagName === 'SELECT' ? input.value : input.value.trim();
                        applyFilter(filterValue);
                    }
                };
                document.addEventListener('click', state.clickOutsideHandler);
                filterState.set(column, state);
            });
        });

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                filters = {};
                currentPage = 1;
                allReferencias = [];
                referencias = [];
                const filterIcons = document.querySelectorAll('.filter-icon');
                filterIcons.forEach(icon => {
                    const column = icon.dataset.column;
                    const state = filterState.get(column);
                    icon.classList.remove('fa-filter-circle-xmark', 'active');
                    icon.classList.add('fa-filter');
                    if (state) {
                        if (state.filterInputContainer && state.filterInputContainer.parentElement) {
                            try {
                                state.filterInputContainer.remove();
                            } catch (e) {
                                showSuccessMessage('Error al remover contenedor de filtro: ' + e.message, false);
                            }
                            state.filterInputContainer = null;
                        }
                        if (state.clickOutsideHandler) {
                            document.removeEventListener('click', state.clickOutsideHandler);
                            state.clickOutsideHandler = null;
                        }
                        state.lastFilterValue = null;
                        state.isApplyingFilter = false;
                        filterState.set(column, state);
                    }
                });
                loadReferencias();
            });
        }
    }

    async function init() {
        if (!container) {
            showSuccessMessage('Contenedor .referencias-container no encontrado', false);
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
                    showSuccessMessage('No hay usuario autenticado', false);
                    container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
                    setTimeout(() => {
                        window.location.href = 'index.html?error=auth-required';
                    }, 2000);
                    return;
                }

                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (!userDoc.exists()) {
                        showSuccessMessage('Documento de usuario no encontrado', false);
                        container.innerHTML = '<p>Error: Tu cuenta no está registrada. Contacta al administrador.</p>';
                        return;
                    }

                    const userData = userDoc.data();
                    const hasAccess = userData.role === 'Administrador' ||
                        (userData.permissions && userData.permissions.includes('Implantes:Referencias'));
                    if (!hasAccess) {
                        showSuccessMessage('Acceso denegado', false);
                        container.innerHTML = '<p>Acceso denegado. No tienes permisos para este módulo.</p>';
                        return;
                    }

                    await loadReferencias();
                    setupFilters();

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
                            const proveedorLowerCase = proveedor.toLowerCase();
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

                                const referenciaData = {
                                    referenciaId,
                                    referencia,
                                    descripcion,
                                    precio,
                                    codigo,
                                    proveedor,
                                    proveedorLowerCase,
                                    modalidad,
                                    categoria,
                                    estado,
                                    fechaCreacion: now,
                                    usuario: fullName,
                                    uid: user.uid
                                };

                                await addDoc(collection(db, 'referencias'), referenciaData);
                                registerProgress.textContent = '60%';

                                const logRef = collection(db, 'referencias', refRef.id, 'logs');
                                await addDoc(logRef, {
                                    action: `Creado: ${referencia}`,
                                    details: `Referencia creada con precio ${precio.toLocaleString('es-CL')}`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: user.uid
                                });

                                registerProgress.textContent = '100%';
                                hideModal(registerModal);
                                showSuccessMessage('Referencia registrada exitosamente', true);

                                referenciaInput.value = '';
                                detallesInput.value = '';
                                precioInput.value = '0';
                                codigoInput.value = '';
                                proveedorInput.value = '';
                                descripcionInput.value = '';
                                await loadReferencias();
                            } catch (error) {
                                hideModal(registerModal);
                                showSuccessMessage('Error al registrar referencia: ' + error.message, false);
                            }
                        });
                    }

                    if (existRegistrarBtn) {
                        existRegistrarBtn.addEventListener('click', async () => {
                            const referencia = existReferenciaInput.value.trim().toUpperCase();
                            const descripcion = existDescripcionInput.value.trim().toUpperCase();
                            let precio = existPrecioInput.value.replace(/[^0-9]/g, '');
                            precio = precio ? parseInt(precio) : 0;
                            const codigo = existCodigoInput.value.trim() || "Pendiente";
                            const proveedor = existProveedorInput.value.trim();
                            const proveedorLowerCase = proveedor.toLowerCase();
                            const modalidad = existModalidadSelect.value;
                            const categoria = existCategoriaSelect.value;
                            const estado = existEstadoSelect.value;

                            if (!referencia || !descripcion || !proveedor || !precio) {
                                showSuccessMessage('Complete todos los campos obligatorios (referencia, descripción, proveedor, precio)', false);
                                return;
                            }

                            if (precio > 9999999) {
                                showSuccessMessage('El precio no puede superar 9.999.999', false);
                                return;
                            }

                            const duplicateCheck = await checkDuplicateReferenciaOrCodigo(referencia, codigo);
                            if (duplicateCheck.isDuplicate) {
                                showSuccessMessage(duplicateCheck.message, false);
                                return;
                            }

                            try {
                                showModal(registerModal, registerProgress, 20);
                                const referenciaId = await getNextReferenciaId();
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());
                                const refRef = doc(collection(db, 'referencias'));

                                const referenciaData = {
                                    referenciaId,
                                    referencia,
                                    descripcion,
                                    precio,
                                    codigo,
                                    proveedor,
                                    proveedorLowerCase,
                                    modalidad,
                                    categoria,
                                    estado,
                                    fechaCreacion: now,
                                    usuario: fullName,
                                    uid: user.uid
                                };

                                await addDoc(collection(db, 'referencias'), referenciaData);
                                registerProgress.textContent = '60%';

                                const logRef = collection(db, 'referencias', refRef.id, 'logs');
                                await addDoc(logRef, {
                                    action: `Creado: ${referencia}`,
                                    details: `Referencia creada con precio ${precio.toLocaleString('es-CL')}`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: user.uid
                                });

                                registerProgress.textContent = '100%';
                                hideModal(registerModal);
                                showSuccessMessage('Referencia existente registrada exitosamente', true);

                                existReferenciaInput.value = '';
                                existDescripcionInput.value = '';
                                existPrecioInput.value = '0';
                                existCodigoInput.value = '';
                                existProveedorInput.value = '';
                                await loadReferencias();
                            } catch (error) {
                                hideModal(registerModal);
                                showSuccessMessage('Error al registrar referencia existente: ' + error.message, false);
                            }
                        });
                    }

                    if (saveEditBtn) {
                        saveEditBtn.addEventListener('click', async () => {
                            const referencia = editReferenciaInput.value.trim().toUpperCase();
                            const descripcion = editDescripcionInput.value.trim().toUpperCase();
                            let precio = editPrecioInput.value.replace(/[^0-9]/g, '');
                            precio = precio ? parseInt(precio) : 0;
                            const codigo = editCodigoInput.value.trim() || "Pendiente";
                            const proveedor = editProveedorInput.value.trim();
                            const proveedorLowerCase = proveedor.toLowerCase();
                            const modalidad = editModalidadSelect.value;
                            const categoria = editCategoriaSelect.value;
                            const estado = editEstadoSelect.value;

                            if (!referencia || !descripcion || !proveedor || !precio) {
                                showSuccessMessage('Complete todos los campos obligatorios (referencia, descripción, proveedor, precio)', false);
                                return;
                            }

                            if (precio > 9999999) {
                                showSuccessMessage('El precio no puede superar 9.999.999', false);
                                return;
                            }

                            try {
                                showModal(registerModal, registerProgress, 20);
                                const refRef = doc(db, 'referencias', currentEditId);
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());

                                const updatedData = {
                                    referencia,
                                    descripcion,
                                    precio,
                                    codigo,
                                    proveedor,
                                    proveedorLowerCase,
                                    modalidad,
                                    categoria,
                                    estado,
                                    fechaActualizada: now,
                                    usuario: fullName,
                                    uid: user.uid
                                };

                                await updateDoc(refRef, updatedData);
                                registerProgress.textContent = '60%';

                                const logRef = collection(db, 'referencias', currentEditId, 'logs');
                                await addDoc(logRef, {
                                    action: `Actualizado: ${referencia}`,
                                    details: `Referencia actualizada con precio ${precio.toLocaleString('es-CL')}`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: user.uid
                                });

                                registerProgress.textContent = '100%';
                                hideModal(registerModal);
                                hideModal(editModal);
                                showSuccessMessage('Referencia actualizada exitosamente', true);
                                await loadReferencias();
                            } catch (error) {
                                hideModal(registerModal);
                                showSuccessMessage('Error al actualizar referencia: ' + error.message, false);
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
                            const refId = confirmDeleteBtn.dataset.id;
                            if (!refId) return;

                            try {
                                showModal(registerModal, registerProgress, 20);
                                const refRef = doc(db, 'referencias', refId);
                                const refSnap = await getDoc(refRef);
                                if (!refSnap.exists()) {
                                    showSuccessMessage('Referencia no encontrada', false);
                                    hideModal(registerModal);
                                    hideModal(deleteModal);
                                    return;
                                }

                                const refData = refSnap.data();
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());

                                await deleteDoc(refRef);
                                registerProgress.textContent = '60%';

                                const logRef = collection(db, 'referencias', refId, 'logs');
                                await addDoc(logRef, {
                                    action: `Eliminado: ${refData.referencia}`,
                                    details: `Referencia eliminada`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: user.uid
                                });

                                registerProgress.textContent = '100%';
                                hideModal(registerModal);
                                hideModal(deleteModal);
                                showSuccessMessage('Referencia eliminada exitosamente', true);
                                await loadReferencias();
                            } catch (error) {
                                hideModal(registerModal);
                                showSuccessMessage('Error al eliminar referencia: ' + error.message, false);
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

                    if (exportExcelBtn) {
                        exportExcelBtn.addEventListener('click', () => {
                            exportToExcel();
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

                    referenciasTableBody.addEventListener('click', (e) => {
                        const target = e.target;
                        const refId = target.dataset.id;
                        if (!refId) return;

                        const ref = referencias.find(r => r.docId === refId);
                        if (!ref) return;

                        if (target.classList.contains('fa-edit')) {
                            openEditModal(ref);
                        } else if (target.classList.contains('fa-trash')) {
                            openDeleteModal(ref);
                        } else if (target.classList.contains('fa-history')) {
                            loadLogs(refId);
                        }
                    });
                } catch (error) {
                    showSuccessMessage('Error al verificar permisos: ' + error.message, false);
                    container.innerHTML = '<p>Error al verificar permisos. Contacta al administrador.</p>';
                }
            });
        } catch (error) {
            showSuccessMessage('Error al inicializar la aplicación: ' + error.message, false);
            container.innerHTML = '<p>Error crítico al cargar la aplicación. Contacta al administrador.</p>';
        }
    }

    init();
} catch (error) {
    showSuccessMessage('Error crítico al inicializar Firebase: ' + error.message, false);
    document.querySelector('.referencias-container').innerHTML = '<p>Error crítico al cargar la aplicación. Contacta al administrador.</p>';
}