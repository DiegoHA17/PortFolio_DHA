"use strict";
// Extrae los objetos colgantes (jaula-farol y cajon) de escenario2.png como sprites con
// transparencia real (solo la componente conexa principal, sin ruido disperso), calcula
// el punto de anclaje de la cadena, y genera un fondo parcheado sin restos visibles.
// Todo en Node puro, sin navegador -- pensado para no repetir el problema de memoria.
const path = require("node:path");
const { leerPNG } = require("./png-leer.cjs");
const { escribirPNG } = require("./png-escribir.cjs");

const RUTA_ESCENARIO = path.resolve(__dirname, "../../../src/assets/imagenes/escenarios/escenario2.png");
const CARPETA_SALIDA = path.resolve(__dirname, "../recursos/frames");

function distancia(a, b) {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/** Mascara inicial por sustraccion de fondo interpolado fila a fila (izq->der del propio recorte). */
function mascaraInicial(img, x0, y0, w, h, umbral) {
    const mascara = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
        const px = (x, yy) => {
            const i = ((y0 + yy) * img.width + (x0 + x)) * 4;
            return [img.data[i], img.data[i + 1], img.data[i + 2]];
        };
        const bgIzq = px(0, y), bgDer = px(w - 1, y);
        for (let x = 0; x < w; x++) {
            const t = x / (w - 1);
            const bg = [
                bgIzq[0] + (bgDer[0] - bgIzq[0]) * t,
                bgIzq[1] + (bgDer[1] - bgIzq[1]) * t,
                bgIzq[2] + (bgDer[2] - bgIzq[2]) * t
            ];
            const c = px(x, y);
            mascara[y * w + x] = distancia(c, bg) > umbral ? 1 : 0;
        }
    }
    return mascara;
}

/** Componente conexa (8-vecinos) mas grande de una mascara dada. Devuelve la mascara de esa
 *  componente unicamente (todo lo demas a 0). */
function componenteConexaMayor(mascara, w, h) {
    const visitado = new Uint8Array(w * h);
    let mejor = null, mejorTam = 0;
    for (let i = 0; i < w * h; i++) {
        if (!mascara[i] || visitado[i]) continue;
        const pila = [i]; visitado[i] = 1;
        const miembros = [];
        while (pila.length) {
            const cur = pila.pop();
            miembros.push(cur);
            const cy = Math.floor(cur / w), cx = cur % w;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                const nidx = ny * w + nx;
                if (visitado[nidx] || !mascara[nidx]) continue;
                visitado[nidx] = 1; pila.push(nidx);
            }
        }
        if (miembros.length > mejorTam) { mejorTam = miembros.length; mejor = miembros; }
    }
    const salida = new Uint8Array(w * h);
    if (mejor) for (const idx of mejor) salida[idx] = 1;
    return { mascara: salida, tam: mejorTam };
}

function dilatar(mascara, w, h, pasadas, minVecinos) {
    let m = mascara;
    for (let p = 0; p < pasadas; p++) {
        const out = new Uint8Array(m);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (m[y * w + x]) continue;
            let n = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const yy = y + dy, xx = x + dx;
                if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
                if (m[yy * w + xx]) n++;
            }
            if (n >= minVecinos) out[y * w + x] = 1;
        }
        m = out;
    }
    return m;
}

/**
 * Dos pasadas: primero se dilata bastante la mascara bruta para que la cadena (fina, a veces
 * mal detectada) quede conectada al resto del objeto, y se localiza ahi la componente principal
 * (sin ruido disperso). Luego se recorta la mascara ORIGINAL (sin dilatar, con el detalle fino)
 * a solo esa region -- asi no se engorda el contorno real, solo se usa la dilatacion para decidir
 * que pertenece al objeto.
 */
function componentePrincipal(maskaraBruta, w, h) {
    const dilatada = dilatar(maskaraBruta, w, h, 3, 2);
    const { mascara: region, tam } = componenteConexaMayor(dilatada, w, h);
    const recortada = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) recortada[i] = (maskaraBruta[i] && region[i]) ? 1 : 0;
    // cierra huecos finos de 1px dentro del contorno ya limpio
    const final = dilatar(recortada, w, h, 1, 5);
    return { mascara: final, tam };
}

function anclaSuperior(mascara, w, h) {
    for (let y = 0; y < h; y++) {
        const xs = [];
        for (let x = 0; x < w; x++) if (mascara[y * w + x]) xs.push(x);
        if (xs.length) return { y, x: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) };
    }
    return { x: Math.round(w / 2), y: 0 };
}

function recortarASprite(img, x0, y0, w, h, mascara) {
    const out = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        const y = Math.floor(i / w), x = i % w;
        const srcI = ((y0 + y) * img.width + (x0 + x)) * 4;
        if (!mascara[i]) { out[i * 4 + 3] = 0; continue; }
        out[i * 4] = img.data[srcI]; out[i * 4 + 1] = img.data[srcI + 1];
        out[i * 4 + 2] = img.data[srcI + 2]; out[i * 4 + 3] = 255;
    }
    return out;
}

function procesarObjeto(img, nombre, x0, y0, w, h, umbral) {
    const inicial = mascaraInicial(img, x0, y0, w, h, umbral);
    const { mascara: principal, tam } = componentePrincipal(inicial, w, h);
    const final = dilatar(principal, w, h, 1);
    const ancla = anclaSuperior(final, w, h);
    const spriteData = recortarASprite(img, x0, y0, w, h, final);
    const ruta = path.join(CARPETA_SALIDA, `${nombre}.png`);
    const bytes = escribirPNG(ruta, w, h, spriteData);
    return { nombre, x0, y0, w, h, tamComponente: tam, ancla, bytes };
}

/** Parchea el hueco copiando una franja vecina (misma fila a fila) -- aproximacion simple, no inpainting real. */
function parchear(img, x0, y0, w, h, offsetX) {
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const destI = ((y0 + y) * img.width + (x0 + x)) * 4;
            const srcI = ((y0 + y) * img.width + (x0 + x + offsetX)) * 4;
            img.data[destI] = img.data[srcI]; img.data[destI + 1] = img.data[srcI + 1];
            img.data[destI + 2] = img.data[srcI + 2]; img.data[destI + 3] = img.data[srcI + 3];
        }
    }
}

function main() {
    const img = leerPNG(RUTA_ESCENARIO);
    console.log(`escenario2.png: ${img.width}x${img.height}`);

    const resultados = [];
    resultados.push(procesarObjeto(img, "jaula2-sprite-v2", 140, 75, 120, 225, 45));
    resultados.push(procesarObjeto(img, "cajon2-sprite", 525, 325, 50, 260, 45));

    // fondo parcheado: se hace DESPUES de leer los sprites (misma imagen en memoria, pero el
    // recorte de sprite ya se guardo con los pixeles originales, parchear no les afecta)
    parchear(img, 140, 75, 120, 225, -140);
    parchear(img, 525, 325, 50, 260, 100);
    const rutaFondo = path.join(CARPETA_SALIDA, "fondo2-parcheado.png");
    const bytesFondo = escribirPNG(rutaFondo, img.width, img.height, img.data);

    console.log(JSON.stringify({ resultados, bytesFondo }, null, 2));
}

main();
