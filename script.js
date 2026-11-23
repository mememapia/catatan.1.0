'use strict';

// =========================
// KONFIGURASI & REFERENSI DOM
// =========================
// Alamat API relatif: berjalan di http://localhost/taskly/ (Laragon)
const API_URL = 'api/tasks.php';

const elements = {
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),
  resultNote: document.getElementById('resultNote'),
  searchInput: document.getElementById('searchInput'),
  modal: document.getElementById('taskModal'),
  form: document.getElementById('taskForm'),
  modalTitle: document.getElementById('modalTitle'),
  title: document.getElementById('taskTitle'),
  description: document.getElementById('taskDescription'),
  date: document.getElementById('taskDateTime'),
  status: document.getElementById('taskStatus'),
  titleError: document.getElementById('titleError'),
  dateError: document.getElementById('dateError'),
  toast: document.getElementById('toast'),
  saveButton: document.getElementById('saveTaskBtn')
};

let tasks = [];
let currentFilter = 'all';
let editingTaskId = null;
let toastTimer = null;

// =========================
// KOMUNIKASI DENGAN API (PHP + MySQL)
// =========================
async function apiRequest(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
  } catch (error) {
    throw new Error('Tidak bisa terhubung ke server. Pastikan Apache & MySQL Laragon menyala.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error('Respon server tidak valid. Cek api/tasks.php dan koneksi database.');
  }

  // Belum login atau sesi habis: arahkan ke halaman login
  if (response.status === 401) {
    window.location.href = 'login.html';
    throw new Error('Sesi berakhir. Silakan login kembali.');
  }

  if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan pada server.');
  return data;
}

// =========================
// AKUN PENGGUNA (login / logout)
// =========================
async function initUser() {
  const me = await apiRequest('api/auth.php?action=me');
  const nameEl = document.getElementById('userName');
  if (nameEl) nameEl.textContent = me.name;
}

const logoutButton = document.getElementById('logoutBtn');
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    try {
      await apiRequest('api/auth.php?action=logout', { method: 'POST', body: '{}' });
    } catch (error) {
      console.error('Logout gagal:', error);
    }
    window.location.href = 'login.html';
  });
}

const TaskAPI = {
  getAll: () => apiRequest(API_URL),
  create: (task) => apiRequest(API_URL, { method: 'POST', body: JSON.stringify(task) }),
  update: (id, task) => apiRequest(`${API_URL}?id=${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(task) }),
  remove: (id) => apiRequest(`${API_URL}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
};

// READ: ambil semua tugas dari database
async function loadTasks() {
  try {
    tasks = await TaskAPI.getAll();
  } catch (error) {
    console.error('Gagal memuat tugas:', error);
    showToast(error.message);
    tasks = [];
  }
  renderTasks();
}

// =========================
// UTILITAS
// =========================
function formatDate(dateTimeString) {
  if (!dateTimeString) return 'No deadline';
  const date = new Date(dateTimeString);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function getLocalDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2400);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

// =========================
// RENDER / READ
// =========================
function renderTasks() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = currentFilter === 'all' || task.status === currentFilter;
    const searchableText = `${task.title} ${task.description || ''}`.toLowerCase();
    return matchesStatus && searchableText.includes(searchTerm);
  });

  elements.taskList.innerHTML = filteredTasks.map((task) => {
    const isCompleted = task.status === 'completed';
    const now = getLocalDateTimeValue();
    const isOverdue = task.dueDate && task.dueDate < now && !isCompleted;

    return `
      <article class="task-row ${isCompleted ? 'is-complete' : ''}">
        <div class="task-main">
          <button class="complete-toggle ${isCompleted ? 'is-complete' : ''}"
            data-action="toggle" data-id="${escapeHTML(task.id)}"
            aria-label="${isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}"
            title="${isCompleted ? 'Mark active' : 'Mark completed'}">${isCompleted ? '✓' : ''}</button>
          <div>
            <div class="task-title">${escapeHTML(task.title)}</div>
            ${task.description ? `<small class="task-description">${escapeHTML(task.description)}</small>` : ''}
          </div>
        </div>
        <div class="task-date ${isOverdue ? 'overdue' : ''}">${isOverdue ? 'Overdue · ' : ''}${formatDate(task.dueDate)}</div>
        <span class="status-pill ${task.status}">${isCompleted ? 'Completed' : 'Active'}</span>
        <div class="row-actions">
          <button class="icon-btn" data-action="edit" data-id="${escapeHTML(task.id)}" aria-label="Edit tugas" title="Edit">✎</button>
          <button class="icon-btn delete" data-action="delete" data-id="${escapeHTML(task.id)}" aria-label="Hapus tugas" title="Delete">⌫</button>
        </div>
      </article>`;
  }).join('');

  elements.emptyState.classList.toggle('visible', filteredTasks.length === 0);
  elements.taskList.hidden = filteredTasks.length === 0;
  elements.resultNote.textContent = `Showing ${filteredTasks.length} of ${tasks.length} tasks`;

  document.getElementById('totalCount').textContent = tasks.length;
  document.getElementById('activeCount').textContent = tasks.filter((task) => task.status === 'active').length;
  document.getElementById('completedCount').textContent = tasks.filter((task) => task.status === 'completed').length;
  document.getElementById('allTabCount').textContent = tasks.length;

  document.querySelectorAll('.filter-btn').forEach((button) => {
    const selected = button.dataset.filter === currentFilter;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

// =========================
// CREATE & UPDATE
// =========================
function openModal(task = null) {
  elements.form.reset();
  clearValidation();
  editingTaskId = task ? task.id : null;
  elements.modalTitle.textContent = task ? 'Edit task' : 'Create a task';
  elements.saveButton.textContent = task ? 'Update task' : 'Save task';

  if (task) {
    elements.title.value = task.title;
    elements.description.value = task.description || '';
    elements.date.value = task.dueDate || '';
    elements.status.value = task.status;
  }

  elements.modal.hidden = false;
  elements.title.focus();
}

function closeModal() {
  elements.modal.hidden = true;
  editingTaskId = null;
  elements.form.reset();
  clearValidation();
}

function clearValidation() {
  elements.titleError.textContent = '';
  elements.dateError.textContent = '';
  elements.title.classList.remove('invalid');
  elements.date.classList.remove('invalid');
}

function validateForm() {
  clearValidation();
  let isValid = true;
  const titleValue = elements.title.value.trim();
  const dateValue = elements.date.value;
  const now = getLocalDateTimeValue();

  if (!titleValue) {
    elements.titleError.textContent = 'Nama tugas wajib diisi.';
    elements.title.classList.add('invalid');
    isValid = false;
  } else if (titleValue.length < 3) {
    elements.titleError.textContent = 'Nama tugas minimal 3 karakter.';
    elements.title.classList.add('invalid');
    isValid = false;
  }

  if (dateValue && dateValue < now) {
    elements.dateError.textContent = 'Deadline harus berada di masa sekarang atau mendatang.';
    elements.date.classList.add('invalid');
    isValid = false;
  }

  return isValid;
}

async function handleFormSubmit(event) {
  event.preventDefault();

  if (!validateForm()) {
    console.warn('Validasi gagal: periksa kembali input tugas.');
    return;
  }

  const taskData = {
    title: elements.title.value.trim(),
    description: elements.description.value.trim(),
    dueDate: elements.date.value,
    status: elements.status.value
  };

  elements.saveButton.disabled = true;
  try {
    if (editingTaskId) {
      const updated = await TaskAPI.update(editingTaskId, taskData);
      tasks = tasks.map((task) => (String(task.id) === String(editingTaskId) ? updated : task));
      showToast('Tugas berhasil diperbarui.');
    } else {
      const created = await TaskAPI.create(taskData);
      tasks.unshift(created);
      showToast('Tugas berhasil ditambahkan.');
    }
    closeModal();
    renderTasks();
  } catch (error) {
    console.error('Gagal menyimpan tugas:', error);
    showToast(error.message);
  } finally {
    elements.saveButton.disabled = false;
  }
}

// =========================
// DELETE & UPDATE STATUS
// =========================
async function deleteTask(id) {
  const task = tasks.find((item) => String(item.id) === String(id));
  if (!task) {
    console.error('Tugas tidak ditemukan untuk dihapus:', id);
    showToast('Tugas tidak ditemukan.');
    return;
  }

  if (!window.confirm(`Hapus tugas "${task.title}"?`)) return;

  try {
    await TaskAPI.remove(id);
    tasks = tasks.filter((item) => String(item.id) !== String(id));
    renderTasks();
    showToast('Tugas berhasil dihapus.');
  } catch (error) {
    console.error('Gagal menghapus tugas:', error);
    showToast(error.message);
  }
}

async function toggleTaskStatus(id) {
  const task = tasks.find((item) => String(item.id) === String(id));
  if (!task) {
    console.error('Tugas tidak ditemukan untuk diubah statusnya:', id);
    return;
  }

  const newStatus = task.status === 'active' ? 'completed' : 'active';
  try {
    const updated = await TaskAPI.update(id, { status: newStatus });
    tasks = tasks.map((item) => (String(item.id) === String(id) ? updated : item));
    renderTasks();
    showToast(newStatus === 'completed' ? 'Task completed. Nice work!' : 'Tugas dipindahkan ke Active.');
  } catch (error) {
    console.error('Gagal mengubah status:', error);
    showToast(error.message);
  }
}

// =========================
// EVENT LISTENERS
// =========================
document.getElementById('openAddBtn').addEventListener('click', () => openModal());
document.getElementById('emptyAddBtn').addEventListener('click', () => openModal());
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
elements.form.addEventListener('submit', handleFormSubmit);
elements.searchInput.addEventListener('input', renderTasks);

document.querySelectorAll('.filter-btn').forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    renderTasks();
  });
});

elements.taskList.addEventListener('click', (event) => {
  const actionButton = event.target.closest('button[data-action]');
  if (!actionButton) return;

  const { action, id } = actionButton.dataset;
  const selectedTask = tasks.find((task) => String(task.id) === String(id));

  if (action === 'toggle') toggleTaskStatus(id);
  if (action === 'edit' && selectedTask) openModal(selectedTask);
  if (action === 'delete') deleteTask(id);
});

elements.modal.addEventListener('click', (event) => {
  if (event.target === elements.modal) closeModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !elements.modal.hidden) closeModal();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    elements.searchInput.focus();
  }
});

// =========================
// INISIALISASI APLIKASI
// =========================
function updateDateTime() {
  const now = new Date();
  document.getElementById('todayLabel').textContent = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(now);
  document.getElementById('clockLabel').textContent = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(now);
}

updateDateTime();
setInterval(updateDateTime, 1000);

initUser()
  .then(loadTasks)
  .then(() => console.info('Taskly berhasil dijalankan. Total tugas:', tasks.length))
  .catch((error) => { if (error && error.message) showToast(error.message); });
