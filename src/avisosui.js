/* ─────────────────────────────────────────────────────────────
   LOS AVISOS, EN PANTALLA  ·  historia #95

   La decisión de qué llega y cuándo está en `push-core.js`, y la parte
   que toca el navegador —permiso, suscripción, guardar— en `push.js`.
   Aquí se pinta y se toca.

   ── EL PERMISO SE PIDE AQUÍ Y NO AL ABRIR LA APP ────────────

   Lo dice la historia: «pedir el permiso al abrir por primera vez es la
   forma segura de que digan que no». Es la misma decisión que se tomó
   con la ubicación en la hoja de sitios: se pide cuando ya sabes qué
   estás concediendo y por qué.

   ── Y SI EL NAVEGADOR YA DIJO QUE NO ────────────────────────

   Ese es un estado distinto de «apagado», y hay que decirlo. Con el
   permiso bloqueado, el interruptor no puede hacer nada: enseñarlo
   como si funcionara es prometer algo que no va a pasar, y quien lo
   toque va a pensar que la app está rota en vez de ir a los ajustes de
   su teléfono.
   ───────────────────────────────────────────────────────────── */

import {
  TIPOS_AVISO, silencioLegible, enSilencio, POR_QUE_NO_LLEGA, sePuedeAvisar,
} from './push-core.js';
import {
  pushDisponible, pushEncendido, pushDenegado, encenderPush, apagarPush,
} from './push.js';
import { misAvisos, setTipoAviso, setSilencio } from './store.js';
import { $, esc, toast, openSheet, closeSheet } from './ui.js';

export function openAvisos() {
  openSheet('avisos-overlay');
  pintarAvisos();
}

export const closeAvisos = (e) => {
  if (!e || e.target === $('avisos-overlay')) closeSheet('avisos-overlay');
};

/* Las horas que se pueden elegir para empezar y acabar el silencio. De
   hora en punto: nadie pone el modo no molestar a las 23:15. */
const HORAS = Array.from({ length: 24 }, (_, i) => i);

const POR_QUE_NO_SE_PUEDE = {
  'no-disponible': 'Este navegador no puede con las notificaciones, o este despliegue '
    + 'no las tiene configuradas.',
  'permiso-denegado': 'Dijiste que no al permiso. Para cambiarlo hay que ir a los ajustes '
    + 'de tu navegador o de tu teléfono: desde aquí ya no se puede volver a preguntar.',
  'sin-sesion': 'Hay que haber entrado para poder mandarte avisos.',
  'no-se-pudo-suscribir': 'No hemos podido suscribir este dispositivo. Vuelve a intentarlo.',
  'no-se-pudo-guardar': 'Nos suscribimos, pero no pudimos guardarlo. Vuelve a intentarlo.',
};

export function pintarAvisos() {
  const cuerpo = $('avisos-body');
  if (!cuerpo) return;

  const cfg = misAvisos();
  const encendido = pushEncendido();
  const denegado = pushDenegado();
  const ahoraCallado = enSilencio(cfg.silencio);

  if (!pushDisponible()) {
    cuerpo.innerHTML = `
      <p class="planner-hint">${esc(POR_QUE_NO_SE_PUEDE['no-disponible'])}</p>`;
    return;
  }

  cuerpo.innerHTML = `
    <p class="set-fineprint">
      Pocos, agrupados, y cada uno se apaga por su cuenta. Cinco comentarios
      son un aviso, no cinco.
    </p>

    ${denegado ? `
      <p class="planner-hint" style="margin-top:14px">
        ${esc(POR_QUE_NO_SE_PUEDE['permiso-denegado'])}
      </p>`
    : `
      <button class="${encendido ? 'btn-ghost' : 'btn-magic'} full" style="margin-top:14px"
              onclick="toggleAvisos()">
        ${encendido ? 'Apagar los avisos en este dispositivo' : 'Recibir avisos en este dispositivo'}
      </button>
      ${encendido ? '' : `
        <p class="set-fineprint" style="margin-top:8px">
          Te pediremos permiso al tocarlo. Se puede quitar cuando quieras.
        </p>`}`}

    ${encendido && !denegado ? `
      <div class="section-heading"><span class="section-heading-text">Qué avisos</span></div>
      <div class="set-card">
        ${TIPOS_AVISO.map((t) => `
          <div class="set-row">
            <div>
              <div class="set-row-title">${esc(t.label)}</div>
              <div class="set-row-sub">${esc(t.sub)}</div>
            </div>
            <button class="btn-mini ${cfg.tipos[t.id] ? 'activo' : ''}"
                    aria-pressed="${Boolean(cfg.tipos[t.id])}"
                    onclick="toggleTipoAviso('${esc(t.id)}')">
              ${cfg.tipos[t.id] ? 'Sí' : 'No'}
            </button>
          </div>`).join('')}
      </div>

      <div class="section-heading"><span class="section-heading-text">Horario de silencio</span></div>
      <div class="set-card">
        <div class="set-row">
          <div>
            <div class="set-row-title">No molestar</div>
            <div class="set-row-sub">${esc(silencioLegible(cfg.silencio))}${
  ahoraCallado ? ' · ahora mismo estás en silencio' : ''}</div>
          </div>
          <button class="btn-mini" onclick="toggleSilencio()">
            ${cfg.silencio.activo ? 'Quitar' : 'Poner'}
          </button>
        </div>
      </div>

      ${cfg.silencio.activo ? `
        <div class="frow" style="margin-top:10px">
          <div class="fg">
            <label class="flabel" for="sil-desde">Desde</label>
            <select class="fselect" id="sil-desde" onchange="setSilencioDesde(this.value)">
              ${HORAS.map((h) => `<option value="${h}" ${cfg.silencio.desde === h ? 'selected' : ''}
                >${String(h).padStart(2, '0')}:00</option>`).join('')}
            </select>
          </div>
          <div class="fg">
            <label class="flabel" for="sil-hasta">Hasta</label>
            <select class="fselect" id="sil-hasta" onchange="setSilencioHasta(this.value)">
              ${HORAS.map((h) => `<option value="${h}" ${cfg.silencio.hasta === h ? 'selected' : ''}
                >${String(h).padStart(2, '0')}:00</option>`).join('')}
            </select>
          </div>
        </div>
        ${/* La excepción hay que decirla, no esconderla: quien pone el
              recordatorio a las 23:30 tiene que saber que ese sí va a
              sonar, o el primero le va a parecer un fallo. */''}
        <p class="set-fineprint">
          El recordatorio de lectura sí llega en el silencio: esa hora la eliges tú.
        </p>` : ''}

      ${/* Lo que pasaría ahora mismo con un mensaje, que es el aviso más
            frecuente. Sin esto, un ajuste que no hace nada visible
            parece estropeado. */''}
      ${(() => {
    const r = sePuedeAvisar('mensaje', cfg);
    return r.mandar ? '' : `<p class="planner-hint hab-ahora">${esc(POR_QUE_NO_LLEGA[r.motivo] || '')}</p>`;
  })()}
    ` : ''}

    <p class="set-fineprint" style="margin-top:14px">
      El interruptor de arriba vale solo para ESTE dispositivo. Lo que elijas
      abajo vale para todos.
    </p>`;
}

/* ── LO QUE SE TOCA ──────────────────────────────────────────── */

export async function toggleAvisos() {
  if (pushEncendido()) {
    await apagarPush();
    pintarAvisos();
    return;
  }

  const motivo = await encenderPush();
  if (motivo) toast(POR_QUE_NO_SE_PUEDE[motivo] || 'No se pudo encender.', 'error');
  else toast('Listo. Te avisaremos en este dispositivo.');
  pintarAvisos();
}

export function toggleTipoAviso(tipo) {
  setTipoAviso(tipo, !misAvisos().tipos[tipo]);
  pintarAvisos();
}

export function toggleSilencio() {
  setSilencio({ activo: !misAvisos().silencio.activo });
  pintarAvisos();
}

/**
 * Las dos horas del silencio.
 *
 * Si acaban siendo la misma, la franja no significa nada —ni «todo el
 * día» ni «nada»— así que se corre la otra una hora. Es menos molesto
 * que rechazar el cambio: quien lo está tocando ve que se mueve algo y
 * entiende que esas dos no pueden coincidir.
 */
export function setSilencioDesde(v) {
  const desde = Number(v);
  const { hasta } = misAvisos().silencio;
  setSilencio({ desde, hasta: hasta === desde ? (desde + 1) % 24 : hasta });
  pintarAvisos();
}

export function setSilencioHasta(v) {
  const hasta = Number(v);
  const { desde } = misAvisos().silencio;
  setSilencio({ hasta, desde: desde === hasta ? (hasta + 23) % 24 : desde });
  pintarAvisos();
}
