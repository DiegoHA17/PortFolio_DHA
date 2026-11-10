"use strict";
// Genera esferitas de señal viajando desde cada icono de contacto (email/github/linkedin/cv)
// hasta su antena correspondiente, en escenario4. Reemplaza la version anterior (ondas4), que
// eran anillos estaticos en el propio nodo de la antena -- esto es ahora un recorrido.
const path = require("node:path");
const { escribirPNG } = require("./png-escribir.cjs");

const CARPETA_SALIDA = path.resolve(__dirname, "../recursos/frames");
const ANCHO = 1672, ALTO = 941;
const N = 8;
const COLOR = [205, 140, 255]; // morado arcano, igual que el resto de luces de la escena

// Iconos (localizados por deteccion de brillo sobre escenario4.png) y la antena que les toca
// por cercania horizontal: email/github -> antena izquierda, linkedin/cv -> antena derecha.
const PARTICULAS = [
    { desde: { x: 155, y: 684 }, hasta: { x: 206, y: 216 }, faseOffset: 0.0 },   // email -> antena izq
    { desde: { x: 309, y: 684 }, hasta: { x: 206, y: 216 }, faseOffset: 0.5 },   // github -> antena izq
    { desde: { x: 489, y: 690 }, hasta: { x: 595, y: 215 }, faseOffset: 0.25 },  // linkedin -> antena der
    { desde: { x: 667, y: 684 }, hasta: { x: 595, y: 215 }, faseOffset: 0.75 }   // cv -> antena der
];

function posicionEnT(p, t) {
    const x = p.desde.x + (p.hasta.x - p.desde.x) * t;
    const y = p.desde.y + (p.hasta.y - p.desde.y) * t;
    const bamboleo = Math.sin(t * Math.PI * 3) * 4 * (1 - Math.abs(t - 0.5) * 2); // mas suave en los extremos
    return { x: x + bamboleo, y };
}

function dibujarEsfera(buf, w, h, cx, cy, radioNucleo, alfa, color) {
    const r1 = radioNucleo + 1.5;
    for (let dy = -Math.ceil(r1); dy <= Math.ceil(r1); dy++) {
        for (let dx = -Math.ceil(r1); dx <= Math.ceil(r1); dx++) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > r1) continue;
            const x = Math.round(cx + dx), y = Math.round(cy + dy);
            if (x < 0 || x >= w || y < 0 || y >= h) continue;
            const i = (y * w + x) * 4;
            const esNucleo = d <= radioNucleo;
            const alfaPixel = esNucleo ? alfa : alfa * 0.35 * (1 - (d - radioNucleo) / 1.5);
            const alfaFinal = Math.round(Math.max(0, alfaPixel) * 255);
            if (alfaFinal <= buf[i + 3]) continue;
            buf[i] = esNucleo ? 255 : color[0];
            buf[i + 1] = esNucleo ? 230 : color[1];
            buf[i + 2] = 255;
            buf[i + 3] = alfaFinal;
        }
    }
}

function alfaRecorrido(t) {
    // se desvanece al salir del icono y al llegar a la antena, en vez de aparecer/desaparecer de golpe
    const entrada = Math.min(1, t / 0.12);
    const salida = Math.min(1, (1 - t) / 0.12);
    return Math.min(entrada, salida);
}

function main() {
    for (let f = 0; f < N; f++) {
        const buf = new Uint8Array(ANCHO * ALTO * 4);
        for (const p of PARTICULAS) {
            const t = (f / N + p.faseOffset) % 1;
            const pos = posicionEnT(p, t);
            const alfa = alfaRecorrido(t) * 0.95;
            if (alfa > 0.02) dibujarEsfera(buf, ANCHO, ALTO, pos.x, pos.y, 2.6, alfa, COLOR);
            // cola corta: dos posiciones anteriores, mas tenues y pequeñas
            for (const dt of [0.035, 0.07]) {
                const tCola = t - dt;
                if (tCola < 0 || tCola > 1) continue;
                const posCola = posicionEnT(p, tCola);
                const alfaCola = alfaRecorrido(tCola) * 0.95 * (1 - dt / 0.1) * 0.5;
                if (alfaCola > 0.02) dibujarEsfera(buf, ANCHO, ALTO, posCola.x, posCola.y, 1.6, alfaCola, COLOR);
            }
        }
        const ruta = path.join(CARPETA_SALIDA, `ondas4-${f}.png`);
        const bytes = escribirPNG(ruta, ANCHO, ALTO, buf);
        console.log(`ondas4-${f}.png: ${bytes} bytes`);
    }
}

main();
