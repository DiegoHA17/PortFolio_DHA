"use strict";
/**
 * Catalogo completo de audio del portfolio: genera todos los efectos y la musica ambiental
 * aprobados en los checkpoints de direccion artistica, usando el motor propio de dsp.js.
 * Uso: node generate-catalog.js <carpetaSalida>
 *
 * Esta es la version "de produccion" -- reemplaza a generate-checkpoint.js (que se conserva
 * como historial del proceso de aprobacion). Para regenerar o pedir variantes de un sonido
 * concreto, edita la funcion correspondiente y vuelve a ejecutar este script.
 */
const path = require("node:path");
const dsp = require("./dsp.js");
const { escribirWav } = require("./wav.js");

const SR = dsp.SR;
const carpetaSalida = process.argv[2] || path.resolve(__dirname, "../library/catalogo");

// ===========================================================================
// 1-2. TELETRANSPORTE DEL JUGADOR (jugador.desaparecer() / jugador.aparecer())
// ===========================================================================
function generarTeletransporteDesaparecer() {
    const dur = 0.56;

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

    const thumpEnv = dsp.envolvente([[0, 0], [0.01, 1], [0.12, 0.3], [0.2, 0]], 0.2, SR);
    const thump = dsp.aplicarEnvolvente(
        dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: (t) => 90 - t * 170, segundos: 0.2 }), thumpEnv
    );
    const capaThump = dsp.monoAEstereo(thump, 0, SR);

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

    const remolino = dsp.remolinoMagico({
        duracion: 0.38, freqInicio: 2600, freqFin: 500, lfoHz: 11, lfoProfundidad: 700,
        semilla: 61, pan: 0, saturacion: 1.6, q: 2.6
    });
    const armonicos = dsp.armonicosMagicos({ duracion: 0.38, freqBase: 220, freqFinal: 70, pan: -0.05, ganancia: 1 });

    const comDur = 0.38;
    const comEnv = dsp.envolvente([[0, 0], [0.02, 1], [0.22, 0.45], [comDur, 0]], comDur, SR);
    let combustion = dsp.ruidoBlanco(comDur, SR, 7);
    combustion = dsp.biquad(combustion, SR, { tipo: "pasabanda", q: 1.1, freq: (t) => 2800 - t * 6200 });
    combustion = dsp.aplicarEnvolvente(combustion, comEnv);
    combustion = dsp.saturarSuave(combustion, 1.8);
    const capaCombustion = dsp.monoAEstereo(combustion, 0.05, SR);

    const roarDur = 0.3;
    let roar = dsp.ruidoBlanco(roarDur, SR, 71);
    roar = dsp.biquad(roar, SR, { tipo: "pico", q: 4, freq: (t) => 180 + t * 500, gananciaDB: 14 });
    const roarEnv = dsp.envolvente([[0, 0], [0.03, 1], [0.18, 0.4], [roarDur, 0]], roarDur, SR);
    roar = dsp.aplicarEnvolvente(roar, roarEnv);
    const capaRoar = dsp.monoAEstereo(roar, -0.08, SR);

    const llamaDur = 0.34;
    const llamaEnv = dsp.envolvente([[0, 0], [0.02, 0.55], [0.1, 0.4], [llamaDur, 0]], llamaDur, SR);
    let llama = dsp.oscilador({ sampleRate: SR, tipo: "sierra", frecuenciaHz: (t) => 620 - t * 1600, segundos: llamaDur });
    llama = dsp.biquad(llama, SR, { tipo: "pasabajos", q: 0.9, freq: (t) => 2600 - t * 5000 });
    llama = dsp.saturarSuave(llama, 3.4);
    llama = dsp.aplicarEnvolvente(llama, llamaEnv);
    const capaLlama = dsp.monoAEstereo(llama, -0.1, SR);

    const chispasCapas = [0.17, 0.23, 0.29, 0.35, 0.42].map((inicio, i) => {
        const d = 0.035;
        const env = dsp.envolvente([[0, 0], [0.004, 1], [d, 0]], d, SR);
        let ch = dsp.ruidoBlanco(d, SR, 30 + i);
        ch = dsp.biquad(ch, SR, { tipo: "pasabanda", q: 3, freq: 3200 + i * 500 });
        ch = dsp.aplicarEnvolvente(ch, env);
        return { buffer: dsp.monoAEstereo(ch, (i % 2 === 0 ? 1 : -1) * 0.3, SR), ganancia: 0.5, retardoSeg: inicio };
    });

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
    return dsp.limitarSuave(mezcla, -0.3);
}

function generarTeletransporteAparecer() {
    const dur = 0.56;

    const residuoEnv = dsp.envolvente([[0, 0.55], [0.08, 0.25], [0.1, 0]], 0.1, SR);
    const residuo = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 54, segundos: 0.1 }), residuoEnv);
    const capaResiduo = dsp.monoAEstereo(residuo, 0, SR);

    const growlDur = 0.22;
    const growlEnv = dsp.envolvente([[0, 0], [0.015, 1], [0.1, 0.4], [growlDur, 0]], growlDur, SR);
    let growl = dsp.oscilador({ sampleRate: SR, tipo: "sierra", segundos: growlDur, frecuenciaHz: (t) => 62 + Math.sin(2 * Math.PI * t * 15) * 10 });
    growl = dsp.saturarSuave(growl, 4);
    growl = dsp.biquad(growl, SR, { tipo: "pasabajos", q: 0.8, freq: 850 });
    growl = dsp.aplicarEnvolvente(growl, growlEnv);
    const capaGrowl = dsp.monoAEstereo(growl, 0, SR);

    const remolino = dsp.remolinoMagico({
        duracion: 0.32, freqInicio: 500, freqFin: 2400, lfoHz: 12, lfoProfundidad: 650,
        semilla: 62, pan: 0, saturacion: 1.5, q: 2.4
    });
    const armonicos = dsp.armonicosMagicos({ duracion: 0.32, freqBase: 90, freqFinal: 240, pan: 0.05, ganancia: 0.9 });

    const impDur = 0.22;
    const impEnv = dsp.envolvente([[0, 0], [0.008, 1], [0.08, 0.35], [impDur, 0]], impDur, SR);
    let impacto = dsp.ruidoBlanco(impDur, SR, 11);
    impacto = dsp.biquad(impacto, SR, { tipo: "pasabanda", q: 1.2, freq: (t) => 900 + t * 2600 });
    impacto = dsp.aplicarEnvolvente(impacto, impEnv);
    impacto = dsp.saturarSuave(impacto, 1.6);
    const capaImpacto = dsp.monoAEstereo(impacto, -0.05, SR);

    const thumpEnv = dsp.envolvente([[0, 0], [0.006, 1], [0.1, 0.22], [0.16, 0]], 0.16, SR);
    const thump = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: (t) => 72 + t * 20, segundos: 0.16 }), thumpEnv);
    const capaThump = dsp.monoAEstereo(thump, 0, SR);

    const brasasDur = 0.46;
    const brasasEnv = dsp.envolvente([[0, 0], [0.03, 0.55], [0.22, 0.25], [brasasDur, 0]], brasasDur, SR);
    let brasas = dsp.ruidoBlanco(brasasDur, SR, 21);
    brasas = dsp.biquad(brasas, SR, { tipo: "pasaaltos", q: 0.7, freq: 2800 });
    brasas = dsp.aplicarEnvolvente(brasas, brasasEnv);
    const capaBrasas = dsp.monoAEstereo(brasas, 0.15, SR);

    const crepitarCapas = [0.14, 0.22, 0.3, 0.38, 0.44].map((inicio, i) => {
        const d = 0.03;
        const env = dsp.envolvente([[0, 0], [0.004, 1], [d, 0]], d, SR);
        let ch = dsp.ruidoBlanco(d, SR, 50 + i);
        ch = dsp.biquad(ch, SR, { tipo: "pasabanda", q: 3.2, freq: 2800 + i * 600 });
        ch = dsp.aplicarEnvolvente(ch, env);
        return { buffer: dsp.monoAEstereo(ch, (i % 2 === 0 ? -1 : 1) * 0.35, SR), ganancia: 0.4, retardoSeg: inicio };
    });

    const polvoDur = 0.14;
    let polvo = dsp.ruidoBlanco(polvoDur, SR, 88);
    polvo = dsp.biquad(polvo, SR, { tipo: "pasabanda", q: 2, freq: 5200 });
    const polvoEnv = dsp.envolvente([[0, 0], [0.05, 0.5], [0.1, 0.3], [polvoDur, 0]], polvoDur, SR);
    polvo = dsp.aplicarEnvolvente(polvo, polvoEnv);
    const capaPolvo = dsp.monoAEstereo(polvo, 0, SR);

    const campanaEnv = (d) => dsp.envolvente([[0, 0], [0.008, 1], [d, 0]], d, SR);
    const nota1 = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 659.25, segundos: 0.14 }), campanaEnv(0.14));
    const nota2 = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 880, segundos: 0.16 }), campanaEnv(0.16));
    const nota3 = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 1318.5, segundos: 0.2 }), campanaEnv(0.2));
    const capaNota1 = dsp.monoAEstereo(nota1, -0.3, SR);
    const capaNota2 = dsp.monoAEstereo(nota2, 0, SR);
    const capaNota3 = dsp.monoAEstereo(nota3, 0.3, SR);

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
    return dsp.limitarSuave(mezcla, -0.3);
}

// ===========================================================================
// 3. AMBIENTE MUSICAL PRINCIPAL (bucle, todas las escenas por ahora)
// ===========================================================================
function generarAmbientePrincipal() {
    const loopSeg = 24;
    const cruceSeg = 3;
    const totalSeg = loopSeg + cruceSeg;
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
    const capasDrone = [capaDrone(raiz, -6, -0.4, 0.16), capaDrone(raiz, 6, 0.4, 0.16), capaDrone(quinta, 0, 0, 0.1)];
    const sub = dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: raiz / 2, segundos: totalSeg });
    const capaSub = { buffer: dsp.monoAEstereo(sub, 0, SR), ganancia: 0.1, retardoSeg: 0 };

    const capasPulso = [];
    for (let t0 = 0.6; t0 < loopSeg - 0.5; t0 += 2.4) {
        const d = 0.5;
        const env = dsp.envolvente([[0, 0], [0.02, 1], [0.18, 0.25], [d, 0]], d, SR);
        const pulso = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: (t) => 50 - t * 12, segundos: d }), env);
        capasPulso.push({ buffer: dsp.monoAEstereo(pulso, 0, SR), ganancia: 0.14, retardoSeg: t0 });
    }

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

    let textura = dsp.ruidoBlanco(totalSeg, SR, 99);
    textura = dsp.biquad(textura, SR, { tipo: "pasabanda", q: 1.4, freq: 4200 });
    const swell = dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 1 / 4.2, segundos: totalSeg }).map((v) => Math.max(0, v) * 0.6);
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
    return dsp.limitarSuave(mezcla, -1.5);
}

// ===========================================================================
// 4-5. CARPETA DE PROYECTO (panel-proyecto-uno)
// ===========================================================================
function generarCarpetaAbrir() {
    const dur = 0.5;
    const flipDur = 0.26;
    let flip = dsp.ruidoBlanco(flipDur, SR, 5);
    flip = dsp.biquad(flip, SR, { tipo: "pasabanda", q: 0.9, freq: (t) => 700 + 1900 * Math.sin(Math.PI * Math.min(1, t / flipDur)) });
    const flipEnv = dsp.envolvente([[0, 0], [0.06, 0.6], [0.16, 0.5], [flipDur, 0]], flipDur, SR);
    flip = dsp.aplicarEnvolvente(flip, flipEnv);
    const capaFlip = dsp.monoAEstereo(flip, -0.1, SR);

    const papelDur = 0.3;
    let papel = dsp.ruidoBlanco(papelDur, SR, 3);
    papel = dsp.biquad(papel, SR, { tipo: "pasabanda", q: 0.8, freq: (t) => 2000 + Math.sin(t * 36) * 700 });
    const papelEnv = dsp.envolvente([[0, 0], [0.05, 0.4], [0.12, 0.25], [0.18, 0.45], [0.24, 0.15], [papelDur, 0]], papelDur, SR);
    papel = dsp.aplicarEnvolvente(papel, papelEnv);
    const capaPapel = dsp.monoAEstereo(papel, 0.2, SR);

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
    return dsp.limitarSuave(mezcla, -0.5);
}

function generarCarpetaCerrar() {
    // Mismo material que abrir pero mas corto, sin chispa magica, y el flip va en sentido inverso.
    const dur = 0.3;
    const flipDur = 0.2;
    let flip = dsp.ruidoBlanco(flipDur, SR, 15);
    flip = dsp.biquad(flip, SR, { tipo: "pasabanda", q: 0.9, freq: (t) => 2200 - 1500 * Math.sin(Math.PI * Math.min(1, t / flipDur)) });
    const flipEnv = dsp.envolvente([[0, 0], [0.04, 0.55], [0.12, 0.3], [flipDur, 0]], flipDur, SR);
    flip = dsp.aplicarEnvolvente(flip, flipEnv);
    const capaFlip = dsp.monoAEstereo(flip, -0.1, SR);

    const papelDur = 0.18;
    let papel = dsp.ruidoBlanco(papelDur, SR, 16);
    papel = dsp.biquad(papel, SR, { tipo: "pasabanda", q: 0.9, freq: (t) => 1600 + Math.sin(t * 50) * 500 });
    const papelEnv = dsp.envolvente([[0, 0], [0.03, 0.4], [0.1, 0.2], [papelDur, 0]], papelDur, SR);
    papel = dsp.aplicarEnvolvente(papel, papelEnv);
    const capaPapel = dsp.monoAEstereo(papel, 0.15, SR);

    let mezcla = dsp.mezclar([
        { buffer: capaFlip, ganancia: 0.45, retardoSeg: 0 },
        { buffer: capaPapel, ganancia: 0.4, retardoSeg: 0.02 }
    ]);
    mezcla = dsp.recortarEstereo(mezcla, dur);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.08, amortiguacion: 0.5 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.08, amortiguacion: 0.5 });
    mezcla = dsp.fundidosEstereo(mezcla, { entradaMs: 3, salidaMs: 20 });
    mezcla = dsp.normalizarPico(mezcla, -4);
    return dsp.limitarSuave(mezcla, -0.5);
}

// ===========================================================================
// PASOS AL CAMINAR (Jugador: ciclo de animacion "caminar", una vez por vuelta de 3 fotogramas)
// ===========================================================================
function generarPaso(semilla, variacionTono) {
    // Pisada sobre rejilla metalica/piedra: ruido filtrado corto + un tic metalico muy discreto.
    const dur = 0.13;
    const golpeEnv = dsp.envolvente([[0, 0], [0.006, 1], [0.05, 0.3], [0.09, 0]], 0.09, SR);
    let golpe = dsp.ruidoBlanco(0.09, SR, semilla);
    golpe = dsp.biquad(golpe, SR, { tipo: "pasabanda", q: 1.3, freq: (260 + variacionTono * 70) });
    golpe = dsp.biquad(golpe, SR, { tipo: "pasabajos", q: 0.7, freq: 900 });
    golpe = dsp.aplicarEnvolvente(golpe, golpeEnv);
    const capaGolpe = dsp.monoAEstereo(golpe, variacionTono * 0.12, SR);

    const ticDur = 0.05;
    let tic = dsp.ruidoBlanco(ticDur, SR, semilla + 50);
    tic = dsp.biquad(tic, SR, { tipo: "pico", q: 5, freq: 2600 + variacionTono * 300, gananciaDB: 8 });
    const ticEnv = dsp.envolvente([[0, 0], [0.003, 1], [ticDur, 0]], ticDur, SR);
    tic = dsp.aplicarEnvolvente(tic, ticEnv);
    const capaTic = dsp.monoAEstereo(tic, variacionTono * 0.12, SR);

    let mezcla = dsp.mezclar([
        { buffer: capaGolpe, ganancia: 0.5, retardoSeg: 0 },
        { buffer: capaTic, ganancia: 0.22, retardoSeg: 0.004 }
    ]);
    mezcla = dsp.recortarEstereo(mezcla, dur);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.07, amortiguacion: 0.55 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.07, amortiguacion: 0.55 });
    mezcla = dsp.fundidosEstereo(mezcla, { salidaMs: 15 });
    mezcla = dsp.normalizarPico(mezcla, -6);
    return dsp.limitarSuave(mezcla, -0.5);
}

// ===========================================================================
// 6-7. ESPEJO ARCANO (panel-ordenador: el objeto "ordenador" usa el sprite del espejo)
// ===========================================================================
function generarEspejoAbrir() {
    const dur = 0.85;
    // Tink de cristal: transitorio agudo con cola larga
    const tinkEnv = dsp.envolvente([[0, 0], [0.004, 1], [0.5, 0.08], [dur, 0]], dur, SR);
    const tink = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 1760, segundos: dur }), tinkEnv);
    const capaTink = dsp.monoAEstereo(tink, 0, SR);

    // Resonancia cristalina sostenida con armonicos y vibrato lento (ecos suaves)
    const armonicos = dsp.armonicosMagicos({ duracion: dur, freqBase: 660, freqFinal: 880, pan: 0, ganancia: 0.8, vibratoHz: 3.2, vibratoProfundidad: 3 });

    // Swell de cristal grave que sube (como un espejo "despertando")
    const swellDur = 0.6;
    const swellEnv = dsp.envolvente([[0, 0], [0.3, 0.6], [swellDur, 0.2]], swellDur, SR);
    let swell = dsp.oscilador({ sampleRate: SR, tipo: "triangulo", frecuenciaHz: (t) => 220 + t * 140, segundos: swellDur });
    swell = dsp.biquad(swell, SR, { tipo: "pasabajos", q: 0.6, freq: 1600 });
    swell = dsp.aplicarEnvolvente(swell, swellEnv);
    const capaSwell = dsp.monoAEstereo(swell, -0.1, SR);

    let mezcla = dsp.mezclar([
        { buffer: capaTink, ganancia: 0.45, retardoSeg: 0 },
        { buffer: armonicos, ganancia: 0.4, retardoSeg: 0.02 },
        { buffer: capaSwell, ganancia: 0.3, retardoSeg: 0 }
    ]);
    mezcla = dsp.recortarEstereo(mezcla, dur);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.48, amortiguacion: 0.18, tamano: 1.6 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.48, amortiguacion: 0.18, tamano: 1.6 });
    mezcla = dsp.fundidosEstereo(mezcla, { salidaMs: 60 });
    mezcla = dsp.normalizarPico(mezcla, -3);
    return dsp.limitarSuave(mezcla, -0.5);
}

function generarEspejoCerrar() {
    const dur = 0.5;
    const tinkEnv = dsp.envolvente([[0, 0], [0.004, 1], [0.25, 0.06], [dur, 0]], dur, SR);
    const tink = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "seno", frecuenciaHz: 1320, segundos: dur }), tinkEnv);
    const capaTink = dsp.monoAEstereo(tink, 0, SR);
    const armonicos = dsp.armonicosMagicos({ duracion: dur, freqBase: 660, freqFinal: 440, pan: 0, ganancia: 0.55, vibratoHz: 3, vibratoProfundidad: 2.5 });

    let mezcla = dsp.mezclar([
        { buffer: capaTink, ganancia: 0.4, retardoSeg: 0 },
        { buffer: armonicos, ganancia: 0.35, retardoSeg: 0.01 }
    ]);
    mezcla = dsp.recortarEstereo(mezcla, dur);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.4, amortiguacion: 0.2, tamano: 1.3 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.4, amortiguacion: 0.2, tamano: 1.3 });
    mezcla = dsp.fundidosEstereo(mezcla, { salidaMs: 50 });
    mezcla = dsp.normalizarPico(mezcla, -3.5);
    return dsp.limitarSuave(mezcla, -0.5);
}

// ===========================================================================
// 8-9. PORTAL DE CAMBIO DE NIVEL (panel-cambio-nivel: confirmacion, no el teletransporte en si)
// ===========================================================================
function generarPortalAbrir() {
    const dur = 0.5;
    // Zumbido grave de mecanismo arcano que sube (la puerta "despierta")
    const zumbidoEnv = dsp.envolvente([[0, 0], [0.12, 1], [0.35, 0.6], [dur, 0]], dur, SR);
    let zumbido = dsp.oscilador({ sampleRate: SR, tipo: "sierra", frecuenciaHz: (t) => 45 + t * 25, segundos: dur });
    zumbido = dsp.saturarSuave(zumbido, 1.6);
    zumbido = dsp.biquad(zumbido, SR, { tipo: "pasabajos", q: 0.7, freq: 500 });
    zumbido = dsp.aplicarEnvolvente(zumbido, zumbidoEnv);
    const capaZumbido = dsp.monoAEstereo(zumbido, 0, SR);

    // Resonancia metalica tipo engranaje antiguo (ruido con filtro de pico estrecho)
    const metalDur = 0.3;
    let metal = dsp.ruidoBlanco(metalDur, SR, 44);
    metal = dsp.biquad(metal, SR, { tipo: "pico", q: 7, freq: 740, gananciaDB: 16 });
    const metalEnv = dsp.envolvente([[0, 0], [0.05, 0.7], [0.18, 0.3], [metalDur, 0]], metalDur, SR);
    metal = dsp.aplicarEnvolvente(metal, metalEnv);
    const capaMetal = dsp.monoAEstereo(metal, 0.2, SR);

    const armonicos = dsp.armonicosMagicos({ duracion: 0.4, freqBase: 300, freqFinal: 500, pan: -0.15, ganancia: 0.4, vibratoHz: 4, vibratoProfundidad: 3 });

    let mezcla = dsp.mezclar([
        { buffer: capaZumbido, ganancia: 0.55, retardoSeg: 0 },
        { buffer: capaMetal, ganancia: 0.4, retardoSeg: 0.08 },
        { buffer: armonicos, ganancia: 0.35, retardoSeg: 0.08 }
    ]);
    mezcla = dsp.recortarEstereo(mezcla, dur);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.28, amortiguacion: 0.3, tamano: 1.2 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.28, amortiguacion: 0.3, tamano: 1.2 });
    mezcla = dsp.fundidosEstereo(mezcla, { salidaMs: 35 });
    mezcla = dsp.normalizarPico(mezcla, -3);
    return dsp.limitarSuave(mezcla, -0.5);
}

function generarPortalCerrar() {
    const dur = 0.32;
    const zumbidoEnv = dsp.envolvente([[0, 0.5], [0.08, 0.3], [dur, 0]], dur, SR);
    let zumbido = dsp.oscilador({ sampleRate: SR, tipo: "sierra", frecuenciaHz: (t) => 70 - t * 20, segundos: dur });
    zumbido = dsp.saturarSuave(zumbido, 1.4);
    zumbido = dsp.biquad(zumbido, SR, { tipo: "pasabajos", q: 0.7, freq: 420 });
    zumbido = dsp.aplicarEnvolvente(zumbido, zumbidoEnv);
    const capaZumbido = dsp.monoAEstereo(zumbido, 0, SR);

    const metalDur = 0.18;
    let metal = dsp.ruidoBlanco(metalDur, SR, 45);
    metal = dsp.biquad(metal, SR, { tipo: "pico", q: 6, freq: 620, gananciaDB: 12 });
    const metalEnv = dsp.envolvente([[0, 0], [0.03, 0.6], [0.1, 0.2], [metalDur, 0]], metalDur, SR);
    metal = dsp.aplicarEnvolvente(metal, metalEnv);
    const capaMetal = dsp.monoAEstereo(metal, 0.15, SR);

    let mezcla = dsp.mezclar([
        { buffer: capaZumbido, ganancia: 0.45, retardoSeg: 0 },
        { buffer: capaMetal, ganancia: 0.3, retardoSeg: 0 }
    ]);
    mezcla = dsp.recortarEstereo(mezcla, dur);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.2, amortiguacion: 0.35 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.2, amortiguacion: 0.35 });
    mezcla = dsp.fundidosEstereo(mezcla, { salidaMs: 25 });
    mezcla = dsp.normalizarPico(mezcla, -3.5);
    return dsp.limitarSuave(mezcla, -0.5);
}

// ===========================================================================
// 10-11. ZONA DE CONTACTO (enfocar formulario de email / abrir enlace externo)
// ===========================================================================
function reduccionMuestreo(mono, factor) {
    // Simula retroinformatica/lo-fi: mantiene el valor cada `factor` muestras (sample & hold).
    const out = new Float64Array(mono.length);
    let ultimo = 0;
    for (let i = 0; i < mono.length; i++) {
        if (i % factor === 0) ultimo = mono[i];
        out[i] = ultimo;
    }
    return out;
}

function generarContactoEnfoque() {
    const dur = 0.16;
    const env = dsp.envolvente([[0, 0], [0.008, 1], [0.05, 0.4], [dur, 0]], dur, SR);
    let blip = dsp.oscilador({ sampleRate: SR, tipo: "cuadrada", frecuenciaHz: 740, segundos: dur });
    blip = reduccionMuestreo(blip, 6);
    blip = dsp.biquad(blip, SR, { tipo: "pasabajos", q: 0.7, freq: 3200 });
    blip = dsp.aplicarEnvolvente(blip, env);
    const capaBlip = dsp.monoAEstereo(blip, 0, SR);

    let mezcla = dsp.mezclar([{ buffer: capaBlip, ganancia: 0.5, retardoSeg: 0 }]);
    mezcla = dsp.recortarEstereo(mezcla, dur);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.12, amortiguacion: 0.5 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.12, amortiguacion: 0.5 });
    mezcla = dsp.fundidosEstereo(mezcla, { salidaMs: 15 });
    mezcla = dsp.normalizarPico(mezcla, -4);
    return dsp.limitarSuave(mezcla, -0.5);
}

function generarContactoEnlace() {
    const dur = 0.22;
    const capas = [620, 980].map((freq, i) => {
        const d = 0.08;
        const env = dsp.envolvente([[0, 0], [0.006, 1], [0.04, 0.3], [d, 0]], d, SR);
        let blip = dsp.oscilador({ sampleRate: SR, tipo: "cuadrada", frecuenciaHz: freq, segundos: d });
        blip = reduccionMuestreo(blip, 5);
        blip = dsp.biquad(blip, SR, { tipo: "pasabajos", q: 0.7, freq: 3400 });
        blip = dsp.aplicarEnvolvente(blip, env);
        return { buffer: dsp.monoAEstereo(blip, 0, SR), ganancia: 0.42, retardoSeg: i * 0.07 };
    });
    let mezcla = dsp.mezclar(capas);
    mezcla = dsp.recortarEstereo(mezcla, dur);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.12, amortiguacion: 0.5 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.12, amortiguacion: 0.5 });
    mezcla = dsp.fundidosEstereo(mezcla, { salidaMs: 15 });
    mezcla = dsp.normalizarPico(mezcla, -4);
    return dsp.limitarSuave(mezcla, -0.5);
}

// ===========================================================================
// 12. SALTO DEL JUGADOR (sustituye al "phaseJump1" generico)
// ===========================================================================
function generarSalto() {
    const dur = 0.22;
    const whooshEnv = dsp.envolvente([[0, 0], [0.015, 1], [0.12, 0.3], [dur, 0]], dur, SR);
    let whoosh = dsp.ruidoBlanco(dur, SR, 33);
    whoosh = dsp.biquad(whoosh, SR, { tipo: "pasabanda", q: 1, freq: (t) => 900 + t * 3200 });
    whoosh = dsp.aplicarEnvolvente(whoosh, whooshEnv);
    const capaWhoosh = dsp.monoAEstereo(whoosh, 0, SR);

    const puffEnv = dsp.envolvente([[0, 0], [0.01, 1], [0.1, 0]], 0.1, SR);
    const puff = dsp.aplicarEnvolvente(dsp.oscilador({ sampleRate: SR, tipo: "triangulo", frecuenciaHz: (t) => 380 + t * 900, segundos: 0.1 }), puffEnv);
    const capaPuff = dsp.monoAEstereo(puff, 0, SR);

    let mezcla = dsp.mezclar([
        { buffer: capaWhoosh, ganancia: 0.5, retardoSeg: 0 },
        { buffer: capaPuff, ganancia: 0.3, retardoSeg: 0 }
    ]);
    mezcla = dsp.recortarEstereo(mezcla, dur);
    mezcla.left = dsp.reverb(mezcla.left, SR, { mezcla: 0.1, amortiguacion: 0.5 });
    mezcla.right = dsp.reverb(mezcla.right, SR, { mezcla: 0.1, amortiguacion: 0.5 });
    mezcla = dsp.fundidosEstereo(mezcla, { salidaMs: 15 });
    mezcla = dsp.normalizarPico(mezcla, -4);
    return dsp.limitarSuave(mezcla, -0.5);
}

// ===========================================================================
function main() {
    const muestras = {
        teletransporte_desaparecer: generarTeletransporteDesaparecer,
        teletransporte_aparecer: generarTeletransporteAparecer,
        // 44.1k -> 22.05k (~2MB en vez de ~4.1MB); el filtro anti-aliasing puede reintroducir un
        // pequeño salto en el punto de union, asi que se corrige otra vez tras diezmar.
        ambiente_principal_loop: () => dsp.corregirCosturaBucle(dsp.submuestrear(generarAmbientePrincipal(), 2), 8),
        carpeta_abrir: generarCarpetaAbrir,
        carpeta_cerrar: generarCarpetaCerrar,
        espejo_abrir: generarEspejoAbrir,
        espejo_cerrar: generarEspejoCerrar,
        portal_abrir: generarPortalAbrir,
        portal_cerrar: generarPortalCerrar,
        contacto_enfoque: generarContactoEnfoque,
        contacto_enlace: generarContactoEnlace,
        salto: generarSalto,
        paso1: () => generarPaso(61, -1),
        paso2: () => generarPaso(62, 1)
    };
    for (const [nombre, generar] of Object.entries(muestras)) {
        const buf = generar();
        const ruta = path.join(carpetaSalida, `${nombre}.wav`);
        const info = escribirWav(ruta, buf);
        console.log(`${nombre}.wav: ${info.segundos.toFixed(2)}s, ${(info.bytes / 1024).toFixed(0)} KB`);
    }
}

main();
