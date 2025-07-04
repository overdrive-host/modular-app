import { getFirestore, collection, getDocs, query, where, Timestamp, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';

const firebaseConfig = {
    apiKey: "AIzaSyAdWLsgSF7mtA4moJ4yu9WzrVwfpNqYjXo",
    authDomain: "respadol-modular.firebaseapp.com",
    projectId: "respadol-modular",
    storageBucket: "respadol-modular.firebasestorage.app",
    messagingSenderId: "458804625858",
    appId: "1:458804625858:web:5580163bc0736efbf2165b",
    measurementId: "G-30MEEM4VMZ"
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

    // Elementos DOM
    const container = document.querySelector('.cargosconsignacion-container');
    const tableBody = document.querySelector('#cargosconsignacion-table tbody');
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

    // Validar elementos DOM
    const elements = {
        container, tableBody, prevBtn, nextBtn, pageInfo, totalRecords, exportExcelBtn,
        successModal, successIcon, successMessage, filterYearSelect, filterMonthSelect, showAllBtn, stateButtonsContainer
    };

    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado`);
    });

    let currentUser = null;
    let cargos = [];
    let currentPage = 1;
    const recordsPerPage = 20;
    let filters = {};
    let quickFilters = { year: new Date().getFullYear().toString(), month: (new Date().getMonth() + 1).toString().padStart(2, '0'), state: null };
    const packageCache = new Map();

    const monthNames = {
        '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
        '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    };

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

    function formatPrice(value) {
        return value ? parseFloat(value).toLocaleString('es-CO', { minimumFractionDigits: 0 }) : '-';
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
        modal.setAttribute('hidden', 'true');
    }

    let lastErrorMessage = null;
    let lastErrorTime = 0;
    const ERROR_DEBOUNCE_MS = 3000;

    function showSuccessMessage(message, isSuccess = true) {
        if (!successModal || !successIcon || !successMessage) {
            console.warn('Elementos de éxito no encontrados');
            alert('Mensaje:', message);
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

    async function getPackageData(cod) {
        try {
            console.debug(`Buscando paquete para COD: ${cod}`);
            if (!cod) {
                console.debug('COD vacío, retornando isPackage: false');
                return { isPackage: false, items: [], descripcion: '' };
            }
            if (packageCache.has(cod)) {
                console.debug(`Paquete encontrado en caché para COD: ${cod}`);
                return packageCache.get(cod);
            }
            const paquetesCollection = collection(db, 'paquetes');
            let queryField = 'code';
            let q = query(paquetesCollection, where(queryField, '==', cod));
            let querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                console.debug(`No se encontró paquete con ${queryField}: ${cod}, intentando con 'codigo'`);
                queryField = 'codigo';
                q = query(paquetesCollection, where(queryField, '==', cod));
                querySnapshot = await getDocs(q);
            }
            if (!querySnapshot.empty) {
                const paquete = querySnapshot.docs[0].data();
                const items = paquete.items.map(item => ({
                    referencia: item.referencia || '-',
                    descripcion: item.descripcion || '',
                    cantidad: item.cantidad || 1,
                    lote: item.lote || '',
                    fechaVencimiento: item.fechaVencimiento ? formatDateOnly(item.fechaVencimiento) : ''
                }));
                const result = { isPackage: true, items, descripcion: paquete.descripcion || paquete.nombre || cod };
                packageCache.set(cod, result);
                console.debug(`Paquete encontrado en Firestore para ${queryField}: ${cod}, items:`, items);
                return result;
            } else {
                const result = { isPackage: false, items: [], descripcion: cod };
                packageCache.set(cod, result);
                console.debug(`No se encontró paquete para ${queryField}: ${cod}`);
                return result;
            }
        } catch (error) {
            console.error('Error al obtener datos del paquete:', error.message);
            showSuccessMessage('Error al obtener datos del paquete: ' + error.message, false);
            return { isPackage: false, items: [], descripcion: cod };
        }
    }

    async function getMatchingHistoricoData(admision, codigo) {
        try {
            const historicoCollection = collection(db, 'datos_historico');
            const q = query(historicoCollection, where('ID_PACIENT', '==', admision), where('CODIGO_CLINICA', '==', codigo));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const data = querySnapshot.docs[0].data();
                return {
                    oc: data.oc || '-',
                    numero_guia: data.numero_guia || '-',
                    numero_factura: data.numero_factura || '-'
                };
            }
            return { oc: '-', numero_guia: '-', numero_factura: '-' };
        } catch (error) {
            console.error('Error al buscar en datos_historico:', error.message);
            showSuccessMessage('Error al buscar datos históricos: ' + error.message, false);
            return { oc: '-', numero_guia: '-', numero_factura: '-' };
        }
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
            if (!item.fechaTraspaso) return false;
            let fechaTraspaso;
            if (typeof item.fechaTraspaso === 'string') {
                fechaTraspaso = new Date(item.fechaTraspaso);
            } else if (item.fechaTraspaso instanceof Timestamp) {
                fechaTraspaso = item.fechaTraspaso.toDate();
            } else if (item.fechaTraspaso instanceof Date) {
                fechaTraspaso = item.fechaTraspaso;
            }
            if (!fechaTraspaso || isNaN(fechaTraspaso)) return false;

            const year = fechaTraspaso.getFullYear().toString();
            const month = (fechaTraspaso.getMonth() + 1).toString().padStart(2, '0');

            const yearMatch = !quickFilters.year || year === quickFilters.year;
            const monthMatch = !quickFilters.month || month === quickFilters.month;
            const stateMatch = !quickFilters.state || item.estado === quickFilters.state;

            return yearMatch && monthMatch && stateMatch;
        });
    }

    function updateYearFilter(data) {
        if (!filterYearSelect) return;
        const years = [...new Set(data
            .filter(p => p?.fechaTraspaso)
            .map(p => {
                let fechaTraspaso;
                if (typeof p.fechaTraspaso === 'string') fechaTraspaso = new Date(p.fechaTraspaso);
                else if (p.fechaTraspaso instanceof Timestamp) fechaTraspaso = p.fechaTraspaso.toDate();
                else if (p.fechaTraspaso instanceof Date) fechaTraspaso = p.fechaTraspaso;
                return fechaTraspaso && !isNaN(fechaTraspaso) ? fechaTraspaso.getFullYear().toString() : null;
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
                if (!p.fechaTraspaso) return false;
                let fechaTraspaso;
                if (typeof p.fechaTraspaso === 'string') fechaTraspaso = new Date(p.fechaTraspaso);
                else if (p.fechaTraspaso instanceof Timestamp) fechaTraspaso = p.fechaTraspaso.toDate();
                else if (p.fechaTraspaso instanceof Date) fechaTraspaso = p.fechaTraspaso;
                if (!fechaTraspaso || isNaN(fechaTraspaso)) return false;
                return !quickFilters.year || fechaTraspaso.getFullYear().toString() === quickFilters.year;
            })
            .map(p => {
                let fechaTraspaso;
                if (typeof p.fechaTraspaso === 'string') fechaTraspaso = new Date(p.fechaTraspaso);
                else if (p.fechaTraspaso instanceof Timestamp) fechaTraspaso = p.fechaTraspaso.toDate();
                return fechaTraspaso ? (fechaTraspaso.getMonth() + 1).toString().padStart(2, '0') : '';
            })
            .filter(m => m)
        )].sort();

        filterMonthSelect.innerHTML = '<option value="">Todos los meses</option>' + months.map(month => `<option value="${month}" title="${monthNames[month]}">${monthNames[month]}</option>`).join('');
        filterMonthSelect.value = quickFilters.month || '';
    }

    function updateStateButtons(data) {
        if (!stateButtonsContainer) return;
        const filteredCargos = applyQuickFilters(data);
        const states = [...new Set(filteredCargos
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
                loadCargos();
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

    function updateFilterIcons() {
        const filterIcons = document.querySelectorAll('.filter-icon');
        filterIcons.forEach(icon => {
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

    async function loadCargos() {
        try {
            if (!tableBody) {
                console.error('No se encontró la tabla de cargos');
                showSuccessMessage('Error: No se encontró la tabla de cargos', false);
                return;
            }

            packageCache.clear();
            console.debug('Caché de paquetes limpiada');

            const cargosCollection = collection(db, 'cargosconsignacion');
            const q = query(cargosCollection, orderBy('fechaCreacion', 'desc'));
            const querySnapshot = await getDocs(q);
            cargos = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                cargos.push({ docId: doc.id, ...data });
            });
            console.debug('Cargos cargados:', cargos.length);

            updateYearFilter(cargos);
            updateMonthFilter(cargos);
            updateStateButtons(cargos);

            let filteredCargos = applyQuickFilters(cargos);
            filteredCargos = applyFilters(filteredCargos);
            console.debug('Cargos filtrados:', filteredCargos.length);
            const startIndex = (currentPage - 1) * recordsPerPage;
            const endIndex = startIndex + recordsPerPage;
            const paginatedCargos = filteredCargos.slice(startIndex, endIndex);
            const packagePromises = paginatedCargos.map(cargo => getPackageData(cargo.COD));
            const packageData = await Promise.all(packagePromises);

            // Obtener datos de datos_historico para cada cargo
            const historicoPromises = paginatedCargos.map(cargo => getMatchingHistoricoData(cargo.admision, cargo.codigo));
            const historicoData = await Promise.all(historicoPromises);

            const fragment = document.createDocumentFragment();
            tableBody.innerHTML = '';

            paginatedCargos.forEach((cargo, index) => {
                const packageInfo = packageData[index];
                const historico = historicoData[index];
                const isPackage = packageInfo.isPackage;
                console.debug(`Cargo COD: ${cargo.COD}, isPackage: ${isPackage}`);
                const tr = document.createElement('tr');
                tr.dataset.cargoId = cargo.docId;
                const estado = cargo.estado || '';
                const estadoClass = estado ? `state-${estado.toLowerCase().replace(/\s+/g, '-')}` : '';
                tr.className = estadoClass;
                const guiaValue = historico.numero_guia || '-';
                const despachado = (guiaValue && guiaValue !== '0' && guiaValue !== '-') ? 'Sí' : 'Pendiente';
                tr.innerHTML = `
                    <td>${historico.oc}</td>
                    <td>${historico.numero_guia}</td>
                    <td>${historico.numero_factura}</td>
                    <td>${despachado}</td>
                    <td>${cargo.estado || '-'}</td>
                    <td>${cargo.CARGO || '-'}</td>
                    <td>${formatDateOnly(cargo.fechaCargo)}</td>
                    <td>${cargo.admision || '-'}</td>
                    <td>${cargo.nombrePaciente || '-'}</td>
                    <td>${cargo.medico || '-'}</td>
                    <td>${formatDateOnly(cargo.fechaCX)}</td>
                    <td>${cargo.proveedor || '-'}</td>
                    <td>${cargo.codigo || '-'}</td>
                    <td>${cargo.descripcion || '-'}</td>
                    <td>${cargo.cantidad || '-'}</td>
                    <td>${formatPrice(cargo.precio)}</td>
                    <td>${cargo.modalidad || '-'}</td>
                    <td>${formatPrice(cargo.total)}</td>
                    <td>${cargo.usuario || '-'}</td>
                `;
                fragment.appendChild(tr);

                // Agregar subfila para paquetes
                if (isPackage && packageInfo.items.length > 0) {
                    const subTr = document.createElement('tr');
                    subTr.className = 'sub-row';
                    subTr.dataset.cargoId = cargo.docId;
                    const subTd = document.createElement('td');
                    subTd.colSpan = 19;
                    const itemsList = document.createElement('ul');
                    itemsList.style.listStyle = 'none';
                    itemsList.style.padding = '0';
                    itemsList.style.margin = '0';
                    packageInfo.items.forEach(item => {
                        const li = document.createElement('li');
                        li.style.padding = '2px 0';
                        li.innerHTML = `
                            <span>Referencia: ${item.referencia || '-'}</span> | 
                            <span>Descripción: ${item.descripcion || '-'}</span> | 
                            <span>Cantidad: ${item.cantidad || '1'}</span> | 
                            <span>Lote: ${item.lote || '-'}</span> | 
                            <span>Fecha Vencimiento: ${item.fechaVencimiento || '-'}</span>
                        `;
                        itemsList.appendChild(li);
                    });
                    subTd.appendChild(itemsList);
                    subTr.appendChild(subTd);
                    fragment.appendChild(subTr);
                }
            });

            tableBody.appendChild(fragment);

            updatePagination(filteredCargos.length);
            updateFilterIcons();
        } catch (error) {
            console.error('Error al cargar cargos:', error.message);
            showSuccessMessage('Error al cargar cargos: ' + error.message, false);
        }
    }

    async function exportToExcel() {
        try {
            if (!window.XLSX || !window.XLSX.utils || !window.XLSX.utils.json_to_sheet) {
                throw new Error('Biblioteca XLSX no está cargada correctamente');
            }
            const filteredCargos = applyQuickFilters(cargos).filter(cargo => applyFilters([cargo]).length > 0);
            const packagePromises = filteredCargos.map(cargo => getPackageData(cargo.COD));
            const packageData = await Promise.all(packagePromises);
            const historicoPromises = filteredCargos.map(cargo => getMatchingHistoricoData(cargo.admision, cargo.codigo));
            const historicoData = await Promise.all(historicoPromises);

            const data = [];
            filteredCargos.forEach((cargo, index) => {
                const packageInfo = packageData[index];
                const historico = historicoData[index];
                const isPackage = packageInfo.isPackage;
                const guiaValue = historico.numero_guia || '-';
                const despachado = (guiaValue && guiaValue !== '0' && guiaValue !== '-') ? 'Sí' : 'Pendiente';
                data.push({
                    OC: historico.oc || '-',
                    Guía: historico.numero_guia || '-',
                    Factura: historico.numero_factura || '-',
                    Despachado: despachado,
                    Estado: cargo.estado || '-',
                    Cargo: cargo.CARGO || '-',
                    'Fecha de Cargo': formatDateOnly(cargo.fechaCargo),
                    Admisión: cargo.admision || '-',
                    'Nombre Paciente': cargo.nombrePaciente || '-',
                    Médico: cargo.medico || '-',
                    'Fecha Cx': formatDateOnly(cargo.fechaCX),
                    Proveedor: cargo.proveedor || '-',
                    Código: cargo.codigo || '-',
                    Descripción: cargo.descripcion || '-',
                    Cantidad: cargo.cantidad || '-',
                    Precio: formatPrice(cargo.precio),
                    Modalidad: cargo.modalidad || '-',
                    Total: formatPrice(cargo.total),
                    Usuario: cargo.usuario || '-'
                });
                if (isPackage && packageInfo.items.length > 0) {
                    packageInfo.items.forEach(item => {
                        data.push({
                            OC: '-',
                            Guía: '-',
                            Factura: '-',
                            Despachado: '-',
                            Estado: cargo.estado || '-',
                            Cargo: '',
                            'Fecha de Cargo': '',
                            Admisión: cargo.admision || '-',
                            'Nombre Paciente': cargo.nombrePaciente || '-',
                            Médico: cargo.medico || '-',
                            'Fecha Cx': formatDateOnly(cargo.fechaCX),
                            Proveedor: cargo.proveedor || '-',
                            Código: 'No lleva OC',
                            Descripción: item.descripcion || '-',
                            Cantidad: item.cantidad || '1',
                            Precio: '0',
                            Modalidad: cargo.modalidad || '-',
                            Total: '0',
                            Usuario: cargo.usuario || '-'
                        });
                    });
                }
            });
            const worksheet = window.XLSX.utils.json_to_sheet(data);
            const workbook = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(workbook, worksheet, 'FichaCargos');
            window.XLSX.writeFile(workbook, 'ficha_cargos.xlsx');
        } catch (error) {
            console.error('Error al exportar a Excel:', error.message);
            showSuccessMessage('Error al exportar a Excel: ' + error.message, false);
        }
    }

    // Event Listeners
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            loadCargos();
        } else {
            console.warn('Usuario no autenticado');
            showSuccessMessage('Por favor, inicia sesión para continuar', false);
        }
    });

    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadCargos();
        }
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
        currentPage++;
        loadCargos();
    });

    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);

    if (filterYearSelect) filterYearSelect.addEventListener('change', () => {
        quickFilters.year = filterYearSelect.value || null;
        updateMonthFilter(cargos);
        loadCargos();
    });

    if (filterMonthSelect) filterMonthSelect.addEventListener('change', () => {
        quickFilters.month = filterMonthSelect.value || null;
        loadCargos();
    });

    if (showAllBtn) showAllBtn.addEventListener('click', () => {
        quickFilters = { year: null, month: null, state: null };
        filters = {};
        filterYearSelect.value = '';
        filterMonthSelect.value = '';
        stateButtonsContainer.innerHTML = '';
        loadCargos();
    });

    // Filtros de columna
    const filterIcons = document.querySelectorAll('.filter-icon');
    let outsideClickListener;
    filterIcons.forEach(icon => {
        icon.addEventListener('click', e => {
            e.stopPropagation();
            const column = icon.dataset.column;

            // Si la columna ya está filtrada, limpiar el filtro
            if (filters[column]) {
                delete filters[column];
                icon.classList.remove('fa-filter-circle-xmark', 'active');
                icon.classList.add('fa-filter');
                currentPage = 1;
                loadCargos();
                return;
            }

            // Remover cualquier contenedor de filtro existente
            const existingContainer = document.querySelector('.filter-input-container');
            if (existingContainer) existingContainer.remove();

            // Crear contenedor de filtro
            const container = document.createElement('div');
            container.className = 'filter-input-container';
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Filtrar por ${column}`;
            input.value = filters[column] || '';
            input.addEventListener('input', e => {
                filters[column] = e.target.value.trim();
                currentPage = 1;
                loadCargos();
            });

            const clearBtn = document.createElement('i');
            clearBtn.className = 'fas fa-filter-circle-xmark';
            clearBtn.addEventListener('click', e => {
                e.stopPropagation();
                delete filters[column];
                input.value = '';
                currentPage = 1;
                loadCargos();
                container.remove();
            });

            container.appendChild(input);
            container.appendChild(clearBtn);
            icon.parentElement.style.position = 'relative';
            icon.parentElement.appendChild(container);
            input.focus();

            // Cerrar contenedor al hacer clic fuera
            document.addEventListener('click', outsideClickListener = e => {
                if (!container.contains(e.target) && !icon.contains(e.target)) {
                    container.remove();
                    document.removeEventListener('click', outsideClickListener);
                }
            }, { once: true });
        });
    });

} catch (error) {
    console.error('Error inicializando la aplicación:', error.message);
    alert('Error al inicializar la aplicación: ' + error.message);
}