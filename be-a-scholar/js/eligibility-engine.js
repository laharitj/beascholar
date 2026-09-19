const EDUCATION_ALIASES = { '10th': ['10th', 'class 10', 'sslc'], '12th': ['12th', 'class 12', 'puc', 'intermediate', 'higher secondary'], diploma: ['diploma', 'polytechnic', 'iti'], ug: ['ug', 'degree', 'undergraduate', 'bachelor', 'college'], pg: ['pg', 'postgraduate', 'master', 'mphil', 'phd', 'doctoral'] };
const CATEGORY_ALIASES = { OBC: ['obc', 'bc', 'ebc', 'backward classes', 'sebc', 'vjnt', 'sbc'], SC: ['sc', 'scheduled caste'], ST: ['st', 'scheduled tribe'], EWS: ['ews'], General: ['general', 'open'] };
const SPECIAL_REQUIREMENTS = /attendance|admitted via|cap round|jan aadhaar|registered profile|board exam|top \d|rank|unmarried|girls?|female|marginal farmer|manual scavenger|hiv|disaster|distress|distance from|foreign universit|regular attendance|speciall?y abled/i;
function normalize(value) { return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function containsTerm(text, term) { if (term.includes(' ')) return text.includes(term); return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text); }
function criterionResult(label, status, detail) { return { label, status, detail }; }
function formatIncome(value) { return `₹${Number(value).toLocaleString('en-IN')}`; }
function parseIncomeLimits(text) { const limits = []; for (const match of text.matchAll(/(?:income|lpa)[^₹\d]{0,30}₹?\s*([\d,.]+)\s*(lpa|lakhs?|lakh)?/gi)) { let amount = Number(match[1].replace(/,/g, '')); if (match[2]?.toLowerCase().startsWith('l')) amount *= 100000; if (amount > 0) limits.push(amount); } return limits; }
function studentEducationMatches(text, education) { return (EDUCATION_ALIASES[education] || []).some((term) => text.includes(term)); }
function evaluateScholarship(student, scholarship) {
  const targetText = normalize(`${scholarship.state} ${scholarship.target} ${scholarship.eligibility} ${scholarship.category}`);
  const matchedCriteria = [], failedCriteria = [], missingInformation = [];
  const state = normalize(student.state), education = normalize(student.education_level || student.class_level), performance = Number.parseFloat(String(student.academic_performance || '').replace(',', '.'));
  const categoryTerms = CATEGORY_ALIASES[student.category] || [];
  if (state) matchedCriteria.push(criterionResult('State / domicile', 'matched', `${student.state} is the selected profile state.`));
  if (categoryTerms.length && categoryTerms.some((term) => containsTerm(targetText, term))) matchedCriteria.push(criterionResult('Category', 'matched', `The scholarship includes ${student.category} eligibility.`));
  else if (/\b(sc|st|obc|bc|ebc|ews|sebc|vjnt|sbc)\b|scheduled caste|scheduled tribe|backward classes/i.test(targetText)) failedCriteria.push(criterionResult('Category', 'failed', `The documented category does not match ${student.category || 'the profile'}.`));
  const incomeLimits = parseIncomeLimits(targetText);
  if (incomeLimits.length && Number.isFinite(Number(student.annual_family_income))) { const limit = Math.min(...incomeLimits); if (Number(student.annual_family_income) <= limit) matchedCriteria.push(criterionResult('Family income', 'matched', `${formatIncome(student.annual_family_income)} is within the documented limit of ${formatIncome(limit)}.`)); else failedCriteria.push(criterionResult('Family income', 'failed', `${formatIncome(student.annual_family_income)} exceeds the documented limit of ${formatIncome(limit)}.`)); }
  else if (/income|lpa|family earnings|parental income/i.test(targetText)) missingInformation.push(criterionResult('Family income', 'missing', 'The income rule needs verification.'));
  if (education && studentEducationMatches(targetText, education)) matchedCriteria.push(criterionResult('Education level', 'matched', `${student.education_level || student.class_level} matches the scholarship wording.`));
  else if (/class 10|class 12|puc|college|degree|ug|pg|diploma|professional|intermediate/i.test(targetText)) missingInformation.push(criterionResult('Education level', 'missing', 'The education condition needs verification.'));
  const percentages = [...targetText.matchAll(/(?:min(?:imum)?|scored|securing|marks)[^\d]{0,15}(\d+(?:\.\d+)?)\s*%/gi)].map((match) => Number(match[1]));
  if (percentages.length && Number.isFinite(performance)) { const minimum = Math.max(...percentages); if (performance >= minimum) matchedCriteria.push(criterionResult('Academic performance', 'matched', `${student.academic_performance} meets the documented minimum of ${minimum}%.`)); else failedCriteria.push(criterionResult('Academic performance', 'failed', `${student.academic_performance} is below the documented minimum of ${minimum}%.`)); }
  else if (/\d+%|marks|merit|distinction|percentile/i.test(targetText)) missingInformation.push(criterionResult('Academic performance', 'missing', 'The academic requirement needs verification.'));
  if (SPECIAL_REQUIREMENTS.test(targetText)) missingInformation.push(criterionResult('Additional conditions', 'missing', 'The scholarship includes additional conditions requiring verification.'));
  const status = failedCriteria.length ? 'NOT_ELIGIBLE' : missingInformation.length ? 'NEEDS_VERIFICATION' : 'ELIGIBLE';
  return { scholarship, status, matchedCriteria, failedCriteria, missingInformation };
}
window.eligibilityEngine = { evaluateScholarship };
