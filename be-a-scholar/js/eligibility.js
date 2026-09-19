let allResults = [];
let activeStatus = 'ALL';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}
function setResultsMessage(message, type = '') {
  const element = document.querySelector('[data-results-message]');
  if (element) { element.textContent = message; element.className = `results-message ${type}`; }
}
function normalizeUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
function criteriaList(items, emptyText) {
  if (!items.length) return `<p class="card-muted">${emptyText}</p>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item.detail)}</li>`).join('')}</ul>`;
}
const statusTitles = {
  ELIGIBLE: { label: 'Matched', tone: 'matched' },
  NEEDS_VERIFICATION: { label: 'Potential', tone: 'potential' },
  NOT_ELIGIBLE: { label: 'Not Matched', tone: 'not-matched' }
};

function resultCard(result) {
  const { scholarship } = result;
  const portal = normalizeUrl(scholarship.officialPortal);
  return `<article class="scholarship-card" data-result-id="${escapeHtml(scholarship.id)}">
    <button class="scholarship-name-toggle" type="button" data-card-toggle="${escapeHtml(scholarship.id)}">
      <span class="scholarship-name">${escapeHtml(scholarship.name || 'Unnamed scholarship')}</span>
      <span class="toggle-indicator" aria-hidden="true">+</span>
    </button>
    <div class="scholarship-content">
      <div class="card-topline">
        <span class="result-status status-${result.status.toLowerCase()}">${statusTitles[result.status]?.label || 'Result'}</span>
        <span class="card-state">${escapeHtml(scholarship.state || 'State not listed')}</span>
      </div>
      <p class="provider">${escapeHtml(scholarship.provider || 'Provider not listed')}</p>
      <div class="card-section">
        <span class="card-label">${result.status === 'ELIGIBLE' ? 'Why you match' : result.status === 'NOT_ELIGIBLE' ? 'Why this did not match' : 'What needs verification'}</span>
        ${criteriaList(result.status === 'ELIGIBLE' ? result.matchedCriteria : result.status === 'NOT_ELIGIBLE' ? result.failedCriteria : result.missingInformation, 'The source does not provide enough structured detail for a confident decision.')}
      </div>
      ${result.matchedCriteria.length && result.status !== 'ELIGIBLE' ? `<div class="card-section"><span class="card-label">Matched criteria</span>${criteriaList(result.matchedCriteria, '')}</div>` : ''}
      <div class="card-section source-copy">
        <span class="card-label">Scholarship details</span>
        <p><strong>Department:</strong> ${escapeHtml(scholarship.provider || 'Not listed')}</p>
        <p><strong>Classification:</strong> ${escapeHtml(scholarship.classification || 'Not listed')}</p>
        <p><strong>Eligibility:</strong> ${escapeHtml(scholarship.eligibility || 'Not listed')}</p>
        <p><strong>Benefits:</strong> ${escapeHtml(scholarship.benefits || 'Not listed')}</p>
      </div>
      <div class="card-actions">
        ${portal ? `<a class="button button-primary button-small" href="${escapeHtml(portal)}" target="_blank" rel="noopener noreferrer">Apply officially ↗</a>` : '<span class="card-muted">No official portal listed</span>'}
        <span class="source-label">Source: Google Sheet</span>
      </div>
    </div>
  </article>`;
}
function visibleResults() {
  const state = document.querySelector('[data-state-filter]')?.value || '';
  return allResults.filter((result) => {
    const scholarship = result.scholarship;
    return (activeStatus === 'ALL' || result.status === activeStatus) && (!state || String(scholarship.state || '').trim().toLowerCase() === state.trim().toLowerCase());
  });
}
function renderResults() {
  const results = visibleResults();
  const grid = document.querySelector('[data-scholarship-grid]');
  if (!grid) return;

  const visibleStatuses = activeStatus === 'ALL' ? ['ELIGIBLE', 'NEEDS_VERIFICATION', 'NOT_ELIGIBLE'] : [activeStatus];
  const grouped = visibleStatuses.map((status) => {
    const items = results.filter((result) => result.status === status);
    return `
      <section class="result-group result-group--${statusTitles[status]?.tone || 'default'}" data-group-status="${status}">
        <button class="result-group-header" type="button" data-group-header="${status}">
          <span>${statusTitles[status]?.label || 'Result'}</span>
          <span class="result-group-count">${items.length}</span>
        </button>
        <div class="result-group-body">
          ${items.length ? items.map(resultCard).join('') : '<p class="group-empty">No scholarships in this group.</p>'}
        </div>
      </section>
    `;
  }).join('');

  grid.innerHTML = grouped;

  grid.querySelectorAll('[data-card-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const article = button.closest('.scholarship-card');
      const allCards = grid.querySelectorAll('.scholarship-card');
      allCards.forEach((card) => {
        if (card !== article) card.classList.remove('is-open');
      });
      article.classList.toggle('is-open');
    });
  });

  grid.querySelectorAll('[data-group-header]').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.closest('.result-group');
      group.classList.toggle('is-collapsed');
    });
  });

  setResultsMessage(results.length ? `${results.length} scholarship result${results.length === 1 ? '' : 's'} shown.` : 'No scholarships could be matched with the information currently available.', results.length ? 'is-ready' : 'is-empty');
}
function updateCounts() {
  document.querySelector('[data-results-count]').textContent = allResults.length;
  ['ALL', 'ELIGIBLE', 'NEEDS_VERIFICATION', 'NOT_ELIGIBLE'].forEach((status) => {
    const count = status === 'ALL' ? allResults.length : allResults.filter((result) => result.status === status).length;
    const element = document.querySelector(`[data-tab-count="${status}"]`);
    if (element) element.textContent = count;
  });
}
async function loadEligibility() {
  const client = window.beAScholarSupabase;
  if (!client) { setResultsMessage('Supabase is not configured.', 'is-error'); return; }
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) { window.location.href = 'login.html'; return; }
  const { data: profile, error: profileError } = await client.from('users').select('date_of_birth, gender, state, category, annual_family_income, education_level, course, academic_performance, scholar_type, disability, minority, residence_type').eq('id', user.id).single();
  if (profileError) { setResultsMessage('Your saved profile could not be loaded. Please return to your profile and try again.', 'is-error'); return; }
  try {
    const scholarships = await window.scholarshipService.fetchScholarships();
    allResults = scholarships.map((scholarship) => window.eligibilityEngine.evaluateScholarship(profile, scholarship));
    const stateFilter = document.querySelector('[data-state-filter]');
    if (stateFilter) {
      const knownStates = [...new Set(scholarships.map((scholarship) => String(scholarship.state || '').trim()).filter(Boolean))];
      stateFilter.innerHTML = '<option value="">All states</option>' + knownStates.map((state) => `<option value="${escapeHtml(state)}">${escapeHtml(state)}</option>`).join('');
      stateFilter.value = '';
    }
    updateCounts();
    renderResults();
  } catch (error) { setResultsMessage('Scholarship information is temporarily unavailable. Please try again later.', 'is-error'); }
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-status-filter]').forEach((button) => button.addEventListener('click', () => { activeStatus = button.dataset.statusFilter; document.querySelectorAll('[data-status-filter]').forEach((item) => item.classList.toggle('is-active', item === button)); renderResults(); }));
  document.querySelector('[data-state-filter]')?.addEventListener('change', renderResults);
  document.querySelector('[data-logout]')?.addEventListener('click', async () => { await logout(); window.location.href = 'login.html'; });
  loadEligibility();
});
