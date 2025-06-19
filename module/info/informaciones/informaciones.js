import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';

export function initNotes(user) {
  if (!user) {
    return;
  }

  const db = getFirestore();
  const infoList = document.querySelector('.info-list');
  const addInfoBtn = document.querySelector('.add-info-btn');

  if (!infoList || !addInfoBtn) {
    return;
  }

  async function loadInfo() {
    try {
      infoList.innerHTML = '';
      const infoRef = collection(db, 'informaciones');
      const q = query(infoRef, where('uid', '==', user.uid));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        renderInfo(doc.id, doc.data().content, false);
      });
    } catch (error) {
      alert('Error al cargar las informaciones. Intenta de nuevo.');
    }
  }

  function renderInfo(id, content, isNew = false) {
    const infoContainer = document.createElement('div');
    infoContainer.classList.add('info-container');
    infoContainer.dataset.id = id;

    if (isNew) {
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

    infoList.appendChild(infoContainer);
  }

  async function saveInfo(id, content, infoContainer) {
    if (!content.trim()) {
      alert('La información no puede estar vacía.');
      return;
    }

    try {
      if (id === 'temp') {
        const infoRef = collection(db, 'informaciones');
        const docRef = await addDoc(infoRef, {
          content,
          uid: user.uid,
          createdAt: new Date()
        });
        infoContainer.dataset.id = docRef.id;
      } else {
        const infoRef = doc(db, 'informaciones', id);
        await updateDoc(infoRef, { content });
      }

      infoContainer.innerHTML = '';
      const infoText = document.createElement('div');
      infoText.classList.add('info-text');
      infoText.textContent = content;
      infoContainer.appendChild(infoText);

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
    } catch (error) {
      alert('Error al guardar la información. Intenta de nuevo.');
    }
  }

  function editInfo(id, content, infoContainer) {
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
    if (!confirm('¿Estás seguro de que deseas eliminar esta información?')) return;

    try {
      const infoRef = doc(db, 'informaciones', id);
      await deleteDoc(infoRef);
      infoContainer.remove();
   няются    } catch (error) {
      alert('Error al eliminar la información. Intenta de nuevo.');
    }
  }

  const addInfoBtnClone = addInfoBtn.cloneNode(true);
  addInfoBtn.parentNode.replaceChild(addInfoBtnClone, addInfoBtn);

  addInfoBtnClone.addEventListener('click', () => {
    renderInfo('temp', '', true);
  });

  loadInfo();

  window.addEventListener('moduleCleanup', () => {
    addInfoBtnClone.removeEventListener('click', () => {});
  });
}

window.initNotes = initNotes;
