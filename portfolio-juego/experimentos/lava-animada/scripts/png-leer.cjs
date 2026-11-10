// Decodificador PNG minimo (solo color RGBA/RGB de 8 bits, sin interlace) usando zlib del nucleo
// de Node. Pensado para inspeccionar los sprites/parches generados sin necesitar un navegador.
"use strict";
const zlib = require("node:zlib");
const fs = require("node:fs");

function leerPNG(ruta) {
    const buf = fs.readFileSync(ruta);
    if (buf.toString("hex", 0, 8) !== "89504e470d0a1a0a") throw new Error("No es un PNG valido");
    let offset = 8;
    let ancho = 0, alto = 0, bitDepth = 0, colorType = 0, interlace = 0;
    const idatTrozos = [];
    while (offset < buf.length) {
        const longitud = buf.readUInt32BE(offset);
        const tipo = buf.toString("ascii", offset + 4, offset + 8);
        const datos = buf.subarray(offset + 8, offset + 8 + longitud);
        if (tipo === "IHDR") {
            ancho = datos.readUInt32BE(0);
            alto = datos.readUInt32BE(4);
            bitDepth = datos[8];
            colorType = datos[9];
            interlace = datos[12];
        } else if (tipo === "IDAT") {
            idatTrozos.push(datos);
        }
        offset += 8 + longitud + 4;
        if (tipo === "IEND") break;
    }
    if (interlace !== 0) throw new Error("Interlace no soportado");
    if (bitDepth !== 8) throw new Error(`bitDepth ${bitDepth} no soportado`);
    const canales = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
    if (!canales) throw new Error(`colorType ${colorType} no soportado`);

    const sinComprimir = zlib.inflateSync(Buffer.concat(idatTrozos));
    const bytesPorPixel = canales; // 8 bits por canal
    const bytesPorFila = ancho * bytesPorPixel;
    const salida = new Uint8Array(ancho * alto * 4); // siempre exportamos como RGBA

    let posEntrada = 0;
    const filaAnterior = new Uint8Array(bytesPorFila);
    for (let y = 0; y < alto; y++) {
        const filtro = sinComprimir[posEntrada]; posEntrada++;
        const filaActual = sinComprimir.subarray(posEntrada, posEntrada + bytesPorFila);
        posEntrada += bytesPorFila;
        const filaDesfiltrada = new Uint8Array(bytesPorFila);
        for (let x = 0; x < bytesPorFila; x++) {
            const a = x >= bytesPorPixel ? filaDesfiltrada[x - bytesPorPixel] : 0;
            const b = filaAnterior[x];
            const c = x >= bytesPorPixel ? filaAnterior[x - bytesPorPixel] : 0;
            const raw = filaActual[x];
            let valor;
            if (filtro === 0) valor = raw;
            else if (filtro === 1) valor = raw + a;
            else if (filtro === 2) valor = raw + b;
            else if (filtro === 3) valor = raw + Math.floor((a + b) / 2);
            else if (filtro === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
                valor = raw + pr;
            } else throw new Error(`filtro PNG desconocido ${filtro}`);
            filaDesfiltrada[x] = valor & 0xff;
        }
        for (let x = 0; x < ancho; x++) {
            const iEnt = x * bytesPorPixel;
            const iSal = (y * ancho + x) * 4;
            if (canales === 4) {
                salida[iSal] = filaDesfiltrada[iEnt]; salida[iSal + 1] = filaDesfiltrada[iEnt + 1];
                salida[iSal + 2] = filaDesfiltrada[iEnt + 2]; salida[iSal + 3] = filaDesfiltrada[iEnt + 3];
            } else if (canales === 3) {
                salida[iSal] = filaDesfiltrada[iEnt]; salida[iSal + 1] = filaDesfiltrada[iEnt + 1];
                salida[iSal + 2] = filaDesfiltrada[iEnt + 2]; salida[iSal + 3] = 255;
            } else if (canales === 2) {
                salida[iSal] = salida[iSal + 1] = salida[iSal + 2] = filaDesfiltrada[iEnt];
                salida[iSal + 3] = filaDesfiltrada[iEnt + 1];
            } else if (canales === 1) {
                salida[iSal] = salida[iSal + 1] = salida[iSal + 2] = filaDesfiltrada[iEnt];
                salida[iSal + 3] = 255;
            }
        }
        filaAnterior.set(filaDesfiltrada);
    }
    return { width: ancho, height: alto, data: salida };
}

module.exports = { leerPNG };
