"use strict";
/**
 * Motor de sintesis de audio en Node puro (sin dependencias externas).
 * Trabaja en buffers estereo { sampleRate, left: Float64Array, right: Float64Array }.
 * Todo el pipeline es determinista (PRNG con semilla) para que los sonidos sean reproducibles.
 */

const SR = 44100;

// ---------- PRNG determinista (mulberry32) ----------
function crearPRNG(semilla = 1) {
    let a = semilla >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---------- Buffers mono / estereo ----------
function monoVacio(segundos, sampleRate = SR) {
    return new Float64Array(Math.max(1, Math.round(segundos * sampleRate)));
}

function estereoVacio(segundos, sampleRate = SR) {
    return { sampleRate, left: monoVacio(segundos, sampleRate), right: monoVacio(segundos, sampleRate) };
}

function monoAEstereo(mono, pan = 0, sampleRate = SR) {
    // Ley de panorama de potencia constante. pan: -1 (izq) .. 1 (der)
    const anguloBase = (pan + 1) * 0.25 * Math.PI; // 0..pi/2
    const gananciaI = Math.cos(anguloBase);
    const gananciaD = Math.sin(anguloBase);
    const left = new Float64Array(mono.length);
    const right = new Float64Array(mono.length);
    for (let i = 0; i < mono.length; i++) {
        left[i] = mono[i] * gananciaI;
        right[i] = mono[i] * gananciaD;
    }
    return { sampleRate, left, right };
}

function mezclar(capas) {
    // capas: [{ buffer: estereo, ganancia: 1, retardoSeg: 0 }]
    let longitudMax = 0;
    for (const capa of capas) {
        const inicio = Math.round((capa.retardoSeg || 0) * capa.buffer.sampleRate);
        longitudMax = Math.max(longitudMax, inicio + capa.buffer.left.length);
    }
    const sampleRate = capas[0]?.buffer.sampleRate || SR;
    const left = new Float64Array(longitudMax);
    const right = new Float64Array(longitudMax);
    for (const capa of capas) {
        const g = capa.ganancia ?? 1;
        const inicio = Math.round((capa.retardoSeg || 0) * sampleRate);
        const { left: l, right: r } = capa.buffer;
        for (let i = 0; i < l.length; i++) {
            left[inicio + i] += l[i] * g;
            right[inicio + i] += r[i] * g;
        }
    }
    return { sampleRate, left, right };
}

function recortarEstereo(buf, segundos) {
    const n = Math.min(buf.left.length, Math.round(segundos * buf.sampleRate));
    return { sampleRate: buf.sampleRate, left: buf.left.slice(0, n), right: buf.right.slice(0, n) };
}

// ---------- Osciladores ----------
function forma(tipo, fase) {
    const f = fase - Math.floor(fase); // 0..1
    switch (tipo) {
        case "seno": return Math.sin(2 * Math.PI * f);
        case "sierra": return 2 * (f - Math.floor(f + 0.5));
        case "triangulo": return 2 * Math.abs(2 * (f - Math.floor(f + 0.5))) - 1;
        case "cuadrada": return f < 0.5 ? 1 : -1;
        default: return Math.sin(2 * Math.PI * f);
    }
}

/** frecuenciaHz puede ser numero o funcion(t) -> Hz (para glissandos / pitch envelopes). */
function oscilador({ tipo = "seno", frecuenciaHz = 440, segundos, sampleRate = SR, faseInicial = 0 }) {
    const n = Math.round(segundos * sampleRate);
    const out = new Float64Array(n);
    let fase = faseInicial;
    const fnFrecuencia = typeof frecuenciaHz === "function" ? frecuenciaHz : () => frecuenciaHz;
    for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        fase += fnFrecuencia(t) / sampleRate;
        out[i] = forma(tipo, fase);
    }
    return out;
}

function ruidoBlanco(segundos, sampleRate = SR, semilla = 1) {
    const rnd = crearPRNG(semilla);
    const n = Math.round(segundos * sampleRate);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = rnd() * 2 - 1;
    return out;
}

// ---------- Envolventes ----------
/** puntos: [[tSeg, valor], ...] ordenados; interpolacion lineal entre puntos. */
function envolvente(puntos, segundos, sampleRate = SR) {
    const n = Math.round(segundos * sampleRate);
    const out = new Float64Array(n);
    let idx = 0;
    for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        while (idx < puntos.length - 2 && t > puntos[idx + 1][0]) idx++;
        const [t0, v0] = puntos[idx];
        const [t1, v1] = puntos[Math.min(idx + 1, puntos.length - 1)];
        const frac = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 1;
        out[i] = v0 + (v1 - v0) * frac;
    }
    return out;
}

function adsr({ ataqueSeg = 0.01, decaimientoSeg = 0.1, sostenNivel = 0.6, sostenSeg = 0.1, liberacionSeg = 0.2 }, sampleRate = SR) {
    const total = ataqueSeg + decaimientoSeg + sostenSeg + liberacionSeg;
    return envolvente([
        [0, 0],
        [ataqueSeg, 1],
        [ataqueSeg + decaimientoSeg, sostenNivel],
        [ataqueSeg + decaimientoSeg + sostenSeg, sostenNivel],
        [total, 0]
    ], total, sampleRate);
}

function aplicarEnvolvente(buf, env) {
    const n = Math.min(buf.length, env.length);
    const out = new Float64Array(buf.length);
    for (let i = 0; i < n; i++) out[i] = buf[i] * env[i];
    return out;
}

// ---------- Filtro biquad (formulas RBJ) ----------
function coefBiquad(tipo, freq, sampleRate, q = 0.707, gananciaDB = 0) {
    const w0 = 2 * Math.PI * Math.min(freq, sampleRate * 0.49) / sampleRate;
    const cosw0 = Math.cos(w0), sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * q);
    const A = Math.pow(10, gananciaDB / 40);
    let b0, b1, b2, a0, a1, a2;
    if (tipo === "pasabajos") {
        b0 = (1 - cosw0) / 2; b1 = 1 - cosw0; b2 = (1 - cosw0) / 2;
        a0 = 1 + alpha; a1 = -2 * cosw0; a2 = 1 - alpha;
    } else if (tipo === "pasaaltos") {
        b0 = (1 + cosw0) / 2; b1 = -(1 + cosw0); b2 = (1 + cosw0) / 2;
        a0 = 1 + alpha; a1 = -2 * cosw0; a2 = 1 - alpha;
    } else if (tipo === "pasabanda") {
        b0 = alpha; b1 = 0; b2 = -alpha;
        a0 = 1 + alpha; a1 = -2 * cosw0; a2 = 1 - alpha;
    } else if (tipo === "pico") {
        b0 = 1 + alpha * A; b1 = -2 * cosw0; b2 = 1 - alpha * A;
        a0 = 1 + alpha / A; a1 = -2 * cosw0; a2 = 1 - alpha / A;
    } else {
        b0 = 1; b1 = 0; b2 = 0; a0 = 1; a1 = 0; a2 = 0;
    }
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** freq puede ser numero o funcion(t)->Hz para barridos de filtro (whoosh). */
function biquad(buf, sampleRate, { tipo = "pasabajos", freq = 1000, q = 0.707, gananciaDB = 0, bloque = 64 } = {}) {
    const fnFreq = typeof freq === "function" ? freq : () => freq;
    const out = new Float64Array(buf.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let inicio = 0; inicio < buf.length; inicio += bloque) {
        const t = inicio / sampleRate;
        const c = coefBiquad(tipo, fnFreq(t), sampleRate, q, gananciaDB);
        const fin = Math.min(inicio + bloque, buf.length);
        for (let i = inicio; i < fin; i++) {
            const x0 = buf[i];
            const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
            x2 = x1; x1 = x0; y2 = y1; y1 = y0;
            out[i] = y0;
        }
    }
    return out;
}

// ---------- Distorsion / saturacion ----------
function saturarSuave(buf, drive = 1) {
    const norm = Math.tanh(drive) || 1;
    const out = new Float64Array(buf.length);
    for (let i = 0; i < buf.length; i++) out[i] = Math.tanh(buf[i] * drive) / norm;
    return out;
}

// ---------- Linea de retardo / eco ----------
function retardo(buf, sampleRate, { ms = 300, realimentacion = 0.35, mezcla = 0.3, filtroHz = 4000 } = {}) {
    const retardoMuestras = Math.round((ms / 1000) * sampleRate);
    const linea = new Float64Array(buf.length + retardoMuestras * 6);
    const out = new Float64Array(buf.length + retardoMuestras * 4);
    let z1 = 0;
    const w0 = 2 * Math.PI * filtroHz / sampleRate;
    const alfaLP = Math.min(1, w0);
    for (let i = 0; i < out.length; i++) {
        const seco = i < buf.length ? buf[i] : 0;
        const leido = i - retardoMuestras >= 0 ? linea[i - retardoMuestras] : 0;
        z1 += (leido - z1) * alfaLP; // amortigua agudos en la realimentacion
        const escrito = seco + z1 * realimentacion;
        linea[i] = escrito;
        out[i] = seco * (1 - mezcla) + leido * mezcla;
    }
    return out;
}

// ---------- Reverberacion tipo Schroeder ----------
function filtroComb(buf, sampleRate, retardoMs, realimentacion, amortiguacion) {
    const retardoMuestras = Math.max(1, Math.round((retardoMs / 1000) * sampleRate));
    const out = new Float64Array(buf.length);
    const linea = new Float64Array(buf.length + retardoMuestras);
    let filtroEstado = 0;
    for (let i = 0; i < buf.length; i++) {
        const leido = linea[i];
        filtroEstado = leido * (1 - amortiguacion) + filtroEstado * amortiguacion;
        const escrito = buf[i] + filtroEstado * realimentacion;
        linea[i + retardoMuestras] = escrito;
        out[i] = leido;
    }
    return out;
}

function filtroAllpass(buf, sampleRate, retardoMs, ganancia = 0.5) {
    const retardoMuestras = Math.max(1, Math.round((retardoMs / 1000) * sampleRate));
    const out = new Float64Array(buf.length);
    const linea = new Float64Array(buf.length + retardoMuestras);
    for (let i = 0; i < buf.length; i++) {
        const xRetardado = i >= retardoMuestras ? (i - retardoMuestras < buf.length ? buf[i - retardoMuestras] : 0) : 0;
        const bufi = buf[i];
        const vn = bufi - ganancia * (linea[i] || 0);
        out[i] = linea[i] + ganancia * vn;
        linea[i + retardoMuestras] = vn;
    }
    return out;
}

function reverb(buf, sampleRate, { mezcla = 0.28, tamano = 1, amortiguacion = 0.25 } = {}) {
    const combos = [1687, 1601, 2053, 2251].map((d) => d * tamano);
    const colaCombs = combos.map((ms) => filtroComb(buf, sampleRate, ms / sampleRate * 1000, 0.84, amortiguacion));
    let cola = new Float64Array(buf.length);
    for (const c of colaCombs) for (let i = 0; i < cola.length; i++) cola[i] += c[i] / colaCombs.length;
    cola = filtroAllpass(cola, sampleRate, 3.47, 0.5);
    cola = filtroAllpass(cola, sampleRate, 1.13, 0.5);
    const out = new Float64Array(buf.length);
    for (let i = 0; i < buf.length; i++) out[i] = buf[i] * (1 - mezcla) + cola[i] * mezcla;
    return out;
}

// ---------- Fundidos ----------
function fundidoEntrada(mono, ms, sampleRate = SR) {
    const n = Math.min(mono.length, Math.round((ms / 1000) * sampleRate));
    const out = Float64Array.from(mono);
    for (let i = 0; i < n; i++) out[i] *= i / n;
    return out;
}

function fundidoSalida(mono, ms, sampleRate = SR) {
    const n = Math.min(mono.length, Math.round((ms / 1000) * sampleRate));
    const out = Float64Array.from(mono);
    for (let i = 0; i < n; i++) out[mono.length - 1 - i] *= i / n;
    return out;
}

function fundidosEstereo(buf, { entradaMs = 0, salidaMs = 0 } = {}) {
    let { left, right } = buf;
    if (entradaMs > 0) { left = fundidoEntrada(left, entradaMs, buf.sampleRate); right = fundidoEntrada(right, entradaMs, buf.sampleRate); }
    if (salidaMs > 0) { left = fundidoSalida(left, salidaMs, buf.sampleRate); right = fundidoSalida(right, salidaMs, buf.sampleRate); }
    return { sampleRate: buf.sampleRate, left, right };
}

// ---------- Empalme para bucle sin costuras ----------
/**
 * buf debe durar (segundosBucle + cruceSeg). Se funde la cola sobre la cabeza
 * para que el ultimo sample conecte con el primero sin clic.
 */
function haceBucle(buf, segundosBucle, cruceSeg) {
    const sampleRate = buf.sampleRate;
    const nBucle = Math.round(segundosBucle * sampleRate);
    const nCruce = Math.round(cruceSeg * sampleRate);
    const left = new Float64Array(nBucle);
    const right = new Float64Array(nBucle);
    for (let i = 0; i < nBucle; i++) { left[i] = buf.left[i]; right[i] = buf.right[i]; }
    for (let i = 0; i < nCruce; i++) {
        const t = i / nCruce; // 0..1
        const colaL = buf.left[nBucle + i] || 0;
        const colaR = buf.right[nBucle + i] || 0;
        left[i] = left[i] * t + colaL * (1 - t);
        right[i] = right[i] * t + colaR * (1 - t);
    }
    return { sampleRate, left, right };
}

/** Corrige el salto de muestra residual en el punto de union de un bucle ya cerrado:
 *  aplica una rampa de correccion que decae a 0 en los primeros `ms` para que la
 *  ultima muestra conecte exactamente con la primera, sin alterar el resto del audio. */
function corregirCosturaBucle(buf, ms) {
    const n = Math.max(1, Math.round((ms / 1000) * buf.sampleRate));
    const len = buf.left.length;
    const left = Float64Array.from(buf.left);
    const right = Float64Array.from(buf.right);
    const deltaL = buf.left[len - 1] - buf.left[0];
    const deltaR = buf.right[len - 1] - buf.right[0];
    for (let i = 0; i < n; i++) {
        const peso = 1 - i / n; // 1 en i=0, 0 en i=n
        left[i] += deltaL * peso;
        right[i] += deltaR * peso;
    }
    return { sampleRate: buf.sampleRate, left, right };
}

// ---------- Normalizacion / limitador ----------
function picoEstereo(buf) {
    let pico = 0;
    for (let i = 0; i < buf.left.length; i++) {
        pico = Math.max(pico, Math.abs(buf.left[i]), Math.abs(buf.right[i]));
    }
    return pico;
}

function normalizarPico(buf, objetivoDB = -1) {
    const pico = picoEstereo(buf);
    if (pico <= 0) return buf;
    const objetivo = Math.pow(10, objetivoDB / 20);
    const factor = objetivo / pico;
    const left = new Float64Array(buf.left.length);
    const right = new Float64Array(buf.right.length);
    for (let i = 0; i < left.length; i++) { left[i] = buf.left[i] * factor; right[i] = buf.right[i] * factor; }
    return { sampleRate: buf.sampleRate, left, right };
}

function limitarSuave(buf, techoDB = -0.3) {
    const techo = Math.pow(10, techoDB / 20);
    const left = new Float64Array(buf.left.length);
    const right = new Float64Array(buf.right.length);
    for (let i = 0; i < left.length; i++) {
        left[i] = Math.tanh(buf.left[i] / techo) * techo;
        right[i] = Math.tanh(buf.right[i] / techo) * techo;
    }
    return { sampleRate: buf.sampleRate, left, right };
}

/** Reduce la frecuencia de muestreo (ej. 44100 -> 22050) para aligerar el peso de descarga de
 *  pistas largas (musica). Aplica un pasabajos anti-aliasing antes de diezmar. */
function submuestrear(buf, factor) {
    const corte = (buf.sampleRate / factor) * 0.45;
    const left = biquad(buf.left, buf.sampleRate, { tipo: "pasabajos", q: 0.707, freq: corte });
    const right = biquad(buf.right, buf.sampleRate, { tipo: "pasabajos", q: 0.707, freq: corte });
    const n = Math.floor(left.length / factor);
    const outL = new Float64Array(n);
    const outR = new Float64Array(n);
    for (let i = 0; i < n; i++) { outL[i] = left[i * factor]; outR[i] = right[i * factor]; }
    return { sampleRate: Math.round(buf.sampleRate / factor), left: outL, right: outR };
}

// ---------- Capas magicas reutilizables (paleta comun del catalogo) ----------
/**
 * Remolino magico continuo: ruido con resonancia que serpentea (LFO sobre el centro de un
 * pasabanda) en vez de un barrido lineal unico. La energia fluye en vez de golpear una sola vez
 * (referencia de direccion artistica: "fire magic spell, continuous").
 */
function remolinoMagico({ duracion, freqInicio, freqFin, lfoHz, lfoProfundidad, semilla, pan = 0, saturacion = 1.3, q = 2.2, sampleRate = SR }) {
    let o = ruidoBlanco(duracion, sampleRate, semilla);
    o = biquad(o, sampleRate, {
        tipo: "pasabanda", q,
        freq: (t) => {
            const base = freqInicio + (freqFin - freqInicio) * Math.min(1, t / duracion);
            return Math.max(80, base + lfoProfundidad * Math.sin(2 * Math.PI * t * lfoHz));
        }
    });
    o = saturarSuave(o, saturacion);
    const env = envolvente([[0, 0], [0.035, 1], [duracion * 0.55, 0.65], [duracion, 0]], duracion, sampleRate);
    o = aplicarEnvolvente(o, env);
    return monoAEstereo(o, pan, sampleRate);
}

/** Armonicos sostenidos con vibrato: shimmer magico que dura todo el sonido, no solo un golpe. */
function armonicosMagicos({ duracion, freqBase, freqFinal, pan = 0, ganancia = 1, vibratoHz = 5.5, vibratoProfundidad = 4, sampleRate = SR }) {
    const vibrato = (t) => Math.sin(2 * Math.PI * t * vibratoHz) * vibratoProfundidad;
    const freq = (t) => {
        const base = freqBase + (freqFinal - freqBase) * Math.min(1, t / duracion);
        return base + vibrato(t);
    };
    const fund = oscilador({ sampleRate, tipo: "triangulo", frecuenciaHz: freq, segundos: duracion });
    const h2 = oscilador({ sampleRate, tipo: "seno", frecuenciaHz: (t) => freq(t) * 2, segundos: duracion });
    const h3 = oscilador({ sampleRate, tipo: "seno", frecuenciaHz: (t) => freq(t) * 3, segundos: duracion });
    const mezcla = fund.map((v, i) => v * 0.55 + h2[i] * 0.3 + h3[i] * 0.15);
    const env = envolvente([[0, 0], [0.05, 1], [duracion * 0.6, 0.5], [duracion, 0]], duracion, sampleRate);
    const out = aplicarEnvolvente(mezcla, env);
    return monoAEstereo(out.map((v) => v * ganancia), pan, sampleRate);
}

module.exports = {
    SR, crearPRNG, monoVacio, estereoVacio, monoAEstereo, mezclar, recortarEstereo,
    oscilador, ruidoBlanco, envolvente, adsr, aplicarEnvolvente,
    biquad, saturarSuave, retardo, reverb, fundidosEstereo, haceBucle, corregirCosturaBucle,
    picoEstereo, normalizarPico, limitarSuave, remolinoMagico, armonicosMagicos, submuestrear
};
