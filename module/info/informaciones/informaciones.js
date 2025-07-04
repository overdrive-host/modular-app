import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';


export function initNotes(user) {
  if (!user) {
    console.error('Usuario no proporcionado');
    return;
  }

  const db = getFirestore();
  const auth = getAuth();
  const infoList = document.querySelector('.info-list');
  let addInfoBtn = document.querySelector('.add-info-btn');

  if (!infoList) {
    console.error('Elemento .info-list no encontrado');
    return;
  }

  if (!addInfoBtn) {
    console.error('Botón .add-info-btn no encontrado en el DOM');
  } else {
  }

  async function isAdmin() {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        console.error('Documento de usuario no encontrado para UID:', user.uid);
        return false;
      }
      const userData = userSnap.data();
      const role = userData.role || '';
      return role === 'Administrador';
    } catch (error) {
      console.error('Error al verificar si el usuario es administrador:', error);
      return false;
    }
  }

  async function loadInfo() {
    try {
      infoList.innerHTML = '';
      const infoRef = collection(db, 'informaciones');
      const snapshot = await getDocs(infoRef);
      const isUserAdmin = await isAdmin();
      if (addInfoBtn) {
        addInfoBtn.style.setProperty('display', isUserAdmin ? 'block' : 'none', 'important');
        setTimeout(() => {
        }, 100);
      } else {
        console.error('Botón .add-info-btn no encontrado al ejecutar loadInfo');
      }
      snapshot.forEach(doc => {
        renderInfo(doc.id, doc.data().content, false, isUserAdmin);
      });
    } catch (error) {
      console.error('Error al cargar las informaciones:', error);
      alert(`Error al cargar las informaciones: ${error.message}. Intenta de nuevo.`);
    }
  }

  function renderInfo(id, content, isNew = false, isUserAdmin = false) {
    const infoContainer = document.createElement('div');
    infoContainer.classList.add('info-container');
    infoContainer.dataset.id = id;

    if (isNew && isUserAdmin) {
      const textarea = document.createElement('textarea');
      textarea.classList.add('info-textarea');
      textarea.value = content || '';
      textarea.placeholder = 'Escribe la información general aquí...';
      infoContainer.appendChild(textarea);

      const actions = document.createElement('div');
      actions.classList.add('info-actions');

      const saveBtn = document.createElement('button');
      saveBtn.classList.add('info-btn', 'save');
      saveBtn.textContent = 'Guardar';
      saveBtn.addEventListener('click', () => saveInfo(id, textarea.value, infoContainer));

      actions.appendChild(saveBtn);
      infoContainer.appendChild(actions);
    } else {
      const infoText = document.createElement('div');
      infoText.classList.add('info-text');
      infoText.textContent = content;
      infoContainer.appendChild(infoText);

      if (isUserAdmin) {
        const actions = document.createElement('div');
        actions.classList.add('info-actions');

        const editBtn = document.createElement('button');
        editBtn.classList.add('info-btn', 'edit');
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => editInfo(id, content, infoContainer));

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('info-btn', 'delete');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.addEventListener('click', () => deleteInfo(id, infoContainer));

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        infoContainer.appendChild(actions);
      }
    }

    infoList.appendChild(infoContainer);
  }

  async function saveInfo(id, content, infoContainer) {
    if (!content.trim()) {
      alert('La información no puede estar vacía.');
      return;
    }

    try {
      const isUserAdmin = await isAdmin();
      if (!isUserAdmin) {
        alert('No tienes permiso para realizar esta acción.');
        return;
      }

      if (id === 'temp') {
        const infoRef = collection(db, 'informaciones');
        const docRef = await addDoc(infoRef, {
          content: content,
          uid: user.uid,
          createdAt: new Date()
        });
        infoContainer.dataset.id = docRef.id;
      } else {
        const infoRef = doc(db, 'informaciones', id);
        const docSnap = await getDoc(infoRef);
        if (!docSnap.exists()) {
          throw new Error('El documento no existe');
        }
        await updateDoc(infoRef, { content });
      }

      infoContainer.innerHTML = '';
      const infoText = document.createElement('div');
      infoText.classList.add('info-text');
      infoText.textContent = content;
      infoContainer.appendChild(infoText);

      if (isUserAdmin) {
        const actions = document.createElement('div');
        actions.classList.add('info-actions');

        const editBtn = document.createElement('button');
        editBtn.classList.add('info-btn', 'edit');
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => editInfo(id, content, infoContainer));

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('info-btn', 'delete');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.addEventListener('click', () => deleteInfo(id, infoContainer));

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        infoContainer.appendChild(actions);
      }
    } catch (error) {
      console.error('Error al guardar la información:', error);
      alert(`Error al guardar la información: ${error.message}. Intenta de nuevo.`);
    }
  }

  async function editInfo(id, content, infoContainer) {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      alert('No tienes permiso para editar esta información.');
      return;
    }

    infoContainer.innerHTML = '';
    const textarea = document.createElement('textarea');
    textarea.classList.add('info-textarea');
    textarea.value = content;
    textarea.placeholder = 'Escribe la información general aquí...';
    infoContainer.appendChild(textarea);

    const actions = document.createElement('div');
    actions.classList.add('info-actions');

    const saveBtn = document.createElement('button');
    saveBtn.classList.add('info-btn', 'save');
    saveBtn.textContent = 'Guardar';
    saveBtn.addEventListener('click', () => saveInfo(id, textarea.value, infoContainer));

    actions.appendChild(saveBtn);
    infoContainer.appendChild(actions);
  }

  async function deleteInfo(id, infoContainer) {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      alert('No tienes permiso para eliminar esta información.');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar esta información?')) return;

    try {
      const infoRef = doc(db, 'informaciones', id);
      await deleteDoc(infoRef);
      infoContainer.remove();
    } catch (error) {
      console.error('Error al eliminar la información:', error);
      alert(`Error al eliminar la información: ${error.message}. Intenta de nuevo.`);
    }
  }

  if (addInfoBtn) {
    const addInfoBtnClone = addInfoBtn.cloneNode(true);
    addInfoBtn.parentNode.replaceChild(addInfoBtnClone, addInfoBtn);
    addInfoBtn = addInfoBtnClone;

    addInfoBtn.addEventListener('click', async () => {
      const isUserAdmin = await isAdmin();
      if (!isUserAdmin) {
        alert('No tienes permiso para añadir información.');
        return;
      }
      renderInfo('temp', '', true, true);
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadInfo();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      loadInfo();
    });
  }

  window.addEventListener('moduleCleanup', () => {
    if (addInfoBtn) {
      addInfoBtn.removeEventListener('click', () => { });
    }
  });
}

window.initNotes = initNotes;