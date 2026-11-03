/* ─────────────────────────────────────────────────────────────
   ¿A QUIÉN AVISA EL CRON, Y A QUÉ HORA?  ·  historias #69 y #95

     npm run test:cron

   POR QUÉ EXISTE:

     «El reloj de los avisos corrió a las 10 p.m. y dijo: sin
      credenciales de Firestore todavía; no se puede saber a quién
      avisar.»

   Y el registro decía la verdad a medias. No era solo que faltara una
   llave: `suscripcionesPendientes` devolvía lista vacía SIEMPRE, con
   credenciales y sin ellas. Poner el secreto habría cambiado el
   mensaje del log y nada más.

   ── EL FALLO QUE ESTA BATERÍA EXISTE PARA CAZAR ─────────────

   El cron corre en UTC. La hora del recordatorio es la del reloj de
   quien lee. Si esa traducción se hace mal, NO HAY ERROR: los avisos
   salen, llegan, y aparecen a las cuatro de la mañana. Quien los
   recibe apaga las notificaciones para siempre y nadie se entera de
   por qué.

   Por eso casi todo lo de aquí abajo mira la misma cosa desde ángulos
   distintos: a las 21:00 de Bogotá sí, a las 21:00 UTC no.

   ── Y LA OTRA MITAD: QUIÉN PUEDE ESCRIBIR QUÉ ───────────────

   El `uid` sale del token verificado, nunca del cuerpo de la
   petición. Si saliera del cuerpo, cualquiera con una cuenta podría
   borrarle los avisos a otra persona. Eso se comprueba abajo
   mandando un uid ajeno a propósito.
   ───────────────────────────────────────────────────────────── */

import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { momentoEn } = await import('../worker/reloj.js');
const { suscripcionesPendientes, manejarSuscripcion, idDeSub } = await import('../worker/index.js');

/* Una petición de mentira con su token, y un verificador que siempre
   dice que es Laura. Lo que se prueba NO es la verificación del JWT
   —eso es de la #53— sino que el uid que acaba en la clave es el que
   sale de ella y no el que venga escrito en el cuerpo. */
const comoLaura = (cuerpo, env, quien = 'laura') => manejarSuscripcion(
  { headers: { get: () => 'Bearer un-token' } }, cuerpo, env, '*', async () => quien,
);

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
const ok = (nombre, condicion, detalle = '') => {
  if (condicion) { pasaron += 1; console.log(`  ✓ ${nombre}`); }
  else { fallaron += 1; console.log(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ''}`); }
};

/* ── UN KV DE MENTIRA ────────────────────────────────────────
   Con `list` paginado de verdad, porque el cursor es justo la clase
   de cosa que funciona con tres suscripciones y falla en silencio con
   mil y una. */
function kvFalso(inicial = {}, { porPagina = 1000 } = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    datos,
    async get(k) { return datos.has(k) ? datos.get(k) : null; },
    async put(k, v) { datos.set(k, v); },
    async delete(k) { datos.delete(k); },
    async list({ prefix = '', cursor } = {}) {
      const todas = [...datos.keys()].filter((k) => k.startsWith(prefix)).sort();
      const desde = cursor ? Number(cursor) : 0;
      const trozo = todas.slice(desde, desde + porPagina);
      const fin = desde + porPagina >= todas.length;
      return {
        keys: trozo.map((name) => ({ name })),
        list_complete: fin,
        cursor: fin ? null : String(desde + porPagina),
      };
    },
  };
}

const sub = (extra = {}) => JSON.stringify({
  uid: 'laura',
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  p256dh: 'clave-publica',
  auth: 'secreto',
  tz: 'America/Bogota',
  activo: true,
  dias: [0, 1, 2, 3, 4, 5, 6],
  hora: 21,            // las nueve de la noche, en Bogotá
  ultimoDiaLeido: '',
  avisado: '',
  ...extra,
});

/* 2026-11-03T02:00:00Z = 2026-11-02, 21:00 en Bogotá (UTC-5), un lunes. */
const LAS_NUEVE_EN_BOGOTA = new Date('2026-11-03T02:00:00Z');
/* La misma hora de reloj, pero en UTC: en Bogotá son las 16:00. */
const LAS_NUEVE_EN_UTC = new Date('2026-11-02T21:00:00Z');

/* ── EL RELOJ ────────────────────────────────────────────────── */

grupo('QUÉ HORA ES DONDE LEE CADA QUIEN');

{
  const m = momentoEn('America/Bogota', LAS_NUEVE_EN_BOGOTA);
  ok('las 02:00 UTC son las 21:00 en Bogotá', m.getHours() === 21, `dio ${m.getHours()}`);
  ok('y es el día ANTERIOR', m.getDate() === 2, `dio día ${m.getDate()}`);
  /* `getMonth()` cuenta desde 0 y el formateador desde 1. Olvidar ese
     «-1» desplaza todos los días un mes, y como `claveDia` solo se
     compara consigo misma, el fallo no da la cara: simplemente nadie
     «ha leído hoy» nunca. */
  ok('el mes viene en base 0, como manda Date', m.getMonth() === 10, `dio ${m.getMonth()}`);
  ok('y el día de la semana es el lunes', m.getDay() === 1, `dio ${m.getDay()}`);
}

ok('UTC se lee como UTC', momentoEn('UTC', LAS_NUEVE_EN_BOGOTA).getHours() === 2);
ok('un huso que no existe no revienta: cae a UTC',
  momentoEn('Marte/Olympus', LAS_NUEVE_EN_BOGOTA).getHours() === 2,
  'un huso mal escrito dejaría a esa persona sin ningún aviso, para siempre');

/* NO DEPENDE DE DÓNDE CORRAN LAS PRUEBAS. Es la trampa del desfase
   sumado: un `new Date(ahora + offset)` pasa en una máquina en UTC y
   falla en un portátil en Madrid, y eso convierte el CI en una
   lotería. */
ok('Y DA LO MISMO LA ZONA DE LA MÁQUINA',
  momentoEn('America/Bogota', LAS_NUEVE_EN_BOGOTA).getHours() === 21,
  `esta máquina está en ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

/* ── A QUIÉN LE TOCA ─────────────────────────────────────────── */

grupo('A QUIÉN LE TOCA AHORA MISMO');

const pendientes = async (fichas, ahora, opciones) => {
  const AGENTE = kvFalso(fichas, opciones);
  return { lista: await suscripcionesPendientes({ AGENTE }, ahora), AGENTE };
};

{
  const { lista } = await pendientes({ 'sub:laura:abc': sub() }, LAS_NUEVE_EN_BOGOTA);
  ok('A SU HORA, SÍ', lista.length === 1, `salieron ${lista.length}`);
  ok('y el aviso va con su dirección y sus claves',
    lista[0]?.sub?.endpoint?.startsWith('https://') && Boolean(lista[0]?.sub?.auth));
  ok('y el día que se apunta es el SUYO, no el de UTC',
    lista[0]?.dia === '2026-11-02', `apuntó ${lista[0]?.dia}`);
}

{
  const { lista } = await pendientes({ 'sub:laura:abc': sub() }, LAS_NUEVE_EN_UTC);
  ok('A LAS NUEVE DE UTC, NO — EN BOGOTÁ SON LAS CUATRO DE LA TARDE',
    lista.length === 0,
    'este es EL fallo: el aviso llega, pero a la hora equivocada, y nadie ve un error');
}

{
  const { lista } = await pendientes(
    { 'sub:laura:abc': sub({ ultimoDiaLeido: '2026-11-02' }) }, LAS_NUEVE_EN_BOGOTA,
  );
  ok('si ya leyó hoy, no se le recuerda que lea', lista.length === 0);
}

{
  /* Y el «hoy» de esa comprobación es el suyo. Con el día de UTC
     —el 3— la app diría «ya leíste» y el cron no se enteraría. */
  const { lista } = await pendientes(
    { 'sub:laura:abc': sub({ ultimoDiaLeido: '2026-11-03' }) }, LAS_NUEVE_EN_BOGOTA,
  );
  ok('y «hoy» es su hoy, no el del servidor', lista.length === 1,
    'descartó a quien leyó el día 3 en UTC, que para ella todavía no ha llegado');
}

{
  const { lista } = await pendientes(
    { 'sub:laura:abc': sub({ avisado: '2026-11-02' }) }, LAS_NUEVE_EN_BOGOTA,
  );
  ok('como mucho un aviso al día', lista.length === 0);
}

{
  const { lista } = await pendientes(
    { 'sub:laura:abc': sub({ activo: false }) }, LAS_NUEVE_EN_BOGOTA,
  );
  ok('apagado es apagado', lista.length === 0,
    'si esto falla, apagar el recordatorio en Ajustes no apaga nada');
}

{
  /* El 2026-11-02 es lunes (getDay 1). Con la semana puesta en sábados
     y domingos, hoy no toca. */
  const { lista } = await pendientes(
    { 'sub:laura:abc': sub({ dias: [0, 6] }) }, LAS_NUEVE_EN_BOGOTA,
  );
  ok('y los días que eligió se respetan', lista.length === 0);
}

{
  /* MIL Y UNA. KV pagina de 1000 en 1000: sin seguir el cursor, la
     última se queda sin aviso y no hay ni error ni log que lo diga. */
  const muchas = {};
  for (let i = 0; i < 1001; i += 1) muchas[`sub:laura:${String(i).padStart(5, '0')}`] = sub();
  const { lista } = await pendientes(muchas, LAS_NUEVE_EN_BOGOTA);
  ok('SE SIGUE EL CURSOR DE KV HASTA EL FINAL',
    lista.length === 1001,
    `salieron ${lista.length} de 1001: a partir de mil, silencio sin error`);
}

{
  const lista = await suscripcionesPendientes({}, LAS_NUEVE_EN_BOGOTA);
  ok('sin KV no inventa nada', Array.isArray(lista) && lista.length === 0);
}

/* ── QUIÉN PUEDE ESCRIBIR QUÉ ────────────────────────────────── */

grupo('EL UID SALE DEL TOKEN, NO DEL CUERPO');

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';
const respuesta = async (r) => ({ estado: r.status, cuerpo: await r.json() });

{
  const AGENTE = kvFalso();
  const r = await comoLaura({
    accion: 'guardar-sub',
    endpoint: ENDPOINT,
    /* El cuerpo DICE que es de otra persona. Se ignora. */
    uid: 'otra-persona',
    ficha: { p256dh: 'pub', auth: 'sec', tz: 'America/Bogota', activo: true, dias: [1], hora: 21 },
  }, { AGENTE });
  const { estado } = await respuesta(r);
  const claves = [...AGENTE.datos.keys()];
  ok('guardar funciona', estado === 200);
  ok('Y SE GUARDA BAJO EL UID DEL TOKEN',
    claves.length === 1 && claves[0].startsWith('sub:laura:'),
    `quedó en ${claves[0]}`);
  ok('no bajo el que venía en el cuerpo',
    !claves[0].includes('otra-persona'),
    'cualquiera con una cuenta podría escribirle avisos a otra persona');
}

{
  /* Y al revés: no puedo borrar lo de otra persona mandando su uid. */
  const idAjeno = await idDeSub(ENDPOINT);
  const AGENTE = kvFalso({ [`sub:ana:${idAjeno}`]: sub({ uid: 'ana' }) });
  await comoLaura({ accion: 'borrar-sub', endpoint: ENDPOINT, uid: 'ana' }, { AGENTE });
  ok('NI SE LE PUEDEN BORRAR',
    AGENTE.datos.has(`sub:ana:${idAjeno}`),
    'la suscripción de Ana desapareció porque Laura mandó su uid en el cuerpo');
}

{
  const AGENTE = kvFalso({
    'sub:laura:1': sub(), 'sub:laura:2': sub(), 'sub:ana:1': sub({ uid: 'ana' }),
  });
  await comoLaura({ accion: 'olvidar-subs' }, { AGENTE });
  ok('borrar la cuenta se lleva TODOS sus dispositivos',
    !AGENTE.datos.has('sub:laura:1') && !AGENTE.datos.has('sub:laura:2'));
  ok('y ninguno de nadie más', AGENTE.datos.has('sub:ana:1'));
}

{
  /* Actualizar la ficha NO puede reiniciar el «ya avisé hoy»: abrir la
     app después de recibir el aviso provocaría un segundo aviso. */
  const id = await idDeSub(ENDPOINT);
  const AGENTE = kvFalso({ [`sub:laura:${id}`]: sub({ avisado: '2026-11-02' }) });
  await comoLaura({
    accion: 'guardar-sub',
    endpoint: ENDPOINT,
    ficha: { p256dh: 'pub', auth: 'sec', tz: 'America/Bogota', activo: true, dias: [1], hora: 21 },
  }, { AGENTE });
  const guardada = JSON.parse(AGENTE.datos.get(`sub:laura:${id}`));
  ok('actualizar la ficha conserva el «ya avisé hoy»',
    guardada.avisado === '2026-11-02',
    'si se reinicia, abrir la app después del aviso da pie a un segundo aviso');
}

{
  const r = await comoLaura(
    { accion: 'guardar-sub', endpoint: ENDPOINT, ficha: { p256dh: 'p', auth: 'a' } }, {},
  );
  const { estado, cuerpo } = await respuesta(r);
  ok('sin KV lo dice en vez de aceptarlo y perderlo',
    estado === 503 && cuerpo.error === 'sin-almacen',
    `dio ${estado} ${JSON.stringify(cuerpo)}`);
}

{
  const AGENTE = kvFalso();
  const r = await comoLaura(
    { accion: 'guardar-sub', endpoint: 'javascript:alert(1)', ficha: { p256dh: 'p', auth: 'a' } },
    { AGENTE },
  );
  ok('una dirección que no es https se rechaza', (await respuesta(r)).estado === 400);
}

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.\n`);
process.exit(fallaron ? 1 : 0);
