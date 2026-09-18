const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\d{10}$/;
const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function setFieldError(input, message) {
  const error = document.querySelector(`[data-error-for="${input.id}"]`);
  input.classList.toggle('input-error', Boolean(message));
  if (error) error.textContent = message || '';
  return !message;
}

function clearFormErrors(form) {
  form.querySelectorAll('.field-error').forEach((error) => { error.textContent = ''; });
  form.querySelectorAll('input').forEach((input) => input.classList.remove('input-error'));
  const message = form.querySelector('[data-form-message]');
  if (message) { message.textContent = ''; message.className = 'form-message'; }
}

function validateLogin(form) {
  let valid = true;
  const email = form.elements.email;
  const password = form.elements.password;
  if (!email.value.trim()) valid = !setFieldError(email, 'Email is required.') && valid ? false : valid;
  else if (!emailPattern.test(email.value.trim())) valid = !setFieldError(email, 'Enter a valid email address.') && valid ? false : valid;
  else setFieldError(email, '');
  if (!password.value) valid = !setFieldError(password, 'Password is required.') && valid ? false : valid;
  else setFieldError(password, '');
  return valid;
}

function validateSignup(form) {
  let valid = true;
  const fields = form.elements;
  const requiredFields = [fields.fullName, fields.email, fields.phone, fields.userId, fields.password];
  requiredFields.forEach((input) => {
    if (!input.value.trim()) { setFieldError(input, `${input.labels[0].textContent} is required.`); valid = false; }
    else setFieldError(input, '');
  });
  if (fields.email.value.trim() && !emailPattern.test(fields.email.value.trim())) { setFieldError(fields.email, 'Enter a valid email address.'); valid = false; }
  if (fields.phone.value.trim() && !phonePattern.test(fields.phone.value.trim())) { setFieldError(fields.phone, 'Phone must be exactly 10 digits.'); valid = false; }
  if (fields.password.value && !passwordPattern.test(fields.password.value)) { setFieldError(fields.password, 'Use 8+ characters, one uppercase letter, one number, and one special character.'); valid = false; }
  return valid;
}
