// Codificador PNG minimo (RGBA 8 bits, sin interlace, filtro 0) usando zlib del nucleo de Node.
"use strict";
const zlib = require("node:zlib");
const fs = require("node:fs");

function crc32(buf) {
    let c, crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        c = (crc ^ buf[i]) & 0xFF;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function trozo(tipo, datos) {
    const longitud = Buffer.alloc(4); longitud.writeUInt32BE(datos.length, 0);
    const tipoBuf = Buffer.from(tipo, "ascii");
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([tipoBuf, datos])), 0);
    return Buffer.concat([longitud, tipoBuf, datos, crcBuf]);
}

/** data: Uint8Array RGBA (width*height*4). */
function escribirPNG(ruta, width, height, data) {
    const firma = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8bit RGBA, sin interlace

    const bytesPorFila = width * 4;
    const crudo = Buffer.alloc((bytesPorFila + 1) * height);
    for (let y = 0; y < height; y++) {
        const destIni = y * (bytesPorFila + 1);
        crudo[destIni] = 0; // filtro 0 (ninguno)
        const srcIni = y * bytesPorFila;
        Buffer.from(data.buffer, data.byteOffset + srcIni, bytesPorFila).copy(crudo, destIni + 1);
    }
    const comprimido = zlib.deflateSync(crudo, { level: 9 });

    const salida = Buffer.concat([
        firma,
        trozo("IHDR", ihdr),
        trozo("IDAT", comprimido),
        trozo("IEND", Buffer.alloc(0))
    ]);
    fs.mkdirSync(require("node:path").dirname(ruta), { recursive: true });
    fs.writeFileSync(ruta, salida);
    return salida.length;
}

module.exports = { escribirPNG };
