const profileFields = ['full_name', 'date_of_birth', 'gender', 'state', 'category', 'annual_family_income', 'education_level', 'course', 'academic_performance', 'scholar_type', 'disability', 'minority', 'residence_type'];
const stateOptions = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];

function optionList(id, options) {
  return `<datalist id="${id}">${options.map((option) => `<option value="${option}"></option>`).join('')}</datalist>`;
}

function removeLegacyProfileFields() {
  ['profile-email', 'profile-phone', 'profile-user-id', 'institution', 'bio', 'class-level', 'country', 'religion'].forEach((id) => {
    document.getElementById(id)?.closest('.form-field')?.remove();
  });
}

function injectProfileSelectors() {
  const grid = document.querySelector('.profile-form-grid');
  if (!grid || document.querySelector('[data-profile-selectors]')) return;
  grid.insertAdjacentHTML('beforeend', `<div class="profile-selector-section" data-profile-selectors><div class="profile-selector-heading"><p class="eyebrow">Student details</p><span>Required fields are marked *</span></div><div class="profile-selector-grid"><div class="form-field"><label for="date-of-birth">Date of Birth *</label><input id="date-of-birth" name="date_of_birth" type="date" required><small class="field-error" data-error-for="date-of-birth"></small></div><div class="form-field"><label for="gender">Gender *</label><select id="gender" name="gender" required><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select><small class="field-error" data-error-for="gender"></small></div><div class="form-field"><label for="state">State / Domicile *</label><input id="state" name="state" type="text" list="state-options" placeholder="Select state" required><small class="field-error" data-error-for="state"></small>${optionList('state-options', stateOptions)}</div><div class="form-field"><label for="category">Category *</label><select id="category" name="category" required><option value="">Select category</option><option>General</option><option>OBC</option><option>SC</option><option>ST</option><option>EWS</option></select><small class="field-error" data-error-for="category"></small></div><div class="form-field"><label for="annual-family-income">Annual Family Income (INR) *</label><input id="annual-family-income" name="annual_family_income" type="number" min="0" step="1" inputmode="numeric" placeholder="e.g. 250000" required><small class="field-error" data-error-for="annual-family-income"></small></div><div class="form-field"><label for="education-level">Education Level *</label><select id="education-level" name="education_level" required><option value="">Select education level</option><option>10th</option><option>12th</option><option>Diploma</option><option>UG</option><option>PG</option></select><small class="field-error" data-error-for="education-level"></small></div><div class="form-field"><label for="course">Course / Stream *</label><input id="course" name="course" type="text" placeholder="e.g. B.Tech, B.Com, MBBS" required><small class="field-error" data-error-for="course"></small></div><div class="form-field"><label for="academic-performance">Marks / Percentage / CGPA *</label><input id="academic-performance" name="academic_performance" type="text" placeholder="e.g. 82% or 8.4 CGPA" required><small class="field-error" data-error-for="academic-performance"></small></div><div class="form-field"><label for="scholar-type">Hosteller or Day Scholar *</label><select id="scholar-type" name="scholar_type" required><option value="">Select student type</option><option>Hosteller</option><option>Day Scholar</option></select><small class="field-error" data-error-for="scholar-type"></small></div><div class="form-field"><label for="disability">Disability <span class="optional">Optional</span></label><select id="disability" name="disability"><option value="">Select option</option><option>Yes</option><option>No</option></select></div><div class="form-field"><label for="minority">Minority <span class="optional">Optional</span></label><select id="minority" name="minority"><option value="">Select option</option><option>Yes</option><option>No</option></select></div><div class="form-field"><label for="residence-type">Rural or Urban <span class="optional">Optional</span></label><select id="residence-type" name="residence_type"><option value="">Select option</option><option>Rural</option><option>Urban</option></select></div></div></div>`);
}

function updateCourseVisibility() {
  const education = document.querySelector('#education-level');
  const course = document.querySelector('#course');
  if (!education || !course) return;
  const courseField = course.closest('.form-field');
  const courseRequired = ['Diploma', 'UG', 'PG'].includes(education.value);
  courseField.hidden = !courseRequired;
  course.required = courseRequired;
  if (!courseRequired) {
    course.value = '';
    setProfileFieldError(course, '');
  }
}

function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function profileMessage(message, type = 'error') {
  const element = document.querySelector('[data-profile-message]');
  if (element) { element.textContent = message; element.className = `form-message ${type}`; }
}

function setProfileFieldError(input, message) {
  const error = document.querySelector(`[data-error-for="${input.id}"]`);
  input.classList.toggle('input-error', Boolean(message));
  if (error) error.textContent = message || '';
}

function fillProfile(form, profile, email, metadata = {}) {
  profileFields.forEach((field) => {
    const input = form.elements[field];
    if (input) input.value = profile?.[field] ?? (field === 'email' ? email : metadata[field] ?? '');
  });
}

async function loadProfile() {
  const client = window.beAScholarSupabase;
  if (!client) { profileMessage('Supabase is not configured.'); return null; }
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) { window.location.href = 'login.html'; return null; }
  const { data, error } = await client.from('users').select('id, phone, full_name, date_of_birth, gender, state, category, annual_family_income, education_level, course, academic_performance, scholar_type, disability, minority, residence_type').eq('id', user.id).maybeSingle();
  if (error) {
    if (error.code === 'PGRST204' || /column .* does not exist|schema cache/i.test(error.message || '')) profileMessage('Run supabase-profile-fields-migration.sql in Supabase SQL Editor, then refresh this page.');
    else if (error.code === 'PGRST205') profileMessage('Run supabase-schema.sql in Supabase SQL Editor before saving profiles.');
    else profileMessage(error.message);
    return { user, profile: null };
  }
  return { user, profile: data, phone: data?.phone || user.user_metadata?.phone || null };
}

function validateProfile(form) {
  let valid = true;
  const required = [form.elements.full_name, form.elements.date_of_birth, form.elements.gender, form.elements.state, form.elements.category, form.elements.annual_family_income, form.elements.education_level, form.elements.academic_performance, form.elements.scholar_type];
  required.forEach((input) => {
    const message = input.value.trim() ? '' : `${input.labels[0].textContent} is required.`;
    setProfileFieldError(input, message);
    if (message) valid = false;
  });
  if (form.elements.annual_family_income.value && Number(form.elements.annual_family_income.value) < 0) {
    setProfileFieldError(form.elements.annual_family_income, 'Income cannot be negative.');
    valid = false;
  }
  if (form.elements.date_of_birth.value && !isValidDateInput(form.elements.date_of_birth.value)) {
    setProfileFieldError(form.elements.date_of_birth, 'Enter a valid date of birth.');
    valid = false;
  }
  if (['Diploma', 'UG', 'PG'].includes(form.elements.education_level.value)) {
    const courseMessage = form.elements.course.value.trim() ? '' : 'Course / Stream is required for this education level.';
    setProfileFieldError(form.elements.course, courseMessage);
    if (courseMessage) valid = false;
  }
  return valid;
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('#profile-form');
  if (!form) return;
  removeLegacyProfileFields();
  injectProfileSelectors();
  document.querySelector('#education-level')?.addEventListener('change', updateCourseVisibility);
  const result = await loadProfile();
  if (!result) return;
  fillProfile(form, result.profile, result.user.email, { full_name: result.user.user_metadata?.full_name });
  updateCourseVisibility();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateProfile(form)) return;
    const button = form.querySelector('[data-save-profile]');
    button.disabled = true;
    button.textContent = 'Saving...';
    try {
      const phone = String(result.phone || result.profile?.phone || result.user.user_metadata?.phone || '').trim();
      if (!phone) {
        throw new Error('Your phone number is missing. Add it to your account profile before saving.');
      }
      const values = Object.fromEntries(profileFields.map((field) => [field, form.elements[field]?.value.trim() || null]));
      values.phone = phone;
      if (values.annual_family_income) values.annual_family_income = Number(values.annual_family_income);
      const { error } = await window.beAScholarSupabase.from('users').update(values).eq('id', result.user.id);
      if (error) throw error;
      const { error: reloadError } = await window.beAScholarSupabase.from('users').select('id').eq('id', result.user.id).single();
      if (reloadError) throw reloadError;
      const state = document.querySelector('[data-save-state]');
      if (state) state.textContent = `Saved just now · ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      window.location.href = 'eligibility.html';
    } catch (error) {
      profileMessage(error.code === 'PGRST204' || /column .*schema cache|column .* does not exist/i.test(error.message || '') ? 'The profile columns are missing from public.users. Run supabase-profile-fields-migration.sql in Supabase SQL Editor, then reload this page.' : error.code === 'PGRST205' ? 'The public.users table is missing. Run supabase-schema.sql first.' : error.message || 'Unable to save your profile.');
    } finally { button.disabled = false; button.innerHTML = 'Save profile <span aria-hidden="true">↗</span>'; }
  });

  document.querySelector('[data-logout]')?.addEventListener('click', async () => {
    await logout();
    window.location.href = 'login.html';
  });
});
