import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
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

    function validateDOMElements() {
        const elements = {
            form: document.getElementById('implantes-form'),
            admisionInput: document.getElementById('admision'),
            previsionInput: document.getElementById('prevision'),
            pacienteInput: document.getElementById('paciente'),
            medicoInput: document.getElementById('medico'),
            fechaCxInput: document.getElementById('fecha-cx'),
            ingresoInput: document.getElementById('ingreso'),
            cotizacionInput: document.getElementById('cotizacion'),
            referenciaInput: document.getElementById('referencia'),
            cantidadInput: document.getElementById('cantidad'),
            loteInput: document.getElementById('lote'),
            vencimientoInput: document.getElementById('vencimiento'),
            precioInput: document.getElementById('precio'),
            descripcionInput: document.getElementById('descripcion'),
            totalInput: document.getElementById('total'),
            proveedorInput: document.getElementById('proveedor'),
            codigoInput: document.getElementById('codigo'),
            totalCotizacionInput: document.getElementById('total-cotizacion'),
            registrarBtn: document.getElementById('registrar-btn'),
            limpiarBtn: document.getElementById('limpiar-btn'),
            tableBody: document.querySelector('#implantes-table tbody'),
            prevPageBtn: document.getElementById('prev-page'),
            nextPageBtn: document.getElementById('next-page'),
            pageInfo: document.getElementById('page-info'),
            messageContainer: document.getElementById('message-container')
        };

        let missingElements = false;
        Object.entries(elements).forEach(([key, el]) => {
            if (!el) {
                console.error(`Elemento ${key} no encontrado en el DOM`);
                missingElements = true;
            }
        });

        if (missingElements) {
            alert('Faltan elementos en el formulario. Revisa el HTML.');
            return null;
        }
        return elements;
    }

    const domElements = validateDOMElements();
    if (!domElements) {
        throw new Error('Faltan elementos del DOM');
    }

    const {
        form,
        admisionInput,
        previsionInput,
        pacienteInput,
        medicoInput,
        fechaCxInput,
        ingresoInput,
        cotizacionInput,
        referenciaInput,
        cantidadInput,
        loteInput,
        vencimientoInput,
        precioInput,
        descripcionInput,
        totalInput,
        proveedorInput,
        codigoInput,
        totalCotizacionInput,
        registrarBtn,
        limpiarBtn,
        tableBody,
        prevPageBtn,
        nextPageBtn,
        pageInfo,
        messageContainer
    } = domElements;

    let allCargos = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    function showMessage(messageText, type = 'success') {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = messageText;
        messageContainer.appendChild(message);
        setTimeout(() => {
            message.classList.add('fade-out');
            setTimeout(() => {
                message.remove();
            }, 300);
        }, 3000);
    }

    function formatDateForInput(date) {
        if (!date || !(date instanceof Timestamp)) {
            return '';
        }
        const d = date.toDate();
        if (isNaN(d.getTime())) {
            return '';
        }
        d.setHours(0, 0, 0, 0);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDateForDisplay(date) {
        if (!date || !(date instanceof Timestamp)) {
            return 'Sin fecha';
        }
        const d = date.toDate();
        if (isNaN(d.getTime())) {
            return 'Sin fecha';
        }
        d.setHours(0, 0, 0, 0);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function formatNumberWithThousands(value) {
        if (!value && value !== 0) return '0';
        const num = Math.round(parseFloat(value));
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    async function loadImplanteByAdmision(admision, user) {
        try {
            const implantesQuery = query(
                collection(db, 'pacientesimplantes'),
                where('uid', '==', user.uid),
                where('admision', '==', admision.trim())
            );
            const implantesSnapshot = await getDocs(implantesQuery);
            if (implantesSnapshot.empty) {
                return null;
            }
            return implantesSnapshot.docs[0].data();
        } catch (error) {
            showMessage(`Error al buscar datos de admisión: ${error.message}`, 'error');
            return null;
        }
    }

    async function fetchReferenciaData(referencia) {
        try {
            console.log('Buscando referencia:', referencia);
            const referenciaValue = referencia.toLowerCase().trim().replace(/\s+/g, '');
            console.log('Valor normalizado para consulta:', referenciaValue);
            const referenciasQuery = query(
                collection(db, 'referencias'),
                where('referenciaLowerCase', '==', referenciaValue)
            );
            const referenciasSnapshot = await getDocs(referenciasQuery);
            console.log('Documentos encontrados:', referenciasSnapshot.size);
            if (referenciasSnapshot.empty) {
                console.log('No se encontraron referencias para:', referenciaValue);
                return null;
            }
            const refData = referenciasSnapshot.docs[0].data();
            console.log('Datos de la referencia:', refData);
            return {
                precio: refData.precio || 0,
                descripcion: refData.descripcion || 'Implante estándar',
                proveedor: refData.proveedor || '',
                codigo: refData.codigo || ''
            };
        } catch (error) {
            console.error('Error al buscar referencia:', error);
            showMessage(`Error al buscar referencia: ${error.message}`, 'error');
            return null;
        }
    }

    async function fetchTotalCotizacionByAdmisionAndProveedor(admision, proveedor, user) {
        try {
            console.log(`Buscando totalCotizacion para admision: ${admision}, proveedor: ${proveedor}`);
            const implantesQuery = query(
                collection(db, 'pacientesimplantes'),
                where('uid', '==', user.uid),
                where('admision', '==', admision.trim()),
                where('proveedor', '==', proveedor.trim())
            );
            const implantesSnapshot = await getDocs(implantesQuery);
            console.log('Documentos encontrados:', implantesSnapshot.size);
            if (implantesSnapshot.empty) {
                console.log(`No se encontró documento para admision: ${admision}, proveedor: ${proveedor}`);
                return null;
            }
            const implanteData = implantesSnapshot.docs[0].data();
            console.log('Datos del implante:', implanteData);
            return implanteData.totalCotizacion || 0;
        } catch (error) {
            console.error(`Error al buscar totalCotizacion: ${error.message}`);
            showMessage(`Error al buscar total cotización: ${error.message}`, 'error');
            return null;
        }
    }

    async function updateReferenciasWithLowerCase() {
        try {
            const referenciasCollection = collection(db, 'referencias');
            const querySnapshot = await getDocs(referenciasCollection);
            const batch = writeBatch(db);
            let updatedCount = 0;
            querySnapshot.forEach(doc => {
                const refData = doc.data();
                if (!refData.referenciaLowerCase && refData.referencia) {
                    batch.update(doc.ref, {
                        referenciaLowerCase: refData.referencia.toLowerCase().trim().replace(/\s+/g, '')
                    });
                    updatedCount++;
                }
            });
            await batch.commit();
            console.log(`Documentos actualizados con referenciaLowerCase: ${updatedCount}`);
            showMessage(`Actualizados ${updatedCount} documentos con referenciaLowerCase`, 'success');
        } catch (error) {
            console.error('Error al actualizar documentos:', error);
            showMessage(`Error al actualizar documentos: ${error.message}`, 'error');
        }
    }

    function clearRelatedFields() {
        previsionInput.value = '';
        pacienteInput.value = '';
        medicoInput.value = '';
        fechaCxInput.value = '';
        totalCotizacionInput.value = '';
    }

    function clearForm() {
        ingresoInput.value = '';
        admisionInput.value = '';
        cotizacionInput.value = '';
        referenciaInput.value = '';
        cantidadInput.value = '';
        loteInput.value = '';
        vencimientoInput.value = '';
        precioInput.value = '100,000';
        descripcionInput.value = 'Implante estándar';
        proveedorInput.value = '';
        codigoInput.value = '';
        totalInput.value = '0';
        totalCotizacionInput.value = '';
        clearRelatedFields();
    }

    function calculateTotal() {
        const cantidad = parseInt(cantidadInput.value) || 0;
        const precio = parseFloat(precioInput.value.replace(/,/g, '')) || 0;
        if (isNaN(cantidad) || cantidad < 0) {
            showMessage('La cantidad debe ser un número mayor o igual a 0.', 'error');
            totalInput.value = '0';
            return;
        }
        if (isNaN(precio) || precio < 0) {
            showMessage('El precio debe ser un número válido.', 'error');
            totalInput.value = '0';
            return;
        }
        const total = cantidad * precio;
        totalInput.value = formatNumberWithThousands(total);
    }

    async function loadCargos() {
        const user = auth.currentUser;
        if (!user) {
            return [];
        }
        try {
            const cargosQuery = query(
                collection(db, 'cargosimp'),
                where('uid', '==', user.uid)
            );
            const cargosSnapshot = await getDocs(cargosQuery);
            return cargosSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            showMessage(`Error al cargar cargos: ${error.message}`, 'error');
            return [];
        }
    }

    function renderCargos(cargos) {
        if (!tableBody) {
            return;
        }
        tableBody.innerHTML = '';
        if (cargos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="17" class="text-center">No hay datos para mostrar.</td></tr>';
            return;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedCargos = cargos.slice(start, end);

        paginatedCargos.forEach(cargo => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDateForDisplay(cargo.fechaIngreso)}</td>
                <td>${cargo.admision || ''}</td>
                <td>${cargo.cotizacion || ''}</td>
                <td>${cargo.referencia || ''}</td>
                <td>${cargo.cantidad || 0}</td>
                <td>${cargo.lote || ''}</td>
                <td>${formatDateForDisplay(cargo.fechaVencimiento)}</td>
                <td>${formatNumberWithThousands(cargo.precio)}</td>
                <td>${cargo.descripcion || ''}</td>
                <td>${formatNumberWithThousands(cargo.total)}</td>
                <td>${cargo.prevision || ''}</td>
                <td>${cargo.paciente || ''}</td>
                <td>${cargo.medico || ''}</td>
                <td>${formatDateForDisplay(cargo.fechaCx)}</td>
                <td>${cargo.proveedor || ''}</td>
                <td>${cargo.codigo || ''}</td>
                <td>${formatNumberWithThousands(cargo.totalCotizacion)}</td>
            `;
            tableBody.appendChild(row);
        });

        updatePagination(cargos);
    }

    function updatePagination(cargos) {
        const totalPages = Math.ceil(cargos.length / itemsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    async function registerCargo(e) {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            showMessage('Usuario no autenticado. Por favor, inicia sesión.', 'error');
            return;
        }

        // Validar solo los campos obligatorios
        if (!ingresoInput.value || !admisionInput.value || !cotizacionInput.value ||
            !referenciaInput.value || !cantidadInput.value) {
            showMessage('Por favor, completa todos los campos requeridos (Ingreso, Admisión, Cotización, Referencia, Cantidad).', 'error');
            return;
        }

        const cantidad = parseInt(cantidadInput.value);
        const precio = parseFloat(precioInput.value.replace(/,/g, ''));
        if (isNaN(cantidad) || cantidad < 1) {
            showMessage('La cantidad debe ser un número mayor o igual a 1.', 'error');
            cantidadInput.focus();
            return;
        }
        if (isNaN(precio) || precio < 0) {
            showMessage('El precio debe ser un número válido.', 'error');
            precioInput.focus();
            return;
        }

        try {
            const parseDateInput = (dateString) => {
                if (!dateString) return null;
                const [year, month, day] = dateString.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                date.setHours(0, 0, 0, 0);
                return isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
            };

            const cargoData = {
                fechaIngreso: parseDateInput(ingresoInput.value),
                admision: admisionInput.value.trim(),
                cotizacion: cotizacionInput.value.trim(),
                referencia: referenciaInput.value.trim().toUpperCase(),
                cantidad: cantidad,
                lote: loteInput.value.trim() || '', // Almacenar cadena vacía si no se ingresa lote
                fechaVencimiento: parseDateInput(vencimientoInput.value), // Almacenar null si no se ingresa fecha
                precio: precio,
                descripcion: descripcionInput.value.trim(),
                total: parseFloat(totalInput.value.replace(/,/g, '')),
                prevision: previsionInput.value.trim() !== '' ? previsionInput.value.trim() : '',
                paciente: pacienteInput.value.trim() !== '' ? pacienteInput.value.trim() : '',
                medico: medicoInput.value.trim() !== '' ? medicoInput.value.trim() : '',
                fechaCx: parseDateInput(fechaCxInput.value),
                proveedor: proveedorInput.value.trim() !== '' ? proveedorInput.value.trim() : '',
                codigo: codigoInput.value.trim() !== '' ? codigoInput.value.trim() : '',
                totalCotizacion: totalCotizacionInput.value ? parseFloat(totalCotizacionInput.value.replace(/,/g, '')) : 0,
                uid: user.uid,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'cargosimp'), cargoData);
            showMessage('Cargo registrado exitosamente.', 'success');
            clearForm();
            allCargos = await loadCargos();
            renderCargos(allCargos);
        } catch (error) {
            showMessage(`Error al registrar cargo: ${error.message}`, 'error');
            if (error.code === 'permission-denied') {
                showMessage('No tienes permisos suficientes para registrar cargos. Contacta al administrador.', 'error');
            }
        }
    }

    function setupReferenciaAutocomplete() {
        referenciaInput.addEventListener('blur', async () => {
            const referenciaValue = referenciaInput.value.trim();
            console.log('Evento blur en referencia:', referenciaValue);
            if (!referenciaValue) {
                precioInput.value = '100,000';
                descripcionInput.value = 'Implante estándar';
                proveedorInput.value = '';
                codigoInput.value = '';
                calculateTotal();
                return;
            }

            const refData = await fetchReferenciaData(referenciaValue);
            if (refData) {
                precioInput.value = formatNumberWithThousands(refData.precio);
                descripcionInput.value = refData.descripcion;
                proveedorInput.value = refData.proveedor;
                codigoInput.value = refData.codigo;
                calculateTotal();
                showMessage(`Referencia "${referenciaValue}" encontrada.`, 'success');

                // Trigger totalCotizacion fetch after proveedor is set
                if (admisionInput.value.trim() && proveedorInput.value.trim()) {
                    const user = auth.currentUser;
                    if (user) {
                        const totalCotizacion = await fetchTotalCotizacionByAdmisionAndProveedor(
                            admisionInput.value.trim(),
                            proveedorInput.value.trim(),
                            user
                        );
                        if (totalCotizacion !== null) {
                            totalCotizacionInput.value = formatNumberWithThousands(totalCotizacion);
                            showMessage(
                                `Total cotización cargado para Admisión "${admisionInput.value.trim()}" y Proveedor "${proveedorInput.value.trim()}".`,
                                'success'
                            );
                        } else {
                            totalCotizacionInput.value = '0';
                            showMessage(
                                `No se encontró total cotización para Admisión "${admisionInput.value.trim()}" y Proveedor "${proveedorInput.value.trim()}".`,
                                'warning'
                            );
                        }
                    } else {
                        showMessage('Usuario no autenticado. Por favor, inicia sesión.', 'error');
                        totalCotizacionInput.value = '0';
                    }
                }
            } else {
                precioInput.value = '100,000';
                descripcionInput.value = 'Implante estándar';
                proveedorInput.value = '';
                codigoInput.value = '';
                totalCotizacionInput.value = '0';
                calculateTotal();
                showMessage(`Referencia "${referenciaValue}" no encontrada. Verifica los datos en Firestore.`, 'warning');
            }
        });
    }

    function setupAdmisionAndProveedorAutocomplete() {
        const fetchTotalCotizacion = async () => {
            const admisionValue = admisionInput.value.trim();
            const proveedorValue = proveedorInput.value.trim();
            if (admisionValue && proveedorValue) {
                const user = auth.currentUser;
                if (!user) {
                    showMessage('Usuario no autenticado. Por favor, inicia sesión.', 'error');
                    totalCotizacionInput.value = '0';
                    return;
                }
                const totalCotizacion = await fetchTotalCotizacionByAdmisionAndProveedor(admisionValue, proveedorValue, user);
                if (totalCotizacion !== null) {
                    totalCotizacionInput.value = formatNumberWithThousands(totalCotizacion);
                    showMessage(
                        `Total cotización cargado para Admisión "${admisionValue}" y Proveedor "${proveedorValue}".`,
                        'success'
                    );
                } else {
                    totalCotizacionInput.value = '0';
                    showMessage(
                        `No se encontró total cotización para Admisión "${admisionValue}" y Proveedor "${proveedorValue}".`,
                        'warning'
                    );
                }
            } else {
                totalCotizacionInput.value = '0';
            }
        };

        admisionInput.addEventListener('change', async () => {
            const admisionValue = admisionInput.value.trim();
            if (admisionValue) {
                const user = auth.currentUser;
                if (!user) {
                    showMessage('Usuario no autenticado. Por favor, inicia sesión.', 'error');
                    clearRelatedFields();
                    return;
                }
                try {
                    const implante = await loadImplanteByAdmision(admisionValue, user);
                    if (implante) {
                        previsionInput.value = implante.prevision || '';
                        pacienteInput.value = implante.nombrePaciente || '';
                        medicoInput.value = implante.medico || '';
                        fechaCxInput.value = formatDateForInput(implante.fechaCX);
                        showMessage('Datos cargados exitosamente.', 'success');
                    } else {
                        clearRelatedFields();
                        showMessage('No se encontró una admisión coincidente.', 'warning');
                    }
                    // Trigger totalCotizacion fetch if proveedor is already set
                    if (proveedorInput.value.trim()) {
                        await fetchTotalCotizacion();
                    }
                } catch (error) {
                    showMessage(`Error en autocompletado de admisión: ${error.message}`, 'error');
                    clearRelatedFields();
                }
            } else {
                clearRelatedFields();
                totalCotizacionInput.value = '0';
            }
        });

        proveedorInput.addEventListener('blur', async () => {
            await fetchTotalCotizacion();
        });
    }

    function setupEventListeners() {
        cantidadInput.addEventListener('input', () => {
            console.log('Evento input en cantidad:', cantidadInput.value);
            calculateTotal();
        });
        precioInput.addEventListener('input', () => {
            console.log('Evento input en precio:', precioInput.value);
            calculateTotal();
        });
        form.addEventListener('submit', registerCargo);
        limpiarBtn.addEventListener('click', clearForm);
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderCargos(allCargos);
            }
        });
        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(allCargos.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderCargos(allCargos);
            }
        });
    }

    async function init() {
        try {
            await new Promise((resolve, reject) => {
                onAuthStateChanged(auth, user => {
                    if (user) {
                        resolve();
                    } else {
                        showMessage('Usuario no autenticado. Por favor, inicia sesión.', 'error');
                        reject(new Error('Usuario no autenticado'));
                    }
                });
            });
            await updateReferenciasWithLowerCase();
            setupAdmisionAndProveedorAutocomplete();
            setupReferenciaAutocomplete();
            setupEventListeners();
            allCargos = await loadCargos();
            renderCargos(allCargos);
        } catch (error) {
            showMessage(`Error al inicializar la aplicación: ${error.message}`, 'error');
        }
    }

    init();
} catch (error) {
    alert('Error al cargar la aplicación. Revisa la consola para más detalles.');
}