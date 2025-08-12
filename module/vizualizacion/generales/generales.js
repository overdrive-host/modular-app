import { getFirestore, collection, query, where, getDocs, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

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

    const db = getFirestore(app);
    const auth = getAuth(app);

    const generalesTable = document.getElementById('generales-table').querySelector('tbody');
    const filterYear = document.getElementById('filter-year');
    const filterMonth = document.getElementById('filter-month');
    const estadoButtonsContainer = document.getElementById('estado-buttons');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');
    const messageContainer = document.getElementById('message-container');
    const loadingModal = document.getElementById('loading-modal');

    let allData = [];
    let filteredData = [];
    let currentPage = 1;
    const itemsPerPage = 50;
    let selectedEstado = null;
    let columnFilters = {};
    
    // Orden fijo predefinido - NO se cambia con los filtros
    const FIXED_SORT_ORDER = {
        '6': 'desc', // fechaCx (descendente, criterio primario)
        '4': 'asc',  // nombrePaciente (ascendente, criterio secundario)
        '7': 'asc'   // proveedor (ascendente, criterio terciario)
    };
    
    // Variables para el redimensionamiento de columnas
    let resizingColumn = null;
    let startX = 0;
    let startWidth = 0;

    function showMessage(messageText, type = 'success') {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = messageText;
        messageContainer.appendChild(message);
        setTimeout(() => {
            message.classList.add('fade-out');
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }

    function showLoading() {
        loadingModal.style.display = 'flex';
    }

    function hideLoading() {
        loadingModal.style.display = 'none';
    }

    function formatDateForDisplay(date) {
        if (!date || !(date instanceof Timestamp)) {
            return '-';
        }
        const d = date.toDate();
        if (isNaN(d.getTime())) {
            return '-';
        }
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function formatNumberWithThousands(value) {
        if (!value && value !== 0) return '0';
        const num = Math.round(parseFloat(value));
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function calculateMargin(precio) {
        if (!precio || isNaN(precio)) return '-';
        precio = parseFloat(precio);
        if (precio < 301) return '500%';
        if (precio < 1001) return '400%';
        if (precio < 5001) return '300%';
        if (precio < 10001) return '250%';
        if (precio < 25001) return '200%';
        if (precio < 50001) return '160%';
        if (precio < 100001) return '140%';
        if (precio < 200001) return '80%';
        return '50%';
    }

    function calculateVenta(modalidad, precio, margen, cantidad) {
        if (!precio || isNaN(precio) || !cantidad || isNaN(cantidad)) return '-';
        precio = parseFloat(precio);
        cantidad = parseInt(cantidad);
        let margenDecimal;
        if (modalidad === 'Consignación') {
            if (!margen || margen === '-') return '-';
            margenDecimal = parseFloat(margen.replace('%', '')) / 100;
        } else if (modalidad === 'Cotización') {
            margenDecimal = 0.30;
        } else {
            return '-';
        }
        const venta = (precio + (precio * margenDecimal)) * cantidad;
        return formatNumberWithThousands(venta);
    }

    async function loadFromCollection(collectionName, user) {
        try {
            const q = query(collection(db, collectionName));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => {
                const item = doc.data();
                const cantidad = collectionName === 'cargosimp' ? (item.cantidad || 0) : (item.CANTID || item.cantidad || 0);
                const precio = item.precio || 0;
                const total = cantidad * precio;
                const venta = collectionName === 'cargosimp' ? formatNumberWithThousands(item.venta || 0) : calculateVenta(item.modalidad, precio, calculateMargin(precio), cantidad);
                const fechaCx = formatDateForDisplay(collectionName === 'cargosimp' ? item.fechaCx : item.fechaCX);
                const fecha = collectionName === 'cargosimp' ? item.fechaIngreso : item.fechaCX;
                return {
                    id: doc.id,
                    source: collectionName,
                    estado: item.estado || 'Pendiente',
                    prevision: item.prevision || '',
                    admision: item.admision || '',
                    nombrePaciente: item.nombrePaciente || '',
                    medico: item.medico || '',
                    fechaCx: fechaCx,
                    proveedor: item.proveedor || '',
                    codigo: item.codigo || item.COD || '',
                    descripcion: item.descripcion || '',
                    cantidad: cantidad,
                    precio: formatNumberWithThousands(precio),
                    modalidad: item.modalidad || '',
                    total: formatNumberWithThousands(total),
                    venta: venta,
                    fecha: fecha // for filters
                };
            });
            console.log(`Loaded ${data.length} items from ${collectionName}`);
            return data;
        } catch (error) {
            console.error(`Error loading data from ${collectionName}:`, error);
            showMessage(`Error al cargar datos de ${collectionName}: ` + error.message, 'error');
            return [];
        }
    }

    // Nueva función para completar previsión desde reportesPabellon
    async function fillMissingPrevision(data) {
        try {
            const user = auth.currentUser;
            if (!user) return data;

            // Obtener registros únicos que tienen admisión pero no previsión
            const itemsNeedingPrevision = data.filter(item => 
                item.admision && item.admision.trim() !== '' && 
                (!item.prevision || item.prevision.trim() === '')
            );

            if (itemsNeedingPrevision.length === 0) {
                console.log('No hay registros que necesiten completar previsión');
                return data;
            }

            console.log(`Buscando previsión para ${itemsNeedingPrevision.length} registros...`);

            // Obtener todas las admisiones únicas que necesitan previsión
            const admisiones = [...new Set(itemsNeedingPrevision.map(item => item.admision))];
            
            // Consultar reportesPabellon para obtener datos de isapre por admisión
            const reportesQuery = query(
                collection(db, 'reportesPabellon'),
                where('uid', '==', user.uid)
            );
            
            const reportesSnapshot = await getDocs(reportesQuery);
            const previsionMap = new Map();

            reportesSnapshot.forEach(doc => {
                const reporte = doc.data();
                if (reporte.admision && reporte.isapre && reporte.isapre.trim() !== '') {
                    previsionMap.set(reporte.admision, reporte.isapre);
                }
            });

            console.log(`Encontrados ${previsionMap.size} registros con isapre en reportesPabellon`);

            // Actualizar los datos con la previsión encontrada
            let updated = 0;
            const updatedData = data.map(item => {
                if (item.admision && (!item.prevision || item.prevision.trim() === '')) {
                    const previsionFromReporte = previsionMap.get(item.admision);
                    if (previsionFromReporte) {
                        updated++;
                        return { ...item, prevision: previsionFromReporte };
                    }
                }
                return item;
            });

            if (updated > 0) {
                console.log(`✅ Completada previsión para ${updated} registros desde reportesPabellon`);
                showMessage(`Completada previsión automáticamente para ${updated} registros`, 'success');
            }

            return updatedData;

        } catch (error) {
            console.error('Error al completar previsión desde reportesPabellon:', error);
            showMessage('Error al completar previsión automáticamente', 'warning');
            return data; // Retornar datos originales si hay error
        }
    }

    async function loadData(user) {
        try {
            showLoading();
            const impData = await loadFromCollection('cargosimp', user);
            const cgnData = await loadFromCollection('cargosconsignacion', user);
            const combined = [...impData, ...cgnData];
            console.log(`Total combined data: ${combined.length}`);
            
            if (cgnData.length === 0) {
                console.warn('No data loaded from cargosconsignacion – check UID or collection.');
                showMessage('Advertencia: No se cargaron datos de consignación. Verifica la colección.', 'warning');
            }

            // Completar previsión automáticamente desde reportesPabellon
            const dataWithPrevision = await fillMissingPrevision(combined);
            
            return dataWithPrevision;
        } finally {
            hideLoading();
        }
    }

    function populateYearSelect() {
        const years = [...new Set(allData.map(item => item.fecha ? item.fecha.toDate().getFullYear() : null).filter(y => y))].sort((a, b) => b - a);
        filterYear.innerHTML = '<option value="all">Todos</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            filterYear.appendChild(option);
        });
        
        // Preseleccionar el año actual (2025)
        const currentYear = 2025;
        if (years.includes(currentYear)) {
            filterYear.value = currentYear;
        } else {
            // Si no existe 2025, seleccionar el año más reciente
            filterYear.value = years[0] || 'all';
        }
    }

    function populateMonthSelect() {
        const selectedYear = filterYear.value;
        let months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        if (selectedYear !== 'all') {
            months = [...new Set(allData.filter(item => item.fecha && item.fecha.toDate().getFullYear() == selectedYear).map(item => item.fecha.toDate().getMonth() + 1).filter(m => m))].sort((a, b) => a - b);
        }
        filterMonth.innerHTML = '<option value="" disabled selected>Seleccione un mes</option>';
        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = new Date(2000, month - 1, 1).toLocaleString('es', { month: 'long' });
            filterMonth.appendChild(option);
        });
    }

    function renderEstadoButtons() {
        estadoButtonsContainer.innerHTML = '';
        const estados = [...new Set(allData.map(item => item.estado))].sort();
        estados.forEach(estado => {
            const button = document.createElement('button');
            button.className = 'estado-button';
            button.textContent = estado;
            button.dataset.estado = estado;
            if (selectedEstado === estado) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                selectedEstado = selectedEstado === estado ? null : estado;
                document.querySelectorAll('.estado-button').forEach(btn => btn.classList.remove('active'));
                if (selectedEstado) button.classList.add('active');
                applyFilters();
            });
            estadoButtonsContainer.appendChild(button);
        });
    }

    function applyFilters() {
        console.log('Aplicando filtros con orden fijo...');
        
        // Verificar si hay un mes seleccionado
        const month = filterMonth.value;
        if (!month) {
            // Si no hay mes seleccionado, mostrar tabla vacía
            filteredData = [];
            currentPage = 1;
            renderTable();
            updatePagination();
            console.log('No hay mes seleccionado - tabla vacía');
            return;
        }
        
        // 1. Primero filtrar los datos
        filteredData = allData.filter(item => {
            let matches = true;
            const year = filterYear.value;
            
            // Filtros por año y mes (mes es obligatorio)
            if (year !== 'all' && (!item.fecha || item.fecha.toDate().getFullYear() != year)) matches = false;
            if (!item.fecha || (item.fecha.toDate().getMonth() + 1) != month) matches = false;
            
            // Filtro por estado
            if (selectedEstado && item.estado !== selectedEstado) matches = false;
            
            // Filtros por columna
            Object.entries(columnFilters).forEach(([colIndex, filterValue]) => {
                if (filterValue) {
                    const colKey = getColumnKey(colIndex);
                    if (!item[colKey]?.toString().toLowerCase().includes(filterValue.toLowerCase())) {
                        matches = false;
                    }
                }
            });
            
            return matches;
        });

        // 2. Después aplicar el ordenamiento FIJO
        applyFixedSorting();
        
        // 3. Renderizar la tabla y actualizar paginación
        currentPage = 1; // Resetear a la primera página cuando se aplican filtros
        renderTable();
        updatePagination();
        
        console.log(`Datos filtrados y ordenados: ${filteredData.length} registros`);
    }

    function getColumnKey(colIndex) {
        const keys = ['estado', 'prevision', 'admision', 'nombrePaciente', 'medico', 'fechaCx', 'proveedor', 'codigo', 'descripcion', 'cantidad', 'precio', 'modalidad', 'total', 'venta'];
        return keys[colIndex - 1]; // data-column starts from 1
    }

    function parseDate(dateStr) {
        if (dateStr === '-' || !dateStr) return new Date(0); // Fecha mínima para ordenar al final
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    }

    function parseNumber(numStr) {
        if (!numStr || numStr === '-') return 0;
        return parseFloat(numStr.replace(/\./g, ''));
    }

    // Nueva función para aplicar ordenamiento fijo
    function applyFixedSorting() {
        console.log('Aplicando ordenamiento fijo:', FIXED_SORT_ORDER);
        
        filteredData.sort((a, b) => {
            // Criterio primario: Fecha de CX (descendente)
            const fechaA = parseDate(a.fechaCx);
            const fechaB = parseDate(b.fechaCx);
            if (fechaA.getTime() !== fechaB.getTime()) {
                return fechaB.getTime() - fechaA.getTime(); // desc
            }
            
            // Criterio secundario: Nombre Paciente (ascendente)
            const nombreA = (a.nombrePaciente || '').toLowerCase();
            const nombreB = (b.nombrePaciente || '').toLowerCase();
            if (nombreA !== nombreB) {
                return nombreA.localeCompare(nombreB); // asc
            }
            
            // Criterio terciario: Proveedor (ascendente)
            const provA = (a.proveedor || '').toLowerCase();
            const provB = (b.proveedor || '').toLowerCase();
            return provA.localeCompare(provB); // asc
        });
    }

    function renderTable() {
        generalesTable.innerHTML = '';
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedData = filteredData.slice(start, end);
        
        if (paginatedData.length === 0) {
            // Verificar si no hay mes seleccionado
            const month = filterMonth.value;
            if (!month) {
                generalesTable.innerHTML = '<tr><td colspan="14" style="text-align: center; color: #666; font-style: italic;">Seleccione un mes para ver los datos</td></tr>';
            } else {
                generalesTable.innerHTML = '<tr><td colspan="14" style="text-align: center;">No hay datos disponibles para los filtros seleccionados</td></tr>';
            }
            return;
        }
        
        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.estado}</td>
                <td>${item.prevision}</td>
                <td>${item.admision}</td>
                <td>${item.nombrePaciente}</td>
                <td>${item.medico}</td>
                <td>${item.fechaCx}</td>
                <td>${item.proveedor}</td>
                <td>${item.codigo}</td>
                <td>${item.descripcion}</td>
                <td>${item.cantidad}</td>
                <td>${item.precio}</td>
                <td>${item.modalidad}</td>
                <td>${item.total}</td>
                <td>${item.venta}</td>
            `;
            generalesTable.appendChild(row);
        });
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }

    function setupFilterIcons() {
        document.querySelectorAll('.filter-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const colIndex = icon.dataset.column;
                const th = icon.closest('th');
                
                let filterContainer = document.querySelector('.filter-container');
                if (!filterContainer) {
                    filterContainer = document.createElement('div');
                    filterContainer.className = 'filter-container';
                    filterContainer.innerHTML = `
                        <label class="filter-label">Filtrar por:</label>
                        <input type="text" class="filter-input">
                        <button class="clear-filter-button">Limpiar</button>
                    `;
                    document.body.appendChild(filterContainer);
                }
                
                const rect = th.getBoundingClientRect();
                filterContainer.style.top = `${rect.bottom + window.scrollY}px`;
                filterContainer.style.left = `${rect.left + window.scrollX}px`;
                filterContainer.style.display = 'block';
                
                const input = filterContainer.querySelector('.filter-input');
                input.value = columnFilters[colIndex] || '';
                input.focus();
                
                input.oninput = () => {
                    columnFilters[colIndex] = input.value;
                    applyFilters(); // Solo filtra, mantiene orden fijo
                };
                
                filterContainer.querySelector('.clear-filter-button').onclick = () => {
                    input.value = '';
                    delete columnFilters[colIndex];
                    applyFilters(); // Solo filtra, mantiene orden fijo
                };
                
                th.classList.add('filter-active');
                
                document.addEventListener('click', outsideClickHandler);
                
                function outsideClickHandler(event) {
                    if (!filterContainer.contains(event.target) && !icon.contains(event.target)) {
                        filterContainer.style.display = 'none';
                        document.removeEventListener('click', outsideClickHandler);
                        if (!columnFilters[colIndex]) {
                            th.classList.remove('filter-active');
                        }
                    }
                }
            });
        });
    }

    // Función de ordenamiento manual (opcional) - removida la funcionalidad automática de click
    function setupManualSorting() {
        // Esta función se puede usar si quieres permitir ordenamiento manual ocasional
        // Por ahora, mantendremos el orden fijo siempre
        console.log('Ordenamiento manual deshabilitado - usando orden fijo');
    }

    function setupColumnResizing() {
        document.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                resizingColumn = handle.closest('th');
                startX = e.clientX;
                startWidth = resizingColumn.offsetWidth;
                document.addEventListener('mousemove', resizeColumn);
                document.addEventListener('mouseup', stopResizing);
            });
        });

        function resizeColumn(e) {
            if (resizingColumn) {
                const width = startWidth + (e.clientX - startX);
                resizingColumn.style.width = `${width}px`;
            }
        }

        function stopResizing() {
            resizingColumn = null;
            document.removeEventListener('mousemove', resizeColumn);
            document.removeEventListener('mouseup', stopResizing);
        }
    }

    // Event listeners
    filterYear.addEventListener('change', () => {
        populateMonthSelect();
        applyFilters();
    });

    filterMonth.addEventListener('change', applyFilters);

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
            updatePagination();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
            updatePagination();
        }
    });

    // Inicialización principal
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('UID del usuario actual:', user.uid);
            
            // Cargar datos
            allData = await loadData(user);
            filteredData = []; // Iniciar vacío hasta que se seleccione un mes
            
            // Configurar interfaz
            populateYearSelect();
            populateMonthSelect();
            renderEstadoButtons();
            
            // Mostrar tabla vacía inicialmente (sin aplicar filtros todavía)
            renderTable();
            updatePagination();
            
            // Configurar funcionalidades
            setupFilterIcons();
            setupManualSorting();
            setupColumnResizing();
            
        } else {
            showMessage('Por favor, inicia sesión.', 'error');
            generalesTable.innerHTML = '<tr><td colspan="14" style="text-align: center;">Por favor, inicia sesión.</td></tr>';
        }
    });

} catch (error) {
    console.error('Error en la inicialización:', error);
    showMessage(`Error en la inicialización: ${error.message}`, 'error');
}