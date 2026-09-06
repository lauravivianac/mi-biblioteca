/* ─────────────────────────────────────────────────────────────
   PROXY DE DEEPSEEK  ·  historias #53, #54, #55, #56

   La app es HTML estático: cualquier key dentro del cliente es
   visible con F12 y se agota en horas. Aquí vive la key, como
   secreto del entorno, y nunca sale de este Worker.

   DESPLEGAR:
     cd worker
     npx wrangler secret put DEEPSEEK_API_KEY     ← pega la key aquí
     npx wrangler deploy

   La key NO va en wrangler.toml ni en ningún archivo del repo.
   ───────────────────────────────────────────────────────────── */

const FIREBASE_PROJECT = 'mi-biblioteca-7a3a5';
const CERTS = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

/* Lista blanca. Cualquier otra cosa se rechaza ANTES de gastar un
   solo token: es la capa que de verdad sostiene los guardrails,
   mucho más que el prompt. */
const INTENTS = {
  identify_book: {
    maxInput: 600,
    system:
      'Identificas libros a partir del texto de una portada, que viene sucio de un OCR. ' +
      'Respondes SOLO con JSON: {"title":"...","author":"...","confidence":0..1}. ' +
      'Si no reconoces un libro real, devuelves {"title":null,"author":null,"confidence":0}. ' +
      'Nunca inventas un libro que no exista. No añades texto fuera del JSON.',
  },
};

/* ── LÍMITES ─────────────────────────────────────────────────── */
const DAILY_LIMIT = 20;      // por usuaria
const buckets = new Map();   // uid -> { day, count }

function withinLimit(uid) {
  const day = new Date().toISOString().slice(0, 10);
  const b = buckets.get(uid);
  if (!b || b.day !== day) { buckets.set(uid, { day, count: 1 }); return true; }
  if (b.count >= DAILY_LIMIT) return false;
  b.count++;
  return true;
}

/* ── VERIFICACIÓN DEL TOKEN ──────────────────────────────────── */

const b64url = (s) => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(pad + '='.repeat((4 - pad.length % 4) % 4)), (c) => c.charCodeAt(0));
};

let certCache = { at: 0, keys: null };

async function certs() {
  if (certCache.keys && Date.now() - certCache.at < 3600_000) return certCache.keys;
  const r = await fetch(CERTS);
  certCache = { at: Date.now(), keys: await r.json() };
  return certCache.keys;
}

/**
 * Verifica el token de Firebase con las claves públicas de Google.
 * Sin esto, el proxy protege la key pero deja el gasto abierto a
 * cualquiera que descubra la URL.
 */
async function verifyToken(jwt) {
  const [h, p, s] = String(jwt || '').split('.');
  if (!h || !p || !s) return null;

  const header = JSON.parse(new TextDecoder().decode(b64url(h)));
  const payload = JSON.parse(new TextDecoder().decode(b64url(p)));

  if (payload.aud !== FIREBASE_PROJECT) return null;
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT}`) return null;
  if (payload.exp * 1000 < Date.now()) return null;
  if (!payload.sub) return null;

  const pem = (await certs())[header.kid];
  if (!pem) return null;

  const der = b64url(
    pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s/g, '')
  );
  const key = await crypto.subtle.importKey(
    'spki', extractSpki(der),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(`${h}.${p}`),
  );
  return valid ? payload.sub : null;
}

/** Saca la clave pública del certificado X.509. */
function extractSpki(der) {
  // La clave pública es el último SEQUENCE con el OID de RSA; se localiza por patrón.
  const marker = [0x30, 0x82];
  for (let i = der.length - 300; i > 0; i--) {
    if (der[i] === marker[0] && der[i + 1] === marker[1]) {
      const len = (der[i + 2] << 8) + der[i + 3] + 4;
      if (i + len <= der.length && der[i + 6] === 0x2a) return der.slice(i, i + len);
    }
  }
  return der;
}

/* ── LIMPIEZA DE ENTRADA ─────────────────────────────────────── */

const INJECTION = /ignora|olvida|forget|ignore|system\s*prompt|act[úu]a como|act as|jailbreak|instruc/i;

/** El texto de una portada es DATO, no instrucción. */
function sanitize(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
  return INJECTION.test(t) ? t.replace(INJECTION, '') : t;
}

/* ── WORKER ──────────────────────────────────────────────────── */

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors(origin) },
  });

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') || '';
    const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || '';

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(allowOrigin) });
    if (request.method !== 'POST') return json({ error: 'method' }, 405, allowOrigin);
    if (allowed.length && !allowed.includes(origin)) return json({ error: 'origin' }, 403, allowOrigin);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'json' }, 400, allowOrigin); }

    const spec = INTENTS[body.intent];
    if (!spec) return json({ error: 'intent-no-permitido' }, 400, allowOrigin);

    const uid = await verifyToken((request.headers.get('Authorization') || '').replace(/^Bearer /, ''));
    if (!uid) return json({ error: 'sin-sesion' }, 401, allowOrigin);

    if (!withinLimit(uid)) {
      return json({ error: 'limite-diario', message: `Máximo ${DAILY_LIMIT} consultas al día. Se renueva mañana.` }, 429, allowOrigin);
    }

    const text = sanitize(body.text, spec.maxInput);
    if (!text) return json({ error: 'sin-texto' }, 400, allowOrigin);

    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: spec.system },
          { role: 'user', content: text },
        ],
        max_tokens: 200,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!r.ok) return json({ error: 'proveedor', status: r.status }, 502, allowOrigin);

    const data = await r.json();
    let out;
    try { out = JSON.parse(data.choices?.[0]?.message?.content || '{}'); }
    catch { return json({ error: 'respuesta-ilegible' }, 502, allowOrigin); }

    // La salida se valida contra lo esperado antes de devolverse
    return json({
      title: typeof out.title === 'string' ? out.title.slice(0, 200) : null,
      author: typeof out.author === 'string' ? out.author.slice(0, 120) : null,
      confidence: Number.isFinite(out.confidence) ? Math.max(0, Math.min(1, out.confidence)) : 0,
    }, 200, allowOrigin);
  },
};
