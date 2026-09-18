const EDUCATION_ALIASES = {
  '10th': ['10th', 'class 10', 'sslc'],
  '12th': ['12th', 'class 12', 'puc', 'intermediate', 'higher secondary'],
  diploma: ['diploma', 'polytechnic', 'iti'],
  ug: ['ug', 'degree', 'undergraduate', 'bachelor', 'college'],
  pg: ['pg', 'postgraduate', 'master', 'mphil', 'phd', 'doctoral']
};
const CATEGORY_ALIASES = { OBC: ['obc', 'bc', 'ebc', 'backward classes', 'sebc', 'vjnt', 'sbc'], SC: ['sc', 'scheduled caste'], ST: ['st', 'scheduled tribe'], EWS: ['ews'], General: ['general', 'open'] };
const SPECIAL_REQUIREMENTS = /attendance|admitted via|cap round|jan aadhaar|registered profile|board exam|top \d|rank|unmarried|girls?|female|marginal farmer|manual scavenger|hiv|disaster|distress|distance from|foreign universit|regular attendance|speciall?y abled/i;

function normalize(value) { return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function containsTerm(text, term) {
  if (term.includes(' ')) return text.includes(term);
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
}
function formatIncome(value) { return `₹${Number(value).toLocaleString('en-IN')}`; }
function parseIncomeLimits(text) {
  const limits = [];
  for (const match of text.matchAll(/(?:income|lpa)[^₹\d]{0,30}₹?\s*([\d,.]+)\s*(lpa|lakhs?|lakh)?/gi)) {
    let amount = Number(match[1].replace(/,/g, ''));
    if (match[2]?.toLowerCase().startsWith('l')) amount *= 100000;
    if (amount > 0) limits.push(amount);
  }
  return limits;
}
function studentEducationMatches(text, education) { return (EDUCATION_ALIASES[education] || []).some((term) => text.includes(term)); }
function criterionResult(label, status, detail) { return { label, status, detail }; }

function evaluateScholarship(student, scholarship) {
  const targetText = normalize(`${scholarship.target} ${scholarship.eligibility}`);
  const matchedCriteria = [];
  const failedCriteria = [];
  const missingInformation = [];
  const state = normalize(student.state);
  const category = normalize(student.category);
  const education = normalize(student.education_level);
  const course = normalize(student.course);
  const performance = Number.parseFloat(String(student.academic_performance || '').replace(',', '.'));

  if (state && targetText.includes(state)) matchedCriteria.push(criterionResult('State / domicile', 'matched', `The sheet mentions ${student.state}.`));
  else if (state && scholarship.state && normalize(scholarship.state) !== state && targetText.includes('domicile')) failedCriteria.push(criterionResult('State / domicile', 'failed', `The scholarship is listed for ${scholarship.state}.`));
  else if (targetText.includes('domicile') || targetText.includes('resident')) missingInformation.push(criterionResult('State / domicile', 'missing', 'The domicile condition needs manual verification against the detailed rule.'));

  const categoryTerms = CATEGORY_ALIASES[student.category] || [];
  if (categoryTerms.length && categoryTerms.some((term) => containsTerm(targetText, term))) matchedCriteria.push(criterionResult('Category', 'matched', `The sheet includes a ${student.category} category condition.`));
  else if (/\b(sc|st|obc|bc|ebc|ews|sebc|vjnt|sbc)\b|scheduled caste|scheduled tribe|backward classes/i.test(targetText) && !categoryTerms.some((term) => containsTerm(targetText, term))) failedCriteria.push(criterionResult('Category', 'failed', `The documented category condition does not match ${student.category || 'the profile'}.`));

  const incomeLimits = parseIncomeLimits(`${scholarship.target} ${scholarship.eligibility}`);
  if (incomeLimits.length > 1 && /rural|urban|district|area/i.test(targetText)) {
    missingInformation.push(criterionResult('Family income', 'missing', 'The source lists different income limits by location; this requires manual verification.'));
  } else if (incomeLimits.length && Number.isFinite(Number(student.annual_family_income))) {
    const limit = Math.min(...incomeLimits);
    if (Number(student.annual_family_income) <= limit) matchedCriteria.push(criterionResult('Family income', 'matched', `${formatIncome(student.annual_family_income)} is within the documented limit of ${formatIncome(limit)}.`));
    else failedCriteria.push(criterionResult('Family income', 'failed', `${formatIncome(student.annual_family_income)} exceeds the documented limit of ${formatIncome(limit)}.`));
  } else if (/income|lpa|family earnings|parental income/i.test(targetText)) missingInformation.push(criterionResult('Family income', 'missing', 'The income rule or student income could not be safely determined.'));

  if (education && studentEducationMatches(targetText, education)) matchedCriteria.push(criterionResult('Education level', 'matched', `The sheet mentions ${student.education_level}.`));
  else if (/class 12|puc|college|degree|ug|pg|diploma|professional|intermediate/i.test(targetText)) missingInformation.push(criterionResult('Education level', 'missing', 'The free-text education condition needs verification.'));

  if (course && targetText.includes(course)) matchedCriteria.push(criterionResult('Course / stream', 'matched', `The sheet mentions ${student.course}.`));
  else if (course && /engineering|medical|medicine|btech|mbbs|professional|course|degree/i.test(targetText)) missingInformation.push(criterionResult('Course / stream', 'missing', 'The course condition is described broadly and needs verification.'));

  const percentageMatches = [...targetText.matchAll(/(?:min(?:imum)?|scored|securing|marks)[^\d]{0,15}(\d+(?:\.\d+)?)\s*%/gi)].map((match) => Number(match[1]));
  if (percentageMatches.length && Number.isFinite(performance)) {
    const minimum = Math.max(...percentageMatches);
    if (performance >= minimum) matchedCriteria.push(criterionResult('Academic performance', 'matched', `${student.academic_performance} meets the documented minimum of ${minimum}%.`));
    else failedCriteria.push(criterionResult('Academic performance', 'failed', `${student.academic_performance} is below the documented minimum of ${minimum}%.`));
  } else if (/\d+%|marks|merit|distinction|percentile/i.test(targetText)) missingInformation.push(criterionResult('Academic performance', 'missing', 'The academic requirement needs verification against the source wording.'));

  if (SPECIAL_REQUIREMENTS.test(targetText)) missingInformation.push(criterionResult('Additional conditions', 'missing', 'The scholarship includes additional conditions that require manual verification.'));
  const status = failedCriteria.length ? 'NOT_ELIGIBLE' : missingInformation.length ? 'NEEDS_VERIFICATION' : 'ELIGIBLE';
  return { scholarship, status, matchedCriteria, failedCriteria, missingInformation };
}

window.eligibilityEngine = { evaluateScholarship };
