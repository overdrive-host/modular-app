import { getFirestore, collection, getDocs, query, orderBy, onSnapshot, setDoc, doc, Timestamp, updateDoc, getDoc, where } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';

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
        console.warn('Error al configurar persistencia:', error.message);
    });

    const container = document.querySelector('.lotes-container');
    const tableBody = document.querySelector('#lotes-table tbody');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const totalRecords = document.getElementById('total-records');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const filterYearSelect = document.getElementById('filter-year');
    const filterMonthSelect = document.getElementById('filter-month');
    const showAllBtn = document.getElementById('show-all-btn');
    const stateButtonsContainer = document.getElementById('state-buttons');
    const editLoteModal = document.getElementById('edit-lote-modal');
    const editLoteForm = document.getElementById('edit-lote-form');
    const documentoDeliverySelect = document.getElementById('documento-delivery');

    const elements = {
        container, tableBody, prevBtn, nextBtn, pageInfo, totalRecords, exportExcelBtn,
        successModal, successIcon, successMessage, filterYearSelect, filterMonthSelect,
        showAllBtn, stateButtonsContainer, editLoteModal, editLoteForm, documentoDeliverySelect
    };

    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado`);
    });

    let currentUser = null;
    let lotes = [];
    let currentPage = 1;
    const recordsPerPage = 20;
    let quickFilters = { year: new Date().getFullYear().toString(), month: (new Date().getMonth() + 1).toString().padStart(2, '0'), state: null };
    let isLoading = false;
    let cargosUnsubscribe = null;

    const monthNames = {
        '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
        '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    };

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

    async function isAdmin() {
        try {
            if (!currentUser) return false;
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                console.error('Documento de usuario no encontrado para UID:', currentUser.uid);
                return false;
            }
            const userData = userSnap.data();
            const role = userData.role || '';
            return role === 'Administrador';
        } catch (error) {
            console.error('Error al verificar si el usuario es administrador:', error);
            return false;
        }
    }

    async function loadGuiasForSelect() {
        try {
            const guiasCollection = collection(db, 'guias');
            const querySnapshot = await getDocs(guiasCollection);
            if (!documentoDeliverySelect) {
                console.warn('Select de documento-delivery no encontrado');
                return;
            }
            documentoDeliverySelect.innerHTML = '<option value="">Seleccione una guía</option>';
            const fragment = document.createDocumentFragment();
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const option = document.createElement('option');
                option.value = data.guiaDespacho || '';
                option.textContent = `${data.folio} (${data.guiaDespacho})`;
                fragment.appendChild(option);
            });
            documentoDeliverySelect.appendChild(fragment);
        } catch (error) {
            console.error('Error al cargar guías para select:', error.message);
            showSuccessMessage('Error al cargar guías para select: ' + error.message, false);
        }
    }

    async function getFolioForGuiaDespacho(guiaDespacho) {
        try {
            if (!guiaDespacho) return '-';
            const guiasCollection = collection(db, 'guias');
            const querySnapshot = await getDocs(guiasCollection);
            for (const doc of querySnapshot.docs) {
                const data = doc.data();
                if (data.guiaDespacho === guiaDespacho) {
                    return data.folio || '-';
                }
            }
            return '-';
        } catch (error) {
            console.error('Error al buscar folio para guía despacho:', error.message);
            return '-';
        }
    }

    async function checkAllCargadoForAdmision(admision) {
        try {
            if (!admision) return 'No';
            const cargosQuery = query(collection(db, 'cargosconsignacion'), where('admision', '==', admision));
            const querySnapshot = await getDocs(cargosQuery);
            if (querySnapshot.empty) {
                return 'No';
            }
            const allCargado = querySnapshot.docs.every(doc => {
                const data = doc.data();
                return data.estado === 'Cargado';
            });
            return allCargado ? 'Sí' : 'No';
        } catch (error) {
            console.error('Error al verificar estado de cargos para admisión:', error.message);
            return 'No';
        }
    }

    function formatDateOnly(date) {
        if (!date) return '-';
        let parsedDate;
        if (typeof date === 'string') {
            parsedDate = new Date(date);
        } else if (date instanceof Timestamp) {
            parsedDate = date.toDate();
        } else if (date instanceof Date) {
            parsedDate = date;
        }
        if (!parsedDate || isNaN(parsedDate)) return '-';
        return parsedDate.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-');
    }

    function showModal(modal) {
        if (!modal) {
            console.warn('Modal no encontrado');
            return;
        }
        modal.style.display = 'block';
        modal.removeAttribute('hidden');
    }

    function hideModal(modal) {
        if (!modal) {
            console.warn('Modal no encontrado');
            return;
        }
        modal.style.display = 'none';
        modal.setAttribute('hidden', 'true');
    }

    let lastErrorMessage = null;
    let lastErrorTime = 0;
    const ERROR_DEBOUNCE_MS = 3000;

    function showSuccessMessage(message, isSuccess = true) {
        if (!successModal || !successIcon || !successMessage) {
            console.warn('Elementos de éxito no encontrados');
            alert('Mensaje: ' + message);
            return;
        }
        const now = Date.now();
        if (isSuccess || (message !== lastErrorMessage || now - lastErrorTime > ERROR_DEBOUNCE_MS)) {
            successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
            successMessage.textContent = message;
            successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
            showModal(successModal);
            setTimeout(() => hideModal(successModal), 2000);
            if (!isSuccess) {
                lastErrorMessage = message;
                lastErrorTime = now;
            }
        }
    }

    function applyQuickFilters(data) {
        return data.filter(item => {
            if (!item.fechaCX) return false;
            let fechaCX;
            if (typeof item.fechaCX === 'string') {
                fechaCX = new Date(item.fechaCX);
            } else if (item.fechaCX instanceof Timestamp) {
                fechaCX = item.fechaCX.toDate();
            } else if (item.fechaCX instanceof Date) {
                fechaCX = item.fechaCX;
            }
            if (!fechaCX || isNaN(fechaCX)) return false;

            const year = fechaCX.getFullYear().toString();
            const month = (fechaCX.getMonth() + 1).toString().padStart(2, '0');

            const yearMatch = !quickFilters.year || year === quickFilters.year;
            const monthMatch = !quickFilters.month || month === quickFilters.month;
            const stateMatch = !quickFilters.state || item.estado === quickFilters.state;

            return yearMatch && monthMatch && stateMatch;
        });
    }

    function updateYearFilter(data) {
        if (!filterYearSelect) return;
        const years = [...new Set(data
            .filter(p => p?.fechaCX)
            .map(p => {
                let fechaCX;
                if (typeof p.fechaCX === 'string') fechaCX = new Date(p.fechaCX);
                else if (p.fechaCX instanceof Timestamp) fechaCX = p.fechaCX.toDate();
                else if (p.fechaCX instanceof Date) fechaCX = p.fechaCX;
                return fechaCX && !isNaN(fechaCX) ? fechaCX.getFullYear().toString() : null;
            })
            .filter(y => y)
        )].sort((a, b) => b - a);

        filterYearSelect.innerHTML = '<option value="">Todos los años</option>' + years.map(year => `<option value="${year}">${year}</option>`).join('');
        filterYearSelect.value = quickFilters.year || '';
    }

    function updateMonthFilter(data) {
        if (!filterMonthSelect) return;
        const months = [...new Set(data
            .filter(p => {
                if (!p.fechaCX) return false;
                let fechaCX;
                if (typeof p.fechaCX === 'string') fechaCX = new Date(p.fechaCX);
                else if (p.fechaCX instanceof Timestamp) fechaCX = p.fechaCX.toDate();
                else if (p.fechaCX instanceof Date) fechaCX = p.fechaCX;
                if (!fechaCX || isNaN(fechaCX)) return false;
                return !quickFilters.year || fechaCX.getFullYear().toString() === quickFilters.year;
            })
            .map(p => {
                let fechaCX;
                if (typeof p.fechaCX === 'string') fechaCX = new Date(p.fechaCX);
                else if (p.fechaCX instanceof Timestamp) fechaCX = p.fechaCX.toDate();
                return fechaCX ? (fechaCX.getMonth() + 1).toString().padStart(2, '0') : '';
            })
            .filter(m => m)
        )].sort();

        filterMonthSelect.innerHTML = '<option value="">Todos los meses</option>' + months.map(month => `<option value="${month}" title="${monthNames[month]}">${monthNames[month]}</option>`).join('');
        filterMonthSelect.value = quickFilters.month || '';
    }

    function updateStateButtons(data) {
        if (!stateButtonsContainer) return;
        const filteredLotes = applyQuickFilters(data);
        const states = [...new Set(filteredLotes
            .map(p => p.estado)
            .filter(s => s)
        )].sort();

        stateButtonsContainer.innerHTML = states.map(state => {
            const stateClass = state.toLowerCase().replace(/\s+/g, '-');
            const isActive = state === quickFilters.state ? 'active' : '';
            return `<button class="state-button ${isActive}" data-state="${state}">${state}</button>`;
        }).join('');

        const stateButtons = stateButtonsContainer.querySelectorAll('.state-button');
        stateButtons.forEach(button => {
            button.addEventListener('click', () => {
                const state = button.dataset.state;
                quickFilters.state = quickFilters.state === state ? null : state;
                stateButtons.forEach(btn => btn.classList.remove('active'));
                if (quickFilters.state) button.classList.add('active');
                loadLotes();
            });
        });
    }

    function updatePagination(total) {
        if (!pageInfo || !totalRecords || !prevBtn || !nextBtn) return;
        const totalPages = Math.ceil(total / recordsPerPage);
        totalRecords.textContent = total;
        pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    async function syncLotesFromAsignaciones() {
        try {
            const asignacionesCollection = collection(db, 'asignaciones');
            const q = query(asignacionesCollection);
            cargosUnsubscribe = onSnapshot(q, async (snapshot) => {
                console.debug('Cambios detectados en asignaciones');
                for (const change of snapshot.docChanges()) {
                    const asignacion = change.doc.data();
                    const asignacionId = change.doc.id;
                    if (change.type === 'added' || change.type === 'modified') {
                        const loteData = {
                            admision: asignacion.admision || '-',
                            nombrePaciente: asignacion.nombrePaciente || '-',
                            fechaCX: asignacion.fechaCX || null,
                            documentoDelivery: asignacion.documentoDelivery || '-',
                            insumoDevuelto: asignacion.insumoDevuelto || '-',
                            cantidad: asignacion.cantidad || 0,
                            cargado: asignacion.cargado || false,
                            estado: asignacion.estado || '-',
                            fechaCreacion: asignacion.fechaCreacion || Timestamp.now()
                        };
                        console.debug(`Sincronizando lote para asignación ${asignacionId}:`, loteData);
                        await setDoc(doc(db, 'lotes', asignacionId), loteData);
                    } else if (change.type === 'removed') {
                        console.debug(`Asignación eliminada: ${asignacionId}, no se elimina lote`);
                    }
                }
                await debouncedLoadLotes();
            }, error => {
                console.error('Error en onSnapshot de asignaciones:', error.message);
                showSuccessMessage('Error al sincronizar lotes: ' + error.message, false);
            });
        } catch (error) {
            console.error('Error al sincronizar lotes:', error.message);
            showSuccessMessage('Error al sincronizar lotes: ' + error.message, false);
        }
    }

    const debouncedLoadLotes = debounce(loadLotes, 500);

    async function loadLotes() {
        if (isLoading) {
            return;
        }
        isLoading = true;

        try {
            if (!tableBody) {
                console.error('No se encontró la tabla de lotes');
                showSuccessMessage('Error: No se encontró la tabla de lotes', false);
                return;
            }

            const lotesCollection = collection(db, 'lotes');
            const q = query(lotesCollection, orderBy('fechaCreacion', 'desc'));
            const querySnapshot = await getDocs(q);
            lotes = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                lotes.push({ docId: doc.id, ...data });
            });
            console.debug('Lotes cargados:', lotes.length);

            await loadGuiasForSelect();

            updateYearFilter(lotes);
            updateMonthFilter(lotes);
            updateStateButtons(lotes);

            let filteredLotes = applyQuickFilters(lotes);
            console.debug('Lotes filtrados:', filteredLotes.length);
            const startIndex = (currentPage - 1) * recordsPerPage;
            const endIndex = startIndex + recordsPerPage;
            const paginatedLotes = filteredLotes.slice(startIndex, endIndex);

            const isUserAdmin = await isAdmin();
            const fragment = document.createDocumentFragment();
            tableBody.innerHTML = '';

            for (const lote of paginatedLotes) {
                const estado = lote.estado || '';
                const estadoClass = estado ? `state-${estado.toLowerCase().replace(/\s+/g, '-')}` : '';
                const folio = await getFolioForGuiaDespacho(lote.documentoDelivery);
                const cargado = await checkAllCargadoForAdmision(lote.admision);
                const tr = document.createElement('tr');
                tr.dataset.loteId = lote.docId;
                tr.className = estadoClass;
                if (cargado === 'Sí') {
                    tr.classList.add('state-cargado');
                }
                tr.innerHTML = `
                    <td>${lote.admision || '-'}</td>
                    <td>${lote.nombrePaciente || '-'}</td>
                    <td>${formatDateOnly(lote.fechaCX)}</td>
                    <td class="editable">${lote.documentoDelivery || '-'}</td>
                    <td class="editable">${lote.insumoDevuelto || '-'}</td>
                    <td class="editable">${lote.cantidad || '-'}</td>
                    <td class="editable ${isUserAdmin ? 'admin-only' : ''}">${cargado}</td>
                    <td class="editable ${isUserAdmin ? 'admin-only' : ''}">${lote.estado || '-'}</td>
                    <td>${folio}</td>
                `;
                fragment.appendChild(tr);
            }

            tableBody.appendChild(fragment);
            updatePagination(filteredLotes.length);

            const editableCells = tableBody.querySelectorAll('td.editable');
            editableCells.forEach(cell => {
                cell.addEventListener('dblclick', () => handleCellDoubleClick(cell, isUserAdmin));
            });
        } catch (error) {
            console.error('Error al cargar lotes:', error.message);
            showSuccessMessage('Error al cargar lotes: ' + error.message, false);
        } finally {
            isLoading = false;
        }
    }

    function listenCargosChanges() {
        if (cargosUnsubscribe) {
            cargosUnsubscribe();
        }

        const cargosCollection = collection(db, 'cargosconsignacion');
        cargosUnsubscribe = onSnapshot(cargosCollection, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'modified' || change.type === 'added' || change.type === 'removed') {
                    const cargoData = change.doc.data();
                    const admision = cargoData.admision;
                    if (admision) {
                        debouncedLoadLotes();
                    }
                }
            }
        }, (error) => {
            console.error('Error al escuchar cambios en cargos:', error.message);
            showSuccessMessage('Error al sincronizar estados: ' + error.message, false);
        });
    }

    function cleanup() {
        if (cargosUnsubscribe) {
            cargosUnsubscribe();
            cargosUnsubscribe = null;
        }
    }

    async function handleCellDoubleClick(cell, isUserAdmin) {
        if (!editLoteModal || !editLoteForm) {
            console.error('Modal de edición o formulario no encontrado');
            showSuccessMessage('Error: No se encontró el formulario de edición', false);
            return;
        }

        const row = cell.closest('tr');
        const loteId = row.dataset.loteId;
        const lote = lotes.find(l => l.docId === loteId);
        if (!lote) {
            console.error('Lote no encontrado para ID:', loteId);
            showSuccessMessage('Error: No se encontró el lote', false);
            return;
        }

        await loadGuiasForSelect();
        editLoteForm['documentoDelivery'].value = lote.documentoDelivery || '';
        editLoteForm['insumoDevuelto'].value = lote.insumoDevuelto || '';
        editLoteForm['cantidad'].value = lote.cantidad || '';
        if (isUserAdmin) {
            editLoteForm['cargado'].value = lote.cargado ? 'true' : 'false';
            editLoteForm['estado'].value = lote.estado || '';
            editLoteForm.classList.add('admin');
        } else {
            editLoteForm.classList.remove('admin');
        }

        showModal(editLoteModal);

        const submitHandler = async (e) => {
            e.preventDefault();
            try {
                const updatedData = {
                    documentoDelivery: editLoteForm['documentoDelivery'].value || '-',
                    insumoDevuelto: editLoteForm['insumoDevuelto'].value || '-',
                    cantidad: parseInt(editLoteForm['cantidad'].value) || 0
                };
                if (isUserAdmin) {
                    updatedData.cargado = editLoteForm['cargado'].value === 'true';
                    updatedData.estado = editLoteForm['estado'].value || '-';
                }
                const loteRef = doc(db, 'lotes', loteId);
                await updateDoc(loteRef, updatedData);
                showSuccessMessage('Lote actualizado correctamente');
                hideModal(editLoteModal);
                await debouncedLoadLotes();
            } catch (error) {
                console.error('Error al actualizar el lote:', error.message);
                showSuccessMessage('Error al actualizar el lote: ' + error.message, false);
            }
            editLoteForm.removeEventListener('submit', submitHandler);
        };

        const cancelBtn = editLoteForm.querySelector('.form-btn.cancel');
        const cancelHandler = () => {
            hideModal(editLoteModal);
            editLoteForm.removeEventListener('submit', submitHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        };

        editLoteForm.addEventListener('submit', submitHandler);
        cancelBtn.addEventListener('click', cancelHandler);
    }

    async function exportToExcel() {
        try {
            if (!window.XLSX || !window.XLSX.utils || !window.XLSX.utils.json_to_sheet) {
                throw new Error('Biblioteca XLSX no está cargada correctamente');
            }
            const filteredLotes = applyQuickFilters(lotes);
            const data = [];
            for (const lote of filteredLotes) {
                const folio = await getFolioForGuiaDespacho(lote.documentoDelivery);
                const cargado = await checkAllCargadoForAdmision(lote.admision);
                data.push({
                    Admisión: lote.admision || '-',
                    'Nombre Paciente': lote.nombrePaciente || '-',
                    'Fecha Cx': formatDateOnly(lote.fechaCX),
                    'Documento Delivery': lote.documentoDelivery || '-',
                    'Insumo Devuelto': lote.insumoDevuelto || '-',
                    Cantidad: lote.cantidad || '-',
                    Cargado: cargado,
                    Estado: lote.estado || '-',
                    Guía: folio
                });
            }
            const worksheet = window.XLSX.utils.json_to_sheet(data);
            const workbook = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Lotes');
            window.XLSX.writeFile(workbook, 'lotes.xlsx');
        } catch (error) {
            console.error('Error al exportar a Excel:', error.message);
            showSuccessMessage('Error al exportar a Excel: ' + error.message, false);
        }
    }

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            debouncedLoadLotes();
            syncLotesFromAsignaciones();
            listenCargosChanges();
        } else {
            console.warn('Usuario no autenticado');
            showSuccessMessage('Por favor, inicia sesión para continuar', false);
        }
    });

    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            debouncedLoadLotes();
        }
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
        currentPage++;
        debouncedLoadLotes();
    });

    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);

    if (filterYearSelect) filterYearSelect.addEventListener('change', () => {
        quickFilters.year = filterYearSelect.value || null;
        updateMonthFilter(lotes);
        debouncedLoadLotes();
    });

    if (filterMonthSelect) filterMonthSelect.addEventListener('change', () => {
        quickFilters.month = filterMonthSelect.value || null;
        debouncedLoadLotes();
    });

    if (showAllBtn) showAllBtn.addEventListener('click', () => {
        quickFilters = { year: null, month: null, state: null };
        filterYearSelect.value = '';
        filterMonthSelect.value = '';
        stateButtonsContainer.innerHTML = '';
        debouncedLoadLotes();
    });

    window.addEventListener('beforeunload', cleanup);

} catch (error) {
    console.error('Error inicializando la aplicación:', error.message);
    alert('Error al inicializar la aplicación: ' + error.message);
}