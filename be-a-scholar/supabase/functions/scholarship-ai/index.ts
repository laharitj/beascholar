import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'npm:@google/genai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const SYSTEM_INSTRUCTION = `You are a scholarship information assistant. Use only the supplied scholarship data and deterministic eligibility result. Never recalculate, change, or override the supplied eligibility status. Never invent criteria, deadlines, amounts, URLs, government rules, or application procedures. If information is absent or ambiguous, say: "I don't have enough information in the available scholarship data to confirm this." Keep the response short, clear, student-friendly, and structured. Always preserve the status exactly as supplied and recommend checking the official portal for current information.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function cleanText(value: unknown, max = 6000) { return String(value ?? '').slice(0, max); }
function validStatus(value: unknown) { return ['ELIGIBLE', 'NOT_ELIGIBLE', 'NEEDS_VERIFICATION'].includes(String(value)); }
function validateContext(body: Record<string, unknown>) {
  if (body.userQuestion) {
    if (!String(body.userQuestion).trim() || !body.studentProfile || !Array.isArray(body.scholarships)) throw new Error('Incomplete assistant context.');
    return;
  }
  if (!body.mode || !['explanation', 'chat'].includes(String(body.mode))) throw new Error('Invalid AI request mode.');
  if (body.mode === 'explanation') {
    const result = body.eligibilityResult as Record<string, unknown>;
    const scholarship = body.scholarship as Record<string, unknown>;
    if (!result || !validStatus(result.status) || !scholarship?.name) throw new Error('Incomplete scholarship context.');
  } else if (!String(body.question || '').trim() || !body.context) {
    throw new Error('Incomplete assistant context.');
  }
}
function buildPrompt(body: Record<string, unknown>) {
  if (body.userQuestion) {
    return `Answer the student's question using only the supplied scholarship data and profile. Do not recalculate eligibility or make unsupported recommendations.\n\nSTUDENT PROFILE:\n${cleanText(JSON.stringify(body.studentProfile), 4000)}\n\nALL SCHOLARSHIPS:\n${cleanText(JSON.stringify(body.scholarships), 14000)}\n\nMATCHED SCHOLARSHIPS:\n${cleanText(JSON.stringify(body.eligibleScholarships), 7000)}\n\nPOTENTIAL SCHOLARSHIPS:\n${cleanText(JSON.stringify(body.potentialScholarships), 7000)}\n\nNOT MATCHED SCHOLARSHIPS:\n${cleanText(JSON.stringify(body.notMatchedScholarships), 7000)}\n\nSTUDENT QUESTION:\n${cleanText(body.userQuestion, 1000)}`;
  }
  if (body.mode === 'chat') {
    return `Answer the student's question using only the supplied page context. Do not recalculate eligibility or make unsupported recommendations.\n\nPAGE CONTEXT:\n${cleanText(JSON.stringify(body.context), 14000)}\n\nSTUDENT QUESTION:\n${cleanText(body.question, 1000)}`;
  }
  const result = body.eligibilityResult as Record<string, unknown>;
  return `Explain this deterministic eligibility result. Keep the supplied status unchanged.\n\nSTUDENT ELIGIBILITY DATA:\n${cleanText(JSON.stringify(body.studentEligibilityData), 4000)}\n\nSCHOLARSHIP DATA:\n${cleanText(JSON.stringify(body.scholarship), 7000)}\n\nELIGIBILITY ENGINE RESULT:\nStatus: ${cleanText(result.status, 40)}\nMatched criteria: ${cleanText(JSON.stringify(result.matchedCriteria), 3000)}\nFailed criteria: ${cleanText(JSON.stringify(result.failedCriteria), 3000)}\nMissing information: ${cleanText(JSON.stringify(result.missingInformation), 3000)}\n\nUse headings: Eligibility Status, Why, Criteria you meet, Criteria not met, Things to verify, Important. Omit empty sections. Always state that the official portal should be checked for current information.`;
}
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required.' }, 401);
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) return json({ error: 'Supabase function authentication is not configured.' }, 503);
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Authentication required.' }, 401);
    const body = await request.json();
    validateContext(body);
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'AI is not configured. Add GEMINI_API_KEY to the scholarship-ai Edge Function secrets.' }, 503);
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: buildPrompt(body),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
        maxOutputTokens: 700
      }
    });
    const text = response.text?.trim();
    if (!text) return json({ error: 'Gemini returned an empty response.' }, 502);
    return json({ text });
  } catch (error) {
    const providerStatus = Number((error as { status?: number; statusCode?: number })?.statusCode || (error as { status?: number })?.status || 0);
    const status = providerStatus === 429 ? 429 : providerStatus >= 400 && providerStatus < 500 ? 400 : 502;
    const message = error instanceof Error ? error.message : 'AI request failed.';
    console.error('scholarship-ai request failed', { status: providerStatus || status, message });
    return json({ error: providerStatus ? `Gemini request failed with status ${providerStatus}.` : message, details: message.slice(0, 1000) }, status);
  }
});
