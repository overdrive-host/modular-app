import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, getDocs, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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
        console.error('Error al configurar persistencia:', error.message);
    });

    const container = document.querySelector('.cargosconsignacion-container');
    const tableBody = document.querySelector('#cargosconsignacion-table tbody');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const totalRecords = document.getElementById('total-records');
    const loadingModal = document.getElementById('loading-modal');
    const loadingProgress = document.getElementById('loading-progress');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const filterYear = document.getElementById('filter-year');
    const filterMonth = document.getElementById('filter-month');
    const showAllBtn = document.getElementById('show-all-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const stateButtonsContainer = document.getElementById('state-buttons');

    const elements = {
        container, tableBody, prevBtn, nextBtn, pageInfo, totalRecords,
        loadingModal, loadingProgress, successModal, successIcon, successMessage,
        filterYear, filterMonth, showAllBtn, exportExcelBtn, stateButtonsContainer
    };

    let missingElements = [];
    Object.entries(elements).forEach(([key, el]) => {
        if (!el) missingElements.push(key);
    });
    if (missingElements.length > 0) {
        console.error('Elementos faltantes en el DOM:', missingElements.join(', '));
        if (container) {
            container.innerHTML = `<p>Error: Faltan elementos en la página (${missingElements.join(', ')}). Contacta al administrador.</p>`;
        } else {
            document.body.innerHTML = `<p>Error: No se encontró el contenedor .cargosconsignacion-container. Verifica el HTML.</p>`;
        }
        throw new Error(`Elementos faltantes: ${missingElements.join(', ')}`);
    }

    let currentUser = null;
    let fichas = [];
    let filteredFichas = [];
    let currentPage = 1;
    const recordsPerPage = 50;
    let totalPages = 1;
    let columnFilters = {};
    let yearFilter = '';
    let monthFilter = '';
    let stateFilter = '';
    let isInitialized = false;

    function generateStateColor(state) {
        let hash = 0;
        for (let i = 0; i < state.length; i++) {
            hash = state.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return {
            lightModeColor: `hsl(${hue}, 40%, 95%)`,
            darkModeColor: '#2d3748',
            lightModeHover: `hsl(${hue}, 40%, 85%)`,
            darkModeHover: '#4a5568',
            lightModeText: '#2d3748',
            darkModeText: '#e2e8f0'
        };
    }

    function formatDate(date) {
        if (typeof date === 'string') {
            if (!date.trim()) return '-';
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate)) {
                return parsedDate.toLocaleString('es-CL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
            return date.trim();
        }
        if (!date) return '-';
        let parsedDate;
        if (typeof date === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            parsedDate = new Date(excelEpoch.getTime() + date * 24 * 60 * 60 * 1000);
        } else if (date instanceof Date) {
            parsedDate = date;
        } else if (date && date.toDate) {
            parsedDate = date.toDate();
        }
        if (!parsedDate || isNaN(parsedDate)) {
            return '-';
        }
        return parsedDate.toLocaleString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function showModal(modal, progressElement = null, percentage = null) {
        if (!modal) {
            return;
        }
        modal.removeAttribute('hidden');
        modal.style.display = 'flex';
        if (progressElement && percentage !== null) {
            progressElement.textContent = `${percentage}%`;
        }
    }

    function hideModal(modal) {
        if (!modal) {
            return;
        }
        modal.setAttribute('hidden', true);
        modal.style.display = 'none';
    }

    function showSuccessMessage(message, isSuccess = true) {
        if (!successModal || !successIcon || !successMessage) {
            alert(message);
            return;
        }
        successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
        successMessage.textContent = message;
        successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
        showModal(successModal);
        setTimeout(() => hideModal(successModal), 2000);
    }

    async function fetchHistoricoData() {
        try {
            const historicoCollection = collection(db, 'datos_historico');
            const querySnapshot = await getDocs(historicoCollection);
            const historicoData = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                historicoData.push({
                    id_pacient: data.id_pacient || '-',
                    codigo_clinica: data.codigo_clinica || '-',
                    oc: data.oc || '-',
                    numero_guia: data.numero_guia || '-',
                    numero_factura: data.numero_factura || '-',
                    estado: data.estado || '-'
                });
            });
            return historicoData;
        } catch (error) {
            showSuccessMessage('Error al cargar datos históricos: ' + error.message, false);
            return [];
        }
    }

    function applyFilters() {
        filteredFichas = fichas.filter(ficha => {
            let columnMatch = true;
            Object.entries(columnFilters).forEach(([column, value]) => {
                if (value) {
                    let cellValue = ficha[column] || '-';
                    cellValue = cellValue.toString().toLowerCase();
                    columnMatch = columnMatch && cellValue.includes(value.toLowerCase());
                }
            });
            let dateMatch = true;
            if (yearFilter || monthFilter) {
                if (!ficha.fechaCX) {
                    return false;
                }
                let date;
                if (typeof ficha.fechaCX.toDate === 'function') {
                    date = ficha.fechaCX.toDate();
                } else if (ficha.fechaCX instanceof Date) {
                    date = ficha.fechaCX;
                } else {
                    return false;
                }
                if (!date || isNaN(date.getTime())) {
                    return false;
                }
                if (yearFilter) {
                    const year = date.getFullYear().toString();
                    dateMatch = dateMatch && year === yearFilter;
                }
                if (monthFilter) {
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    dateMatch = dateMatch && month === monthFilter;
                }
            }
            const stateMatch = !stateFilter || (ficha.estado && ficha.estado === stateFilter);
            return columnMatch && dateMatch && stateMatch;
        });
        currentPage = 1;
        renderTable(filteredFichas);
        updatePagination(filteredFichas.length);
    }

    function setupColumnFilters() {
        const filterIcons = document.querySelectorAll('.filter-icon');
        if (filterIcons.length === 0) {
            return;
        }
        filterIcons.forEach(icon => {
            icon.removeEventListener('click', icon.clickHandler);
            icon.clickHandler = (e) => {
                e.stopPropagation();
                e.preventDefault();
                const column = icon.getAttribute('data-column');
                const th = icon.closest('th');
                let filterContainer = document.querySelector('.filter-input-container');
                
                if (filterContainer) {
                    filterContainer.remove();
                    if (columnFilters[column]) {
                        icon.classList.remove('fa-filter-circle-xmark', 'active');
                        icon.classList.add('fa-filter');
                        delete columnFilters[column];
                        applyFilters();
                    }
                    return;
                }

                filterContainer = document.createElement('div');
                filterContainer.className = 'filter-input-container';
                const tableContainer = document.querySelector('.table-container');
                if (!tableContainer) {
                    return;
                }
                tableContainer.appendChild(filterContainer);
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = `Filtrar ${column}`;
                input.value = columnFilters[column] || '';
                filterContainer.appendChild(input);

                const thRect = th.getBoundingClientRect();
                const tableContainerRect = tableContainer.getBoundingClientRect();
                const scrollTop = tableContainer.scrollTop;
                const scrollLeft = tableContainer.scrollLeft;

                filterContainer.style.position = 'absolute';
                filterContainer.style.top = `${thRect.bottom - tableContainerRect.top + scrollTop}px`;
                filterContainer.style.left = `${thRect.left - tableContainerRect.left + scrollLeft}px`;
                filterContainer.style.width = `${thRect.width}px`;

                setTimeout(() => {
                    filterContainer.classList.add('visible');
                }, 10);

                input.focus();

                icon.classList.remove('fa-filter');
                icon.classList.add('fa-filter-circle-xmark', 'active');

                input.addEventListener('input', () => {
                    columnFilters[column] = input.value.trim();
                    applyFilters();
                });

                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        filterContainer.remove();
                        if (!columnFilters[column]) {
                            icon.classList.remove('fa-filter-circle-xmark', 'active');
                            icon.classList.add('fa-filter');
                        }
                    }
                });

                const closeOnClickOutside = (e) => {
                    if (!filterContainer.contains(e.target) && !icon.contains(e.target)) {
                        filterContainer.remove();
                        if (!columnFilters[column]) {
                            icon.classList.remove('fa-filter-circle-xmark', 'active');
                            icon.classList.add('fa-filter');
                        }
                        document.removeEventListener('click', closeOnClickOutside);
                    }
                };

                setTimeout(() => {
                    document.addEventListener('click', closeOnClickOutside);
                }, 200);

                tableContainer.addEventListener('scroll', () => {
                    const newThRect = th.getBoundingClientRect();
                    const newTableContainerRect = tableContainer.getBoundingClientRect();
                    filterContainer.style.top = `${newThRect.bottom - newTableContainerRect.top + tableContainer.scrollTop}px`;
                    filterContainer.style.left = `${newThRect.left - newTableContainerRect.left + tableContainer.scrollLeft}px`;
                }, { once: true });
            };
            icon.addEventListener('click', icon.clickHandler);
            icon.style.display = 'inline';
        });
    }

    function setupStateButtons() {
        const states = new Set();
        fichas.forEach(ficha => {
            const state = ficha.estado || '-';
            if (state !== '-') {
                states.add(state);
            }
        });

        stateButtonsContainer.innerHTML = '';
        if (states.size === 0) {
            return;
        }

        const allButton = document.createElement('button');
        allButton.className = 'state-button all-states';
        allButton.dataset.state = '';
        allButton.textContent = 'Todos';
        const allColors = generateStateColor('all');
        allButton.style.setProperty('--state-bg', allColors.lightModeColor);
        allButton.style.setProperty('--state-hover-bg', allColors.lightModeHover);
        allButton.style.setProperty('--dark-state-bg', allColors.darkModeColor);
        allButton.style.setProperty('--dark-state-hover-bg', allColors.darkModeHover);
        allButton.style.setProperty('--state-text', allColors.lightModeText);
        allButton.style.setProperty('--dark-state-text', allColors.darkModeText);
        allButton.addEventListener('click', () => {
            stateFilter = '';
            document.querySelectorAll('.state-button').forEach(btn => btn.classList.remove('active'));
            allButton.classList.add('active');
            applyFilters();
        });
        stateButtonsContainer.appendChild(allButton);

        Array.from(states).sort().forEach(state => {
            const button = document.createElement('button');
            button.className = `state-button state-${state.toLowerCase().replace(/\s+/g, '-')}`;
            button.dataset.state = state;
            button.textContent = state.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const { lightModeColor, darkModeColor, lightModeHover, darkModeHover, lightModeText, darkModeText } = generateStateColor(state);
            button.style.setProperty('--state-bg', lightModeColor);
            button.style.setProperty('--state-hover-bg', lightModeHover);
            button.style.setProperty('--dark-state-bg', darkModeColor);
            button.style.setProperty('--dark-state-hover-bg', darkModeHover);
            button.style.setProperty('--state-text', lightModeText);
            button.style.setProperty('--dark-state-text', darkModeText);
            button.addEventListener('click', () => {
                if (stateFilter === state) {
                    stateFilter = '';
                    button.classList.remove('active');
                    allButton.classList.add('active');
                } else {
                    stateFilter = state;
                    document.querySelectorAll('.state-button').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                }
                applyFilters();
            });
            stateButtonsContainer.appendChild(button);
        });
    }

    function setupYearMonthFilters() {
        const currentYear = new Date().getFullYear().toString();
        const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const years = new Set();
        const yearMonthMap = new Map();
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        fichas.forEach(ficha => {
            const fechaCX = ficha.fechaCX;
            let date;
            if (fechaCX && typeof fechaCX.toDate === 'function') {
                date = ficha.fechaCX.toDate();
            } else if (fechaCX instanceof Date) {
                date = ficha.fechaCX;
            } else {
                return;
            }
            if (!date || isNaN(date.getTime())) {
                return;
            }
            const year = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            years.add(year);
            if (!yearMonthMap.has(year)) {
                yearMonthMap.set(year, new Set());
            }
            yearMonthMap.get(year).add(month);
        });

        const sortedYears = Array.from(years).sort((a, b) => b - a);
        filterYear.innerHTML = '<option value="">Todos los años</option>';
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            filterYear.appendChild(option);
        });

        yearFilter = currentYear;
        filterYear.value = currentYear;
        monthFilter = currentMonth;

        function updateMonthFilter(selectedYear) {
            filterMonth.innerHTML = '<option value="">Todos los meses</option>';
            if (selectedYear && yearMonthMap.has(selectedYear)) {
                const months = Array.from(yearMonthMap.get(selectedYear)).sort();
                months.forEach(month => {
                    const option = document.createElement('option');
                    option.value = month;
                    option.textContent = monthNames[parseInt(month) - 1];
                    filterMonth.appendChild(option);
                });
                if (selectedYear === currentYear && months.includes(currentMonth)) {
                    filterMonth.value = currentMonth;
                    monthFilter = currentMonth;
                } else {
                    filterMonth.value = '';
                    if (selectedYear === currentYear) {
                        monthFilter = currentMonth;
                    } else {
                        monthFilter = '';
                    }
                }
            } else {
                filterMonth.value = '';
                if (selectedYear === currentYear) {
                    monthFilter = currentMonth;
                } else {
                    monthFilter = '';
                }
            }
        }

        updateMonthFilter(currentYear);

        filterYear.addEventListener('change', () => {
            yearFilter = filterYear.value;
            updateMonthFilter(yearFilter);
            applyFilters();
        });

        filterMonth.addEventListener('change', () => {
            monthFilter = filterMonth.value;
            applyFilters();
        });

        showAllBtn.addEventListener('click', () => {
            yearFilter = '';
            monthFilter = '';
            stateFilter = '';
            columnFilters = {};
            filterYear.value = '';
            filterMonth.value = '';
            updateMonthFilter('');
            document.querySelectorAll('.state-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.filter-icon').forEach(icon => {
                icon.classList.remove('fa-filter-circle-xmark', 'active');
                icon.classList.add('fa-filter');
            });
            applyFilters();
        });
    }

    function exportToExcel() {
        const headers = ['OC', 'Guía', 'Factura', 'Despachado', 'Estado', 'Cargo', 'Fecha de Cargo', 'Admisión', 
                        'Nombre Paciente', 'Médico', 'Fecha Cx', 'Proveedor', 'Código', 'Descripción', 
                        'Cantidad', 'Precio', 'Modalidad', 'Total', 'Usuario'];
        const data = filteredFichas.map(ficha => [
            ficha.OC || '-',
            ficha.Guia || '-',
            ficha.Factura || '-',
            ficha.Despachado || '-',
            ficha.estado || '-',
            ficha.CARGO || '-',
            formatDate(ficha.fechaCargo),
            ficha.admision || '-',
            ficha.nombrePaciente || '-',
            ficha.medico || '-',
            formatDate(ficha.fechaCX),
            ficha.proveedor || '-',
            ficha.codigo || '-',
            ficha.descripcion || '-',
            ficha.cantidad || '-',
            ficha.precio || '-',
            ficha.modalidad || '-',
            ficha.total || '-',
            ficha.usuario || '-'
        ]);

        const csvContent = [
            headers.join(','),
            ...data.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'cargosconsignacion.csv';
        link.click();
        URL.revokeObjectURL(link.href);
        showSuccessMessage('Datos exportados a CSV exitosamente');
    }

    async function loadFichas() {
        try {
            if (!tableBody || !loadingModal || !loadingProgress) {
                showSuccessMessage('Error: Elementos esenciales no encontrados (tabla o modal)', false);
                return;
            }

            showModal(loadingModal, loadingProgress, 0);
            const fichasCollection = collection(db, 'cargosconsignacion');
            const historicoData = await fetchHistoricoData();
            const querySnapshot = await getDocs(fichasCollection);
            fichas = [];

            querySnapshot.forEach((doc, index) => {
                const data = doc.data();
                let matchedHistorico = historicoData.find(h => 
                    String(h.id_pacient) === String(data.admision) && 
                    String(h.codigo_clinica) === String(data.codigo)
                );
                const guiaValue = matchedHistorico ? matchedHistorico.numero_guia : '-';
                const despachadoStatus = (guiaValue !== '-' && Number(guiaValue) > 1) ? 'Despachado' : 'Pendiente';
                fichas.push({
                    importOrder: index,
                    docId: doc.id,
                    OC: matchedHistorico ? matchedHistorico.oc : '-',
                    Guia: guiaValue,
                    Factura: matchedHistorico ? matchedHistorico.numero_factura : '-',
                    Despachado: despachadoStatus,
                    estado: data.estado || '-',
                    CARGO: data.CARGO || '-',
                    fechaCargo: data.fechaCargo || '-',
                    admision: data.admision || '-',
                    nombrePaciente: data.nombrePaciente || '-',
                    medico: data.medico || '-',
                    fechaCX: data.fechaCX || '-',
                    proveedor: data.proveedor || '-',
                    codigo: data.codigo || '-',
                    descripcion: data.descripcion || '-',
                    cantidad: data.cantidad || '-',
                    precio: data.precio || '-',
                    modalidad: data.modalidad || '-',
                    total: data.total || '-',
                    usuario: data.usuario || '-'
                });
            });

            fichas.sort((a, b) => {
                const nombreA = (a.nombrePaciente || '-').toLowerCase();
                const nombreB = (b.nombrePaciente || '-').toLowerCase();
                const codigoA = (a.codigo || '-').toLowerCase();
                const codigoB = (b.codigo || '-').toLowerCase();
                
                if (nombreA < nombreB) return -1;
                if (nombreA > nombreB) return 1;
                if (codigoA < codigoB) return -1;
                if (codigoA > codigoB) return 1;
                return 0;
            });

            filteredFichas = [...fichas];
            totalRecords.textContent = `${fichas.length} registros`;
            totalPages = Math.ceil(fichas.length / recordsPerPage);

            yearFilter = '2025';
            monthFilter = '07';

            renderTable(filteredFichas);
            updatePagination(filteredFichas.length);
            setupColumnFilters();
            setupStateButtons();
            setupYearMonthFilters();
            exportExcelBtn.addEventListener('click', exportToExcel);
            hideModal(loadingModal);
            applyFilters();
        } catch (error) {
            showSuccessMessage('Error al cargar datos: ' + error.message, false);
            hideModal(loadingModal);
        }
    }

    function setupRealtimeUpdates() {
        const fichasCollection = collection(db, 'cargosconsignacion');
        onSnapshot(fichasCollection, (snapshot) => {
            if (snapshot.docChanges().length > 0) {
                currentPage = 1;
                loadFichas();
            }
        }, error => {
            showSuccessMessage('Error en actualización en tiempo real: ' + error.message, false);
        });
    }

    function renderTable(data) {
        if (!tableBody) {
            return;
        }
        tableBody.innerHTML = '';
        const fragment = document.createDocumentFragment();

        if (data.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="19" style="text-align: center;">No se encontraron registros que coincidan con los filtros aplicados.</td>`;
            fragment.appendChild(tr);
        } else {
            const start = (currentPage - 1) * recordsPerPage;
            const end = start + recordsPerPage;
            const paginatedData = data.slice(start, end);

            paginatedData.forEach(ficha => {
                const tr = document.createElement('tr');
                const stateClass = `state-${(ficha.estado || '-').toLowerCase().replace(/\s+/g, '-')}`;
                tr.className = stateClass;
                if (ficha.estado && ficha.estado !== '-') {
                    const { lightModeColor, darkModeColor, lightModeHover, darkModeHover, lightModeText, darkModeText } = generateStateColor(ficha.estado);
                    tr.style.setProperty('--state-bg', lightModeColor);
                    tr.style.setProperty('--dark-state-bg', darkModeColor);
                    tr.style.setProperty('--state-hover-bg', lightModeHover);
                    tr.style.setProperty('--dark-state-hover-bg', darkModeHover);
                    tr.style.setProperty('--state-text', lightModeText);
                    tr.style.setProperty('--dark-state-text', darkModeText);
                }
                tr.innerHTML = `
                    <td>${ficha.OC || '-'}</td>
                    <td>${ficha.Guia || '-'}</td>
                    <td>${ficha.Factura || '-'}</td>
                    <td>${ficha.Despachado || '-'}</td>
                    <td>${ficha.estado || '-'}</td>
                    <td>${ficha.CARGO || '-'}</td>
                    <td>${formatDate(ficha.fechaCargo)}</td>
                    <td>${ficha.admision || '-'}</td>
                    <td>${ficha.nombrePaciente || '-'}</td>
                    <td>${ficha.medico || '-'}</td>
                    <td>${formatDate(ficha.fechaCX)}</td>
                    <td>${ficha.proveedor || '-'}</td>
                    <td>${ficha.codigo || '-'}</td>
                    <td>${ficha.descripcion || '-'}</td>
                    <td>${ficha.cantidad || '-'}</td>
                    <td>${ficha.precio || '-'}</td>
                    <td>${ficha.modalidad || '-'}</td>
                    <td>${ficha.total || '-'}</td>
                    <td>${ficha.usuario || '-'}</td>
                `;
                fragment.appendChild(tr);
            });
        }
        tableBody.appendChild(fragment);
    }

    function updatePagination(total) {
        if (!pageInfo || !totalRecords || !prevBtn || !nextBtn) {
            return;
        }
        const totalPagesFiltered = Math.ceil(total / recordsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPagesFiltered || 1}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPagesFiltered || totalPagesFiltered === 0;
    }

    async function init() {
        if (isInitialized) {
            return;
        }
        isInitialized = true;

        if (!container) {
            document.body.innerHTML = '<p>Error: No se encontró el contenedor .cargosconsignacion-container. Verifica el HTML.</p>';
            return;
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderTable(filteredFichas);
                    updatePagination(filteredFichas.length);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderTable(filteredFichas);
                    updatePagination(filteredFichas.length);
                }
            });
        }

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
                setTimeout(() => {
                    window.location.href = 'index.html?error=auth-required';
                }, 2000);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    container.innerHTML = '<p>Error: Tu cuenta no está registrada. Contacta al administrador.</p>';
                    return;
                }

                const userData = userDoc.data();
                const hasAccess = userData.role === 'Administrador' || userData.role === 'Operador' ||
                    (userData.permissions && (
                        userData.permissions.includes('Consignacion:Asignacion') ||
                        userData.permissions.includes('Implantes:Paquetización') ||
                        userData.permissions.includes('Implantes:Mantenedor') ||
                        userData.permissions.includes('Implantes:Transito') ||
                        userData.permissions.includes('Implantes:Contenedores') ||
                        userData.permissions.includes('Implantes:PacientesImplantes') ||
                        userData.permissions.includes('Tablas:Historico')
                    ));
                if (!hasAccess) {
                    container.innerHTML = '<p>Acceso denegado. No tienes permisos para este módulo.</p>';
                    return;
                }

                currentUser = user;
                await loadFichas();
                setupRealtimeUpdates();
            } catch (error) {
                container.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        init();
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => {
            init();
        }, 1);
    }
} catch (error) {
    const container = document.querySelector('.cargosconsignacion-container');
    if (container) {
        container.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
    } else {
        document.body.innerHTML = `<p>Error al inicializar Firebase: ${error.message}</p>`;
    }
}