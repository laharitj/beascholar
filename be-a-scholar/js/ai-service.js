class ScholarshipAIError extends Error {
  constructor(message, status, backendMessage, cause) {
    super(message);
    this.name = 'ScholarshipAIError';
    this.status = status;
    this.backendMessage = backendMessage;
    this.cause = cause;
  }
}

async function readFunctionError(error) {
  const response = error?.context;
  let backendMessage = error?.message || 'AI request failed.';
  if (response?.json) {
    try {
      const payload = await response.clone().json();
      backendMessage = payload?.error || payload?.message || backendMessage;
    } catch {
      try {
        const text = await response.clone().text();
        if (text) backendMessage = text;
      } catch {
        // Preserve the original SDK error when the response body cannot be read.
      }
    }
  }
  return new ScholarshipAIError(backendMessage, response?.status || error?.status || 0, backendMessage, error);
}

async function callScholarshipAI(payload) {
  const client = window.beAScholarSupabase;
  if (!client) throw new Error('Supabase is not configured.');
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new ScholarshipAIError('User session expired. Please log in again.', 401, 'No Supabase access token is available.');

  const response = await fetch(`${client.supabaseUrl}/functions/v1/scholarship-ai`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: client.supabaseKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  let data = null;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    const providerDetails = data?.details ? ` ${data.details}` : '';
    const backendMessage = `${data?.error || data?.message || response.statusText || 'AI request failed.'}${providerDetails}`;
    throw new ScholarshipAIError(backendMessage, response.status, backendMessage);
  }
  if (!data?.text) {
    const backendMessage = data?.error || 'AI returned an empty response.';
    throw new ScholarshipAIError(backendMessage, 200, backendMessage);
  }
  return data.text;
}

window.aiService = { callScholarshipAI };
