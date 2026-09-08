/* ─────────────────────────────────────────────────────────────
   EL RECORDATORIO DE LECTURA, EN PANTALLA  ·  historia #69

     «Quiero que me recuerden leer cuando suelo hacerlo, para que se me
      haga costumbre.»

   La lógica —a qué hora sueles leer, si hoy toca avisar— vive en
   `habito-core.js`, sin DOM y con su batería. Aquí solo se pinta y se
   guarda lo que se toca.

   ── LA HORA SE PROPONE, NO SE IMPONE ────────────────────────

   Lo primero que ofrece la hoja es **tu hora habitual**, deducida de
   cuándo lees de verdad, porque eso es lo que pide la historia y
   porque es la respuesta correcta para casi todo el mundo. Pero se
   puede fijar una a mano: quien quiere leer a las siete de la mañana
   —y hoy no lo hace, por eso quiere el recordatorio— necesita
   exactamente lo contrario de que se le proponga su costumbre actual.

   Y mientras no haya lecturas suficientes se DICE que se está
   aprendiendo, en vez de enseñar una hora inventada con cara de dato.

   ── Y SE EXPLICA POR QUÉ NO VA A LLEGAR ─────────────────────

   Debajo va siempre una línea con lo que pasaría ahora mismo: «hoy no
   te avisaremos: ya leíste», «todavía no es la hora». Un ajuste
   encendido que no hace nada visible parece estropeado, y quien lo mira
   no tiene forma de saber si es que funciona así o es que falla.
   ───────────────────────────────────────────────────────────── */

import {
  horaHabitual, horaLegible, tocaAvisar, POR_QUE_NO, DIAS, TODOS_LOS_DIAS, MINIMO,
} from './habito-core.js';
import {
  horasDeLectura, miRecordatorio, setRecordatorio, readingDays, ultimoAviso,
} from './store.js';
import { $, esc, openSheet, closeSheet } from './ui.js';

export function openRecordatorio() {
  horasAbiertas = false;
  openSheet('recordatorio-overlay');
  pintarRecordatorio();
}

export const closeRecordatorio = (e) => {
  if (!e || e.target === $('recordatorio-overlay')) closeSheet('recordatorio-overlay');
};

/* Las horas que se pueden elegir a mano. De media en media hora sería
   una lista de 48 y nadie elige leer a las 06:30 en punto; de hora en
   hora entre las 5 y la 1 cubre a cualquiera sin volverse un desfile. */
const HORAS_ELEGIBLES = [
  5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1,
];

/* Y VAN ESCONDIDAS HASTA QUE HAGAN FALTA.

   Enseñadas siempre son veintiún botones casi idénticos ocupando media
   hoja, y encima justo debajo de la opción que dice que NO hace falta
   elegir ninguno. La hoja acababa pareciendo un selector de hora con un
   texto encima, cuando lo que es —y lo que quiere casi todo el mundo—
   es «avísame cuando suelo leer».

   Se abren solas si ya hay una hora fija: entonces sí son lo que se
   está mirando. */
let horasAbiertas = false;
export function mostrarHoras() { horasAbiertas = true; pintarRecordatorio(); }

export function pintarRecordatorio() {
  const cuerpo = $('recordatorio-body');
  if (!cuerpo) return;

  const cfg = miRecordatorio();
  const horas = horasDeLectura();
  const deducida = horaHabitual(horas);
  const dias = cfg.dias?.length ? cfg.dias : TODOS_LOS_DIAS;

  /* Qué pasaría ahora mismo. Se calcula con la configuración de verdad
     y el estado de verdad, así que lo que dice es lo que va a hacer. */
  const ahora = tocaAvisar(cfg, {
    horas, diasLeidos: readingDays(), ultimoAviso: ultimoAviso(),
  });

  cuerpo.innerHTML = `
    <p class="set-fineprint">
      Un aviso al día, como mucho, y nunca si ya leíste. Habla tu mascota,
      y dice por dónde vas — no es una alarma.
    </p>

    ${/* Un botón y no una fila con su nombre: la hoja ya se llama
          «Recordarme leer», y repetirlo dentro era decir lo mismo dos
          veces a dos centímetros de distancia. */''}
    <button class="${cfg.activo ? 'btn-ghost' : 'btn-magic'} full" style="margin-top:14px"
            onclick="toggleRecordatorio()">
      ${cfg.activo ? 'Apagar los recordatorios' : 'Encender los recordatorios'}
    </button>

    ${cfg.activo ? `
      <div class="section-heading"><span class="section-heading-text">A qué hora</span></div>

      ${/* La opción de fábrica va primera y explica de dónde sale. */''}
      <button class="hab-opcion ${cfg.hora == null ? 'elegida' : ''}"
              onclick="setHoraRecordatorio(null)">
        <span class="hab-opcion-nombre">Mi hora habitual</span>
        <span class="hab-opcion-sub">${esc(deducida.hora != null
    ? `Sueles leer sobre las ${horaLegible(deducida.hora)}, según ${deducida.muestras} lecturas`
    : deducida.motivo === 'sin-hora-clara'
      ? 'Lees a horas muy distintas, así que todavía no hay una. Elige una abajo.'
      : `Lo estamos aprendiendo: llevamos ${deducida.muestras} de ${MINIMO} lecturas`)}</span>
      </button>

      ${cfg.hora != null || horasAbiertas ? `
        <div class="hab-horas">
          ${HORAS_ELEGIBLES.map((h) => `
            <button class="hab-hora ${cfg.hora === h ? 'elegida' : ''}"
                    onclick="setHoraRecordatorio(${h})">${horaLegible(h)}</button>`).join('')}
        </div>`
    : `<button class="hab-otra" onclick="mostrarHoras()">Prefiero otra hora</button>`}

      <div class="section-heading"><span class="section-heading-text">Qué días</span></div>
      <div class="hab-dias">
        ${DIAS.map((d) => `
          <button class="hab-dia ${dias.includes(d.i) ? 'elegida' : ''}"
                  onclick="toggleDiaRecordatorio(${d.i})"
                  aria-label="${esc(d.nombre)}"
                  aria-pressed="${dias.includes(d.i)}">${d.corto}</button>`).join('')}
      </div>

      ${/* LO QUE PASARÍA AHORA MISMO. Sin esto, un ajuste encendido que
            no hace nada visible parece estropeado. */''}
      <p class="planner-hint hab-ahora">
        ${esc(ahora.avisar
    ? 'Ahora mismo te avisaríamos.'
    : POR_QUE_NO[ahora.motivo] || '')}
      </p>
    ` : ''}

    <p class="set-fineprint" style="margin-top:14px">
      Las horas a las que lees se guardan en tu cuenta y no salen de ahí:
      son una lista de números, sin el libro ni la página.
    </p>`;
}

/* ── LO QUE SE TOCA ──────────────────────────────────────────── */

export function toggleRecordatorio() {
  setRecordatorio({ activo: !miRecordatorio().activo });
  pintarRecordatorio();
}

export function setHoraRecordatorio(h) {
  /* Volver a «mi hora habitual» pliega la lista: si ya no se está
     eligiendo una hora, no hay motivo para seguir enseñando veintiuna. */
  if (h == null) horasAbiertas = false;
  setRecordatorio({ hora: h });
  pintarRecordatorio();
}

/**
 * Quitar y poner días.
 *
 * No se puede dejar la semana vacía: cero días no es una configuración,
 * es el interruptor de apagado con otro nombre — y con el aviso todavía
 * diciendo «encendido». Quitar el último se entiende como apagarlo, que
 * es lo que se quería hacer.
 */
export function toggleDiaRecordatorio(i) {
  const cfg = miRecordatorio();
  const dias = cfg.dias?.length ? cfg.dias : TODOS_LOS_DIAS;
  const quedan = dias.includes(i) ? dias.filter((d) => d !== i) : [...dias, i];

  if (!quedan.length) {
    setRecordatorio({ activo: false, dias: TODOS_LOS_DIAS });
  } else {
    setRecordatorio({ dias: quedan.sort((a, b) => a - b) });
  }
  pintarRecordatorio();
}
