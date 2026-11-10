"use strict";
const fs = require("node:fs");

/** Escribe un buffer estereo {sampleRate, left, right} (Float64, -1..1) a WAV PCM de 16 bits. */
function escribirWav(rutaArchivo, buf) {
    const { sampleRate, left, right } = buf;
    const n = left.length;
    const bloque = 4; // 2 canales * 2 bytes
    const datosBytes = n * bloque;
    const out = Buffer.alloc(44 + datosBytes);
    out.write("RIFF", 0);
    out.writeUInt32LE(36 + datosBytes, 4);
    out.write("WAVE", 8);
    out.write("fmt ", 12);
    out.writeUInt32LE(16, 16);
    out.writeUInt16LE(1, 20); // PCM
    out.writeUInt16LE(2, 22); // estereo
    out.writeUInt32LE(sampleRate, 24);
    out.writeUInt32LE(sampleRate * bloque, 28);
    out.writeUInt16LE(bloque, 32);
    out.writeUInt16LE(16, 34);
    out.write("data", 36);
    out.writeUInt32LE(datosBytes, 40);
    let offset = 44;
    for (let i = 0; i < n; i++) {
        const l = Math.max(-1, Math.min(1, left[i]));
        const r = Math.max(-1, Math.min(1, right[i]));
        out.writeInt16LE(Math.round(l * (l < 0 ? 32768 : 32767)), offset); offset += 2;
        out.writeInt16LE(Math.round(r * (r < 0 ? 32768 : 32767)), offset); offset += 2;
    }
    fs.mkdirSync(require("node:path").dirname(rutaArchivo), { recursive: true });
    fs.writeFileSync(rutaArchivo, out);
    return { bytes: out.length, segundos: n / sampleRate };
}

/** Lee un WAV PCM de 16 bits (mono o estereo) y devuelve {sampleRate, left, right}. */
function leerWav(rutaArchivo) {
    const buf = fs.readFileSync(rutaArchivo);
    if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
        throw new Error(`No es un WAV valido: ${rutaArchivo}`);
    }
    let offset = 12;
    let sampleRate = 44100, canales = 2, bitsPorMuestra = 16, datosInicio = -1, datosLongitud = 0;
    while (offset < buf.length - 8) {
        const id = buf.toString("ascii", offset, offset + 4);
        const tam = buf.readUInt32LE(offset + 4);
        if (id === "fmt ") {
            canales = buf.readUInt16LE(offset + 10);
            sampleRate = buf.readUInt32LE(offset + 12);
            bitsPorMuestra = buf.readUInt16LE(offset + 22);
        } else if (id === "data") {
            datosInicio = offset + 8;
            datosLongitud = tam;
        }
        offset += 8 + tam + (tam % 2);
    }
    if (datosInicio < 0) throw new Error(`WAV sin bloque 'data': ${rutaArchivo}`);
    const bytesPorMuestra = bitsPorMuestra / 8;
    const n = Math.floor(datosLongitud / bytesPorMuestra / canales);
    const left = new Float64Array(n);
    const right = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const base = datosInicio + i * canales * bytesPorMuestra;
        const l = buf.readInt16LE(base) / 32768;
        const r = canales > 1 ? buf.readInt16LE(base + bytesPorMuestra) / 32768 : l;
        left[i] = l; right[i] = r;
    }
    return { sampleRate, left, right };
}

module.exports = { escribirWav, leerWav };
