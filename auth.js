// Dipakai oleh login.html dan register.html
const AUTH_URL = 'api/auth.php';

async function authRequest(action, body) {
  let res;
  try {
    res = await fetch(`${AUTH_URL}?action=${action}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    throw new Error('Tidak bisa terhubung ke server. Pastikan Apache & MySQL menyala.');
  }

  let data = {};
  try {
    data = await res.json();
  } catch (error) {
    throw new Error('Respon server tidak valid. Cek api/auth.php dan koneksi database.');
  }

  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');
  return data;
}

// Kalau sudah login, tidak perlu melihat halaman ini lagi
authRequest('me').then(() => { window.location.href = 'index.html'; }).catch(() => {});

const errorBox = document.getElementById('authError');
const submitBtn = document.getElementById('submitBtn');
const val = (id) => document.getElementById(id).value;

function bindForm(formId, action, getData, validate) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.textContent = '';

    const problem = validate();
    if (problem) { errorBox.textContent = problem; return; }

    submitBtn.disabled = true;
    try {
      await authRequest(action, getData());
      window.location.href = 'index.html';
    } catch (error) {
      errorBox.textContent = error.message;
      submitBtn.disabled = false;
    }
  });
}

bindForm('loginForm', 'login',
  () => ({ email: val('email').trim(), password: val('password') }),
  () => (!val('email').trim() || !val('password')) ? 'Email dan password wajib diisi.' : ''
);

bindForm('registerForm', 'register',
  () => ({ name: val('name').trim(), email: val('email').trim(), password: val('password') }),
  () => {
    if (val('name').trim().length < 2) return 'Nama minimal 2 karakter.';
    if (!val('email').trim()) return 'Email wajib diisi.';
    if (val('password').length < 8) return 'Password minimal 8 karakter.';
    if (val('password') !== val('password2')) return 'Konfirmasi password tidak sama.';
    return '';
  }
);
