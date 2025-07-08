import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, updateDoc, getDocs, query, where, serverTimestamp, Timestamp, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';

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

const filterYear = document.getElementById('filter-year');
const filterMonth = document.getElementById('filter-month');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const downloadFormatBtn = document.getElementById('download-format-btn');
const exportBtn = document.getElementById('export-btn');
const table = document.getElementById('ordenes-compra-table');
const tableBody = table.querySelector('tbody');
const totalRecords = document.getElementById('total-records');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const loadingImportModal = document.getElementById('loading-import-modal');
const importProgress = document.getElementById('import-progress');

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

let filters = {};
let columnWidths = Array(table.querySelectorAll('th').length).fill('150px');

function formatDate(timestamp) {
  if (!timestamp) return '';
  let date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return '';
  }
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function showSuccessModal(message, isError = false) {
  successIcon.className = `fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}`;
  successMessage.textContent = message;
  successModal.className = `modal ${isError ? 'error' : 'success'}`;
  successModal.style.display = 'flex';
  setTimeout(() => successModal.style.display = 'none', 2000);
}

function showImportModal(percentage) {
  loadingImportModal.style.display = 'flex';
  importProgress.textContent = `${percentage}%`;
}

function hideImportModal() {
  loadingImportModal.style.display = 'none';
}

async function logAction(ordenId, action, data = {}) {
  try {
    await addDoc(collection(db, `ordenesCompra/${ordenId}/logs`), {
      action,
      timestamp: serverTimestamp(),
      uid: auth.currentUser.uid,
      data
    });
  } catch (error) {
    console.error('Error al registrar log:', error);
  }
}

async function loadYearsAndMonths() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const ordenesQuery = query(
      collection(db, 'ordenesCompra'),
      where('uid', '==', user.uid)
    );
    const ordenesSnapshot = await getDocs(ordenesQuery);
    const years = new Set();
    const yearMonths = {};

    ordenesSnapshot.forEach(doc => {
      const orden = doc.data();
      if (orden.generacion) {
        const date = orden.generacion.toDate ? orden.generacion.toDate() : new Date(orden.generacion);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = date.getMonth();
          years.add(year);
          if (!yearMonths[year]) yearMonths[year] = new Set();
          yearMonths[year].add(month);
        }
      }
    });

    filterYear.innerHTML = '<option value="">Todos</option>';
    const sortedYears = [...years].sort();
    sortedYears.forEach(year => {
      const opt = document.createElement('option');
      opt.value = year;
      opt.textContent = year;
      filterYear.appendChild(opt);
    });

    const currentYear = new Date().getFullYear();
    if (years.has(currentYear)) {
      filterYear.value = currentYear;
    }

    const updateMonths = () => {
      const selectedYear = filterYear.value;
      filterMonth.innerHTML = '<option value="">Todos</option>';
      if (selectedYear && yearMonths[selectedYear]) {
        [...yearMonths[selectedYear]].sort().forEach(month => {
          const opt = document.createElement('option');
          opt.value = month;
          opt.textContent = meses[month];
          filterMonth.appendChild(opt);
        });
      }
      if (selectedYear == currentYear && !filterMonth.value) {
        const currentMonth = new Date().getMonth();
        if (yearMonths[selectedYear]?.has(currentMonth)) {
          filterMonth.value = currentMonth;
        }
      }
      loadOrdenes();
    };

    filterYear.addEventListener('change', updateMonths);
    filterMonth.addEventListener('change', loadOrdenes);

    updateMonths();
  } catch (error) {
    console.error('Error al cargar años:', error);
    showSuccessModal('Error al cargar filtros de año/mes.', true);
  }
}

async function loadOrdenes() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    let ordenesQuery = query(
      collection(db, 'ordenesCompra'),
      where('uid', '==', user.uid)
    );

    let selectedYear = filterYear.value;
    let selectedMonth = filterMonth.value;

    const ordenesSnapshot = await getDocs(ordenesQuery);
    let ordenes = [];

    ordenesSnapshot.forEach(doc => {
      const orden = { id: doc.id, ...doc.data() };
      const generacionDate = orden.generacion?.toDate ? orden.generacion.toDate() : new Date(orden.generacion);
      if (isNaN(generacionDate.getTime())) return;

      const year = generacionDate.getFullYear();
      const month = generacionDate.getMonth();

      if (selectedYear && year.toString() !== selectedYear) return;
      if (selectedMonth !== '' && month.toString() !== selectedMonth) return;

      ordenes.push(orden);
    });

    Object.keys(filters).forEach(column => {
      if (filters[column]) {
        ordenes = ordenes.filter(orden => {
          let value = orden[column];
          if (column === 'generacion' || column === 'autorId') {
            value = formatDate(value);
          } else if (column === 'liberada') {
            value = orden.liberada ? 'Sí' : 'No';
          } else if (column === 'total') {
            value = value.toString(); // Asegurar que el total se trate como string para la comparación
          }
          return value?.toString().toLowerCase().includes(filters[column].toLowerCase());
        });
      }
    });

    tableBody.innerHTML = '';
    if (ordenes.length === 0) {
      tableBody.innerHTML = `<tr class="no-records"><td colspan="13">Sin registros para el mes</td></tr>`;
    } else {
      ordenes.forEach(orden => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${orden.codigo}</td>
          <td>${formatDate(orden.generacion)}</td>
          <td>${orden.autorId ? formatDate(orden.autorId) : ''}</td>
          <td>${orden.sociedadId || ''}</td>
          <td>${orden.tipoCompra || ''}</td>
          <td>${orden.proveedorId || ''}</td>
          <td>${orden.digitadorId || ''}</td>
          <td>${orden.nivelActual || ''}</td>
          <td>${orden.nivelOC || ''}</td>
          <td>${orden.liberada ? 'Sí' : 'No'}</td>
          <td>${orden.total}</td>
          <td>${orden.estado || ''}</td>
          <td>${orden.evento || ''}</td>
        `;
        tableBody.appendChild(row);
      });
    }

    totalRecords.textContent = `${ordenes.length} registros`;
    updateColumnWidths();
  } catch (error) {
    console.error('Error al cargar órdenes:', error);
    showSuccessModal(`Error al cargar órdenes: ${error.message}`, true);
  }
}

function updateColumnWidths() {
  const headers = table.querySelectorAll('th');
  const rows = table.querySelectorAll('tbody tr');

  headers.forEach((th, index) => {
    th.style.width = columnWidths[index];
  });

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    cells.forEach((td, index) => {
      td.style.width = columnWidths[index];
    });
  });
}

function initResizeHandles() {
  const headers = table.querySelectorAll('th');
  headers.forEach((th, index) => {
    const handle = th.querySelector('.resize-handle');
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = th.offsetWidth;

      const onMouseMove = (moveEvent) => {
        const newWidth = startWidth + (moveEvent.clientX - startX);
        if (newWidth >= 100 && newWidth <= 400) {
          columnWidths[index] = `${newWidth}px`;
          updateColumnWidths();
        }
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });
}

function downloadFormat() {
  const headers = [
    'Código', 'Generación', 'Autorización', 'Sociedad', 'Tipo Compra',
    'Proveedor', 'Digitador', 'Nivel Actual', 'Nivel OC', 'Liberada',
    'Total', 'Estado'
  ];
  const exampleRow = [
    'OC123', '2025-01-02', '2025-01-03', 'SOC123', 'Materiales', 'PROV456',
    'USER789', '1', '2', 'TRUE', '1000', 'Pendiente'
  ];
  const data = [headers, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Formato');
  XLSX.writeFile(wb, 'formato_ordenes_compra.xlsx');
}

async function importOrdenes(file) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        showImportModal(0);
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (json.length === 0) {
          throw new Error('El archivo Excel está vacío.');
        }

        let headerRowIndex = -1;
        const expectedHeaders = [
          'Código', 'Generación', 'Autorización', 'Sociedad', 'Tipo Compra',
          'Proveedor', 'Digitador', 'Nivel Actual', 'Nivel OC', 'Liberada',
          'Total', 'Estado'
        ];
        for (let i = 0; i < json.length; i++) {
          if (json[i].join(',').toLowerCase().includes('código')) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          throw new Error('No se encontraron los encabezados esperados en el archivo.');
        }

        const dataRows = XLSX.utils.sheet_to_json(sheet, { header: expectedHeaders, range: headerRowIndex });
        if (dataRows.length === 0) {
          throw new Error('No se encontraron datos válidos en el archivo.');
        }

        const existingOrdenes = {};
        const ordenesSnapshot = await getDocs(query(collection(db, 'ordenesCompra'), where('uid', '==', user.uid)));
        ordenesSnapshot.forEach(doc => {
          const orden = doc.data();
          existingOrdenes[orden.codigo] = { id: doc.id, ...orden };
        });

        let created = 0, updated = 0;
        const totalRows = dataRows.length;

        for (let i = 0; i < dataRows.length; i++) {
          const item = dataRows[i];
          const progress = Math.round(((i + 1) / totalRows) * 100);
          showImportModal(progress);

          if (!item.Código || item.Código.toString().trim() === '') {
            console.warn('Fila omitida por Código vacío:', item);
            continue;
          }

          const generacionDate = item.Generación ? (item.Generación instanceof Date ? item.Generación : new Date(item.Generación)) : null;
          if (!generacionDate || isNaN(generacionDate.getTime())) {
            console.warn('Fecha inválida en Generación:', item.Generación);
            continue;
          }

          const autorDate = item.Autorización ? (item.Autorización instanceof Date ? item.Autorización : new Date(item.Autorización)) : null;
          if (autorDate && isNaN(autorDate.getTime())) {
            console.warn('Fecha inválida en Autorización:', item.Autorización);
            continue;
          }

          const ordenData = {
            codigo: item.Código.toString().trim(),
            generacion: Timestamp.fromDate(generacionDate),
            autorId: autorDate ? Timestamp.fromDate(autorDate) : null,
            sociedadId: item.Sociedad?.toString().trim() || '',
            tipoCompra: item['Tipo Compra']?.toString().trim() || '',
            proveedorId: item.Proveedor?.toString().trim() || '',
            digitadorId: item.Digitador?.toString().trim() || '',
            nivelActual: item['Nivel Actual']?.toString().trim() || '',
            nivelOC: item['Nivel OC']?.toString().trim() || '',
            liberada: item.Liberada === 'TRUE' || item.Liberada === true || false,
            total: item.Total ? Math.floor(parseFloat(item.Total)) || 0 : 0,
            estado: item.Estado?.toString().trim() || '',
            evento: `Importado: ${formatDate(new Date())}`,
            uid: user.uid
          };

          const existing = existingOrdenes[item.Código];
          if (existing) {
            const changes = {};
            for (const key in ordenData) {
              let existingValue = existing[key];
              let newValue = ordenData[key];

              if (key === 'generacion' || key === 'autorId') {
                existingValue = existingValue?.toDate?.().getTime();
                newValue = newValue?.toDate?.().getTime();
              }

              if (JSON.stringify(newValue) !== JSON.stringify(existingValue)) {
                changes[key] = ordenData[key];
              }
            }
            if (Object.keys(changes).length > 0) {
              changes.evento = `Actualizado: ${formatDate(new Date())}`;
              const ordenRef = doc(db, 'ordenesCompra', existing.id);
              await updateDoc(ordenRef, changes);
              await logAction(existing.id, 'update', changes);
              updated++;
            }
          } else {
            const ordenRef = await addDoc(collection(db, 'ordenesCompra'), ordenData);
            await logAction(ordenRef.id, 'create', ordenData);
            created++;
          }
        }

        hideImportModal();
        if (created === 0 && updated === 0) {
          showSuccessModal('No se importaron datos. Verifique el formato del archivo.', true);
        } else {
          showSuccessModal(`Importación exitosa: ${created} creadas, ${updated} actualizadas.`);
        }
        loadYearsAndMonths();
        loadOrdenes();
      } catch (error) {
        console.error('Error al procesar el archivo:', error);
        hideImportModal();
        showSuccessModal(`Error al procesar el archivo: ${error.message}`, true);
      }
    };
    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error('Error al importar órdenes:', error);
    hideImportModal();
    showSuccessModal(`Error al importar órdenes: ${error.message}`, true);
  }
}

importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (e) => {
  if (e.target.files[0]) {
    importOrdenes(e.target.files[0]);
    e.target.value = '';
  }
});

downloadFormatBtn.addEventListener('click', downloadFormat);

exportBtn.addEventListener('click', async () => {
  try {
    const ordenes = [];
    const rows = tableBody.querySelectorAll('tr:not(.no-records)');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      ordenes.push({
        Código: cells[0].textContent,
        Generación: cells[1].textContent,
        Autorización: cells[2].textContent,
        Sociedad: cells[3].textContent,
        'Tipo Compra': cells[4].textContent,
        Proveedor: cells[5].textContent,
        Digitador: cells[6].textContent,
        'Nivel Actual': cells[7].textContent,
        'Nivel OC': cells[8].textContent,
        Liberada: cells[9].textContent,
        Total: cells[10].textContent,
        Estado: cells[11].textContent,
        Evento: cells[12].textContent
      });
    });

    const ws = XLSX.utils.json_to_sheet(ordenes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ordenes de Compra');
    XLSX.writeFile(wb, 'ordenes_compra.xlsx');
  } catch (error) {
    console.error('Error al exportar órdenes:', error);
    showSuccessModal('Error al exportar órdenes.', true);
  }
});

document.querySelectorAll('.filter-icon').forEach(icon => {
  icon.addEventListener('click', (e) => {
    const column = e.target.dataset.column;

    // Si el ícono es fa-filter-circle-xmark, limpiar el filtro
    if (e.target.classList.contains('fa-filter-circle-xmark')) {
      e.target.classList.remove('fa-filter-circle-xmark', 'active');
      e.target.classList.add('fa-filter');
      delete filters[column]; // Eliminar el filtro de la columna
      document.querySelectorAll(`.filter-input-container[data-column="${column}"]`).forEach(input => input.remove());
      loadOrdenes(); // Recargar la tabla
      return;
    }

    // Cerrar otros inputs de filtro, pero no cambiar los íconos de columnas con filtros activos
    document.querySelectorAll('.filter-input-container').forEach(input => input.remove());

    // Mostrar el input de filtro y cambiar el ícono
    e.target.classList.remove('fa-filter');
    e.target.classList.add('fa-filter-circle-xmark', 'active');

    const container = document.createElement('div');
    container.className = 'filter-input-container';
    container.dataset.column = column;
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
        e.target.classList.remove('fa-filter-circle-xmark', 'active');
        e.target.classList.add('fa-filter');
        container.remove();
      }
      loadOrdenes();
    });
    container.appendChild(input);
    e.target.parentElement.appendChild(container);
    input.focus();

    // Restaurar íconos fa-filter-circle-xmark para columnas con filtros activos
    document.querySelectorAll('.filter-icon').forEach(i => {
      const col = i.dataset.column;
      if (filters[col] && !i.classList.contains('fa-filter-circle-xmark')) {
        i.classList.remove('fa-filter');
        i.classList.add('fa-filter-circle-xmark', 'active');
      } else if (!filters[col] && i.classList.contains('fa-filter-circle-xmark') && i !== e.target) {
        i.classList.remove('fa-filter-circle-xmark', 'active');
        i.classList.add('fa-filter');
      }
    });
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.classList.contains('fa-filter') &&
      !e.target.classList.contains('fa-filter-circle-xmark') &&
      !e.target.closest('.filter-input-container')) {
    document.querySelectorAll('.filter-input-container').forEach(input => input.remove());
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
});

auth.onAuthStateChanged(async user => {
  if (!user) {
    showSuccessModal('Usuario no autenticado. Por favor, inicia sesión.', true);
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      showSuccessModal('Usuario no registrado en la base de datos.', true);
      return;
    }

    const userData = userDoc.data();
    const hasAccess = userData.role === 'Administrador' || userData.role === 'Operador';
    if (!hasAccess) {
      showSuccessModal('Acceso denegado. No tienes permisos para acceder a este módulo.', true);
      return;
    }

    loadYearsAndMonths();
    loadOrdenes();
    initResizeHandles();
  } catch (error) {
    console.error('Error al verificar permisos:', error);
    showSuccessModal(`Error al verificar permisos: ${error.message}`, true);
  }
});

window.addEventListener('moduleCleanup', () => {
  successModal.style.display = 'none';
  loadingImportModal.style.display = 'none';
});