const SUPABASE_URL = 'https://rddhdgicvonghzocavmx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IiCdBuTvRwuNG8w2tuRJuQ_4GBp3sCi';
const supabaseClient = window.supabase && SUPABASE_URL.startsWith('http')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
window.beAScholarSupabase = supabaseClient;

function showFormMessage(form, message, type = 'error') {
  const element = form.querySelector('[data-form-message]');
  if (element) { element.textContent = message; element.className = `form-message ${type}`; }
}

function readableAuthError(error) {
  const message = error?.message || '';
  if (error?.status === 429 || /rate limit|too many requests|email rate limit/i.test(message)) {
    return 'Supabase email rate limit reached. Wait a while before trying again, or disable email confirmation while testing in Supabase Auth settings.';
  }
  return message || 'Unable to complete authentication. Please try again.';
}

async function signUp({ fullName, email, phone, userId, password }) {
  if (!supabaseClient) return { demo: true };
  const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: { full_name: fullName, phone, user_id: userId } } });
  if (error) throw error;
  if (data.user && data.session) {
    const { error: profileError } = await supabaseClient.from('users').upsert({ id: data.user.id, full_name: fullName, email, phone, user_id: userId }, { onConflict: 'id' });
    if (profileError) {
      if (profileError.code === 'PGRST205') {
        throw new Error('Supabase is missing the public.users table. Run supabase-schema.sql in the Supabase SQL Editor, then try again.');
      }
      throw profileError;
    }
  }
  return data;
}

async function login(email, password) {
  if (!supabaseClient) return { demo: true };
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function logout() {
  if (supabaseClient) { const { error } = await supabaseClient.auth.signOut(); if (error) throw error; }
}

async function resetPassword(email) {
  if (!supabaseClient) return { demo: true };
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login.html` });
  if (error) throw error;
  return { sent: true };
}

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.querySelector('#signup-form');
  const loginForm = document.querySelector('#login-form');

  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(signupForm);
    if (!validateSignup(signupForm)) return;
    const submit = signupForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Creating account...';
    try {
      const fields = signupForm.elements;
      const result = await signUp({ fullName: fields.fullName.value.trim(), email: fields.email.value.trim(), phone: fields.phone.value.trim(), userId: fields.userId.value.trim(), password: fields.password.value });
      if (result.session) { window.location.href = 'profile.html'; return; }
      showFormMessage(signupForm, result.demo ? 'Demo mode is ready. Supabase is not configured.' : 'Account created. Check your email to confirm your account, then log in.', 'success');
      if (!result.demo) signupForm.reset();
    } catch (error) { showFormMessage(signupForm, readableAuthError(error)); }
    finally { submit.disabled = false; submit.innerHTML = 'Create account <span aria-hidden="true">↗</span>'; }
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(loginForm);
    if (!validateLogin(loginForm)) return;
    const submit = loginForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Logging in...';
    try {
      const result = await login(loginForm.elements.email.value.trim(), loginForm.elements.password.value);
      if (!result.demo) { window.location.href = 'profile.html'; return; }
      showFormMessage(loginForm, 'Demo mode is ready. Supabase is not configured.', 'success');
    } catch (error) { showFormMessage(loginForm, readableAuthError(error)); }
    finally { submit.disabled = false; submit.innerHTML = 'Log in <span aria-hidden="true">↗</span>'; }
  });

  document.querySelectorAll('[data-demo-action]').forEach((link) => link.addEventListener('click', async (event) => {
    event.preventDefault();
    const email = loginForm?.elements.email;
    if (!email || !email.value.trim() || !emailPattern.test(email.value.trim())) {
      if (email) setFieldError(email, 'Enter a valid email address first.');
      return;
    }
    try {
      const result = await resetPassword(loginForm.elements.email.value.trim());
      showFormMessage(loginForm, result.demo ? 'Demo mode is ready. Connect Supabase to send recovery emails.' : 'Check your email for a password reset link.', 'success');
    } catch (error) { showFormMessage(loginForm, error.message || 'Unable to send a password reset email.'); }
  }));
});
