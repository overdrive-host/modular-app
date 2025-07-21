import { getFirestore, collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, Timestamp, writeBatch, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

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

    // DOM Elements
    const container = document.querySelector('.pacientesimplantes-container');
    const pacienteForm = document.getElementById('paciente-form');
    const pacientesTableBody = document.querySelector('#pacientesimplantes-table tbody');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const totalRecords = document.getElementById('total-records');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const editModal = document.getElementById('edit-paciente-modal');
    const editAtributoSelect = document.getElementById('edit-atributo');
    const editPrevisionInput = document.getElementById('edit-prevision');
    const editConvenioInput = document.getElementById('edit-convenio');
    const editAdmisionInput = document.getElementById('edit-admision');
    const editNombrePacienteInput = document.getElementById('edit-nombrePaciente');
    const editMedicoInput = document.getElementById('edit-medico');
    const editFechaCXInput = document.getElementById('edit-fechaCX');
    const editProveedorInput = document.getElementById('edit-proveedor');
    const editEstadoSelect = document.getElementById('edit-estado');
    const editFechaCargoInput = document.getElementById('edit-fechaCargo');
    const editInformeInput = document.getElementById('edit-informe');
    const editTotalCotizacionInput = document.getElementById('edit-totalCotización');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const deleteModal = document.getElementById('delete-paciente-modal');
    const deleteMessage = document.getElementById('delete-message');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const logModal = document.getElementById('log-modal');
    const logContent = document.getElementById('log-content');
    const closeLogBtn = document.getElementById('close-log-btn');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const changeStateModal = document.getElementById('change-state-modal');
    const changeStateSelect = document.getElementById('change-state-select');
    const saveStateBtn = document.getElementById('save-state-btn');
    const cancelStateBtn = document.getElementById('cancel-state-btn');
    const filterYearSelect = document.getElementById('filter-year');
    const filterMonthSelect = document.getElementById('filter-month');
    const showAllBtn = document.getElementById('show-all-btn');
    const stateButtonsContainer = document.getElementById('state-buttons');

    let currentUser = null;
    let currentEditId = null;
    let currentStateChangeId = null;
    let pacientes = [];
    let medicos = [];
    let proveedores = [];
    let currentPage = 1;
    const recordsPerPage = 20;
    let filters = {};
    let quickFilters = { year: new Date().getFullYear().toString(), month: (new Date().getMonth() + 1).toString().padStart(2, '0'), state: null };

    const monthNames = {
        '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
        '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    };

    function formatDate(date) {
        return date.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
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
        return parsedDate.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).split('/').join('-');
    }

    function formatDateForInput(date) {
        if (!date) return '';
        let parsedDate;
        if (typeof date === 'string') {
            parsedDate = new Date(date);
        } else if (date instanceof Timestamp) {
            parsedDate = date.toDate();
        } else if (date instanceof Date) {
            parsedDate = date;
        }
        if (!parsedDate || isNaN(parsedDate)) return '';
        return parsedDate.toISOString().split('T')[0];
    }

    function formatPrice(value) {
        return value ? parseInt(value).toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '-';
    }

    function showModal(modal) {
        if (!modal) {
            console.warn('Modal no encontrado');
            return;
        }
        modal.style.display = 'flex';
        modal.removeAttribute('hidden');
    }

    function hideModal(modal) {
        if (!modal) {
            console.warn('Modal no encontrado');
            return;
        }
        modal.style.display = 'none';
        modal.setAttribute('hidden', true);
    }

    function showSuccessMessage(message, isSuccess = true) {
        if (!successModal || !successIcon || !successMessage) {
            console.warn('Elementos de éxito no encontrados');
            alert(message);
            return;
        }
        successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
        successMessage.textContent = message;
        successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
        showModal(successModal);
        setTimeout(() => hideModal(successModal), 2000);
    }

    async function getUserFullName() {
        if (!currentUser) throw new Error('No se encontró el usuario autenticado');
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
        return userSnap.data().fullName || 'Usuario Desconocido';
    }

    async function fetchReporteByAdmision(admision) {
        try {
            if (!admision) {
                console.warn('Admisión vacía');
                return null;
            }
            let reportesQuery = query(
                collection(db, 'reportesPabellon'),
                where('admision', '==', admision.trim())
            );
            const reportesSnapshot = await getDocs(reportesQuery);
            if (reportesSnapshot.empty) {
                showSuccessMessage(`No se encontró la admisión ${admision}`, false);
                return null;
            }
            const reporte = reportesSnapshot.docs[0].data();
            const result = {
                prevision: reporte.isapre || '',
                convenio: reporte.convenio || '',
                medico: reporte.primerCirujano || '',
                fechaCX: reporte.fecha || null
            };
            return result;
        } catch (error) {
            console.error('Error en fetchReporteByAdmision:', error);
            showSuccessMessage(`Error: ${error.message}`, false);
            return null;
        }
    }

    async function fetchMedicos() {
        try {
            if (!currentUser) {
                console.warn('No hay usuario autenticado en fetchMedicos');
                return [];
            }
            const medicosQuery = query(collection(db, 'medicos'), where('uid', '==', currentUser.uid));
            const medicosSnapshot = await getDocs(medicosQuery);
            medicos = [];
            medicosSnapshot.forEach(doc => {
                const data = doc.data();
                medicos.push({ docId: doc.id, nombreMedico: data.nombreMedico || '' });
            });
            return medicos;
        } catch (error) {
            console.error('Error al cargar médicos:', error);
            showSuccessMessage('Error al cargar médicos: ' + error.message, false);
            return [];
        }
    }

    async function fetchProveedores() {
        try {
            if (!currentUser) {
                console.warn('No hay usuario autenticado en fetchProveedores');
                return [];
            }
            const proveedoresQuery = query(
                collection(db, 'empresas'),
                where('uid', '==', currentUser.uid),
                where('estado', '==', 'Activo'),
                orderBy('nombreEmpresa')
            );
            const proveedoresSnapshot = await getDocs(proveedoresQuery);
            proveedores = [];
            proveedoresSnapshot.forEach(doc => {
                const data = doc.data();
                proveedores.push({
                    docId: doc.id,
                    nombreEmpresa: data.nombreEmpresa || '',
                    rutEmpresa: data.rutEmpresa || ''
                });
            });
            return proveedores;
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
            showSuccessMessage('Error al cargar proveedores: ' + error.message, false);
            return [];
        }
    }

    async function loadEmpresas() {
        try {
            const empresasCollection = collection(db, 'empresas');
            const querySnapshot = await getDocs(query(empresasCollection, where('estado', '==', 'Activo'), orderBy('nombreEmpresa')));
            const empresas = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (data.nombreEmpresa) {
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
        let filteredEmpresas = showAll || inputValue ? empresas : [];
        filteredEmpresas = filteredEmpresas.filter(emp => emp.toLowerCase().includes(inputValue.toLowerCase()));
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

    async function setupProveedorAutocomplete(inputId, suggestionsListId) {
        const input = document.getElementById(inputId);
        const suggestionsList = document.getElementById(suggestionsListId);
        const icon = input.parentElement.querySelector('.icon-list');
        if (!input || !suggestionsList || !icon) {
            console.error(`Elementos ${inputId}, ${suggestionsListId} o icon-list no encontrados`);
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

    function setupAutocomplete(inputId, listId, dataArray, fieldName, targetInputId = null) {
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        if (!input || !list) {
            console.error(`Elementos ${inputId} o ${listId} no encontrados`);
            return;
        }

        input.addEventListener('input', () => {
            const value = input.value.trim().toLowerCase();
            list.innerHTML = '';
            if (!value) return;

            const filteredData = dataArray.filter(item => 
                item[fieldName].toLowerCase().includes(value)
            );

            filteredData.forEach(item => {
                const div = document.createElement('div');
                div.textContent = item[fieldName];
                div.addEventListener('click', () => {
                    input.value = item[fieldName];
                    if (targetInputId) {
                        document.getElementById(targetInputId).value = item[fieldName];
                    }
                    list.innerHTML = '';
                });
                list.appendChild(div);
            });
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !list.contains(e.target)) {
                list.innerHTML = '';
            }
        });
    }

    function applyFilters(data) {
        return data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = item[key]?.toString().toLowerCase() || '';
                return itemValue.includes(value.toLowerCase());
            });
        });
    }

    function applyQuickFilters(data) {
        return data.filter(item => {
            // Si no hay filtros de año, mes o estado, devolver todos los registros
            if (!quickFilters.year && !quickFilters.month && !quickFilters.state) {
                return true;
            }

            // Validar fechaCX
            let fechaCX;
            if (typeof item.fechaCX === 'string') {
                fechaCX = new Date(item.fechaCX);
            } else if (item.fechaCX instanceof Timestamp) {
                fechaCX = item.fechaCX.toDate();
            } else if (item.fechaCX instanceof Date) {
                fechaCX = item.fechaCX;
            }

            // Si no hay fechaCX y se está filtrando por año o mes, excluir el registro
            if ((quickFilters.year || quickFilters.month) && (!fechaCX || isNaN(fechaCX))) {
                return false;
            }

            const year = fechaCX ? fechaCX.getFullYear().toString() : null;
            const month = fechaCX ? (fechaCX.getMonth() + 1).toString().padStart(2, '0') : null;

            const yearMatch = !quickFilters.year || (year && year === quickFilters.year);
            const monthMatch = !quickFilters.month || (month && month === quickFilters.month);
            const stateMatch = !quickFilters.state || item.estado === quickFilters.state;

            return yearMatch && monthMatch && stateMatch;
        });
    }

    function updateYearFilter(data) {
        if (!filterYearSelect) return;
        const years = [...new Set(data
            .filter(p => p.fechaCX)
            .map(p => {
                let fechaCX;
                if (typeof p.fechaCX === 'string') {
                    fechaCX = new Date(p.fechaCX);
                } else if (p.fechaCX instanceof Timestamp) {
                    fechaCX = p.fechaCX.toDate();
                } else if (p.fechaCX instanceof Date) {
                    fechaCX = p.fechaCX;
                }
                return fechaCX && !isNaN(fechaCX) ? fechaCX.getFullYear().toString() : null;
            })
            .filter(y => y !== null)
        )].sort((a, b) => b - a);

        filterYearSelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
        filterYearSelect.value = quickFilters.year || new Date().getFullYear().toString();
    }

    function updateMonthFilter(data) {
        if (!filterMonthSelect) return;
        let months;
        if (!quickFilters.year) {
            // Mostrar todos los meses (01 a 12) si no hay un año seleccionado
            months = Object.keys(monthNames).sort();
        } else {
            // Filtrar meses según el año seleccionado
            months = [...new Set(data
                .filter(p => {
                    if (!p.fechaCX) return false;
                    let fechaCX;
                    if (typeof p.fechaCX === 'string') {
                        fechaCX = new Date(p.fechaCX);
                    } else if (p.fechaCX instanceof Timestamp) {
                        fechaCX = p.fechaCX.toDate();
                    } else if (p.fechaCX instanceof Date) {
                        fechaCX = p.fechaCX;
                    }
                    if (!fechaCX || isNaN(fechaCX)) return false;
                    return fechaCX.getFullYear().toString() === quickFilters.year;
                })
                .map(p => {
                    let fechaCX;
                    if (typeof p.fechaCX === 'string') {
                        fechaCX = new Date(p.fechaCX);
                    } else if (p.fechaCX instanceof Timestamp) {
                        fechaCX = p.fechaCX.toDate();
                    } else if (p.fechaCX instanceof Date) {
                        fechaCX = p.fechaCX;
                    }
                    return (fechaCX.getMonth() + 1).toString().padStart(2, '0');
                })
            )].sort();
        }

        filterMonthSelect.innerHTML = months.map(month => `<option value="${month}">${monthNames[month]}</option>`).join('');
        // Si no hay año seleccionado, no establecer un valor predeterminado para el mes
        if (!quickFilters.year) {
            filterMonthSelect.value = quickFilters.month || '';
        } else {
            const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
            filterMonthSelect.value = months.includes(currentMonth) && quickFilters.year === new Date().getFullYear().toString() ? currentMonth : months[0] || '';
        }
        quickFilters.month = filterMonthSelect.value || null;
    }

    function updateStateButtons(data) {
        if (!stateButtonsContainer) return;
        const filteredData = applyQuickFilters(data);
        const states = [...new Set(filteredData
            .map(p => p.estado)
            .filter(s => s)
        )].sort();

        stateButtonsContainer.innerHTML = states.map(state => {
            const stateClass = state.toLowerCase().replace(/\s+/g, '-');
            return `<button class="state-button ${quickFilters.state === state ? 'active' : ''}" data-state="${stateClass}">${state}</button>`;
        }).join('');

        const stateButtons = stateButtonsContainer.querySelectorAll('.state-button');
        stateButtons.forEach(button => {
            button.addEventListener('click', () => {
                const state = button.textContent;
                quickFilters.state = quickFilters.state === state ? null : state;
                stateButtons.forEach(btn => btn.classList.remove('active'));
                if (quickFilters.state) button.classList.add('active');
                loadPacientes();
            });
        });
    }

    function updatePagination(totalRecordsCount) {
        if (!pageInfo || !totalRecords || !prevBtn || !nextBtn) return;
        const totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    async function loadPacientes() {
        try {
            if (!pacientesTableBody) {
                console.error('Tabla de pacientes no encontrada');
                showSuccessMessage('Error: tabla no encontrada', false);
                return;
            }

            const pacientesCollection = collection(db, 'pacientesimplantes');
            const q = query(pacientesCollection, where('uid', '==', currentUser.uid), orderBy('fechaIngreso', 'desc'));
            const querySnapshot = await getDocs(q);
            pacientesTableBody.innerHTML = '';
            pacientes = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                pacientes.push({ docId: doc.id, ...data });
            });

            updateYearFilter(pacientes);
            updateMonthFilter(pacientes);
            updateStateButtons(pacientes);

            let filteredPacientes = applyQuickFilters(pacientes);
            filteredPacientes = applyFilters(filteredPacientes);

            const startIndex = (currentPage - 1) * recordsPerPage;
            const endIndex = startIndex + recordsPerPage;
            const paginatedPacientes = filteredPacientes.slice(startIndex, endIndex);

            paginatedPacientes.forEach(paciente => {
                const tr = document.createElement('tr');
                const estado = paciente.estado || '';
                const estadoClass = estado ? `state-${estado.toLowerCase().replace(/\s+/g, '-')}` : '';
                tr.className = estadoClass;
                tr.innerHTML = `
                    <td>
                        <i class="fas fa-edit action-icon" data-id="${paciente.docId}" title="Editar"></i>
                        <i class="fas fa-trash action-icon" data-id="${paciente.docId}" title="Eliminar"></i>
                        <i class="fas fa-history action-icon" data-id="${paciente.docId}" title="Historial"></i>
                    </td>
                    <td>${formatDateOnly(paciente.fechaIngreso)}</td>
                    <td>${paciente.atributo || '-'}</td>
                    <td>${paciente.prevision || '-'}</td>
                    <td>${paciente.convenio || '-'}</td>
                    <td>${paciente.admision || '-'}</td>
                    <td>${paciente.nombrePaciente || '-'}</td>
                    <td>${paciente.medico || '-'}</td>
                    <td>${formatDateOnly(paciente.fechaCX)}</td>
                    <td>${paciente.proveedor || '-'}</td>
                    <td class="estado-cell" data-id="${paciente.docId}">${paciente.estado || '-'}</td>
                    <td>${formatDateOnly(paciente.fechaCargo)}</td>
                    <td>${paciente.informe || '-'}</td>
                    <td>${formatPrice(paciente.totalCotizacion)}</td>
                `;
                pacientesTableBody.appendChild(tr);
            });

            updatePagination(filteredPacientes.length);
        } catch (error) {
            console.error('Error al cargar pacientes:', error);
            showSuccessMessage('Error al cargar pacientes: ' + error.message, false);
        }
    }

    function openEditModal(paciente) {
        if (!editModal) return;
        currentEditId = paciente.docId;
        editAtributoSelect.value = paciente.atributo || 'Implantes';
        editPrevisionInput.value = paciente.prevision || '';
        editConvenioInput.value = paciente.convenio || '';
        editAdmisionInput.value = paciente.admision || '';
        editNombrePacienteInput.value = paciente.nombrePaciente || '';
        editMedicoInput.value = paciente.medico || '';
        editFechaCXInput.value = formatDateForInput(paciente.fechaCX);
        editProveedorInput.value = paciente.proveedor || '';
        editEstadoSelect.value = paciente.estado || 'Actualizar Precio';
        editFechaCargoInput.value = formatDateForInput(paciente.fechaCargo);
        editInformeInput.value = paciente.informe || '';
        editTotalCotizacionInput.value = paciente.totalCotizacion ? parseInt(paciente.totalCotizacion).toLocaleString('es-CL') : '';
        showModal(editModal);
    }

    function openChangeStateModal(paciente) {
        if (!changeStateModal || !changeStateSelect) return;
        currentStateChangeId = paciente.docId;
        changeStateSelect.value = paciente.estado || 'Actualizar Precio';
        showModal(changeStateModal);
    }

    function openDeleteModal(paciente) {
        if (!deleteModal || !deleteMessage) return;
        deleteMessage.textContent = `¿Eliminar paciente "${paciente?.nombrePaciente || 'Sin nombre'}"?`;
        confirmDeleteBtn.dataset.id = paciente.docId;
        showModal(deleteModal);
    }

    async function loadLogs(pacienteId) {
        if (!logContent) return;
        try {
            const logsCollection = collection(db, 'pacientesimplantes', pacienteId, 'logs');
            const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
            const logsSnapshot = await getDocs(logsQuery);
            logContent.innerHTML = '';
            if (logsSnapshot.empty) {
                logContent.innerHTML = '<p>No hay registros.</p>';
            } else {
                logsSnapshot.forEach(doc => {
                    const logData = doc.data();
                    const timestamp = logData.timestamp?.toDate?.() || new Date();
                    const fechaDisplay = timestamp ? formatDate(timestamp) : 'Sin fecha';
                    let action = logData.action;
                    if (action.startsWith('Creado:')) action = 'Creación';
                    else if (action.startsWith('Actualizado:')) action = 'Modificado';
                    else if (action.startsWith('Eliminado:')) action = 'Eliminado';
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

    function setupFilters() {
        const filterIcons = document.querySelectorAll('.filter-icon');
        filterIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const column = icon.dataset.column;
                const th = icon.closest('th');
                let inputContainer = th.querySelector('.filter-input-container');

                if (inputContainer) {
                    inputContainer.remove();
                    icon.classList.remove('fa-filter-circle-xmark');
                    icon.classList.add('fa-filter');
                    delete filters[column];
                    currentPage = 1;
                    loadPacientes();
                    return;
                }

                inputContainer = document.createElement('div');
                inputContainer.className = 'filter-input-container';
                const input = document.createElement('input');
                input.type = 'text';
                input.value = filters[column] || '';
                input.addEventListener('input', () => {
                    filters[column] = input.value.trim();
                    currentPage = 1;
                    loadPacientes();
                });
                inputContainer.appendChild(input);
                th.appendChild(inputContainer);
                input.focus();

                icon.classList.remove('fa-filter');
                icon.classList.add('fa-filter-circle-xmark');

                document.addEventListener('click', (e) => {
                    if (!th.contains(e.target) && !inputContainer.contains(e.target)) {
                        inputContainer.remove();
                        icon.classList.remove('fa-filter-circle-xmark');
                        icon.classList.add('fa-filter');
                        if (!filters[column]) {
                            delete filters[column];
                            currentPage = 1;
                            loadPacientes();
                        }
                    }
                }, { once: true });
            });
        });
    }

    function setupQuickFilters() {
        if (filterYearSelect) {
            filterYearSelect.addEventListener('change', () => {
                quickFilters.year = filterYearSelect.value;
                quickFilters.month = null;
                quickFilters.state = null;
                currentPage = 1;
                loadPacientes();
            });
        }

        if (filterMonthSelect) {
            filterMonthSelect.addEventListener('change', () => {
                quickFilters.month = filterMonthSelect.value || null;
                quickFilters.state = null;
                currentPage = 1;
                loadPacientes();
            });
        }

        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
                quickFilters.year = null;
                quickFilters.month = null;
                quickFilters.state = null;
                currentPage = 1;
                loadPacientes();
            });
        }
    }

    function setupAdmisionAutocomplete() {
        const admisionInput = document.getElementById('admision');
        const previsionInput = document.getElementById('prevision');
        const convenioInput = document.getElementById('convenio');
        const medicoInput = document.getElementById('medico');
        const fechaCXInput = document.getElementById('fechaCX');

        if (!admisionInput || !previsionInput || !convenioInput || !medicoInput || !fechaCXInput) {
            console.error('Elementos de formulario no encontrados:', {
                admision: !!admisionInput,
                prevision: !!previsionInput,
                convenio: !!convenioInput,
                medico: !!medicoInput,
                fechaCX: !!fechaCXInput
            });
            return;
        }

        async function handleAdmisionInput() {
            const admision = admisionInput.value.trim();
            if (!admision) {
                previsionInput.value = '';
                convenioInput.value = '';
                medicoInput.value = '';
                fechaCXInput.value = '';
                return;
            }
            const reporte = await fetchReporteByAdmision(admision);
            if (reporte) {
                previsionInput.value = reporte.prevision || '';
                convenioInput.value = reporte.convenio || '';
                medicoInput.value = reporte.medico || '';
                fechaCXInput.value = formatDateForInput(reporte.fechaCX);
            } else {
                previsionInput.value = '';
                convenioInput.value = '';
                medicoInput.value = '';
                fechaCXInput.value = '';
            }
        }

        admisionInput.addEventListener('input', handleAdmisionInput);
    }

    function exportToExcel() {
        try {
            if (!pacientes.length) {
                showSuccessMessage('No hay datos para exportar', false);
                return;
            }
            let filteredPacientes = applyQuickFilters(pacientes);
            filteredPacientes = applyFilters(filteredPacientes);
            const data = filteredPacientes.map(p => ({
                'Fecha Creación': formatDateOnly(p.fechaIngreso),
                'Atributo': p.atributo || '',
                'Previsión': p.prevision || '',
                'Convenio': p.convenio || '',
                'Admisión': p.admision || '',
                'Nombre del Paciente': p.nombrePaciente || '',
                'Médico': p.medico || '',
                'Fecha de Cx': formatDateOnly(p.fechaCX),
                'Proveedor': p.proveedor || '',
                'Estado': p.estado || '',
                'Fecha de Cargo': formatDateOnly(p.fechaCargo),
                'Informe': p.informe || '',
                'Total Cotización': formatPrice(p.totalCotizacion)
            }));
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'PacientesImplantes');
            XLSX.writeFile(workbook, 'pacientesimplantes.xlsx');
        } catch (error) {
            console.error('Error al exportar a Excel:', error);
            showSuccessMessage('Error al exportar a Excel: ' + error.message, false);
        }
    }

    async function initAuthenticatedApp() {
        try {
            await Promise.all([fetchMedicos(), fetchProveedores()]);
            setupFilters();
            setupQuickFilters();
            setupAdmisionAutocomplete();

            if (document.getElementById('medico') && document.getElementById('medico-autocomplete-list')) {
                setupAutocomplete('medico', 'medico-autocomplete-list', medicos, 'nombreMedico');
            }
            if (document.getElementById('edit-medico') && document.getElementById('edit-medico-autocomplete-list')) {
                setupAutocomplete('edit-medico', 'edit-medico-autocomplete-list', medicos, 'nombreMedico');
            }

            if (document.getElementById('proveedor') && document.getElementById('proveedor-suggestions')) {
                await setupProveedorAutocomplete('proveedor', 'proveedor-suggestions');
            }
            if (document.getElementById('edit-proveedor') && document.getElementById('edit-proveedor-suggestions')) {
                await setupProveedorAutocomplete('edit-proveedor', 'edit-proveedor-suggestions');
            }

            await loadPacientes();
        } catch (error) {
            console.error('Error al inicializar la aplicación autenticada:', error);
            showSuccessMessage('Error al inicializar la aplicación: ' + error.message, false);
        }
    }

    async function initApp() {
        try {
            // Configurar listeners que no dependen de autenticación
            if (pacienteForm) {
                pacienteForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    if (!currentUser) {
                        showSuccessMessage('Usuario no autenticado', false);
                        return;
                    }
                    try {
                        const atributo = document.getElementById('atributo')?.value || 'Implantes';
                        const prevision = document.getElementById('prevision')?.value?.trim() || '';
                        const convenio = document.getElementById('convenio')?.value?.trim() || '';
                        const admision = document.getElementById('admision')?.value?.trim() || '';
                        const nombrePaciente = document.getElementById('nombrePaciente')?.value?.trim() || '';
                        const medico = document.getElementById('medico')?.value?.trim() || '';
                        const fechaCX = document.getElementById('fechaCX')?.value || '';
                        const proveedor = document.getElementById('proveedor')?.value?.trim() || '';
                        const estado = document.getElementById('estado')?.value || 'Actualizar Precio';
                        const fechaCargo = document.getElementById('fechaCargo')?.value || '';
                        const informe = document.getElementById('informe')?.value?.trim() || '';
                        let totalCotizacion = document.getElementById('totalCotización')?.value?.replace(/[^0-9]/g, '') || '0';
                        totalCotizacion = parseInt(totalCotizacion) || 0;

                        if (!atributo || !prevision || !convenio || !admision || !nombrePaciente || !medico || !fechaCX || !proveedor) {
                            showSuccessMessage('Complete todos los campos requeridos', false);
                            return;
                        }

                        const empresas = await loadEmpresas();
                        if (!empresas.includes(proveedor)) {
                            showSuccessMessage('Error: El proveedor ingresado no está registrado o no está activo', false);
                            return;
                        }

                        const fullName = await getUserFullName();
                        const now = Timestamp.fromDate(new Date());
                        const pacienteRef = doc(collection(db, 'pacientesimplantes'));
                        const batch = writeBatch(db);
                        batch.set(pacienteRef, {
                            atributo,
                            prevision,
                            convenio,
                            admision,
                            nombrePaciente,
                            medico,
                            fechaCX: fechaCX ? Timestamp.fromDate(new Date(fechaCX)) : null,
                            proveedor,
                            estado,
                            fechaCargo: fechaCargo ? Timestamp.fromDate(new Date(fechaCargo)) : null,
                            informe,
                            totalCotizacion,
                            usuario: fullName,
                            fechaIngreso: now,
                            fechaActualizada: now,
                            uid: currentUser.uid
                        });
                        const logRef = doc(collection(db, 'pacientesimplantes', pacienteRef.id, 'logs'));
                        batch.set(logRef, {
                            action: `Creado: ${formatDate(new Date(now.toDate()))}`,
                            details: `Paciente ${nombrePaciente} creado`,
                            timestamp: now,
                            user: fullName,
                            uid: currentUser.uid
                        });
                        await batch.commit();
                        pacienteForm.reset();
                        document.getElementById('atributo').value = 'Implantes';
                        showSuccessMessage('Paciente creado con éxito');
                        await loadPacientes();
                    } catch (error) {
                        console.error('Error al crear paciente:', error);
                        showSuccessMessage('Error al crear paciente: ' + error.message, false);
                    }
                });
            }

            if (saveEditBtn) {
                saveEditBtn.addEventListener('click', async () => {
                    if (!currentUser) {
                        showSuccessMessage('Usuario no autenticado', false);
                        return;
                    }
                    try {
                        const atributo = editAtributoSelect?.value || 'Implantes';
                        const prevision = editPrevisionInput?.value?.trim() || '';
                        const convenio = editConvenioInput?.value?.trim() || '';
                        const admision = editAdmisionInput?.value?.trim() || '';
                        const nombrePaciente = editNombrePacienteInput?.value?.trim() || '';
                        const medico = editMedicoInput?.value?.trim() || '';
                        const fechaCX = editFechaCXInput?.value || '';
                        const proveedor = editProveedorInput?.value?.trim() || '';
                        const estado = editEstadoSelect?.value || '';
                        const fechaCargo = editFechaCargoInput?.value || '';
                        const informe = editInformeInput?.value?.trim() || '';
                        let totalCotizacion = editTotalCotizacionInput?.value?.replace(/[^0-9]/g, '') || '0';
                        totalCotizacion = parseInt(totalCotizacion) || 0;

                        if (!atributo || !prevision || !convenio || !admision || !nombrePaciente || !medico || !fechaCX || !proveedor) {
                            showSuccessMessage('Complete todos los campos requeridos', false);
                            return;
                        }

                        const empresas = await loadEmpresas();
                        if (!empresas.includes(proveedor)) {
                            showSuccessMessage('Error: El proveedor ingresado no está registrado o no está activo', false);
                            return;
                        }

                        const fullName = await getUserFullName();
                        const now = Timestamp.fromDate(new Date());
                        const pacienteRef = doc(db, 'pacientesimplantes', currentEditId);
                        const logRef = doc(collection(db, 'pacientesimplantes', currentEditId, 'logs'));
                        const batch = writeBatch(db);
                        batch.update(pacienteRef, {
                            atributo,
                            prevision,
                            convenio,
                            admision,
                            nombrePaciente,
                            medico,
                            fechaCX: fechaCX ? Timestamp.fromDate(new Date(fechaCX)) : null,
                            proveedor,
                            estado,
                            fechaCargo: fechaCargo ? Timestamp.fromDate(new Date(fechaCargo)) : null,
                            informe,
                            totalCotizacion,
                            usuario: fullName,
                            fechaActualizada: now,
                            uid: currentUser.uid
                        });
                        batch.set(logRef, {
                            action: `Actualizado: ${formatDate(new Date(now.toDate()))}`,
                            details: `Paciente ${nombrePaciente} actualizado`,
                            timestamp: now,
                            user: fullName,
                            uid: currentUser.uid
                        });
                        await batch.commit();
                        hideModal(editModal);
                        showSuccessMessage('Paciente actualizado con éxito');
                        await loadPacientes();
                    } catch (error) {
                        console.error('Error al actualizar paciente:', error);
                        showSuccessMessage('Error al actualizar paciente: ' + error.message, false);
                    }
                });
            }

            if (cancelEditBtn) {
                cancelEditBtn.addEventListener('click', () => hideModal(editModal));
            }

            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', async () => {
                    if (!currentUser) {
                        showSuccessMessage('Usuario no válido', false);
                        return;
                    }
                    try {
                        const id = confirmDeleteBtn.dataset.id;
                        const paciente = pacientes.find(p => p.docId === id);
                        const fullName = await getUserFullName();
                        const now = Timestamp.fromDate(new Date());
                        const pacienteRef = doc(db, 'pacientesimplantes', id);
                        const logRef = doc(collection(db, 'pacientesimplantes', id, 'logs'));
                        const batch = writeBatch(db);
                        batch.delete(pacienteRef);
                        batch.set(logRef, {
                            action: `Eliminado: ${formatDate(new Date(now.toDate()))}`,
                            details: `Paciente ${paciente?.nombrePaciente || 'Sin nombre'} eliminado`,
                            timestamp: now,
                            user: fullName,
                            uid: currentUser.uid
                        });
                        await batch.commit();
                        hideModal(deleteModal);
                        showSuccessMessage('Paciente eliminado con éxito');
                        await loadPacientes();
                    } catch (error) {
                        console.error('Error al eliminar paciente:', error);
                        showSuccessMessage('Error al eliminar paciente: ' + error.message, false);
                    }
                });
            }

            if (cancelDeleteBtn) {
                cancelDeleteBtn.addEventListener('click', () => hideModal(deleteModal));
            }

            if (saveStateBtn) {
                saveStateBtn.addEventListener('click', async () => {
                    if (!currentUser) {
                        showSuccessMessage('Usuario no autenticado');
                        return;
                    }
                    try {
                        const estado = changeStateSelect?.value || '';
                        const fullName = await getUserFullName();
                        const now = Timestamp.fromDate(new Date());
                        const pacienteRef = doc(db, 'pacientesimplantes', currentStateChangeId);
                        const logRef = doc(collection(db, 'pacientesimplantes', currentStateChangeId, 'logs'));
                        const batch = writeBatch(db);
                        batch.update(pacienteRef, {
                            estado,
                            usuario: fullName,
                            fechaActualizada: now,
                            uid: currentUser.uid
                        });
                        batch.set(logRef, {
                            action: `Estado cambiado: ${formatDate(new Date(now.toDate()))}`,
                            details: `Estado cambiado a ${estado}`,
                            timestamp: now,
                            user: fullName,
                            uid: currentUser.uid
                        });
                        await batch.commit();
                        hideModal(changeStateModal);
                        showSuccessMessage('Estado cambiado con éxito');
                        await loadPacientes();
                    } catch (error) {
                        console.error('Error al cambiar estado:', error);
                        showSuccessMessage('Error al cambiar estado: ' + error.message, false);
                    }
                });
            }

            if (cancelStateBtn) {
                cancelStateBtn.addEventListener('click', () => hideModal(changeStateModal));
            }

            if (closeLogBtn) {
                closeLogBtn.addEventListener('click', () => hideModal(logModal));
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    if (currentPage > 1) {
                        currentPage--;
                        loadPacientes();
                    }
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    currentPage++;
                    loadPacientes();
                });
            }

            if (exportExcelBtn) {
                exportExcelBtn.addEventListener('click', exportToExcel);
            }

            pacientesTableBody.addEventListener('click', (e) => {
                const target = e.target;
                if (!target.classList.contains('action-icon')) return;
                const id = target.dataset.id;
                const paciente = pacientes.find(p => p.docId === id);
                if (!paciente) return;

                if (target.classList.contains('fa-edit')) {
                    openEditModal(paciente);
                } else if (target.classList.contains('fa-trash')) {
                    openDeleteModal(paciente);
                } else if (target.classList.contains('fa-history')) {
                    loadLogs(id);
                }
            });

            pacientesTableBody.addEventListener('click', (e) => {
                const estadoCell = e.target.closest('.estado-cell');
                if (!estadoCell) return;
                const id = estadoCell.dataset.id;
                const paciente = pacientes.find(p => p.docId === id);
                if (paciente) {
                    openChangeStateModal(paciente);
                }
            });

            // Configurar autenticación y manejar estado del usuario
            onAuthStateChanged(auth, user => {
                if (user) {
                    currentUser = user;
                    console.log('Usuario autenticado:', user.uid);
                    initAuthenticatedApp();
                } else {
                    currentUser = null;
                    pacientesTableBody.innerHTML = '';
                    showSuccessMessage('Usuario no autenticado', false);
                    console.log('No hay usuario autenticado');
                }
            });
        } catch (error) {
            console.error('Error al cargar la aplicación:', error);
            showSuccessMessage('Error al cargar la aplicación: ' + error.message, false);
        }
    }

    initApp();
} catch (error) {
    console.error('Error global:', error);
    alert('Error al cargar la aplicación global: ' + error.message);
}