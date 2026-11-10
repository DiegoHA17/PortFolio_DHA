// Genera los recursos de los fondos animados del juego a partir del experimento
// `experimentos/lava-animada` (que sigue siendo la fuente de verdad).
//
// - Cada capa animada del experimento son 8 fotogramas de lienzo completo (1672x941, casi todo
//   transparente). Aqui se recortan a la caja comun de los 8 fotogramas (+ margen transparente)
//   y se apilan en vertical en UNA hoja por capa. Asi el juego descarga 1 archivo por capa y el
//   navegador decodifica solo los pixeles utiles (un lienzo completo decodificado ocupa ~6.3MB).
// - Los sprites colgantes del nivel 2 (jaula y cajon) se reducen a 1/3 con promedio por area
//   (alfa premultiplicado); se muestran a ~100px de ancho, el original mide ~850px.
// - Se copia el fondo del nivel 2 sin los objetos colgantes (parcheado en el experimento).
// - Se escribe `src/js/fondos-animados-datos.js` con las coordenadas (en pixeles de la imagen de
//   fondo) que usa `src/js/fondos-animados.js`.
//
// Uso (desde portfolio-juego/):  node tools/generar-fondos-animados.cjs
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { leerPNG } = require("../experimentos/lava-animada/scripts/png-leer.cjs");

const RAIZ = path.resolve(__dirname, "..");
const ORIGEN = path.join(RAIZ, "experimentos/lava-animada/recursos/frames");
const DESTINO = path.join(RAIZ, "src/assets/imagenes/escenarios/animados");
const ARCHIVO_DATOS = path.join(RAIZ, "src/js/fondos-animados-datos.js");
const NUM_FOTOGRAMAS = 8;
const MARGEN = 2; // px transparentes alrededor de cada fotograma: evita sangrado entre fotogramas al escalar

// Capas por nivel, en el mismo orden que el experimento (comparacion-todos.html).
const CAPAS = {
    1: ["cascada1", "cascada2", "suelo"],
    2: ["agua2", "lamparas2"],
    3: ["agua3", "brillos3", "pantalla3"],
    4: ["agua4", "ondas4"]
};

// Parametros de los colgantes copiados del experimento (comparacion-todos.html, ronda 5).
// x/y/ancho en pixeles de la imagen de fondo; origen = pivote de la oscilacion en % del sprite.
const COLGANTES = [
    { id: "jaula", nivel: 2, origen: "jaula2-sprite-v2.png", destino: "jaula-colgante.png",
        x: 141, y: -36, ancho: 102, origenX: 50.4, origenY: 0, animacion: "oscilar-colgante-1", ancho3: 296 },
    { id: "cajon", nivel: 2, origen: "cajon2-sprite.png", destino: "cajon-colgante.png",
        x: 487, y: 366, ancho: 105, origenX: 50, origenY: 3.6, animacion: "oscilar-colgante-2", ancho3: 280 }
];

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let k = 0; k < 8; k++) crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function trozo(tipo, datos) {
    const longitud = Buffer.alloc(4);
    longitud.writeUInt32BE(datos.length, 0);
    const cuerpo = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(cuerpo), 0);
    return Buffer.concat([longitud, cuerpo, crc]);
}

function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
}

// Codificador PNG RGBA 8 bits con filtro adaptativo por fila (heuristica de suma minima).
function escribirPNG(ruta, ancho, alto, rgba) {
    const bpf = ancho * 4;
    const crudo = Buffer.alloc((bpf + 1) * alto);
    const candidato = Buffer.alloc(bpf);
    const mejor = Buffer.alloc(bpf);
    for (let y = 0; y < alto; y++) {
        const fila = rgba.subarray(y * bpf, (y + 1) * bpf);
        const previa = y > 0 ? rgba.subarray((y - 1) * bpf, y * bpf) : null;
        let mejorFiltro = 0, mejorSuma = Infinity;
        for (let filtro = 0; filtro < 5; filtro++) {
            let suma = 0;
            for (let i = 0; i < bpf; i++) {
                const a = i >= 4 ? fila[i - 4] : 0;
                const b = previa ? previa[i] : 0;
                const c = previa && i >= 4 ? previa[i - 4] : 0;
                const pred = filtro === 0 ? 0 : filtro === 1 ? a : filtro === 2 ? b
                    : filtro === 3 ? ((a + b) >> 1) : paeth(a, b, c);
                const v = (fila[i] - pred) & 0xff;
                candidato[i] = v;
                suma += v < 128 ? v : 256 - v;
            }
            if (suma < mejorSuma) { mejorSuma = suma; mejorFiltro = filtro; candidato.copy(mejor); }
        }
        crudo[y * (bpf + 1)] = mejorFiltro;
        mejor.copy(crudo, y * (bpf + 1) + 1);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(ancho, 0);
    ihdr.writeUInt32BE(alto, 4);
    ihdr[8] = 8; ihdr[9] = 6;
    const png = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        trozo("IHDR", ihdr),
        trozo("IDAT", zlib.deflateSync(crudo, { level: 9 })),
        trozo("IEND", Buffer.alloc(0))
    ]);
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
    fs.writeFileSync(ruta, png);
    return png.length;
}

function generarHoja(prefijo) {
    const fotogramas = [];
    for (let k = 0; k < NUM_FOTOGRAMAS; k++) {
        fotogramas.push(leerPNG(path.join(ORIGEN, `${prefijo}-${k}.png`)));
    }
    const { width: W, height: H } = fotogramas[0];
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (const { width, height, data } of fotogramas) {
        if (width !== W || height !== H) throw new Error(`${prefijo}: fotogramas de distinto tamano`);
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                if (data[(y * W + x) * 4 + 3] === 0) continue;
                if (x < x0) x0 = x; if (x > x1) x1 = x;
                if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
        }
    }
    if (x1 < 0) throw new Error(`${prefijo}: todos los fotogramas estan vacios`);
    // La caja util ya trae contenido hasta el borde de la caja; el margen se anade como relleno
    // transparente (no se toman pixeles de fuera), asi que la posicion en el fondo es x0-MARGEN.
    const anchoUtil = x1 - x0 + 1, altoUtil = y1 - y0 + 1;
    const ancho = anchoUtil + MARGEN * 2, altoFotograma = altoUtil + MARGEN * 2;
    const hoja = new Uint8Array(ancho * altoFotograma * NUM_FOTOGRAMAS * 4);
    fotogramas.forEach(({ data }, k) => {
        for (let y = 0; y < altoUtil; y++) {
            const origen = ((y0 + y) * W + x0) * 4;
            const destino = ((k * altoFotograma + MARGEN + y) * ancho + MARGEN) * 4;
            hoja.set(data.subarray(origen, origen + anchoUtil * 4), destino);
        }
    });
    const bytes = escribirPNG(path.join(DESTINO, `${prefijo}.png`), ancho, altoFotograma * NUM_FOTOGRAMAS, hoja);
    return { id: prefijo, x: x0 - MARGEN, y: y0 - MARGEN, ancho, alto: altoFotograma, bytes };
}

// Reduccion por promedio de area con alfa premultiplicado (no oscurece los bordes).
function reducir({ width: W, height: H, data }, anchoDestino) {
    const escala = W / anchoDestino;
    const altoDestino = Math.round(H / escala);
    const escalaY = H / altoDestino;
    const salida = new Uint8Array(anchoDestino * altoDestino * 4);
    for (let dy = 0; dy < altoDestino; dy++) {
        const sy0 = dy * escalaY, sy1 = sy0 + escalaY;
        for (let dx = 0; dx < anchoDestino; dx++) {
            const sx0 = dx * escala, sx1 = sx0 + escala;
            let r = 0, g = 0, b = 0, a = 0, peso = 0;
            for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy++) {
                const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
                for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx++) {
                    const w = wy * (Math.min(sx + 1, sx1) - Math.max(sx, sx0));
                    const i = (sy * W + sx) * 4;
                    const alfa = data[i + 3] / 255;
                    r += data[i] * alfa * w; g += data[i + 1] * alfa * w; b += data[i + 2] * alfa * w;
                    a += alfa * w; peso += w;
                }
            }
            const o = (dy * anchoDestino + dx) * 4;
            if (a > 0) {
                salida[o] = Math.round(r / a); salida[o + 1] = Math.round(g / a); salida[o + 2] = Math.round(b / a);
            }
            salida[o + 3] = Math.round((a / peso) * 255);
        }
    }
    return { ancho: anchoDestino, alto: altoDestino, data: salida };
}

const capas = {};
let total = 0;
for (const [nivel, prefijos] of Object.entries(CAPAS)) {
    capas[nivel] = prefijos.map((prefijo) => {
        const capa = generarHoja(prefijo);
        total += capa.bytes;
        console.log(`nivel ${nivel}  ${prefijo.padEnd(10)} ${capa.ancho}x${capa.alto} x${NUM_FOTOGRAMAS}  ${(capa.bytes / 1024).toFixed(0)}KB`);
        return capa;
    });
}

const colgantes = COLGANTES.map((c) => {
    const original = leerPNG(path.join(ORIGEN, c.origen));
    const reducido = reducir(original, c.ancho3);
    const bytes = escribirPNG(path.join(DESTINO, c.destino), reducido.ancho, reducido.alto, reducido.data);
    total += bytes;
    console.log(`colgante ${c.id.padEnd(6)} ${original.width}x${original.height} -> ${reducido.ancho}x${reducido.alto}  ${(bytes / 1024).toFixed(0)}KB`);
    return { id: c.id, nivel: c.nivel, archivo: c.destino, x: c.x, y: c.y, ancho: c.ancho,
        alto: +(c.ancho * reducido.alto / reducido.ancho).toFixed(3),
        origenX: c.origenX, origenY: c.origenY, animacion: c.animacion };
});

fs.copyFileSync(path.join(ORIGEN, "fondo2-parcheado.png"), path.join(RAIZ, "src/assets/imagenes/escenarios/escenario2-sin-colgantes.png"));

const limpiarCapa = ({ id, x, y, ancho, alto }) => ({ id, archivo: `${id}.png`, x, y, ancho, alto });
const datos = Object.fromEntries(Object.entries(capas).map(([nivel, lista]) => [nivel, lista.map(limpiarCapa)]));
fs.writeFileSync(ARCHIVO_DATOS, `// ARCHIVO GENERADO por tools/generar-fondos-animados.cjs -- no editar a mano.
// Coordenadas en pixeles de la imagen de fondo (1672x941). "alto" es el de UN fotograma; cada
// hoja apila ${NUM_FOTOGRAMAS} fotogramas en vertical.

export const FOTOGRAMAS_FONDO_ANIMADO = ${NUM_FOTOGRAMAS};

export const CAPAS_FONDO_ANIMADO = ${JSON.stringify(datos, null, 4)};

export const COLGANTES_FONDO_ANIMADO = ${JSON.stringify(colgantes, null, 4)};
`);
console.log(`total ${(total / 1024).toFixed(0)}KB (+ fondo nivel 2 sin colgantes)`);
