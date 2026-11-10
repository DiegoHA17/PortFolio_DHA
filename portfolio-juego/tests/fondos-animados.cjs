// Prueba de los fondos animados (integrados desde experimentos/lava-animada).
// Uso: con el servidor local sirviendo portfolio-juego/ ->  node tests/fondos-animados.cjs
// Variables opcionales (como tests/audio.cjs): PORTFOLIO_URL, PLAYWRIGHT_MODULE, CHROME_PATH.
const assert = require("node:assert/strict");
const path = require("node:path");
const { leerPNG } = require("../experimentos/lava-animada/scripts/png-leer.cjs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const URL_PORTFOLIO = process.env.PORTFOLIO_URL || "http://127.0.0.1:5500/";
const RAIZ = path.resolve(__dirname, "..");
const NIVELES = { 1: ["cascada1", "cascada2", "suelo"], 2: ["agua2", "lamparas2"],
    3: ["agua3", "brillos3", "pantalla3"], 4: ["agua4", "ondas4"] };

async function cargarDatos() {
    const url = require("node:url").pathToFileURL(path.join(RAIZ, "src/js/fondos-animados-datos.js")).href;
    return import(url);
}

// 1) Las hojas generadas reproducen pixel a pixel los fotogramas del experimento.
async function comprobarHojas() {
    const { CAPAS_FONDO_ANIMADO, FOTOGRAMAS_FONDO_ANIMADO } = await cargarDatos();
    for (const [nivel, capas] of Object.entries(CAPAS_FONDO_ANIMADO)) {
        assert.deepEqual(capas.map((capa) => capa.id), NIVELES[nivel], `capas del nivel ${nivel}`);
        for (const capa of capas) {
            const hoja = leerPNG(path.join(RAIZ, "src/assets/imagenes/escenarios/animados", capa.archivo));
            assert.equal(hoja.width, capa.ancho);
            assert.equal(hoja.height, capa.alto * FOTOGRAMAS_FONDO_ANIMADO);
            for (let k = 0; k < FOTOGRAMAS_FONDO_ANIMADO; k++) {
                const original = leerPNG(path.join(RAIZ, `experimentos/lava-animada/recursos/frames/${capa.id}-${k}.png`));
                let opacosOriginal = 0;
                for (let i = 3; i < original.data.length; i += 4) if (original.data[i]) opacosOriginal++;
                let opacosHoja = 0;
                for (let y = 0; y < capa.alto; y++) {
                    for (let x = 0; x < capa.ancho; x++) {
                        const ox = capa.x + x, oy = capa.y + y;
                        const iHoja = ((k * capa.alto + y) * capa.ancho + x) * 4;
                        const dentro = ox >= 0 && oy >= 0 && ox < original.width && oy < original.height;
                        const iOrig = (oy * original.width + ox) * 4;
                        for (let c = 0; c < 4; c++) {
                            const esperado = dentro ? original.data[iOrig + c] : 0;
                            if (hoja.data[iHoja + c] !== esperado) {
                                assert.fail(`${capa.id} fotograma ${k}: pixel (${ox},${oy}) distinto del experimento`);
                            }
                        }
                        if (hoja.data[iHoja + 3]) opacosHoja++;
                    }
                }
                assert.equal(opacosHoja, opacosOriginal, `${capa.id} fotograma ${k}: se ha recortado contenido`);
            }
        }
    }
}

// 2) En el juego: posicion, visibilidad por nivel, animacion, nivel 2 y degradacion segura.
async function comprobarJuego(browser) {
    const errores = [];
    const vigilar = (page) => {
        page.on("pageerror", (error) => errores.push(error.message));
        page.on("console", (mensaje) => {
            if (mensaje.type() === "error" && !mensaje.location().url.endsWith("/favicon.ico")) errores.push(mensaje.text());
        });
    };

    for (const [ancho, alto] of [[1440, 900], [1000, 1300], [390, 844]]) {
        const page = await browser.newPage({ viewport: { width: ancho, height: alto } });
        vigilar(page);
        await page.goto(URL_PORTFOLIO);
        await page.waitForSelector(".escenario.fondos-animados-activos .fondos-animados");

        for (const nivel of ["1", "2", "3", "4"]) {
            const estado = await page.evaluate(async (n) => {
                const escenario = document.querySelector("#escenario");
                escenario.dataset.nivelActual = n;
                await new Promise((r) => setTimeout(r, 400));
                const contenedor = escenario.querySelector(".fondos-animados");
                const r = contenedor.getBoundingClientRect();
                const e = escenario.getBoundingClientRect();
                const escala = Math.max(escenario.clientWidth / 1672, escenario.clientHeight / 941);
                const visibles = [...contenedor.querySelectorAll(".capa-fondo-animado, .colgante-fondo-animado")]
                    .filter((el) => el.offsetParent);
                // Las animaciones CSS quedan "pending" hasta el primer fotograma compuesto tras la
                // carga; se espera a que esten listas y se muestrea un ciclo completo (8 x 160ms).
                await Promise.all(visibles[0].getAnimations().map((animacion) => animacion.ready));
                const posiciones = new Set();
                for (let i = 0; i < 9; i++) {
                    posiciones.add(getComputedStyle(visibles[0]).backgroundPositionY);
                    await new Promise((r) => setTimeout(r, 160));
                }
                const jaula = contenedor.querySelector('[data-colgante="jaula"]');
                const rj = jaula?.getBoundingClientRect();
                return {
                    rect: [r.left - e.left, r.top - e.top, r.width, r.height],
                    esperado: [(escenario.clientWidth - 1672 * escala) / 2, 0, 1672 * escala, 941 * escala],
                    visibles: visibles.map((el) => el.dataset.capa || el.dataset.colgante),
                    fotogramasDistintos: posiciones.size,
                    fondo: getComputedStyle(escenario).backgroundImage,
                    jaula: rj && jaula.offsetParent ? { arriba: rj.top - e.top, abajo: rj.bottom - e.top, cargada: jaula.complete && jaula.naturalWidth > 0 } : null
                };
            }, nivel);
            const etiqueta = `${ancho}x${alto} nivel ${nivel}`;
            estado.rect.forEach((valor, i) => assert(Math.abs(valor - estado.esperado[i]) < 1, `${etiqueta}: el contenedor no coincide con el fondo`));
            const esperadas = nivel === "2" ? [...NIVELES[nivel], "jaula", "cajon"] : NIVELES[nivel];
            assert.deepEqual(estado.visibles, esperadas, `${etiqueta}: capas visibles`);
            assert(estado.fotogramasDistintos >= 3, `${etiqueta}: la animacion no avanza`);
            if (nivel === "2") {
                assert.match(estado.fondo, /escenario2-sin-colgantes\.png/, `${etiqueta}: fondo parcheado`);
                assert(estado.jaula.cargada, `${etiqueta}: sprite de la jaula sin cargar`);
                // La cadena sale por encima del techo y la jaula queda entera dentro del escenario.
                assert(estado.jaula.arriba < -2, `${etiqueta}: la cadena no continua por encima del borde`);
                assert(estado.jaula.abajo > 0 && estado.jaula.abajo < estado.esperado[3] * 0.4, `${etiqueta}: jaula fuera de sitio`);
            } else {
                assert.doesNotMatch(estado.fondo, /sin-colgantes/, `${etiqueta}: fondo parcheado fuera del nivel 2`);
            }
        }
        await page.close();
    }

    // prefers-reduced-motion: todo visible y quieto.
    const contexto = await browser.newContext({ reducedMotion: "reduce" });
    const quieta = await contexto.newPage();
    vigilar(quieta);
    await quieta.goto(URL_PORTFOLIO);
    await quieta.waitForSelector(".fondos-animados");
    const animaciones = await quieta.evaluate(() => [...document.querySelectorAll(".capa-fondo-animado, .colgante-fondo-animado")]
        .map((el) => getComputedStyle(el).animationName));
    assert(animaciones.length > 0 && animaciones.every((nombre) => nombre === "none"), "reduced-motion debe parar las animaciones");
    await contexto.close();

    // Si el modulo falla al cargar, el juego sigue y el nivel 2 conserva su fondo original.
    const sinModulo = await browser.newPage();
    const erroresSinModulo = [];
    sinModulo.on("pageerror", (error) => erroresSinModulo.push(error.message));
    await sinModulo.route("**/fondos-animados.js", (ruta) => ruta.abort());
    await sinModulo.goto(URL_PORTFOLIO);
    await sinModulo.waitForSelector("#panel-tutorial-inicio:not(.oculto)");
    const respaldo = await sinModulo.evaluate(() => {
        const escenario = document.querySelector("#escenario");
        escenario.dataset.nivelActual = "2";
        return { contenedor: !!escenario.querySelector(".fondos-animados"), fondo: getComputedStyle(escenario).backgroundImage };
    });
    assert.equal(respaldo.contenedor, false);
    assert.match(respaldo.fondo, /escenario2\.png/, "sin el modulo debe verse el fondo original del nivel 2");
    assert.deepEqual(erroresSinModulo, [], "un fallo del modulo no debe romper el juego");
    await sinModulo.close();

    assert.deepEqual(errores, [], "errores de consola");
}

(async () => {
    await comprobarHojas();
    const browser = await chromium.launch({ headless: true,
        ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
    try {
        await comprobarJuego(browser);
        console.log("OK: hojas identicas al experimento, alineacion en 3 tamanos, capas por nivel, animacion, jaula, reduced-motion y respaldo sin modulo.");
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
