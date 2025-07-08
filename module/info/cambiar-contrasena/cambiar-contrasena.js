import { getAuth, reauthenticateWithCredential, updatePassword, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';

const auth = getAuth();
const db = getFirestore();

const changePasswordForm = document.getElementById('change-password-form');
const successModal = document.getElementById('success-modal');
const successMessage = successModal ? successModal.querySelector('.success-message') : null;
const successIcon = document.getElementById('success-icon');
const loadingModal = document.getElementById('loading-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');

function showModal(type, message) {
  if (!successModal || !successIcon || !successMessage) {
    console.warn('Elementos de modal no encontrados');
    alert(message);
    return;
  }
  successModal.className = `modal ${type}`;
  successMessage.textContent = message;
  successIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
  successModal.style.display = 'flex';
  setTimeout(() => {
    successModal.style.display = 'none';
  }, 2000);
}

function toggleLoading(show) {
  if (loadingModal) {
    loadingModal.style.display = show ? 'flex' : 'none';
  }
}

function validateForm(data) {
  if (!data.username || data.username.length < 3) {
    showModal('error', 'El nombre de usuario debe tener al menos 3 caracteres.');
    return false;
  }
  if (!data.currentPassword || data.currentPassword.length < 6) {
    showModal('error', 'La contraseña actual debe tener al menos 6 caracteres.');
    return false;
  }
  if (!data.newPassword || data.newPassword.length < 6) {
    showModal('error', 'La nueva contraseña debe tener al menos 6 caracteres.');
    return false;
  }
  if (data.newPassword !== data.confirmNewPassword) {
    showModal('error', 'Las nuevas contraseñas no coinciden.');
    return false;
  }
  if (data.newPassword === data.currentPassword) {
    showModal('error', 'La nueva contraseña debe ser diferente a la actual.');
    return false;
  }
  return true;
}

function clearForm() {
  const fields = ['username', 'currentPassword', 'newPassword', 'confirmNewPassword'];
  let missingFields = [];
  fields.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.value = '';
    } else {
      missingFields.push(id);
    }
  });
  if (missingFields.length > 0) {
    console.warn(`Elementos no encontrados en el DOM: ${missingFields.join(', ')}`);
  }
}

async function init() {
  const container = document.querySelector('.change-password-container');
  if (!container) {
    console.error('Contenedor .change-password-container no encontrado');
    return;
  }

  if (!changePasswordForm) {
    console.error('Formulario change-password-form no encontrado');
    container.innerHTML = '<p>Error: Formulario no encontrado.</p>';
    return;
  }

  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading(true);

    const data = {
      username: document.getElementById('username')?.value.trim().toLowerCase(),
      currentPassword: document.getElementById('currentPassword')?.value,
      newPassword: document.getElementById('newPassword')?.value,
      confirmNewPassword: document.getElementById('confirmNewPassword')?.value
    };

    if (!validateForm(data)) {
      toggleLoading(false);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        showModal('error', 'No estás autenticado. Por favor, inicia sesión nuevamente.');
        toggleLoading(false);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        showModal('error', 'No se encontró el documento del usuario.');
        toggleLoading(false);
        return;
      }

      const userData = userSnap.data();
      if (userData.username !== data.username) {
        showModal('error', 'El nombre de usuario no coincide con el usuario autenticado.');
        toggleLoading(false);
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, data.newPassword);

      showModal('success', 'Contraseña actualizada exitosamente.');
      clearForm();
    } catch (error) {
      console.error('Error al cambiar la contraseña:', error);
      let errorMessage = 'Error al cambiar la contraseña.';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'La contraseña actual es incorrecta.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Por favor, intenta de nuevo más tarde.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Credenciales inválidas. Verifica la contraseña actual.';
      }
      showModal('error', errorMessage);
    } finally {
      toggleLoading(false);
    }
  });

  closeModalButtons.forEach(button => {
    button.addEventListener('click', () => {
      button.closest('.modal').style.display = 'none';
    });
  });

  window.addEventListener('moduleCleanup', () => {
    if (successModal) successModal.style.display = 'none';
    if (loadingModal) loadingModal.style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}