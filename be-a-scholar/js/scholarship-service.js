const SCHOLARSHIP_SHEET_ID = '1xYQ9MLnSfPOGQ_NoaFJ6WIVuqn2Yk4mE';
const SCHOLARSHIP_DATA_URL = `https://docs.google.com/spreadsheets/d/${SCHOLARSHIP_SHEET_ID}/gviz/tq?tqx=out:json`;

function parseGoogleVisualization(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Invalid Google Sheet response.');
  return JSON.parse(text.slice(start, end + 1));
}

function cellValue(cell) {
  if (!cell) return '';
  return String(cell.f ?? cell.v ?? '').trim();
}

function parseScholarshipRows(payload) {
  const rows = payload.table?.rows || [];
  const rowValues = rows.map((row) => (row.c || []).map(cellValue));
  const headerIndex = rowValues.findIndex((values) => values.includes('State') && values.includes('Scheme Name'));
  const headers = headerIndex >= 0 ? rowValues[headerIndex] : (payload.table?.cols || []).map((column) => String(column.label || '').trim());
  if (headers.length < 8) throw new Error('The scholarship sheet headers are incomplete.');
  return rowValues.slice(headerIndex + 1).map((values, index) => {
    const record = Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex] || '']));
    return {
      id: `sheet-row-${index + 1}`,
      state: record.State,
      name: record['Scheme Name'],
      target: record['Target Level & Student Group'],
      classification: record['Scholarship Classification'],
      eligibility: record['Detailed Eligibility Criteria (Income, Course & Merit)'],
      benefits: record['Financial Benefits & Fee Waivers'],
      officialPortal: record['Official State Application Portal'],
      provider: record['Nodal Government Department'],
      source: record['Official State Application Portal']
    };
  }).filter((record) => record.name || record.state || record.eligibility);
}

async function fetchScholarships() {
  const response = await fetch(SCHOLARSHIP_DATA_URL, { headers: { Accept: 'text/plain' } });
  if (!response.ok) throw new Error(`Scholarship source returned ${response.status}.`);
  const payload = parseGoogleVisualization(await response.text());
  return parseScholarshipRows(payload);
}

window.scholarshipService = { fetchScholarships };
