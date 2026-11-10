"use strict";
/**
 * Checkpoint de direccion artistica: genera 4 muestras (2 del teletransporte + ambiente + carpeta)
 * para validar el rumbo sonoro antes de construir el catalogo completo.
 * Uso: node generate-checkpoint.js <carpetaSalida>
 */
const path = require("node:path");
const dsp = require("./dsp.js");
const { escribirWav } = require("./wav.js");

const SR = dsp.SR;
const carpetaSalida = process.argv[2] || path.resolve(__dirname, "../library/checkpoint");

function capaOsc(opts, env, pan = 0) {
    const mono = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, ...opts }), env);
    return dsp.monoAEstereo(mono, pan, SR);
}

function capaRuido(segundos, semilla, env, pan = 0) {
    const mono = dsp.aplicarEnvolvente(dsp.ruidoBlanco(segundos, SR, semilla), env);
    return dsp.monoAEstereo(mono, pan, SR);
}

/**
 * Remolino magico continuo: ruido con resonancia que serpentea (LFO sobre el centro de un
 * pasabanda) en vez de un barrido lineal unico. Inspirado en la referencia "fire magic spell,
 * continuous" del usuario: la energia fluye en vez de golpear una sola vez.
 */
function capaRemolinoMagico({ duracion, freqInicio, freqFin, lfoHz, lfoProfundidad, semilla, pan, saturacion = 1.3, q = 2.2 }) {
    let o = dsp.ruidoBlanco(duracion, SR, semilla);
    o = dsp.biquad(o, SR, {
        tipo: "pasabanda", q,
        freq: (t) => {
            const base = freqInicio + (freqFin - freqInicio) * Math.min(1, t / duracion);
            return Math.max(80, base + lfoProfundidad * Math.sin(2 * Math.PI * t * lfoHz));
        }
    });
    o = dsp.saturarSuave(o, saturacion);
    const env = dsp.envolvente([[0, 0], [0.035, 1], [duracion * 0.55, 0.65], [duracion, 0]], duracion, SR);
    o = dsp.aplicarEnvolvente(o, env);
    return dsp.monoAEstereo(o, pan, SR);
}

/** Armonicos sostenidos con vibrato: shimmer magico que dura todo el sonido, no solo un golpe. */
function capaArmonicosMagicos({ duracion, freqBase, freqFinal, pan, ganancia = 1 }) {
    const vibrato = (t) => Math.sin(2 * Math.PI * t * 5.5) * 4;
    const freq = (t) => {
        const base = freqBase + (freqFinal - freqBase) * Math.min(1, t / duracion);
        return base + vibrato(t);
    };
    let fund = dsp.oscilador({ sampleRate: SR, tipo: "triangulo", frecuenciaHz: freq, segundos: duracion });
    let h2 = dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: (t) => freq(t) * 2, segundos: duracion });
    let h3 = dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: (t) => freq(t) * 3, segundos: duracion });
    const mezcla = fund.map((v, i) => v * 0.55 + h2[i] * 0.3 + h3[i] * 0.15);
    const env = dsp.envolvente([[0, 0], [0.05, 1], [duracion * 0.6, 0.5], [duracion, 0]], duracion, SR);
    const out = dsp.aplicarEnvolvente(mezcla, env);
    return dsp.monoAEstereo(out.map((v) => v * ganancia), pan, SR);
}

// ---------------------------------------------------------------------------
// 1. Teletransporte - DESAPARECER (~540 ms: carga magica -> combustion sobrenatural)
// ---------------------------------------------------------------------------
function generarTeletransporteDesaparecer() {
    const dur = 0.56;

    // Carga: shimmer ascendente con tremolo + arpegio magico de 3 campanas (0 - 0.16s)
    const cargaEnv = dsp.envolvente([[0, 0], [0.03, 0.2], [0.14, 0.32], [0.16, 0]], 0.16, SR);
    let carga = dsp.oscilador({ sampleRate: SR, tipo: "triangulo", frecuenciaHz: (t) => 320 + t * 4200, segundos: 0.16 });
    const tremolo = dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 26, segundos: 0.16 }).map((v) => 0.6 + 0.4 * (v * 0.5 + 0.5));
    carga = carga.map((v, i) => v * tremolo[i]);
    carga = dsp.aplicarEnvolvente(carga, cargaEnv);
    const capaCarga = dsp.monoAEstereo(carga, 0, SR);

    const arpegioCapas = [1400, 1700, 2100].map((freq, i) => {
        const d = 0.06;
        const env = dsp.envolvente([[0, 0], [0.004, 1], [d, 0]], d, SR);
        const nota = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: freq, segundos: d }), env);
        return { buffer: dsp.monoAEstereo(nota, (i - 1) * 0.3, SR), ganancia: 0.18, retardoSeg: 0.02 + i * 0.035 };
    });

    // Sub-thump de arranque de la combustion (~0.14 - 0.34s)
    const thumpEnv = dsp.envolvente([[0, 0], [0.01, 1], [0.12, 0.3], [0.2, 0]], 0.2, SR);
    const thump = dsp.aplicarEnvolvente(
        dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: (t) => 90 - t * 170, segundos: 0.2 }), thumpEnv
    );
    const capaThump = dsp.monoAEstereo(thump, 0, SR);

    // Gruñido infernal grave: sierra saturada con vibrato irregular, bajo toda la combustion
    const growlDur = 0.38;
    const growlEnv = dsp.envolvente([[0, 0], [0.03, 1], [0.24, 0.55], [growlDur, 0]], growlDur, SR);
    let growl = dsp.oscilador({
        sampleRate: SR, tipo: "sierra", segundos: growlDur,
        frecuenciaHz: (t) => 58 + Math.sin(2 * Math.PI * t * 13) * 9 - t * 10
    });
    growl = dsp.saturarSuave(growl, 4.5);
    growl = dsp.biquad(growl, SR, { tipo: "pasabajos", q: 0.8, freq: 900 });
    growl = dsp.aplicarEnvolvente(growl, growlEnv);
    const capaGrowl = dsp.monoAEstereo(growl, 0, SR);

    // Combustion / aire en movimiento: ruido filtrado con barrido descendente (0.14 - 0.52s)
    const comDur = 0.38;
    const comEnv = dsp.envolvente([[0, 0], [0.02, 1], [0.22, 0.45], [comDur, 0]], comDur, SR);
    let combustion = dsp.ruidoBlanco(comDur, SR, 7);
    combustion = dsp.biquad(combustion, SR, { tipo: "pasabanda", q: 1.1, freq: (t) => 2800 - t * 6200 });
    combustion = dsp.aplicarEnvolvente(combustion, comEnv);
    combustion = dsp.saturarSuave(combustion, 1.8);
    const capaCombustion = dsp.monoAEstereo(combustion, 0.05, SR);

    // Resonancia de "rugido" infernal: ruido realzado con filtro de pico grave que sube
    const roarDur = 0.3;
    let roar = dsp.ruidoBlanco(roarDur, SR, 71);
    roar = dsp.biquad(roar, SR, { tipo: "pico", q: 4, freq: (t) => 180 + t * 500, gananciaDB: 14 });
    const roarEnv = dsp.envolvente([[0, 0], [0.03, 1], [0.18, 0.4], [roarDur, 0]], roarDur, SR);
    roar = dsp.aplicarEnvolvente(roar, roarEnv);
    const capaRoar = dsp.monoAEstereo(roar, -0.08, SR);

    // Capa de "llama" tonal: sierra descendente saturada, rango mas amplio y mas sucia (0.14 - 0.48s)
    const llamaDur = 0.34;
    const llamaEnv = dsp.envolvente([[0, 0], [0.02, 0.55], [0.1, 0.4], [llamaDur, 0]], llamaDur, SR);
    let llama = dsp.oscilador({ sampleRate: SR, tipo: "sierra", frecuenciaHz: (t) => 620 - t * 1600, segundos: llamaDur });
    llama = dsp.biquad(llama, SR, { tipo: "pasabajos", q: 0.9, freq: (t) => 2600 - t * 5000 });
    llama = dsp.saturarSuave(llama, 3.4);
    llama = dsp.aplicarEnvolvente(llama, llamaEnv);
    const capaLlama = dsp.monoAEstereo(llama, -0.1, SR);

    // Chispas/crepitar: 5 transitorios cortos de ruido agudo esparcidos
    const chispasCapas = [0.17, 0.23, 0.29, 0.35, 0.42].map((inicio, i) => {
        const d = 0.035;
        const env = dsp.envolvente([[0, 0], [0.004, 1], [d, 0]], d, SR);
        let ch = dsp.ruidoBlanco(d, SR, 30 + i);
        ch = dsp.biquad(ch, SR, { tipo: "pasabanda", q: 3, freq: 3200 + i * 500 });
        ch = dsp.aplicarEnvolvente(ch, env);
        return { buffer: dsp.monoAEstereo(ch, (i % 2 === 0 ? 1 : -1) * 0.3, SR), ganancia: 0.5, retardoSeg: inicio };
    });

    // Remolino magico continuo + armonicos sostenidos (0.14 - 0.52s): la energia fluye, no solo golpea
    const remolino = capaRemolinoMagico({
        duracion: 0.38, freqInicio: 2600, freqFin: 500, lfoHz: 11, lfoProfundidad: 700,
        semilla: 61, pan: 0, saturacion: 1.6, q: 2.6
    });
    const armonicos = capaArmonicosMagicos({ duracion: 0.38, freqBase: 220, freqFinal: 70, pan: -0.05, ganancia: 1 });

    let mezcla = dsp.mezclar([
        { buffer: capaCarga, ganancia: 0.45, retardoSeg: 0 },
        ...arpegioCapas,
        { buffer: capaThump, ganancia: 0.75, retardoSeg: 0.14 },
        { buffer: capaGrowl, ganancia: 0.5, retardoSeg: 0.14 },
        { buffer: remolino, ganancia: 0.85, retardoSeg: 0.14 },
        { buffer: armonicos, ganancia: 0.5, retardoSeg: 0.14 },
        { buffer: capaCombustion, ganancia: 0.55, retardoSeg: 0.14 },
        { buffer: capaRoar, ganancia: 0.4, retardoSeg: 0.15 },
        { buffer: capaLlama, ganancia: 0.45, retardoSeg: 0.14 },
        ...chispasCapas
    ]);
    mezcla = dsp.recortarEstereo(mezcla, dur);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.26, amortiguacion: 0.3, tamano: 1.4 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.26, amortiguacion: 0.3, tamano: 1.4 });
    mezcla = dsp.fundidosEstereo(mezcla, { salidaMs: 25 });
    mezcla = dsp.normalizarPico(mezcla, -1.2);
    mezcla = dsp.limitarSuave(mezcla, -0.3);
    return mezcla;
}

// ---------------------------------------------------------------------------
// 2. Teletransporte - APARECER (~540 ms: impacto controlado -> brasas -> asentamiento magico)
// ---------------------------------------------------------------------------
function generarTeletransporteAparecer() {
    const dur = 0.56;

    // Residuo grave que ya viene "entrando" (como si arrastrara la transicion) (0 - 0.1s)
    const residuoEnv = dsp.envolvente([[0, 0.55], [0.08, 0.25], [0.1, 0]], 0.1, SR);
    const residuo = dsp.aplicarEnvolvente(
        dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 54, segundos: 0.1 }), residuoEnv
    );
    const capaResiduo = dsp.monoAEstereo(residuo, 0, SR);

    // Gruñido infernal corto en el impacto (mas breve que en desaparecer: llegada, no salida)
    const growlDur = 0.22;
    const growlEnv = dsp.envolvente([[0, 0], [0.015, 1], [0.1, 0.4], [growlDur, 0]], growlDur, SR);
    let growl = dsp.oscilador({
        sampleRate: SR, tipo: "sierra", segundos: growlDur,
        frecuenciaHz: (t) => 62 + Math.sin(2 * Math.PI * t * 15) * 10
    });
    growl = dsp.saturarSuave(growl, 4);
    growl = dsp.biquad(growl, SR, { tipo: "pasabajos", q: 0.8, freq: 850 });
    growl = dsp.aplicarEnvolvente(growl, growlEnv);
    const capaGrowl = dsp.monoAEstereo(growl, 0, SR);

    // Impacto controlado (0.08 - 0.3s): mas corto y mas "seco" que la combustion de desaparecer
    const impDur = 0.22;
    const impEnv = dsp.envolvente([[0, 0], [0.008, 1], [0.08, 0.35], [impDur, 0]], impDur, SR);
    let impacto = dsp.ruidoBlanco(impDur, SR, 11);
    impacto = dsp.biquad(impacto, SR, { tipo: "pasabanda", q: 1.2, freq: (t) => 900 + t * 2600 });
    impacto = dsp.aplicarEnvolvente(impacto, impEnv);
    impacto = dsp.saturarSuave(impacto, 1.6);
    const capaImpacto = dsp.monoAEstereo(impacto, -0.05, SR);

    const thumpEnv = dsp.envolvente([[0, 0], [0.006, 1], [0.1, 0.22], [0.16, 0]], 0.16, SR);
    const thump = dsp.aplicarEnvolvente(
        dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: (t) => 72 + t * 20, segundos: 0.16 }), thumpEnv
    );
    const capaThump = dsp.monoAEstereo(thump, 0, SR);

    // Brasas / cola de fuego (0.1 - 0.56s): ruido agudo con decaimiento lento e irregular
    const brasasDur = 0.46;
    const brasasEnv = dsp.envolvente([[0, 0], [0.03, 0.55], [0.22, 0.25], [brasasDur, 0]], brasasDur, SR);
    let brasas = dsp.ruidoBlanco(brasasDur, SR, 21);
    brasas = dsp.biquad(brasas, SR, { tipo: "pasaaltos", q: 0.7, freq: 2800 });
    brasas = dsp.aplicarEnvolvente(brasas, brasasEnv);
    const capaBrasas = dsp.monoAEstereo(brasas, 0.15, SR);

    // Crepitar disperso de brasas
    const crepitarCapas = [0.14, 0.22, 0.3, 0.38, 0.44].map((inicio, i) => {
        const d = 0.03;
        const env = dsp.envolvente([[0, 0], [0.004, 1], [d, 0]], d, SR);
        let ch = dsp.ruidoBlanco(d, SR, 50 + i);
        ch = dsp.biquad(ch, SR, { tipo: "pasabanda", q: 3.2, freq: 2800 + i * 600 });
        ch = dsp.aplicarEnvolvente(ch, env);
        return { buffer: dsp.monoAEstereo(ch, (i % 2 === 0 ? -1 : 1) * 0.35, SR), ganancia: 0.4, retardoSeg: inicio };
    });

    // Chispazo de polvo magico (swell breve de ruido alto) justo antes del asentamiento
    const polvoDur = 0.14;
    let polvo = dsp.ruidoBlanco(polvoDur, SR, 88);
    polvo = dsp.biquad(polvo, SR, { tipo: "pasabanda", q: 2, freq: 5200 });
    const polvoEnv = dsp.envolvente([[0, 0], [0.05, 0.5], [0.1, 0.3], [polvoDur, 0]], polvoDur, SR);
    polvo = dsp.aplicarEnvolvente(polvo, polvoEnv);
    const capaPolvo = dsp.monoAEstereo(polvo, 0, SR);

    // Asentamiento magico: campana de 3 notas (0.28 - 0.56s)
    const campanaEnv = (dur2) => dsp.envolvente([[0, 0], [0.008, 1], [dur2, 0]], dur2, SR);
    const nota1 = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 659.25, segundos: 0.14 }), campanaEnv(0.14));
    const nota2 = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 880, segundos: 0.16 }), campanaEnv(0.16));
    const nota3 = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 1318.5, segundos: 0.2 }), campanaEnv(0.2));
    const capaNota1 = dsp.monoAEstereo(nota1, -0.3, SR);
    const capaNota2 = dsp.monoAEstereo(nota2, 0, SR);
    const capaNota3 = dsp.monoAEstereo(nota3, 0.3, SR);

    // Remolino magico continuo + armonicos sostenidos, ascendiendo (es una llegada, no una salida)
    const remolino = capaRemolinoMagico({
        duracion: 0.32, freqInicio: 500, freqFin: 2400, lfoHz: 12, lfoProfundidad: 650,
        semilla: 62, pan: 0, saturacion: 1.5, q: 2.4
    });
    const armonicos = capaArmonicosMagicos({ duracion: 0.32, freqBase: 90, freqFinal: 240, pan: 0.05, ganancia: 0.9 });

    let mezcla = dsp.mezclar([
        { buffer: capaResiduo, ganancia: 0.5, retardoSeg: 0 },
        { buffer: capaGrowl, ganancia: 0.45, retardoSeg: 0.08 },
        { buffer: capaThump, ganancia: 0.75, retardoSeg: 0.08 },
        { buffer: remolino, ganancia: 0.75, retardoSeg: 0.08 },
        { buffer: armonicos, ganancia: 0.45, retardoSeg: 0.08 },
        { buffer: capaImpacto, ganancia: 0.5, retardoSeg: 0.08 },
        { buffer: capaBrasas, ganancia: 0.5, retardoSeg: 0.1 },
        ...crepitarCapas,
        { buffer: capaPolvo, ganancia: 0.35, retardoSeg: 0.26 },
        { buffer: capaNota1, ganancia: 0.2, retardoSeg: 0.28 },
        { buffer: capaNota2, ganancia: 0.22, retardoSeg: 0.31 },
        { buffer: capaNota3, ganancia: 0.18, retardoSeg: 0.35 }
    ]);
    mezcla = dsp.recortarEstereo(mezcla, dur);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.26, amortiguacion: 0.28, tamano: 1.3 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.26, amortiguacion: 0.28, tamano: 1.3 });
    mezcla = dsp.fundidosEstereo(mezcla, { salidaMs: 30 });
    mezcla = dsp.normalizarPico(mezcla, -1.2);
    mezcla = dsp.limitarSuave(mezcla, -0.3);
    return mezcla;
}

// ---------------------------------------------------------------------------
// 3. Ambiente principal - loop oscuro/arcano de 24s (3s de empalme para bucle)
// ---------------------------------------------------------------------------
function generarAmbientePrincipal() {
    const loopSeg = 24;
    const cruceSeg = 3;
    const totalSeg = loopSeg + cruceSeg;

    // Drone: 3 sierras desafinadas + sub seno, filtradas con LFO de corte mas corto y profundo (mas movimiento)
    const raiz = 73.42; // D2
    const quinta = 110.0; // A2
    const lfoCorte = (t) => 500 + 320 * Math.sin(2 * Math.PI * t / 8.5);
    function capaDrone(freqBase, detuneCents, pan, ganancia) {
        const detune = Math.pow(2, detuneCents / 1200);
        let o = dsp.oscilador({ sampleRate: SR, tipo: "sierra", frecuenciaHz: freqBase * detune, segundos: totalSeg });
        o = dsp.biquad(o, SR, { tipo: "pasabajos", q: 0.7, freq: lfoCorte });
        o = dsp.saturarSuave(o, 1.15);
        return { buffer: dsp.monoAEstereo(o, pan, SR), ganancia, retardoSeg: 0 };
    }
    const capasDrone = [
        capaDrone(raiz, -6, -0.4, 0.16),
        capaDrone(raiz, 6, 0.4, 0.16),
        capaDrone(quinta, 0, 0, 0.1)
    ];
    const sub = dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: raiz / 2, segundos: totalSeg });
    const capaSub = { buffer: dsp.monoAEstereo(sub, 0, SR), ganancia: 0.1, retardoSeg: 0 };

    // Pulso grave lento tipo mecanismo/latido, cada 2.4s (movimiento ritmico discreto, sabor industrial)
    const capasPulso = [];
    for (let t0 = 0.6; t0 < loopSeg - 0.5; t0 += 2.4) {
        const d = 0.5;
        const env = dsp.envolvente([[0, 0], [0.02, 1], [0.18, 0.25], [d, 0]], d, SR);
        const pulso = dsp.aplicarEnvolvente(
            dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: (t) => 50 - t * 12, segundos: d }), env
        );
        capasPulso.push({ buffer: dsp.monoAEstereo(pulso, 0, SR), ganancia: 0.14, retardoSeg: t0 });
    }

    // Motivo disperso en escala frigia sobre D (D Eb F G A Bb C), con eco para dar sensacion de movimiento
    const notasMotivo = [293.66, 311.13, 220.0, 261.63, 349.23, 220.0, 293.66, 311.13, 261.63];
    const tiemposMotivo = [2.0, 2.7, 4.6, 5.4, 7.3, 8.1, 8.8, 11.2, 13.6, 14.3, 16.5, 18.2];
    const capasMotivo = tiemposMotivo.map((t0, i) => {
        const freq = notasMotivo[i % notasMotivo.length];
        const d = 1.1;
        const env = dsp.envolvente([[0, 0], [0.012, 1], [0.35, 0.35], [d, 0]], d, SR);
        let nota = dsp.oscilador({ sampleRate: SR, tipo: "triangulo", frecuenciaHz: freq, segundos: d });
        nota = dsp.biquad(nota, SR, { tipo: "pasabajos", q: 0.6, freq: 2600 });
        nota = dsp.aplicarEnvolvente(nota, env);
        nota = dsp.retardo(nota, SR, { ms: 480, realimentacion: 0.3, mezcla: 0.28, filtroHz: 2200 });
        const pan = Math.sin(i * 1.7) * 0.5;
        return { buffer: dsp.monoAEstereo(nota, pan, SR), ganancia: 0.2, retardoSeg: t0 };
    });

    // Textura alta "polvo arcano": ruido pasabanda con swells mas frecuentes y paneo lento (mas movimiento)
    let textura = dsp.ruidoBlanco(totalSeg, SR, 99);
    textura = dsp.biquad(textura, SR, { tipo: "pasabanda", q: 1.4, freq: 4200 });
    const swell = dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 1 / 4.2, segundos: totalSeg })
        .map((v) => Math.max(0, v) * 0.6);
    textura = textura.map((v, i) => v * swell[i]);
    const panLFO = dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 1 / 11, segundos: totalSeg });
    const texturaIzq = textura.map((v, i) => v * Math.max(0, -panLFO[i]));
    const texturaDer = textura.map((v, i) => v * Math.max(0, panLFO[i]));
    const texturaCentro = textura.map((v, i) => v * (1 - Math.abs(panLFO[i])) * 0.5);
    const capaTextura = {
        sampleRate: SR,
        left: texturaIzq.map((v, i) => v + texturaCentro[i]),
        right: texturaDer.map((v, i) => v + texturaCentro[i])
    };

    let mezcla = dsp.mezclar([...capasDrone, capaSub, ...capasPulso, ...capasMotivo, { buffer: capaTextura, ganancia: 0.5, retardoSeg: 0 }]);
    mezcla = dsp.recortarEstereo(mezcla, totalSeg);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.3, amortiguacion: 0.3, tamano: 1.3 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.3, amortiguacion: 0.3, tamano: 1.3 });

    mezcla = dsp.haceBucle(mezcla, loopSeg, cruceSeg);
    mezcla = dsp.corregirCosturaBucle(mezcla, 15);
    mezcla = dsp.normalizarPico(mezcla, -4.5);
    mezcla = dsp.limitarSuave(mezcla, -1.5);
    return mezcla;
}

// ---------------------------------------------------------------------------
// 4. Carpeta - ABRIR (~450 ms: papel + madera/cuero + chispa magica de confirmacion)
// ---------------------------------------------------------------------------
function generarCarpetaAbrir() {
    // v3: siguiendo la referencia "Book, Page Turn, Paper, Rustle, Flip, Movement, Soft" del
    // usuario -- se quita la capa de madera/cuero (no aparecia en la referencia) y domina el
    // papel: un barrido de "flip" (giro de pagina) mas un aleteo suave, todo con ataques lentos.
    const dur = 0.5;

    // Flip: barrido pasabanda continuo que sube y baja, como el giro fisico de una pagina
    const flipDur = 0.26;
    let flip = dsp.ruidoBlanco(flipDur, SR, 5);
    flip = dsp.biquad(flip, SR, {
        tipo: "pasabanda", q: 0.9,
        freq: (t) => 700 + 1900 * Math.sin(Math.PI * Math.min(1, t / flipDur))
    });
    const flipEnv = dsp.envolvente([[0, 0], [0.06, 0.6], [0.16, 0.5], [flipDur, 0]], flipDur, SR);
    flip = dsp.aplicarEnvolvente(flip, flipEnv);
    const capaFlip = dsp.monoAEstereo(flip, -0.1, SR);

    // Aleteo de papel: entra justo despues, ataque suave, varias ondulaciones (no un solo golpe)
    const papelDur = 0.3;
    let papel = dsp.ruidoBlanco(papelDur, SR, 3);
    papel = dsp.biquad(papel, SR, { tipo: "pasabanda", q: 0.8, freq: (t) => 2000 + Math.sin(t * 36) * 700 });
    const papelEnv = dsp.envolvente(
        [[0, 0], [0.05, 0.4], [0.12, 0.25], [0.18, 0.45], [0.24, 0.15], [papelDur, 0]], papelDur, SR
    );
    papel = dsp.aplicarEnvolvente(papel, papelEnv);
    const capaPapel = dsp.monoAEstereo(papel, 0.2, SR);

    // Chispa magica de confirmacion: dos notas ascendentes breves, tras el movimiento fisico
    const n1Env = dsp.envolvente([[0, 0], [0.01, 1], [0.12, 0]], 0.12, SR);
    const n2Env = dsp.envolvente([[0, 0], [0.01, 1], [0.16, 0]], 0.16, SR);
    const nota1 = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "triangulo", frecuenciaHz: 1046.5, segundos: 0.12 }), n1Env);
    const nota2 = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "triangulo", frecuenciaHz: 1568, segundos: 0.16 }), n2Env);
    const capaNota1 = dsp.monoAEstereo(nota1, 0.3, SR);
    const capaNota2 = dsp.monoAEstereo(nota2, 0.35, SR);

    let mezcla = dsp.mezclar([
        { buffer: capaFlip, ganancia: 0.5, retardoSeg: 0 },
        { buffer: capaPapel, ganancia: 0.6, retardoSeg: 0.05 },
        { buffer: capaNota1, ganancia: 0.28, retardoSeg: 0.28 },
        { buffer: capaNota2, ganancia: 0.24, retardoSeg: 0.33 }
    ]);
    mezcla = dsp.recortarEstereo(mezcla, dur);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.1, amortiguacion: 0.45 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.1, amortiguacion: 0.45 });
    mezcla = dsp.fundidosEstereo(mezcla, { entradaMs: 3, salidaMs: 25 });
    mezcla = dsp.normalizarPico(mezcla, -3);
    mezcla = dsp.limitarSuave(mezcla, -0.5);
    return mezcla;
}

// ---------------------------------------------------------------------------
function main() {
    const muestras = {
        "teletransporte_desaparecer.wav": generarTeletransporteDesaparecer(),
        "teletransporte_aparecer.wav": generarTeletransporteAparecer(),
        "ambiente_principal_loop.wav": generarAmbientePrincipal(),
        "carpeta_abrir.wav": generarCarpetaAbrir()
    };
    for (const [nombre, buf] of Object.entries(muestras)) {
        const ruta = path.join(carpetaSalida, nombre);
        const info = escribirWav(ruta, buf);
        console.log(`${nombre}: ${info.segundos.toFixed(2)}s, ${(info.bytes / 1024).toFixed(0)} KB -> ${ruta}`);
    }
}

main();
