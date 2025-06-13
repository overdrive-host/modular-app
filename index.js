import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDmAf-vi7PhzzQkPZh89q9p3Mz4vGGPtd0",
  authDomain: "modular-app-387da.firebaseapp.com",
  projectId: "modular-app-387da",
  storageBucket: "modular-app-387da.firebasestorage.app",
  messagingSenderId: "271561966774",
  appId: "1:271561966774:web:e197c00e2abd67b4f0d217",
  measurementId: "G-7YT6MMR47X"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const particleConfig = {
    light: {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: ['#1a202c', '#3182ce', '#2f855a'] },
            shape: { type: 'circle', stroke: { width: 0, color: '#000000' } },
            opacity: { value: 0.5, random: true, anim: { enable: true, speed: 1, opacity_min: 0.1, sync: false } },
            size: { value: 3, random: true, anim: { enable: false } },
            line_linked: { enable: true, distance: 150, color: '#1a202c', opacity: 0.4, width: 1 },
            move: { enable: true, speed: 2, direction: 'none', random: false, straight: false, out_mode: 'out', bounce: false }
        },
        interactivity: {
            detect_on: 'canvas',
            events: { onhover: { enable: true, mode: 'grab' }, onclick: { enable: true, mode: 'push' }, resize: true },
            modes: { grab: { distance: 200, line_linked: { opacity: 1 } }, push: { particles_nb: 4 } }
        },
        retina_detect: true
    },
    dark: {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: ['#e2e8f0', '#63b3ed', '#38a169'] },
            shape: { type: 'circle', stroke: { width: 0, color: '#000000' } },
            opacity: { value: 0.5, random: true, anim: { enable: true, speed: 1, opacity_min: 0.1, sync: false } },
            size: { value: 3, random: true, anim: { enable: false } },
            line_linked: { enable: true, distance: 150, color: '#e2e8f0', opacity: 0.4, width: 1 },
            move: { enable: true, speed: 2, direction: 'none', random: false, straight: false, out_mode: 'out', bounce: false }
        },
        interactivity: {
            detect_on: 'canvas',
            events: { onhover: { enable: true, mode: 'grab' }, onclick: { enable: true, mode: 'push' }, resize: true },
            modes: { grab: { distance: 200, line_linked: { opacity: 1 } }, push: { particles_nb: 4 } }
        },
        retina_detect: true
    }
};

const savedMode = localStorage.getItem('theme') || 'dark';
particlesJS('particles-js', particleConfig[savedMode]);

function updateParticles(theme) {
    particlesJS('particles-js', particleConfig[theme]);
}

const toggleModeButton = document.getElementById('toggle-mode');
const body = document.body;
const toggleIcon = toggleModeButton.querySelector('i');
const loginButton = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal');
const closeModalButton = document.getElementById('close-modal');
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('password-toggle');
const capsLockMessage = document.getElementById('caps-lock-message');

if (savedMode === 'dark') {
    body.classList.add('dark-mode');
    toggleIcon.classList.remove('fa-sun');
    toggleIcon.classList.add('fa-moon');
} else {
    body.classList.remove('dark-mode');
    toggleIcon.classList.remove('fa-moon');
    toggleIcon.classList.add('fa-sun');
}

toggleModeButton.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    toggleIcon.classList.toggle('fa-sun', !isDarkMode);
    toggleIcon.classList.toggle('fa-moon', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    updateParticles(isDarkMode ? 'dark' : 'light');
});

loginButton.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
});

closeModalButton.addEventListener('click', () => {
    loginModal.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loginForm.reset();
    passwordInput.type = 'password';
    passwordToggle.classList.remove('fa-eye-slash');
    passwordToggle.classList.add('fa-eye');
    capsLockMessage.classList.add('hidden');
});

passwordToggle.addEventListener('click', () => {
    const isPasswordVisible = passwordInput.type === 'text';
    passwordInput.type = isPasswordVisible ? 'password' : 'text';
    passwordToggle.classList.toggle('fa-eye', isPasswordVisible);
    passwordToggle.classList.toggle('fa-eye-slash', !isPasswordVisible);
});

passwordInput.addEventListener('input', () => {
    if (!passwordInput.value) {
        passwordInput.type = 'password';
        passwordToggle.classList.remove('fa-eye-slash');
        passwordToggle.classList.add('fa-eye');
    }
});

passwordInput.addEventListener('keydown', (e) => {
    const isCapsLockOn = e.getModifierState('CapsLock');
    capsLockMessage.classList.toggle('hidden', !isCapsLockOn);
});

passwordInput.addEventListener('keyup', (e) => {
    const isCapsLockOn = e.getModifierState('CapsLock');
    capsLockMessage.classList.toggle('hidden', !isCapsLockOn);
});

const submenuData = {
  Usuarios: [
    {
      name: 'Registros',
      icon: 'fa-user-plus',
      html: 'modulos/usuarios/registros/registros.html',
      css: 'modulos/usuarios/registros/registros.css',
      js: 'modulos/usuarios/registros/registros.js'
    }
  ],
    Implantes: [
        { name: 'Cargos Implantes', icon: 'fa-tooth', html: 'module/implantes/cargosimplantes/cargosimplantes.html', css: 'module/implantes/cargosimplantes/cargosimplantes.css', js: 'module/implantes/cargosimplantes/cargosimplantes.js' },
        { name: 'Cargos Consignación', icon: 'fa-box', html: 'module/implantes/cargosconsignacion/cargosconsignacion.html', css: 'module/implantes/cargosconsignacion/cargosconsignacion.css', js: 'module/implantes/cargosconsignacion/cargosconsignacion.js' },
        { name: 'Pacientes Implantes', icon: 'fa-user', html: 'module/implantes/pacientesimplantes/pacientesimplantes.html', css: 'module/implantes/pacientesimplantes/pacientesimplantes.css', js: 'module/implantes/pacientesimplantes/pacientesimplantes.js' },
        { name: 'Pacientes Consignación', icon: 'fa-user-injured', html: 'module/implantes/pacientesconsignacion/pacientesconsignacion.html', css: 'module/implantes/pacientesconsignacion/pacientesconsignacion.css', js: 'module/implantes/pacientesconsignacion/pacientesconsignacion.js' },
        { name: 'Referencias', icon: 'fa-link', html: 'module/implantes/referencias/referencias.html', css: 'module/implantes/referencias/referencias.css', js: 'module/implantes/referencias/referencias.js' },
        { name: 'Paquetización', icon: 'fa-boxes', html: 'module/implantes/paquetizacion/paquetizacion.html', css: 'module/implantes/paquetizacion/paquetizacion.css', js: 'module/implantes/paquetizacion/paquetizacion.js' },
        { name: 'Mantenedor', icon: 'fa-warehouse', html: 'module/implantes/mantenedor/mantenedor.html', css: 'module/implantes/mantenedor/mantenedor.css', js: 'module/implantes/mantenedor/mantenedor.js' },
        { name: 'Tránsito', icon: 'fa-route', html: 'module/implantes/transito/transito.html', css: 'module/implantes/transito/transito.css', js: 'module/implantes/transito/transito.js' },
        { name: 'Contenedores', icon: 'fa-box-archive', html: 'module/implantes/contenedores/contenedores.html', css: 'module/implantes/contenedores/contenedores.css', js: 'module/implantes/contenedores/contenedores.js' }
    ],
  Consignacion: [
    { name: 'Asignación', icon: 'fa-clipboard-list', html: 'modulos/consignacion/asignacion/asignacion.html', css: 'modulos/consignacion/asignacion/asignacion.css', js: 'modulos/consignacion/asignacion/asignacion.js' },
    { name: 'Ficha', icon: 'fa-file-alt', html: 'modulos/consignacion/ficha/ficha.html', css: 'modulos/consignacion/ficha/ficha.css', js: 'modulos/consignacion/ficha/ficha.js' },
    { name: 'Lotes', icon: 'fa-boxes', html: 'modulos/consignacion/lotes/lotes.html', css: 'modulos/consignacion/lotes/lotes.css', js: 'modulos/consignacion/lotes/lotes.js' }
  ],
  Corporativo: [
    { name: 'Reporte 2024', icon: 'fa-chart-bar', html: 'modulos/corporativo/reporte-2024/reporte-2024.html', css: 'modulos/corporativo/reporte-2024/reporte-2024.css', js: 'modulos/corporativo/reporte-2024/reporte-2024.js' },
    { name: 'Reporte 2025', icon: 'fa-chart-bar', html: 'modulos/corporativo/reporte-2025/reporte-2025.html', css: 'modulos/corporativo/reporte-2025/reporte-2025.css', js: 'modulos/corporativo/reporte-2025/reporte-2025.js' },
    { name: 'RP 2024', icon: 'fa-file-excel', html: 'modulos/corporativo/rp-2024/rp-2024.html', css: 'modulos/corporativo/rp-2024/rp-2024.css', js: 'modulos/corporativo/rp-6060.js' },
    { name: 'RO 2025', icon: 'fa-file-excel', html: 'modulos/corporativo/ro-2025/ro-2025.html', css: 'modulos/corporativo/ro-2025/ro-2025.css', js: 'modulos/corporativo/ro-2025/ro-2025.js' }
  ],
  Laboratorio: [
    { name: 'Facturación', icon: 'fa-money-bill', html: 'modulos/laboratorio/facturacion/facturacion.html', css: 'modulos/laboratorio/facturacion/facturacion.css', js: 'modulos/laboratorio/facturacion/facturacion.js' },
    { name: 'Detalles', icon: 'fa-info-circle', html: 'modulos/laboratorio/detalles/detalles.html', css: 'modulos/laboratorio/detalles/detalles.css', js: 'modulos/laboratorio/detalles/detalles.js' }
  ],
  Resumen: [
    { name: 'Visor', icon: 'fa-eye', html: 'modulos/resumen/visor/visor.html', css: 'modulos/resumen/visor/visor.css', js: 'modulos/resumen/visor/visor.js' },
    { name: 'ImplanteView', icon: 'fa-syringe', html: 'modulos/resumen/implanteview/implanteview.html', css: 'modulos/resumen/implanteview/implanteview.css', js: 'modulos/resumen/implanteview/implanteview.js' },
    { name: 'Consigna', icon: 'fa-dolly-flatbed', html: 'modulos/resumen/consigna/consigna.html', css: 'modulos/resumen/consigna/consigna.css', js: 'modulos/resumen/consigna/consigna.js' },
    { name: 'FactuView', icon: 'fa-file-invoice', html: 'modulos/resumen/factuview/factuview.html', css: 'modulos/resumen/factuview/factuview.css', js: 'modulos/resumen/factuview/factuview.js' }
  ],
  Prestaciones: [
    { name: 'Empresas', icon: 'fa-building', html: 'modulos/prestaciones/empresas/empresas.html', css: 'modulos/prestaciones/empresas/empresas.css', js: 'modulos/prestaciones/empresas/empresas.js' },
    { name: 'Médicos', icon: 'fa-user-md', html: 'modulos/prestaciones/medicos/medicos.html', css: 'modulos/prestaciones/medicos/medicos.css', js: 'modulos/prestaciones/medicos/medicos.js' },
    { name: 'Previsiones', icon: 'fa-shield-alt', html: 'modulos/prestaciones/previsiones/previsiones.html', css: 'modulos/prestaciones/previsiones/previsiones.css', js: 'modulos/prestaciones/previsiones/previsiones.js' },
    { name: 'Áreas Clínicas', icon: 'fa-hospital', html: 'modulos/prestaciones/areas-clinicas/areas-clinicas.html', css: 'modulos/prestaciones/areas-clinicas/areas-clinicas.css', js: 'modulos/prestaciones/areas-clinicas/areas-clinicas.js' },
    { name: 'CTS Proveedores', icon: 'fa-truck-loading', html: 'modulos/prestaciones/cts-proveedores/cts-proveedores.html', css: 'modulos/prestaciones/cts-proveedores/cts-proveedores.css', js: 'modulos/prestaciones/cts-proveedores/cts-proveedores.js' },
    { name: 'CTS Clínico', icon: 'fa-stethoscope', html: 'modulos/prestaciones/cts-clinico/cts-clinico.html', css: 'modulos/prestaciones/cts-clinico/cts-clinico.css', js: 'modulos/prestaciones/cts-clinico/cts-clinico.js' }
  ],
  Importacion: [
    { name: 'Reporte Pabellón', icon: 'fa-notes-medical', html: 'modulos/importacion/reportepabellon/reportepabellon.html', css: 'modulos/importacion/reportepabellon/reportepabellon.css', js: 'modulos/importacion/reportepabellon/reportepabellon.js' },
    { name: 'Órdenes de Compra', icon: 'fa-shopping-cart', html: 'modulos/laboratorio/ordenes-compra/ordenes-compra.html', css: 'modulos/laboratorio/ordenes-compra/ordenes-compra.css', js: 'modulos/laboratorio/ordenes-compra/ordenes-compra.js' }
  ],
  Apuntes: [
    { name: 'Notas', icon: 'fa-sticky-note', html: 'modulos/apuntes/notas/notas.html', css: 'modulos/apuntes/notas/notas.css', js: 'modulos/apuntes/notas/notas.js' },
    { name: 'Bloc', icon: 'fa-calendar', html: 'modulos/apuntes/bloc/bloc.html', css: 'modulos/apuntes/bloc/bloc.css', js: 'modulos/apuntes/bloc/bloc.js' }
  ]
};


loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        errorMessage.textContent = 'Por favor, complete todos los campos.';
        errorMessage.classList.remove('hidden');
        return;
    }

    try {
        const usernameRef = doc(db, 'usernames', username);
        const usernameSnap = await getDoc(usernameRef);

        if (!usernameSnap.exists()) {
            errorMessage.textContent = 'Usuario no encontrado.';
            errorMessage.classList.remove('hidden');
            return;
        }

        const email = usernameSnap.data().email;
        const userId = usernameSnap.data().userId;

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (user.uid !== userId) {
            errorMessage.textContent = 'Error: ID de usuario no coincide.';
            errorMessage.classList.remove('hidden');
            return;
        }

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            errorMessage.textContent = 'Datos de usuario no encontrados.';
            errorMessage.classList.remove('hidden');
            return;
        }

        const userData = userSnap.data();
        const permissions = Array.isArray(userData.permissions) ? userData.permissions : [];
        const userRole = userData.role || '';

        localStorage.setItem('userDocId', user.uid);
        localStorage.setItem('userPermissions', JSON.stringify(permissions.map(perm => ({
            module: perm.split(':')[0],
            paths: [submenuData[perm.split(':')[0]]?.find(sub => sub.name === perm.split(':')[1])?.html].filter(Boolean)
        }))));
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('userEmail', user.email);

        window.location.href = 'main.html';

        loginModal.classList.add('hidden');
        errorMessage.classList.add('hidden');
        loginForm.reset();
        passwordInput.type = 'password';
        passwordToggle.classList.remove('fa-eye-slash');
        passwordToggle.classList.add('fa-eye');
        capsLockMessage.classList.add('hidden');
    } catch (error) {
        console.error('Error en el inicio de sesión:', error.code, error.message);
        let errorText = 'Error al iniciar sesión. Por favor, intenta de nuevo.';
        switch (error.code) {
            case 'auth/wrong-password':
                errorText = 'Contraseña incorrecta.';
                break;
            case 'auth/user-not-found':
                errorText = 'Usuario no encontrado.';
                break;
            case 'auth/too-many-requests':
                errorText = 'Demasiados intentos fallidos. Intenta de nuevo más tarde.';
                break;
            case 'auth/invalid-email':
                errorText = 'El correo asociado al usuario es inválido.';
                break;
            case 'firestore/permission-denied':
                errorText = 'Permiso denegado para acceder a los datos del usuario. Contacta al administrador.';
                break;
            default:
                errorText = `Error: ${error.message}`;
        }
        errorMessage.textContent = errorText;
        errorMessage.classList.remove('hidden');
    }
});