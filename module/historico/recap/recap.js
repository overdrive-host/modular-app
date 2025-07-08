import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, getDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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
        console.error('Error al configurar persistencia:', error.message);
    });

    const recapContainer = document.querySelector('.recap-container');
    const recapTableBody = document.querySelector('#recap-table tbody');
    const loadingModal = document.getElementById('loading-modal');
    const loadingProgress = document.getElementById('loading-progress');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const yearFilter = document.getElementById('year-filter');

    const elements = { recapContainer, recapTableBody, loadingModal, loadingProgress, successModal, successIcon, successMessage, yearFilter };
    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado`);
    });

    function showModal(modal, progressElement = null, percentage = null) {
        if (!modal) { console.warn('Modal no encontrado'); return; }
        modal.style.display = 'flex';
        if (progressElement && percentage !== null) progressElement.textContent = `${percentage}%`;
    }

    function hideModal(modal) {
        if (!modal) { console.warn('Modal no encontrado'); return; }
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
        successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
        showModal(successModal);
        setTimeout(() => hideModal(successModal), 2000);
    }

    function formatDate(date) {
        if (!date) return null;
        if (date instanceof Timestamp) return date.toDate();
        if (date instanceof Date) return date;
        return new Date(date);
    }

    async function getEmpresaRut(proveedor) {
        if (!proveedor) return "Empresa no registrada";
        try {
            const empresasCollection = collection(db, 'empresas');
            const q = query(empresasCollection, where('nombreEmpresa', '==', proveedor));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty ? querySnapshot.docs[0].data().rutEmpresa || "Empresa no registrada" : "Empresa no registrada";
        } catch (error) {
            console.error('Error al buscar RUT:', error.message);
            return "Empresa no registrada";
        }
    }

    async function loadRecapData(selectedYear = '') {
        try {
            showModal(loadingModal, loadingProgress, 0);
            const datosHistoricoCollection = collection(db, 'datos_historico');
            const querySnapshot = await getDocs(datosHistoricoCollection);
            const registrosMap = new Map();
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                let fechaCirugia = formatDate(data.fecha_cirugia);
                if (fechaCirugia && !isNaN(fechaCirugia.getTime())) {
                    if (!selectedYear || fechaCirugia.getFullYear().toString() === selectedYear) {
                        const proveedor = data.proveedor || 'Sin Proveedor';
                        if (!registrosMap.has(proveedor)) {
                            registrosMap.set(proveedor, []);
                        }
                        registrosMap.get(proveedor).push(data);
                    }
                }
            });

            const providers = Array.from(registrosMap.keys());
            recapTableBody.innerHTML = '';

            const allMonthlyTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 };

            for (let i = 0; i < providers.length; i++) {
                const proveedor = providers[i];
                const rut = await getEmpresaRut(proveedor);
                const registros = registrosMap.get(proveedor);
                const monthlyTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 };
                registros.filter(r => !r.estado || r.estado === 'Pendiente factura').forEach(r => {
                    const fechaCirugia = formatDate(r.fecha_cirugia);
                    if (fechaCirugia && !isNaN(fechaCirugia.getTime())) {
                        const month = fechaCirugia.getMonth();
                        const ocMonto = parseFloat(r.oc_monto) || 0;
                        monthlyTotals[month] += ocMonto;
                        allMonthlyTotals[month] += ocMonto;
                    }
                });

                const total = Object.values(monthlyTotals).reduce((a, b) => a + b, 0);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${proveedor}</td>
                    <td>${rut}</td>
                    <td>${monthlyTotals[0].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${monthlyTotals[1].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${monthlyTotals[2].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${monthlyTotals[3].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${monthlyTotals[4].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${monthlyTotals[5].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${monthlyTotals[6].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${monthlyTotals[7].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${monthlyTotals[8].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${monthlyTotals[9].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${monthlyTotals[10].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${monthlyTotals[11].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td>${total.toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                `;
                recapTableBody.appendChild(tr);

                const progress = Math.round((i + 1) / providers.length * 100);
                showModal(loadingModal, loadingProgress, progress);
            }

            const totalRow = document.createElement('tr');
            totalRow.innerHTML = `
                <td><strong>Total General</strong></td>
                <td>-</td>
                <td>${allMonthlyTotals[0].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                <td>${allMonthlyTotals[1].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                <td>${allMonthlyTotals[2].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                <td>${allMonthlyTotals[3].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                <td>${allMonthlyTotals[4].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                <td>${allMonthlyTotals[5].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                <td>${allMonthlyTotals[6].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                <td>${allMonthlyTotals[7].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                <td>${allMonthlyTotals[8].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                <td>${allMonthlyTotals[9].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                <td>${allMonthlyTotals[10].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                <td>${allMonthlyTotals[11].toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                <td>${Object.values(allMonthlyTotals).reduce((a, b) => a + b, 0).toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
            `;
            recapTableBody.appendChild(totalRow);

            hideModal(loadingModal);
        } catch (error) {
            console.error('Error al cargar datos de recap:', error.message);
            showSuccessMessage('Error al cargar datos: ' + error.message, false);
            hideModal(loadingModal);
        }
    }

    function populateYearFilter(years) {
        if (!yearFilter) { console.error('Elemento year-filter no encontrado'); return; }
        yearFilter.innerHTML = '<option value="">Todos los años</option>';
        if (years.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Sin años disponibles';
            option.disabled = true;
            yearFilter.appendChild(option);
        } else {
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            });
        }
        const currentYear = new Date().getFullYear().toString();
        if (years.includes(currentYear)) {
            yearFilter.value = currentYear;
        }
    }

    async function init() {
        if (!recapContainer) {
            console.error('Contenedor .recap-container no encontrado');
            return;
        }

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                console.error('No hay usuario autenticado');
                recapContainer.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
                setTimeout(() => window.location.href = 'index.html?error=auth-required', 2000);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    console.error('Documento de usuario no encontrado');
                    recapContainer.innerHTML = '<p>Error: Tu cuenta no está registrada. Contacta al administrador.</p>';
                    return;
                }

                const userData = userDoc.data();
                const hasAccess = userData.role === 'Administrador' || (userData.permissions && userData.permissions.includes('Tablas:Historico'));
                if (!hasAccess) {
                    console.error('Acceso denegado');
                    recapContainer.innerHTML = '<p>Acceso denegado. No tienes permisos para este módulo.</p>';
                    return;
                }

                const datosHistoricoCollection = collection(db, 'datos_historico');
                const querySnapshot = await getDocs(datosHistoricoCollection);
                const years = [...new Set(querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    let fechaCirugia = formatDate(data.fecha_cirugia);
                    return fechaCirugia && !isNaN(fechaCirugia.getTime()) ? fechaCirugia.getFullYear().toString() : null;
                }).filter(year => year))].sort();
                populateYearFilter(years);

                yearFilter.addEventListener('change', () => {
                    const selectedYear = yearFilter.value;
                    loadRecapData(selectedYear);
                });

                await loadRecapData(yearFilter.value);
            } catch (error) {
                console.error('Error en verificación de usuario:', error.message);
                recapContainer.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => init());
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(() => init(), 1);
} catch (error) {
    console.error('Error al inicializar Firebase:', error.message);
    const recapContainer = document.querySelector('.recap-container');
    if (recapContainer) recapContainer.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
}