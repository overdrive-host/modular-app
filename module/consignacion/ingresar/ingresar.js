import { getFirestore, collection, addDoc, updateDoc, doc, getDocs, getDoc, deleteDoc, query, where, Timestamp, writeBatch, orderBy, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';

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
    const asignacionForm = document.getElementById('asignacion-form');
    const fechaIngresoInput = document.getElementById('fecha-ingreso');
    const admisionInput = document.getElementById('admisión');
    const nombrePacienteInput = document.getElementById('nombrePaciente');
    const fechaCXInput = document.getElementById('fechaCX');
    const medicoInput = document.getElementById('medico');
    const medicoSearch = document.getElementById('medico-search');
    const medicoList = document.getElementById('medico-list');
    const descripcionInput = document.getElementById('descripcion');
    const descripcionSearch = document.getElementById('descripcion-search');
    const descripcionModeToggle = document.getElementById('descripcion-mode-toggle');
    const descripcionList = document.getElementById('descripcion-list');
    const cantidadInput = document.getElementById('cantidad');
    const estadoSelect = document.getElementById('estado');
    const codigoInput = document.getElementById('codigo');
    const referenciaInput = document.getElementById('referencia');
    const proveedorInput = document.getElementById('proveedor');
    const proveedorSearch = document.getElementById('proveedor-search');
    const proveedorList = document.getElementById('proveedor-list');
    const modalidadSelect = document.getElementById('modalidad');
    const precioInput = document.getElementById('precio');
    const totalInput = document.getElementById('total');
    const registrarBtn = document.getElementById('registrar-btn');
    const limpiarBtn = document.getElementById('limpiar-btn');
    const traspasoModal = document.getElementById('traspaso-modal');
    const traspasoTypeSelect = document.getElementById('traspaso-type');
    const traspasoSelect = document.getElementById('traspaso-select');
    const currentDateSpan = document.getElementById('current-date');
    const confirmTraspasoBtn = document.getElementById('confirm-traspaso-btn');
    const cancelTraspasoBtn = document.getElementById('cancel-traspaso-btn');
    const selectAsignacionesModal = document.getElementById('select-asignaciones-modal');
    const selectAsignacionesTableBody = document.querySelector('#select-asignaciones-table tbody');
    const confirmSelectBtn = document.getElementById('confirm-select-btn');
    const cancelSelectBtn = document.getElementById('cancel-select-btn');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const editModal = document.getElementById('edit-modal');
    const editFechaIngresoInput = document.getElementById('edit-fecha-ingreso');
    const editAdmisionInput = document.getElementById('edit-admisión');
    const editNombrePacienteInput = document.getElementById('edit-nombrePaciente');
    const editFechaCXInput = document.getElementById('edit-fechaCX');
    const editMedicoInput = document.getElementById('edit-medico');
    const editMedicoSearch = document.getElementById('edit-medico-search');
    const editMedicoList = document.getElementById('edit-medico-list');
    const editDescripcionInput = document.getElementById('edit-descripcion');
    const editDescripcionSearch = document.getElementById('edit-descripcion-search');
    const editDescripcionModeToggle = document.getElementById('edit-descripcion-mode-toggle');
    const editDescripcionList = document.getElementById('edit-descripcion-list');
    const editCantidadInput = document.getElementById('edit-cantidad');
    const editEstadoSelect = document.getElementById('edit-estado');
    const editCodigoInput = document.getElementById('edit-codigo');
    const editReferenciaInput = document.getElementById('edit-referencia');
    const editProveedorInput = document.getElementById('edit-proveedor');
    const editModalidadSelect = document.getElementById('edit-modalidad');
    const editPrecioInput = document.getElementById('edit-precio');
    const editTotalInput = document.getElementById('edit-total');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const deleteModal = document.getElementById('delete-modal');
    const deleteMessage = document.getElementById('delete-message');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const logModal = document.getElementById('log-modal');
    const logContent = document.getElementById('log-content');
    const closeLogBtn = document.getElementById('close-log-btn');
    const asignacionesTableBody = document.querySelector('#asignaciones-table tbody');
    const loadingModal = document.getElementById('loading-modal');

    const elements = {
        container, asignacionForm, fechaIngresoInput, admisionInput, nombrePacienteInput, fechaCXInput, medicoInput, medicoSearch, medicoList,
        descripcionInput, descripcionSearch, descripcionModeToggle, descripcionList, cantidadInput, estadoSelect,
        codigoInput, referenciaInput, proveedorInput, proveedorSearch, proveedorList, modalidadSelect,
        precioInput, totalInput, registrarBtn, limpiarBtn, traspasoModal, traspasoTypeSelect, traspasoSelect, currentDateSpan,
        confirmTraspasoBtn, cancelTraspasoBtn, selectAsignacionesModal, selectAsignacionesTableBody, confirmSelectBtn, cancelSelectBtn,
        successModal, successIcon, successMessage, editModal, editFechaIngresoInput, editAdmisionInput, editNombrePacienteInput, editFechaCXInput,
        editMedicoInput, editMedicoSearch, editMedicoList, editDescripcionInput, editDescripcionSearch, editDescripcionModeToggle,
        editDescripcionList, editCantidadInput, editEstadoSelect, editCodigoInput, editReferenciaInput, editProveedorInput,
        editModalidadSelect, editPrecioInput, editTotalInput, saveEditBtn, cancelEditBtn, deleteModal, deleteMessage,
        confirmDeleteBtn, cancelDeleteBtn, logModal, logContent, closeLogBtn, asignacionesTableBody, loadingModal
    };

    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado`);
    });

    let currentUser = null;
    let currentEditId = null;
    let asignaciones = [];
    let descripcionMode = 'Consignación';
    let editDescripcionMode = 'Consignación';

    // Inicializar el campo de fecha de ingreso con la fecha actual
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    if (fechaIngresoInput) {
        fechaIngresoInput.value = today;
    }

    function showLoadingModal() {
        if (!loadingModal) {
            console.warn('loadingModal no encontrado');
            return;
        }
        loadingModal.style.display = 'flex';
        loadingModal.removeAttribute('hidden');
    }

    function hideLoadingModal() {
        if (!loadingModal) {
            console.warn('loadingModal no encontrado');
            return;
        }
        loadingModal.style.display = 'none';
        loadingModal.setAttribute('hidden', true);
    }

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
            updateTotal(input === precioInput ? totalInput : editTotalInput);
        });
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.value = '0';
                updateTotal(input === precioInput ? totalInput : editTotalInput);
                return;
            }
            let value = input.value.replace(/[^0-9]/g, '');
            value = value ? parseInt(value).toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '0';
            input.value = value;
            updateTotal(input === precioInput ? totalInput : editTotalInput);
        });
    }

    function updateTotal(totalField) {
        if (!cantidadInput || !precioInput || !totalInput || !editCantidadInput || !editPrecioInput || !editTotalInput) return;
        const cantidad = parseInt(totalField === totalInput ? cantidadInput.value : editCantidadInput.value) || 1;
        let precio = (totalField === totalInput ? precioInput.value : editPrecioInput.value).replace(/[^0-9]/g, '');
        precio = parseInt(precio) || 0;
        const total = cantidad * precio;
        totalField.value = total.toLocaleString('es-CL', { minimumFractionDigits: 0 });
    }

    function formatDate(date) {
        return date.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function formatDateOnly(date) {
        if (!date) return '-';
        let parsedDate;
        if (typeof date === 'string') {
            const [year, month, day] = date.split('-');
            parsedDate = new Date(year, month - 1, day);
        } else if (date instanceof Timestamp) {
            parsedDate = date.toDate();
        } else if (date instanceof Date) {
            parsedDate = date;
        }
        if (!parsedDate || isNaN(parsedDate)) return '-';
        parsedDate.setHours(0, 0, 0, 0);
        return parsedDate.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    async function loadEmpresas() {
        try {
            const user = auth.currentUser;
            const empresasSnapshot = await getDocs(collection(db, 'empresas'));
            const empresas = empresasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return empresas;
        } catch (error) {
            console.error('Error al cargar empresas:', error);
            alert('No se pudieron cargar las empresas. Verifica tus permisos o contacta al administrador.');
            return [];
        }
    }

    async function loadMedicos() {
        try {
            const medicosSnapshot = await getDocs(collection(db, 'medicos'));
            const medicos = medicosSnapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data };
            });
            if (medicos.length === 0) {
                console.warn('No se encontraron documentos en la colección "medicos". Verifica que la colección exista y tenga datos.');
            }
            return medicos;
        } catch (error) {
            console.error('Error al cargar médicos:', error);
            alert('No se pudieron cargar los médicos. Verifica tus permisos o contacta al administrador.');
            return [];
        }
    }

    async function loadDescripciones(mode = 'Consignación') {
        try {
            const referenciasCollection = collection(db, 'referencias');
            const q = query(referenciasCollection, where('modalidad', '==', mode));
            const referenciasSnapshot = await getDocs(q);
            const referencias = referenciasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return referencias;
        } catch (error) {
            console.error('Error al cargar descripciones de Consignación:', error);
            alert('No se pudieron cargar las descripciones. Verifica tus permisos o contacta al administrador.');
            return [];
        }
    }

    async function fetchReferenciaData(descripcion, modalidad) {
        try {
            const referenciasCollection = collection(db, 'referencias');
            const q = query(referenciasCollection, where('descripcion', '==', descripcion), where('modalidad', '==', modalidad));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data();
            }
            return null;
        } catch (error) {
            console.error('Error al obtener datos de referencia:', error);
            showSuccessMessage('Error al obtener datos de referencia: ' + error.message, false);
            return null;
        }
    }

    function fillFormFields(data, isEdit = false) {
        const fields = isEdit ? {
            codigo: editCodigoInput,
            referencia: editReferenciaInput,
            proveedor: editProveedorInput,
            modalidad: editModalidadSelect,
            precio: editPrecioInput,
            total: editTotalInput
        } : {
            codigo: codigoInput,
            referencia: referenciaInput,
            proveedor: proveedorInput,
            modalidad: modalidadSelect,
            precio: precioInput,
            total: totalInput
        };

        if (data) {
            fields.codigo.value = data.codigo || '';
            fields.referencia.value = data.referencia || '';
            fields.proveedor.value = data.proveedor || '';
            fields.modalidad.value = data.modalidad || 'Consignación';
            fields.precio.value = data.precio ? parseInt(data.precio).toLocaleString('es-CL') : '0';
            fields.codigo.setAttribute('readonly', true);
            fields.referencia.setAttribute('readonly', true);
            fields.proveedor.setAttribute('readonly', true);
            fields.modalidad.disabled = true;
            fields.precio.setAttribute('readonly', true);
            updateTotal(fields.total);
        } else {
            fields.codigo.value = '';
            fields.referencia.value = '';
            fields.proveedor.value = '';
            fields.modalidad.value = 'Consignación';
            fields.precio.value = '0';
            fields.codigo.setAttribute('readonly', true);
            fields.referencia.setAttribute('readonly', true);
            fields.proveedor.setAttribute('readonly', true);
            fields.modalidad.disabled = true;
            fields.precio.setAttribute('readonly', true);
            updateTotal(fields.total);
        }
    }

    async function filterAndRenderSuggestions(input, list, items, showAll, displayProperty) {
        const query = input.value.trim().toLowerCase();
        list.innerHTML = '';
        const filteredItems = showAll ? items : items.filter(item =>
            item[displayProperty]?.toLowerCase().includes(query)
        );
        if (filteredItems.length === 0 && !showAll) {
            list.style.display = 'none';
            return;
        }
        filteredItems.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item[displayProperty] || 'Sin nombre';
            li.addEventListener('click', async () => {
                input.value = item[displayProperty] || '';
                input.dataset.id = item.id;
                list.innerHTML = '';
                list.style.display = 'none';

                if (input.id === 'descripcion' || input.id === 'edit-descripcion') {
                    const isEdit = input.id === 'edit-descripcion';
                    const modalidad = isEdit ? editModalidadSelect.value : modalidadSelect.value;
                    const referenciaData = await fetchReferenciaData(item[displayProperty], modalidad);
                    fillFormFields(referenciaData, isEdit);
                }
            });
            list.appendChild(li);
        });
        list.style.display = filteredItems.length > 0 ? 'block' : 'none';
    }

    async function setupProveedorAutocomplete() {
        if (!proveedorInput || !proveedorSearch || !proveedorList) return;
        const empresas = await loadEmpresas();
        proveedorInput.addEventListener('input', () => {
            filterAndRenderSuggestions(proveedorInput, proveedorList, empresas, false, 'nombre');
        });
        proveedorInput.addEventListener('focus', () => {
            if (proveedorInput.value.trim()) {
                filterAndRenderSuggestions(proveedorInput, proveedorList, empresas, false, 'nombre');
            }
        });
        proveedorSearch.addEventListener('click', () => {
            filterAndRenderSuggestions(proveedorInput, proveedorList, empresas, true, 'nombre');
        });
        document.addEventListener('click', e => {
            if (!proveedorInput.contains(e.target) && !proveedorList.contains(e.target) && !proveedorSearch.contains(e.target)) {
                proveedorList.innerHTML = '';
                proveedorList.style.display = 'none';
            }
        });
    }

    async function setupMedicoAutocomplete() {
        if (!medicoInput || !medicoList || !medicoSearch) return;
        const medicos = await loadMedicos();
        medicoInput.addEventListener('input', () => {
            filterAndRenderSuggestions(medicoInput, medicoList, medicos, false, 'nombreMedico');
        });
        medicoInput.addEventListener('focus', () => {
            if (medicoInput.value.trim()) {
                filterAndRenderSuggestions(medicoInput, medicoList, medicos, false, 'nombreMedico');
            }
        });
        medicoSearch.addEventListener('click', () => {
            filterAndRenderSuggestions(medicoInput, medicoList, medicos, true, 'nombreMedico');
        });
        document.addEventListener('click', e => {
            if (!medicoInput.contains(e.target) && !medicoList.contains(e.target) && !medicoSearch.contains(e.target)) {
                medicoList.innerHTML = '';
                medicoList.style.display = 'none';
            }
        });
    }

    async function setupEditMedicoAutocomplete() {
        if (!editMedicoInput || !editMedicoList || !editMedicoSearch) return;
        const medicos = await loadMedicos();
        editMedicoInput.addEventListener('input', () => {
            filterAndRenderSuggestions(editMedicoInput, editMedicoList, medicos, false, 'nombreMedico');
        });
        editMedicoInput.addEventListener('focus', () => {
            if (editMedicoInput.value.trim()) {
                filterAndRenderSuggestions(editMedicoInput, editMedicoList, medicos, false, 'nombreMedico');
            }
        });
        editMedicoSearch.addEventListener('click', () => {
            filterAndRenderSuggestions(editMedicoInput, editMedicoList, medicos, true, 'nombreMedico');
        });
        document.addEventListener('click', e => {
            if (!editMedicoInput.contains(e.target) && !editMedicoList.contains(e.target) && !editMedicoSearch.contains(e.target)) {
                editMedicoList.innerHTML = '';
                editMedicoList.style.display = 'none';
            }
        });
    }

    async function setupDescriptionAutocomplete() {
        if (!descripcionInput || !descripcionList || !descripcionSearch || !descripcionModeToggle) return;
        let descripciones = await loadDescripciones(descripcionMode);
        descripcionModeToggle.className = `fas fa-toggle-${descripcionMode === 'Consignación' ? 'on' : 'off'}`;
        descripcionModeToggle.title = descripcionMode;

        const updateDescriptionSuggestions = () => {
            filterAndRenderSuggestions(descripcionInput, descripcionList, descripciones, false, 'descripcion');
        };

        descripcionInput.addEventListener('input', async () => {
            updateDescriptionSuggestions();
            if (!descripcionInput.value.trim()) {
                fillFormFields(null);
            }
        });
        descripcionInput.addEventListener('focus', () => {
            if (descripcionInput.value.trim()) updateDescriptionSuggestions();
        });
        descripcionSearch.addEventListener('click', () =>
            filterAndRenderSuggestions(descripcionInput, descripcionList, descripciones, true, 'descripcion')
        );
        descripcionModeToggle.addEventListener('click', async () => {
            descripcionMode = descripcionMode === 'Consignación' ? 'Cotización' : 'Consignación';
            descripcionModeToggle.className = `fas fa-toggle-${descripcionMode === 'Consignación' ? 'on' : 'off'}`;
            descripcionModeToggle.title = descripcionMode;
            descripciones = await loadDescripciones(descripcionMode);
            fillFormFields(null);
            updateDescriptionSuggestions();
        });
        document.addEventListener('click', e => {
            if (!descripcionInput.contains(e.target) && !descripcionList.contains(e.target) && !descripcionSearch.contains(e.target) && !descripcionModeToggle.contains(e.target)) {
                descripcionList.innerHTML = '';
                descripcionList.style.display = 'none';
            }
        });
    }

    async function setupEditDescriptionAutocomplete() {
        if (!editDescripcionInput || !editDescripcionList || !editDescripcionSearch || !editDescripcionModeToggle) return;
        let descripciones = await loadDescripciones(editDescripcionMode);
        editDescripcionModeToggle.className = `fas fa-toggle-${editDescripcionMode === 'Consignación' ? 'on' : 'off'}`;
        editDescripcionModeToggle.title = editDescripcionMode;

        const updateEditDescriptionSuggestions = () => {
            filterAndRenderSuggestions(editDescripcionInput, editDescripcionList, descripciones, false, 'descripcion');
        };

        editDescripcionInput.addEventListener('input', async () => {
            updateEditDescriptionSuggestions();
            if (!editDescripcionInput.value.trim()) {
                fillFormFields(null, true);
            }
        });
        editDescripcionInput.addEventListener('focus', () => {
            if (editDescripcionInput.value.trim()) updateEditDescriptionSuggestions();
        });
        editDescripcionSearch.addEventListener('click', () =>
            filterAndRenderSuggestions(editDescripcionInput, editDescripcionList, descripciones, true, 'descripcion')
        );
        editDescripcionModeToggle.addEventListener('click', async () => {
            editDescripcionMode = editDescripcionMode === 'Consignación' ? 'Cotización' : 'Consignación';
            editDescripcionModeToggle.className = `fas fa-toggle-${editDescripcionMode === 'Consignación' ? 'on' : 'off'}`;
            editDescripcionModeToggle.title = editDescripcionMode;
            descripciones = await loadDescripciones(editDescripcionMode);
            fillFormFields(null, true);
            updateEditDescriptionSuggestions();
        });
        document.addEventListener('click', e => {
            if (!editDescripcionInput.contains(e.target) && !editDescripcionList.contains(e.target) && !editDescripcionSearch.contains(e.target) && !editDescripcionModeToggle.contains(e.target)) {
                editDescripcionList.innerHTML = '';
                editDescripcionList.style.display = 'none';
            }
        });
    }

    async function getUserFullName() {
        if (!currentUser) throw new Error('No se encontró el usuario autenticado');
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
        return userSnap.data().fullName || 'Usuario Desconocido';
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

    async function loadAsignaciones() {
        try {
            if (!asignacionesTableBody) {
                console.error('Tabla de asignaciones no encontrada');
                showSuccessMessage('Error: No se encontró la tabla de asignaciones', false);
                return;
            }

            const asignacionesCollection = collection(db, 'asignaciones');
            const q = query(asignacionesCollection, orderBy('fechaCreacion', 'asc')); // Orden ascendente

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                asignacionesTableBody.innerHTML = '';
                asignaciones = [];
                if (traspasoSelect) {
                    traspasoSelect.innerHTML = '<option value="">Seleccione una asignación</option>';
                }

                if (querySnapshot.empty) {
                    console.warn('No se encontraron documentos en asignaciones');
                    asignacionesTableBody.innerHTML = '<tr><td colspan="15">No hay asignaciones disponibles</td></tr>';
                }

                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    asignaciones.push({ docId: doc.id, ...data });
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                    <td>${formatDateOnly(data.fechaIngreso)}</td>
                    <td>${data.admision || '-'}</td>
                    <td>${data.nombrePaciente || '-'}</td>
                    <td>${formatDateOnly(data.fechaCX)}</td>
                    <td>${data.medico || '-'}</td>
                    <td>${data.proveedor || '-'}</td>
                    <td>${data.codigo || '-'}</td>
                    <td>${data.descripcion || '-'}</td>
                    <td>${data.cantidad || '-'}</td>
                    <td>${data.precio ? parseInt(data.precio).toLocaleString('es-CL') : '-'}</td>
                    <td>${data.total ? parseInt(data.total).toLocaleString('es-CL') : '-'}</td>
                    <td>${data.estado || '-'}</td>
                    <td>${data.referencia || '-'}</td>
                    <td>${data.modalidad || '-'}</td>
                    <td>${data.usuario || '-'}</td>
                    <td>
                        <i class="fas fa-edit action-icon" data-id="${doc.id}" title="Editar"></i>
                        <i class="fas fa-trash action-icon" data-id="${doc.id}" title="Eliminar"></i>
                        <i class="fas fa-history action-icon" data-id="${doc.id}" title="Historial"></i>
                    </td>
                `;
                    asignacionesTableBody.appendChild(tr);
                    if (traspasoSelect) {
                        const option = document.createElement('option');
                        option.value = doc.id;
                        option.textContent = `${data.admision || 'Sin admisión'} - ${data.nombrePaciente || 'Sin paciente'}`;
                        traspasoSelect.appendChild(option);
                    }
                });

                const traspasoRow = document.createElement('tr');
                traspasoRow.innerHTML = `
                <td colspan="15" style="text-align: center;">
                    <button id="traspasar-btn" class="btn">Traspasar</button>
                </td>
            `;
                asignacionesTableBody.appendChild(traspasoRow);
                const traspasarBtn = document.getElementById('traspasar-btn');
                if (traspasarBtn) {
                    traspasarBtn.addEventListener('click', () => {
                        if (asignaciones.length === 0) {
                            showSuccessMessage('No hay asignaciones para traspasar', false);
                            return;
                        }
                        if (currentDateSpan) {
                            currentDateSpan.textContent = formatDate(new Date());
                        }
                        showModal(traspasoModal);
                    });
                }

                // Configurar redimensionamiento para #asignaciones-table después de cargar los datos
                setupTableResize('#asignaciones-table');
            }, (error) => {
                console.error('Error al escuchar asignaciones:', error.code, error.message);
                showSuccessMessage('Error al cargar asignaciones en tiempo real: ' + error.message, false);
            });

            window.addEventListener('moduleCleanup', () => {
                if (unsubscribe) unsubscribe();
            });

        } catch (error) {
            console.error('Error al cargar asignaciones:', error.code, error.message);
            showSuccessMessage('Error al cargar asignaciones: ' + error.message, false);
        }
    }

    async function loadAsignacionesForSelection() {
        if (!selectAsignacionesTableBody) return;
        selectAsignacionesTableBody.innerHTML = '';
        asignaciones.forEach(asignacion => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" class="select-asignacion" data-id="${asignacion.docId}"></td>
                <td>${asignacion.admision || '-'}</td>
                <td>${asignacion.nombrePaciente || '-'}</td>
                <td>${asignacion.descripcion || '-'}</td>
            `;
            selectAsignacionesTableBody.appendChild(tr);
        });
        // Configurar redimensionamiento para #select-asignaciones-table después de cargar los datos
        setupTableResize('#select-asignaciones-table');
    }

    async function traspasarAsignaciones(asignacionIds) {
        try {
            showLoadingModal();
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No hay usuario autenticado');
            }
            const fullName = await getUserFullName();
            const now = Timestamp.fromDate(new Date());

            if (!addDoc || !deleteDoc || !getDoc || !doc || !collection || !Timestamp || !setDoc) {
                throw new Error('Una o más funciones de Firestore no están definidas. Verifica las importaciones.');
            }

            const asignacionesToProcess = [];
            for (const id of asignacionIds) {
                const asignacionRef = doc(db, 'asignaciones', id);
                const asignacionSnap = await getDoc(asignacionRef);
                if (asignacionSnap.exists()) {
                    const data = asignacionSnap.data();
                    console.debug('Asignación para traspaso:', {
                        docId: id,
                        fechaIngreso: data.fechaIngreso,
                        fechaCX: data.fechaCX,
                        fechaCXType: typeof data.fechaCX,
                        fechaCXIsTimestamp: data.fechaCX instanceof Timestamp
                    });
                    let fechaCX;
                    if (typeof data.fechaCX === 'string' && data.fechaCX) {
                        const [year, month, day] = data.fechaCX.split('-');
                        if (year && month && day && year.length === 4 && month.length === 2 && day.length === 2) {
                            fechaCX = new Date(year, month - 1, day);
                            fechaCX.setHours(0, 0, 0, 0);
                        } else {
                            console.warn(`FechaCX inválida en asignación ${id}:`, data.fechaCX);
                            fechaCX = null;
                        }
                    } else if (data.fechaCX instanceof Timestamp) {
                        fechaCX = data.fechaCX.toDate();
                        fechaCX.setHours(0, 0, 0, 0);
                    } else {
                        console.warn(`FechaCX no válida o ausente en asignación ${id}:`, data.fechaCX);
                        fechaCX = null;
                    }
                    if (!fechaCX || isNaN(fechaCX)) {
                        console.warn(`Asignación ${id} omitida: fechaCX inválida o ausente`, data);
                        continue;
                    }

                    // Convertir fechaIngreso a Date
                    let fechaIngreso;
                    if (data.fechaIngreso instanceof Timestamp) {
                        fechaIngreso = data.fechaIngreso.toDate();
                        fechaIngreso.setHours(0, 0, 0, 0);
                    } else if (typeof data.fechaIngreso === 'string' && data.fechaIngreso) {
                        const [year, month, day] = data.fechaIngreso.split('-');
                        if (year && month && day && year.length === 4 && month.length === 2 && day.length === 2) {
                            fechaIngreso = new Date(year, month - 1, day);
                            fechaIngreso.setHours(0, 0, 0, 0);
                        } else {
                            console.warn(`FechaIngreso inválida en asignación ${id}:`, data.fechaIngreso);
                            fechaIngreso = new Date('2025-01-01');
                            fechaIngreso.setHours(0, 0, 0, 0);
                        }
                    } else {
                        console.warn(`FechaIngreso no válida o ausente en asignación ${id}:`, data.fechaIngreso);
                        fechaIngreso = new Date('2025-01-01');
                        fechaIngreso.setHours(0, 0, 0, 0);
                    }

                    asignacionesToProcess.push({ docId: asignacionSnap.id, ...data, fechaCX, fechaIngreso });
                } else {
                    console.warn('Asignación no encontrada:', id);
                }
            }

            if (asignacionesToProcess.length === 0) {
                console.warn('No hay asignaciones válidas para traspasar');
                showSuccessMessage('No hay asignaciones válidas para traspasar. Verifica que todas tengan una fecha de cirugía válida.', false);
                hideLoadingModal();
                return;
            }

            const pacientesMap = {};
            asignacionesToProcess.forEach(asignacion => {
                const key = `${asignacion.admision}_${asignacion.proveedor}`;
                if (!pacientesMap[key]) {
                    pacientesMap[key] = {
                        admision: asignacion.admision || '',
                        proveedor: asignacion.proveedor || '',
                        nombrePaciente: asignacion.nombrePaciente || '',
                        medico: asignacion.medico || '',
                        fechaCX: asignacion.fechaCX ? Timestamp.fromDate(asignacion.fechaCX) : null,
                        totalPaciente: 0,
                        modalidad: asignacion.modalidad || 'Consignación',
                        prevision: asignacion.prevision || 'Desconocido',
                        estado: asignacion.estado || 'Reposición',
                        fechaIngreso: asignacion.fechaIngreso ? Timestamp.fromDate(asignacion.fechaIngreso) : Timestamp.fromDate(new Date('2025-01-01')),
                        fechaCargo: asignacion.fechaIngreso ? Timestamp.fromDate(asignacion.fechaIngreso) : Timestamp.fromDate(new Date('2025-01-01')),
                        usuario: fullName,
                        uid: user.uid
                    };
                }
                pacientesMap[key].totalPaciente += parseFloat(asignacion.total) || 0;
            });

            for (const paciente of Object.values(pacientesMap)) {
                const pacienteRef = collection(db, 'pacientesconsignacion');
                try {
                    const newDoc = await addDoc(pacienteRef, paciente);
                    console.debug('Paciente creado:', {
                        docId: newDoc.id,
                        fechaIngreso: paciente.fechaIngreso,
                        fechaCX: paciente.fechaCX,
                        fechaCargo: paciente.fechaCargo
                    });
                } catch (error) {
                    console.error('Error al crear paciente:', error);
                    throw error;
                }
            }

            for (const asignacion of asignacionesToProcess) {
                const cargoRef = collection(db, 'cargosconsignacion');
                const fechaVencimiento = new Date(asignacion.fechaIngreso || new Date('2025-01-01'));
                fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);

                try {
                    const newCargo = await addDoc(cargoRef, {
                        admision: asignacion.admision || '',
                        nombrePaciente: asignacion.nombrePaciente || '',
                        fechaCX: asignacion.fechaCX ? Timestamp.fromDate(asignacion.fechaCX) : null,
                        medico: asignacion.medico || '',
                        descripcion: asignacion.descripcion || '',
                        cantidad: asignacion.cantidad || 1,
                        estado: asignacion.estado || 'Reposición',
                        codigo: asignacion.codigo || '',
                        referencia: asignacion.referencia || '',
                        proveedor: asignacion.proveedor || '',
                        modalidad: asignacion.modalidad || 'Consignación',
                        precio: parseFloat(asignacion.precio) || 0,
                        total: parseFloat(asignacion.total) || 0,
                        usuario: asignacion.usuario || fullName,
                        fechaCreacion: asignacion.fechaIngreso ? Timestamp.fromDate(asignacion.fechaIngreso) : Timestamp.fromDate(new Date('2025-01-01')),
                        fechaTraspaso: asignacion.fechaIngreso ? Timestamp.fromDate(asignacion.fechaIngreso) : Timestamp.fromDate(new Date('2025-01-01')),
                        uid: user.uid,
                        ID: '',
                        COD: asignacion.codigo || '',
                        CANTID: asignacion.cantidad || 1,
                        VENTA: parseFloat(asignacion.total) || 0,
                        'N° GUIA': 'Pendiente',
                        LOTE: 'Pendiente',
                        'FECHA DE VENCIMIENTO': Timestamp.fromDate(fechaVencimiento),
                        CARGO: asignacion.estado || 'Reposición'
                    });
                    await updateDoc(doc(db, 'cargosconsignacion', newCargo.id), { ID: newCargo.id });
                    console.debug('Cargo creado:', newCargo.id);
                } catch (error) {
                    console.error('Error al crear cargo:', error);
                    throw error;
                }
            }

            const lotesMap = {};
            asignacionesToProcess.forEach(asignacion => {
                const key = `${asignacion.admision}_${asignacion.proveedor}`;
                if (!lotesMap[key]) {
                    lotesMap[key] = {
                        admision: asignacion.admision || '-',
                        nombrePaciente: asignacion.nombrePaciente || '-',
                        fechaCX: asignacion.fechaCX ? Timestamp.fromDate(asignacion.fechaCX) : null,
                        documentoDelivery: '',
                        insumoDevuelto: '',
                        cantidad: 0,
                        cargado: false,
                        estado: '',
                        guia: '',
                        proveedor: asignacion.proveedor || '-',
                        fechaCreacion: asignacion.fechaIngreso ? Timestamp.fromDate(asignacion.fechaIngreso) : Timestamp.fromDate(new Date('2025-01-01')),
                        uid: user.uid,
                        usuario: fullName
                    };
                }
            });

            for (const [key, lote] of Object.entries(lotesMap)) {
                const [admision, proveedor] = key.split('_');
                const loteId = `${admision}_${proveedor}_${(lote.fechaCreacion || Timestamp.fromDate(new Date('2025-01-01'))).toMillis()}`;
                try {
                    await setDoc(doc(db, 'lotes', loteId), lote);
                    console.debug('Lote creado:', loteId);
                } catch (error) {
                    console.error('Error al crear lote:', error);
                    throw error;
                }
            }

            for (const asignacion of asignacionesToProcess) {
                const asignacionRef = doc(db, 'asignaciones', asignacion.docId);
                const logRef = collection(db, 'asignaciones', asignacion.docId, 'logs');
                try {
                    await addDoc(logRef, {
                        action: `Traspasado: ${formatDate(new Date(now.toMillis()))}`,
                        details: `Asignación traspasada a cargosconsignacion, pacientesconsignacion y lotes, y eliminada de asignaciones`,
                        timestamp: now,
                        user: fullName,
                        uid: user.uid
                    });
                    await deleteDoc(asignacionRef);
                    console.debug('Asignación eliminada:', asignacion.docId);
                } catch (error) {
                    console.error('Error al procesar log o eliminación:', error);
                    throw error;
                }
            }

            showSuccessMessage('Traspaso realizado y asignaciones eliminadas con éxito', true);
            hideModal(traspasoModal);
            hideModal(selectAsignacionesModal);
            await loadAsignaciones();
        } catch (error) {
            console.error('Error al realizar traspaso:', error.code, error.message);
            showSuccessMessage('Error al realizar traspaso: ' + error.message, false);
        } finally {
            hideLoadingModal();
        }
    }

    function clearForm(isEdit = false, partial = false) {
        const inputs = isEdit ?
            [editFechaIngresoInput, editAdmisionInput, editNombrePacienteInput, editFechaCXInput, editMedicoInput, editCantidadInput, editEstadoSelect,
                editDescripcionInput, editCodigoInput, editReferenciaInput, editProveedorInput, editModalidadSelect, editPrecioInput,
                editTotalInput] :
            [fechaIngresoInput, admisionInput, nombrePacienteInput, fechaCXInput, medicoInput, cantidadInput, estadoSelect,
                descripcionInput, codigoInput, referenciaInput, proveedorInput, modalidadSelect, precioInput,
                totalInput];

        const partialFields = isEdit ?
            [editDescripcionInput, editCantidadInput, editCodigoInput, editReferenciaInput, editProveedorInput,
                editModalidadSelect, editPrecioInput, editTotalInput] :
            [descripcionInput, cantidadInput, codigoInput, referenciaInput, proveedorInput,
                modalidadSelect, precioInput, totalInput];

        const fieldsToClear = partial ? partialFields : inputs;

        fieldsToClear.forEach(field => {
            if (!field) return;
            if (field.tagName === 'INPUT') {
                if (field.id.includes('fecha-ingreso')) {
                    field.value = today;
                } else if (field.type === 'number') {
                    field.value = '1';
                } else if (field.id.includes('precio') || field.id.includes('total')) {
                    field.value = '0';
                } else if (field.type === 'date') {
                    field.value = '';
                } else {
                    field.value = '';
                }
                if (field.id.includes('codigo') || field.id.includes('referencia') || field.id.includes('proveedor') || field.id.includes('precio')) {
                    field.setAttribute('readonly', true);
                }
            } else if (field.tagName === 'SELECT') {
                field.value = field.id.includes('estado') ? 'Reposición' : field.id.includes('modalidad') ? 'Consignación' : '';
                if (field.id.includes('modalidad')) {
                    field.disabled = true;
                }
            }
        });

        if (!isEdit) {
            if (!partial) {
                descripcionMode = 'Consignación';
                if (descripcionModeToggle) {
                    descripcionModeToggle.className = 'fas fa-toggle-on';
                    descripcionModeToggle.title = 'Consignación';
                }
            }
        } else {
            editDescripcionMode = 'Consignación';
            if (editDescripcionModeToggle) {
                editDescripcionModeToggle.className = 'fas fa-toggle-on';
                editDescripcionModeToggle.title = 'Consignación';
            }
        }

        updateTotal(isEdit ? editTotalInput : totalInput);
    }

    function openEditModal(asignacion) {
        if (!editModal) {
            console.warn('editModal no encontrado');
            return;
        }
        currentEditId = asignacion.docId;
        editFechaIngresoInput.value = asignacion.fechaIngreso ? formatDateOnly(asignacion.fechaIngreso) : today;
        editAdmisionInput.value = asignacion.admision || '';
        editNombrePacienteInput.value = asignacion.nombrePaciente || '';
        editFechaCXInput.value = formatDateOnly(asignacion.fechaCX) !== '-' ? formatDateOnly(asignacion.fechaCX) : '';
        editMedicoInput.value = asignacion.medico || '';
        editDescripcionInput.value = asignacion.descripcion || '';
        editCantidadInput.value = asignacion.cantidad || '1';
        editEstadoSelect.value = asignacion.estado || 'Reposición';
        editCodigoInput.value = asignacion.codigo || '';
        editReferenciaInput.value = asignacion.referencia || '';
        editProveedorInput.value = asignacion.proveedor || '';
        editModalidadSelect.value = asignacion.modalidad || 'Consignación';
        editPrecioInput.value = asignacion.precio ? parseInt(asignacion.precio).toLocaleString('es-CL') : '0';
        editTotalInput.value = asignacion.total ? parseInt(asignacion.total).toLocaleString('es-CL') : '0';
        editDescripcionMode = asignacion.modalidad || 'Consignación';
        if (editDescripcionModeToggle) {
            editDescripcionModeToggle.className = `fas fa-toggle-${editDescripcionMode === 'Consignación' ? 'on' : 'off'}`;
            editDescripcionModeToggle.title = editDescripcionMode;
        }
        editCodigoInput.setAttribute('readonly', true);
        editReferenciaInput.setAttribute('readonly', true);
        editProveedorInput.setAttribute('readonly', true);
        editModalidadSelect.disabled = true;
        editPrecioInput.setAttribute('readonly', true);
        showModal(editModal);
    }

    function openDeleteModal(asignacion) {
        if (!deleteModal || !deleteMessage) {
            console.warn('deleteModal o deleteMessage no encontrados');
            return;
        }
        deleteMessage.textContent = `¿Estás seguro de que quieres eliminar la asignación para "${asignacion.nombrePaciente || 'Sin paciente'}"?`;
        confirmDeleteBtn.dataset.id = asignacion.docId;
        showModal(deleteModal);
    }

    async function loadLogs(asignacionId) {
        if (!logContent) {
            console.warn('logContent no encontrado');
            return;
        }
        try {
            showLoadingModal();
            const logsCollection = collection(db, 'asignaciones', asignacionId, 'logs');
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
                    if (action.startsWith('Creado:')) action = 'Creación';
                    else if (action.startsWith('Actualizado:')) action = 'Modificado';
                    else if (action.startsWith('Eliminado:')) action = 'Eliminado';
                    else if (action.startsWith('Traspasado:')) action = 'Traspasado';
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
        } finally {
            hideLoadingModal();
        }
    }

    function setupTableResize(tableId) {
        const table = document.querySelector(tableId);
        if (!table) {
            console.warn(`Tabla ${tableId} no encontrada`);
            return;
        }

        const ths = table.querySelectorAll('th');
        ths.forEach((th, index) => {
            if (tableId === '#asignaciones-table' && index === ths.length - 1) return;
            if (tableId === '#select-asignaciones-table' && index === 0) return;

            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            th.appendChild(resizeHandle);

            let startX, startWidth;

            resizeHandle.addEventListener('mousedown', (e) => {
                startX = e.clientX;
                startWidth = th.offsetWidth;
                resizeHandle.classList.add('active');

                function onMouseMove(e) {
                    const newWidth = startWidth + (e.clientX - startX);
                    if (newWidth >= 50) {
                        th.style.width = `${newWidth}px`;
                        th.style.maxWidth = `${newWidth}px`;
                    }
                }

                function onMouseUp() {
                    resizeHandle.classList.remove('active');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    }

    async function init() {
        if (!container || !asignacionForm) {
            console.error('Contenedor o formulario no encontrado');
            container.innerHTML = '<p>Error: No se encontraron elementos esenciales. Verifica la configuración.</p>';
            return;
        }

        showLoadingModal();

        try {
            formatPrice(precioInput);
            formatPrice(editPrecioInput);

            if (cantidadInput) {
                cantidadInput.addEventListener('input', () => updateTotal(totalInput));
            }
            if (editCantidadInput) {
                editCantidadInput.addEventListener('input', () => updateTotal(editTotalInput));
            }

            await Promise.all([
                setupProveedorAutocomplete(),
                setupMedicoAutocomplete(),
                setupEditMedicoAutocomplete(),
                setupDescriptionAutocomplete(),
                setupEditDescriptionAutocomplete()
            ]);

            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    console.error('No hay usuario autenticado');
                    container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
                    setTimeout(() => {
                        window.location.href = 'index.html?error=auth-required';
                    }, 1000);
                    hideLoadingModal();
                    return;
                }

                currentUser = user;
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid), { source: 'server' });
                    if (!userDoc.exists()) {
                        console.error('Documento de usuario no encontrado');
                        container.innerHTML = '<p>Error: Tu cuenta no está registrada. Contacta al administrador.</p>';
                        hideLoadingModal();
                        return;
                    }

                    const userData = userDoc.data();
                    const hasAccess = userData.role === 'Administrador' || userData.role === 'Operador';
                    if (!hasAccess) {
                        console.error('Acceso denegado');
                        container.innerHTML = '<p>Acceso denegado. No tienes permisos para este módulo.</p>';
                        hideLoadingModal();
                        return;
                    }

                    await loadAsignaciones();

                    if (registrarBtn) {
                        registrarBtn.addEventListener('click', async () => {
                            showLoadingModal();
                            const fechaIngreso = fechaIngresoInput?.value || today;
                            const admision = admisionInput?.value.trim() || '';
                            const nombrePaciente = nombrePacienteInput?.value.trim() || '';
                            const fechaCX = fechaCXInput?.value || '';
                            const medico = medicoInput?.value.trim() || '';
                            const descripcion = descripcionInput?.value || '';
                            const cantidad = parseInt(cantidadInput?.value) || 1;
                            const estado = estadoSelect?.value || 'Reposición';
                            const codigo = codigoInput?.value.trim() || '';
                            const referencia = referenciaInput?.value.trim() || '';
                            const proveedor = proveedorInput?.value.trim() || '';
                            const modalidad = modalidadSelect?.value || 'Consignación';
                            let precio = precioInput?.value.replace(/[^0-9]/g, '') || '0';
                            precio = parseInt(precio) || 0;
                            const total = cantidad * precio;

                            if (!admision || !nombrePaciente || !fechaCX || !medico || !descripcion || !proveedor || !precio || !modalidad) {
                                console.warn('Campos obligatorios incompletos');
                                showSuccessMessage('Complete todos los campos obligatorios', false);
                                hideLoadingModal();
                                return;
                            }

                            if (precio > 9999999) {
                                console.warn('Precio excede el límite');
                                showSuccessMessage('El precio no puede superar 9.999.999', false);
                                hideLoadingModal();
                                return;
                            }

                            try {
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());
                                const asignacionRef = doc(collection(db, 'asignaciones'));
                                const batch = writeBatch(db);

                                const [year, month, day] = fechaIngreso.split('-');
                                const fechaIngresoDate = new Date(year, month - 1, day);
                                fechaIngresoDate.setHours(0, 0, 0, 0);
                                const fechaIngresoTimestamp = Timestamp.fromDate(fechaIngresoDate);

                                batch.set(asignacionRef, {
                                    fechaIngreso: fechaIngresoTimestamp,
                                    admision,
                                    nombrePaciente,
                                    fechaCX,
                                    medico,
                                    descripcion,
                                    cantidad,
                                    estado,
                                    codigo,
                                    referencia,
                                    proveedor,
                                    modalidad,
                                    precio,
                                    total,
                                    usuario: fullName,
                                    fechaCreacion: now,
                                    uid: currentUser.uid
                                });
                                const logRef = doc(collection(db, 'asignaciones', asignacionRef.id, 'logs'));
                                batch.set(logRef, {
                                    action: `Creado: ${formatDate(new Date(now.toMillis()))}`,
                                    details: `Asignación para ${nombrePaciente} creada`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: currentUser.uid
                                });
                                await batch.commit();
                                showSuccessMessage('Asignación registrada correctamente');
                                clearForm(false, true);
                            } catch (error) {
                                console.error('Error al registrar:', error);
                                showSuccessMessage('Error al registrar: ' + error.message, false);
                            } finally {
                                hideLoadingModal();
                            }
                        });
                    }

                    if (limpiarBtn) {
                        limpiarBtn.addEventListener('click', () => clearForm(false, false));
                    }

                    if (saveEditBtn) {
                        saveEditBtn.addEventListener('click', async () => {
                            showLoadingModal();
                            const fechaIngreso = editFechaIngresoInput?.value || today;
                            const admision = editAdmisionInput?.value.trim() || '';
                            const nombrePaciente = editNombrePacienteInput?.value.trim() || '';
                            const fechaCX = editFechaCXInput?.value || '';
                            const medico = editMedicoInput?.value.trim() || '';
                            const descripcion = editDescripcionInput?.value.trim() || '';
                            const cantidad = parseInt(editCantidadInput?.value) || 1;
                            const estado = editEstadoSelect?.value || 'Reposición';
                            const codigo = editCodigoInput?.value.trim() || '';
                            const referencia = editReferenciaInput?.value.trim() || '';
                            const proveedor = editProveedorInput?.value.trim() || '';
                            const modalidad = editModalidadSelect?.value || 'Consignación';
                            let precio = editPrecioInput?.value.replace(/[^0-9]/g, '') || '0';
                            precio = parseInt(precio) || 0;
                            const total = cantidad * precio;

                            if (!admision || !nombrePaciente || !fechaCX || !medico || !descripcion || !proveedor || !precio || !modalidad) {
                                showSuccessMessage('Complete todos los campos obligatorios', false);
                                hideLoadingModal();
                                return;
                            }

                            if (precio > 9999999) {
                                showSuccessMessage('El precio no puede superar 9.999.999', false);
                                hideLoadingModal();
                                return;
                            }

                            try {
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());
                                const asignacionRef = doc(db, 'asignaciones', currentEditId);
                                const batch = writeBatch(db);
                                batch.update(asignacionRef, {
                                    fechaIngreso: fechaIngreso ? Timestamp.fromDate(new Date(fechaIngreso)) : now,
                                    admision,
                                    nombrePaciente,
                                    fechaCX,
                                    medico,
                                    descripcion,
                                    cantidad,
                                    estado,
                                    codigo,
                                    referencia,
                                    proveedor,
                                    modalidad,
                                    precio,
                                    total,
                                    usuario: fullName,
                                    fechaActualizada: now,
                                    uid: currentUser.uid
                                });
                                const logRef = doc(collection(db, 'asignaciones', asignacionRef.id, 'logs'));
                                batch.set(logRef, {
                                    action: `Actualizado: ${formatDate(new Date(now.toMillis()))}`,
                                    details: `Asignación para ${nombrePaciente} actualizada`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: currentUser.uid
                                });
                                await batch.commit();
                                hideModal(editModal);
                                showSuccessMessage('Asignación actualizada correctamente');
                                await loadAsignaciones();
                            } catch (error) {
                                console.error('Error al actualizar:', error);
                                showSuccessMessage('Error al actualizar: ' + error.message, false);
                            } finally {
                                hideLoadingModal();
                            }
                        });
                    }

                    if (cancelEditBtn) {
                        cancelEditBtn.addEventListener('click', () => hideModal(editModal));
                    }

                    if (confirmDeleteBtn) {
                        confirmDeleteBtn.addEventListener('click', async () => {
                            showLoadingModal();
                            const id = confirmDeleteBtn.dataset.id;
                            try {
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());
                                const batch = writeBatch(db);
                                batch.delete(doc(db, 'asignaciones', id));
                                const logRef = doc(collection(db, 'asignaciones', id, 'logs'));
                                batch.set(logRef, {
                                    action: `Eliminado: ${formatDate(new Date(now.toMillis()))}`,
                                    details: `Asignación eliminada`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: currentUser.uid
                                });
                                await batch.commit();
                                hideModal(deleteModal);
                                showSuccessMessage('Asignación eliminada correctamente');
                                await loadAsignaciones();
                            } catch (error) {
                                console.error('Error al eliminar:', error);
                                showSuccessMessage('Error al eliminar: ' + error.message, false);
                            } finally {
                                hideLoadingModal();
                            }
                        });
                    }

                    if (cancelDeleteBtn) {
                        cancelDeleteBtn.addEventListener('click', () => hideModal(deleteModal));
                    }

                    if (traspasoTypeSelect) {
                        traspasoTypeSelect.addEventListener('change', async () => {
                            if (traspasoTypeSelect.value === 'select') {
                                traspasoSelect.style.display = 'none';
                                loadAsignacionesForSelection();
                                if (currentDateSpan) {
                                    currentDateSpan.textContent = 'Se usará la fecha de ingreso de las asignaciones seleccionadas';
                                }
                                showModal(selectAsignacionesModal);
                            } else if (traspasoTypeSelect.value === 'single') {
                                traspasoSelect.style.display = 'block';
                                const selectedId = traspasoSelect.value;
                                if (selectedId && currentDateSpan) {
                                    const asignacion = asignaciones.find(a => a.docId === selectedId);
                                    currentDateSpan.textContent = asignacion && asignacion.fechaIngreso
                                        ? formatDateOnly(asignacion.fechaIngreso)
                                        : 'Seleccione una asignación';
                                } else if (currentDateSpan) {
                                    currentDateSpan.textContent = 'Seleccione una asignación';
                                }
                            } else {
                                traspasoSelect.style.display = 'block';
                                if (currentDateSpan) {
                                    currentDateSpan.textContent = 'Se usará la fecha de ingreso de todas las asignaciones';
                                }
                            }
                        });
                    }

                    if (confirmTraspasoBtn) {
                        confirmTraspasoBtn.addEventListener('click', async () => {
                            showLoadingModal();
                            const user = auth.currentUser;
                            if (!user) {
                                showSuccessMessage('Usuario no autenticado', false);
                                hideLoadingModal();
                                return;
                            }

                            const traspasoType = traspasoTypeSelect.value;
                            let asignacionesToProcess = [];

                            try {
                                const fullName = await getUserFullName();

                                if (traspasoType === 'all') {
                                    const querySnapshot = await getDocs(collection(db, 'asignaciones'));
                                    asignacionesToProcess = querySnapshot.docs
                                        .map(doc => ({ docId: doc.id, ...doc.data() }));
                                } else if (traspasoType === 'single') {
                                    const selectedId = traspasoSelect.value;
                                    if (!selectedId) {
                                        showSuccessMessage('Seleccione una asignación', false);
                                        hideLoadingModal();
                                        return;
                                    }
                                    const asignacionDoc = await getDoc(doc(db, 'asignaciones', selectedId));
                                    if (asignacionDoc.exists()) {
                                        asignacionesToProcess = [{ docId: asignacionDoc.id, ...asignacionDoc.data() }];
                                    }
                                } else if (traspasoType === 'select') {
                                    const selectedAsignaciones = Array.from(document.querySelectorAll('.select-asignacion:checked')).map(input => input.dataset.id);
                                    if (selectedAsignaciones.length === 0) {
                                        showSuccessMessage('Seleccione al menos una asignación', false);
                                        hideLoadingModal();
                                        return;
                                    }
                                    for (const id of selectedAsignaciones) {
                                        const asignacionDoc = await getDoc(doc(db, 'asignaciones', id));
                                        if (asignacionDoc.exists()) {
                                            asignacionesToProcess.push({ docId: asignacionDoc.id, ...asignacionDoc.data() });
                                        }
                                    }
                                }

                                if (asignacionesToProcess.length === 0) {
                                    console.warn('No hay asignaciones válidas para traspasar');
                                    showSuccessMessage('No hay asignaciones válidas para traspasar', false);
                                    hideLoadingModal();
                                    return;
                                }

                                await traspasarAsignaciones(asignacionesToProcess.map(a => a.docId));
                            } catch (error) {
                                console.error('Error al iniciar traspaso:', error);
                                showSuccessMessage('Error al iniciar traspaso: ' + error.message, false);
                                hideLoadingModal();
                            }
                        });
                    }

                    if (cancelTraspasoBtn) {
                        cancelTraspasoBtn.addEventListener('click', () => hideModal(traspasoModal));
                    }

                    if (confirmSelectBtn) {
                        confirmSelectBtn.addEventListener('click', () => {
                            const selectedAsignaciones = Array.from(document.querySelectorAll('.select-asignacion:checked')).map(input => input.dataset.id);
                            if (selectedAsignaciones.length === 0) {
                                showSuccessMessage('Seleccione al menos una asignación', false);
                                return;
                            }
                            hideModal(selectAsignacionesModal);
                            traspasarAsignaciones(selectedAsignaciones);
                        });
                    }

                    if (cancelSelectBtn) {
                        cancelSelectBtn.addEventListener('click', () => hideModal(selectAsignacionesModal));
                    }

                    if (closeLogBtn) {
                        closeLogBtn.addEventListener('click', () => hideModal(logModal));
                    }

                    if (traspasoSelect) {
                        traspasoSelect.addEventListener('change', () => {
                            const selectedId = traspasoSelect.value;
                            if (currentDateSpan) {
                                if (selectedId) {
                                    const asignacion = asignaciones.find(a => a.docId === selectedId);
                                    currentDateSpan.textContent = asignacion && asignacion.fechaIngreso
                                        ? formatDateOnly(asignacion.fechaIngreso)
                                        : 'Seleccione una asignación';
                                } else {
                                    currentDateSpan.textContent = 'Seleccione una asignación';
                                }
                            }
                        });
                    }

                    asignacionesTableBody.addEventListener('click', (e) => {
                        const target = e.target;
                        const id = target.dataset.id;
                        const asignacion = asignaciones.find(a => a.docId === id);
                        if (!asignacion) return;
                        if (target.classList.contains('fa-edit')) {
                            openEditModal(asignacion);
                        } else if (target.classList.contains('fa-trash')) {
                            openDeleteModal(asignacion);
                        } else if (target.classList.contains('fa-history')) {
                            loadLogs(id);
                        }
                    });

                } catch (error) {
                    console.error('Error al inicializar:', error);
                    container.innerHTML = '<p>Error al cargar los datos. Por favor, intenta de nuevo más tarde.</p>';
                } finally {
                    hideLoadingModal();
                }
            });
        } catch (error) {
            console.error('Error al inicializar:', error);
            container.innerHTML = '<p>Error al inicializar la aplicación. Verifica la configuración.</p>';
            hideLoadingModal();
        }
    }

    init();
} catch (error) {
    console.error('Error crítico:', error);
    document.body.innerHTML = '<p>Error crítico al cargar la aplicación. Contacta al soporte técnico.</p>';
}
