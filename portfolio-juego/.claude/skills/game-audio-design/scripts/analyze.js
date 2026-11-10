"use strict";
/** Comprobacion tecnica (no auditiva) de los WAV generados: pico, RMS y continuidad del empalme de bucle. */
const fs = require("node:fs");
const path = require("node:path");
const { leerWav } = require("./wav.js");

function dB(valor) { return valor > 0 ? 20 * Math.log10(valor) : -Infinity; }

function analizar(ruta) {
    const buf = leerWav(ruta);
    let pico = 0, sumaCuadrados = 0;
    for (let i = 0; i < buf.left.length; i++) {
        pico = Math.max(pico, Math.abs(buf.left[i]), Math.abs(buf.right[i]));
        sumaCuadrados += buf.left[i] * buf.left[i] + buf.right[i] * buf.right[i];
    }
    const rms = Math.sqrt(sumaCuadrados / (buf.left.length * 2));
    const n = buf.left.length;
    const saltoCostura = n > 1
        ? Math.max(Math.abs(buf.left[0] - buf.left[n - 1]), Math.abs(buf.right[0] - buf.right[n - 1]))
        : 0;
    return {
        archivo: path.basename(ruta),
        duracionSeg: (n / buf.sampleRate).toFixed(2),
        picoDBFS: dB(pico).toFixed(1),
        rmsDBFS: dB(rms).toFixed(1),
        saltoCostura: saltoCostura.toFixed(4)
    };
}

const carpeta = process.argv[2];
if (!carpeta) { console.error("Uso: node analyze.js <carpeta>"); process.exit(1); }

for (const archivo of fs.readdirSync(carpeta).filter((f) => f.endsWith(".wav"))) {
    const r = analizar(path.join(carpeta, archivo));
    console.log(
        `${r.archivo.padEnd(32)} dur=${r.duracionSeg}s  pico=${r.picoDBFS}dBFS  rms=${r.rmsDBFS}dBFS  saltoCostura=${r.saltoCostura}`
    );
}
