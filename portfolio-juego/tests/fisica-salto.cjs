// Prueba de la fisica del salto adaptada a la escala del mundo.
// Uso: con el servidor local sirviendo portfolio-juego/ ->  node tests/fisica-salto.cjs
// Variables opcionales (como tests/audio.cjs): PORTFOLIO_URL, PLAYWRIGHT_MODULE, CHROME_PATH.
// SOLO=1920x1080 limita la prueba a una resolucion.
//
// 1) Analisis estatico: con la configuracion, la altura maxima del salto (en unidades del mundo)
//    supera todas las subidas obligatorias del mapa.
// 2) En el navegador, a varias resoluciones (y con zoom simulado): mide la altura y la velocidad
//    reales en unidades del mundo y un bot recorre las rutas obligatorias pulsando teclas,
//    comprobando en que plataforma aterriza en cada salto y que los objetos son interactuables.
// 3) Cambios de tamano en mitad de la partida (de pie y en el aire) y salto infinito en la escalera.
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const URL_PORTFOLIO = process.env.PORTFOLIO_URL || "http://127.0.0.1:5500/";
const RAIZ = path.resolve(__dirname, "..");

const RESOLUCIONES = [
    { nombre: "1366x768", viewport: { width: 1366, height: 768 } },
    { nombre: "1920x1080", viewport: { width: 1920, height: 1080 } },
    { nombre: "2560x1440", viewport: { width: 2560, height: 1440 } },
    { nombre: "3840x2160", viewport: { width: 3840, height: 2160 } },
    // Zoom del navegador: 1920x1080 al 125% y al 200% equivalen a estos viewports CSS.
    { nombre: "1920x1080@125%", viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 },
    { nombre: "1920x1080@200%", viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 },
    // Moviles en horizontal (en vertical el juego pide girar el dispositivo).
    { nombre: "movil 844x390", viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 },
    { nombre: "movil 667x375", viewport: { width: 667, height: 375 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
];

// Subidas que el jugador necesita para completar el nivel o no quedarse atrapado
// (origen -> destino, por id de plataforma).
const SUBIDAS_OBLIGATORIAS = {
    1: [
        ["plataforma-central-derecha", "plataforma-superior-derecha"], // hasta el portal
        ["plataforma-derecha-media", "plataforma-central-derecha"], // volver desde el espejo
        ["plataforma-inferior-central", "plataforma-derecha-media"], // salir del foso
        ["plataforma-inferior-central", "plataforma-central-izquierda"],
        ["plataforma-central-izquierda", "plataforma-superior-central-izquierda"]
    ],
    3: [["proyectos-plataforma-superior-derecha", "proyectos-plataforma-superior-izquierda"]]
};

async function comprobarAnalisisEstatico() {
    const url = require("node:url").pathToFileURL(path.join(RAIZ, "src/js/configuracion.js")).href;
    const { CONFIGURACION_JUGADOR, CONFIGURACION_NIVELES } = await import(url);
    const alturaMaxima = CONFIGURACION_JUGADOR.fuerzaSalto ** 2 / (2 * CONFIGURACION_JUGADOR.gravedad);

    for (const [nivel, subidas] of Object.entries(SUBIDAS_OBLIGATORIAS)) {
        const plataformas = new Map(CONFIGURACION_NIVELES[nivel].plataformas.map((p) => [p.id, p]));
        for (const [origen, destino] of subidas) {
            assert(plataformas.has(origen) && plataformas.has(destino), `nivel ${nivel}: ${origen} -> ${destino} existe`);
            const subida = plataformas.get(origen).y - plataformas.get(destino).y;
            // Margen del 5% para no depender de alcanzar exactamente el apex.
            assert(subida <= alturaMaxima * 0.95,
                `nivel ${nivel}: subir ${subida} (${origen} -> ${destino}) supera el salto de ${alturaMaxima.toFixed(1)}`);
        }
    }

    return alturaMaxima;
}

// Herramientas que se inyectan en la pagina: estado del jugador en coordenadas del mundo y un
// bot que pulsa teclas y espera condiciones fotograma a fotograma (sin latencia de Playwright).
function instalarBot() {
    const ANCHO_MUNDO = 1672;
    const ALTO_MUNDO = 941;
    const pulsadas = new Set();
    const muestra = { actual: null, anterior: null };

    function estado() {
        const escenario = document.querySelector("#escenario");
        const jugador = document.querySelector("#contenedor-personaje");
        const W = escenario.clientWidth;
        const H = escenario.clientHeight;
        const escala = Math.max(W / ANCHO_MUNDO, H / ALTO_MUNDO);
        const left = (W - ANCHO_MUNDO * escala) / 2;
        const posX = parseFloat(jugador.style.left);
        const bottom = parseFloat(jugador.style.bottom);
        const ancho = jugador.offsetWidth;
        const piesPx = H - bottom;
        let sobre = null;

        // El juego coloca los pies exactamente en la superficie al aterrizar.
        document.querySelectorAll(".capa-colisiones .plataforma-colision").forEach((elemento) => {
            const top = parseFloat(elemento.style.top);
            const izquierda = parseFloat(elemento.style.left);
            const derecha = izquierda + parseFloat(elemento.style.width);
            const solapa = posX + ancho * 0.78 > izquierda && posX + ancho * 0.22 < derecha;
            if (solapa && Math.abs(piesPx - top) <= 0.5) sobre = elemento.dataset.id;
        });

        // Solo cuenta como "en el suelo" si ademas los pies no se han movido verticalmente entre
        // dos fotogramas: asi no se confunde con pasar junto a una superficie a mitad de salto.
        const estable = Boolean(
            sobre &&
            muestra.actual && muestra.anterior &&
            muestra.actual.sobre === sobre && muestra.anterior.sobre === sobre &&
            Math.abs(muestra.actual.piesPx - piesPx) < 0.01 &&
            Math.abs(muestra.anterior.piesPx - piesPx) < 0.01
        );

        return {
            escala,
            x: (posX + ancho / 2 - left) / escala,
            pies: piesPx / escala,
            piesPx,
            anchoMundo: ancho / escala,
            sobre,
            plataforma: estable ? sobre : null,
            visible: !jugador.classList.contains("oculto"),
            nivel: escenario.dataset.nivelActual,
            activos: [...document.querySelectorAll(".objeto-interactivo-activo")].map((e) => e.id),
            panel: document.querySelector(".panel-flotante:not(.oculto)")?.id ?? null
        };
    }

    function fijarTeclas(teclas) {
        const nuevas = new Set(teclas);
        for (const codigo of [...pulsadas]) {
            if (!nuevas.has(codigo)) {
                window.dispatchEvent(new KeyboardEvent("keyup", { code: codigo }));
                pulsadas.delete(codigo);
            }
        }
        for (const codigo of nuevas) {
            if (!pulsadas.has(codigo)) {
                window.dispatchEvent(new KeyboardEvent("keydown", { code: codigo }));
                pulsadas.add(codigo);
            }
        }
    }

    function paso(teclas, condicion, timeout = 6000) {
        const cumple = new Function("e", `return (${condicion});`);
        fijarTeclas(teclas);
        const inicio = performance.now();
        let minPies = Infinity;
        return new Promise((resolver) => {
            const comprobar = () => {
                const e = estado();
                minPies = Math.min(minPies, e.pies);
                if (cumple(e)) return resolver({ ...e, ok: true, minPies });
                if (performance.now() - inicio > timeout) {
                    fijarTeclas([]);
                    return resolver({ ...e, ok: false, minPies });
                }
                requestAnimationFrame(comprobar);
            };
            requestAnimationFrame(comprobar);
        });
    }

    // Muestreo por fotograma (para la deteccion de suelo) e historico circular para diagnosticar fallos.
    const historico = [];
    const registrar = () => {
        if (document.querySelector("#escenario") && document.querySelector("#contenedor-personaje")) {
            const e = estado();
            muestra.anterior = muestra.actual;
            muestra.actual = { sobre: e.sobre, piesPx: e.piesPx };
            historico.push(`${performance.now().toFixed(0)}ms pies ${e.pies.toFixed(1)} x ${e.x.toFixed(1)} ${e.plataforma} [${[...pulsadas]}]`);
            if (historico.length > 40) historico.shift();
        }
        requestAnimationFrame(registrar);
    };
    requestAnimationFrame(registrar);

    window.__bot = { estado, paso, fijarTeclas, historico };
}

class Bot {
    constructor(page, etiqueta) {
        this.page = page;
        this.etiqueta = etiqueta;
    }

    async paso(teclas, condicion, timeout, descripcion) {
        const resultado = await this.page.evaluate(([t, c, ms]) => window.__bot.paso(t, c, ms), [teclas, condicion, timeout]);
        if (!resultado.ok) await this.volcarHistorico();
        assert(resultado.ok, `[${this.etiqueta}] ${descripcion}: no se cumplio "${condicion}" (estado ${JSON.stringify(resultado)})`);
        return resultado;
    }

    async volcarHistorico() {
        console.error((await this.page.evaluate(() => window.__bot.historico)).join("\n"));
    }

    estado() {
        return this.page.evaluate(() => window.__bot.estado());
    }

    async soltar() {
        await this.page.evaluate(() => window.__bot.fijarTeclas([]));
    }

    async esperarEnSuelo(descripcion) {
        return this.paso([], "e.visible && e.plataforma !== null", 4000, descripcion);
    }

    // Camina hasta que el centro del jugador pasa una coordenada X del mundo.
    async caminarHasta(x, descripcion) {
        const actual = await this.estado();
        const derecha = x > actual.x;
        await this.paso([derecha ? "ArrowRight" : "ArrowLeft"], derecha ? `e.x >= ${x}` : `e.x <= ${x}`, 8000, descripcion);
        return this.soltar();
    }

    // Para saltar desde un borde: camina hacia el solo si aun no se ha llegado (con personajes muy
    // anchos en el mundo, como en moviles pequenos, el jugador puede estar ya mas alla del objetivo).
    async irAlBorde(x, direccion, descripcion) {
        const actual = await this.estado();
        const yaHaLlegado = direccion === "derecha" ? actual.x >= x : actual.x <= x;
        if (!yaHaLlegado) await this.caminarHasta(x, descripcion);
    }

    async caminarHastaPlataforma(direccion, idPlataforma, descripcion) {
        await this.paso([direccion], `e.plataforma === "${idPlataforma}"`, 8000, descripcion);
        return this.soltar();
    }

    // Salta (opcionalmente desplazandose) y devuelve la plataforma donde aterriza.
    async saltar(direccion, descripcion) {
        const teclas = direccion ? [direccion] : [];
        await this.paso([...teclas, "Space"], "e.sobre === null", 1000, `${descripcion} (despegue)`);
        const aterrizaje = await this.paso(teclas, "e.plataforma !== null", 4000, `${descripcion} (aterrizaje)`);
        await this.soltar();
        return aterrizaje;
    }

    async saltarA(direccion, idEsperado, descripcion) {
        const aterrizaje = await this.saltar(direccion, descripcion);
        if (aterrizaje.plataforma !== idEsperado) await this.volcarHistorico();
        assert.equal(aterrizaje.plataforma, idEsperado,
            `[${this.etiqueta}] ${descripcion}: aterriza en ${aterrizaje.plataforma} (x ${aterrizaje.x.toFixed(1)}, `
            + `pies minimos ${aterrizaje.minPies.toFixed(1)})`);
        return aterrizaje;
    }

    async interactuarCon(idObjeto, direccion, idPanel, descripcion) {
        await this.paso([direccion], `e.activos.includes("${idObjeto}")`, 8000, `${descripcion}: acercarse`);
        await this.soltar();
        await this.page.keyboard.press("KeyI");
        await this.paso([], `e.panel === "${idPanel}"`, 2000, `${descripcion}: abrir panel`);
        await this.page.keyboard.press("Escape");
        await this.paso([], "e.panel === null", 2000, `${descripcion}: cerrar panel`);
    }
}

async function abrirPartida(browser, resolucion) {
    const contexto = await browser.newContext({
        viewport: resolucion.viewport,
        deviceScaleFactor: resolucion.deviceScaleFactor ?? 1,
        hasTouch: Boolean(resolucion.hasTouch),
        isMobile: Boolean(resolucion.isMobile)
    });
    const page = await contexto.newPage();
    const errores = [];
    page.on("pageerror", (error) => errores.push(error.message));
    await page.addInitScript(instalarBot);
    await page.goto(URL_PORTFOLIO);
    await page.waitForSelector("#panel-tutorial-inicio:not(.oculto)");
    await page.locator('#panel-tutorial-inicio [data-i18n="tutorial.start"]').click();
    const bot = new Bot(page, resolucion.nombre);
    await bot.paso([], "e.visible && e.plataforma !== null && e.panel === null", 5000, "aparicion inicial");
    await page.waitForTimeout(700);
    return { contexto, page, bot, errores };
}

async function irAlNivel(page, bot, accion, nivel) {
    await page.locator(`[data-accion-nav="${accion}"]`).click();
    await bot.paso([], `e.nivel === "${nivel}" && e.visible && e.plataforma !== null`, 6000, `ir a ${accion}`);
    await page.waitForTimeout(700);
}

// Nivel 1: desde el inicio hasta subida-central.
async function bajarHastaSubidaCentral(bot) {
    const e = await bot.estado();
    await bot.irAlBorde(112 - e.anchoMundo * 0.2, "derecha", "borde de la plataforma inicial");
    await bot.saltarA("ArrowRight", "plataforma-superior-central-izquierda", "saltar el hueco inicial (180)");
    await bot.caminarHastaPlataforma("ArrowRight", "plataforma-subida-central", "bajar hasta subida central");
}

async function subirAlPortal(bot) {
    // central-derecha (952-1264) se solapa con superior-derecha (1226-1518).
    await bot.caminarHasta(1240, "colocarse bajo superior derecha");
    await bot.saltarA(null, "plataforma-superior-derecha", "subir a superior derecha (118)");
    await bot.interactuarCon("portal-nivel", "ArrowRight", "panel-cambio-nivel", "portal");
}

async function rutaPrincipal(bot) {
    await bajarHastaSubidaCentral(bot);
    const e = await bot.estado();
    await bot.irAlBorde(758 - e.anchoMundo * 0.2, "derecha", "borde derecho de subida central");
    const aterrizaje = await bot.saltar("ArrowRight", "salto hacia central derecha");
    if (aterrizaje.plataforma === "plataforma-colgante-central") {
        // Con personajes grandes en el mundo (moviles) se puede caer en la plataforma colgante.
        await bot.caminarHastaPlataforma("ArrowRight", "plataforma-central-derecha", "bajar de la colgante");
    } else {
        assert.equal(aterrizaje.plataforma, "plataforma-central-derecha", `[${bot.etiqueta}] salto hacia central derecha`);
    }
    await subirAlPortal(bot);
}

async function bajarAlFoso(bot) {
    await bajarHastaSubidaCentral(bot);
    await bot.caminarHastaPlataforma("ArrowRight", "plataforma-inferior-central", "caer al foso");
}

async function rutaRecuperacionEspejo(bot) {
    await bajarAlFoso(bot);
    await bot.irAlBorde(1112, "derecha", "borde derecho del foso");
    await bot.saltarA("ArrowRight", "plataforma-derecha-media", "salir del foso (83)");
    await bot.interactuarCon("ordenador", "ArrowRight", "panel-ordenador", "espejo");
    await bot.caminarHasta(1180, "colocarse bajo central derecha");
    await bot.saltarA(null, "plataforma-central-derecha", "subir desde el espejo (166)");
    await subirAlPortal(bot);
}

async function rutaRecuperacionInicio(bot) {
    await bajarAlFoso(bot);
    await bot.irAlBorde(430, "izquierda", "borde izquierdo del foso");
    await bot.saltarA("ArrowLeft", "plataforma-central-izquierda", "subir a central izquierda (163)");
    await bot.caminarHasta(340, "colocarse bajo superior central izquierda");
    await bot.saltarA(null, "plataforma-superior-central-izquierda", "subir a superior central izquierda (163)");
    await bot.irAlBorde(300, "izquierda", "borde izquierdo de superior central izquierda");
    await bot.saltarA("ArrowLeft", "plataforma-superior-izquierda", "volver a la plataforma inicial (95, hueco 180)");
}

async function rutaProyectos(page, bot, proyectos) {
    await irAlNivel(page, bot, "proyectos", "3");
    await bot.caminarHasta(492, "ir a la escalera");
    await bot.paso(["ArrowUp"], 'e.plataforma === "proyectos-plataforma-superior-derecha" && e.visible', 5000, "subir escalera");
    await bot.soltar();
    await page.waitForTimeout(800); // animacion de aparicion: el movimiento esta bloqueado

    // Las carpetas a la derecha del hueco de la escalera se visitan primero; despues se salta el
    // hueco para llegar a las de la planta izquierda (caminando se caeria al piso inferior).
    const centroX = (selector) => page.evaluate((s) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return r.left + r.width / 2;
    }, selector);
    const bordeDerechoEscalera = await page.evaluate(() => document.querySelector(".zona-escalera").getBoundingClientRect().right);
    const conPosicion = [];
    for (const [idObjeto, idPanel] of proyectos) {
        conPosicion.push({ idObjeto, idPanel, x: await centroX(`#${idObjeto}`) });
    }
    const visitar = async (lista) => {
        for (const { idObjeto, idPanel, x } of lista) {
            const direccion = x < await centroX("#contenedor-personaje") ? "ArrowLeft" : "ArrowRight";
            await bot.interactuarCon(idObjeto, direccion, idPanel, `proyecto ${idObjeto}`);
        }
    };

    await visitar(conPosicion.filter((p) => p.x > bordeDerechoEscalera).sort((a, b) => a.x - b.x));
    await bot.irAlBorde(536, "izquierda", "borde izquierdo de superior derecha");
    await bot.saltarA("ArrowLeft", "proyectos-plataforma-superior-izquierda", "cruzar el hueco de la escalera");
    await visitar(conPosicion.filter((p) => p.x <= bordeDerechoEscalera).sort((a, b) => b.x - a.x));
}

async function comprobarEscaleraSinSaltoInfinito(page, bot, alturaMaxima) {
    await irAlNivel(page, bot, "proyectos", "3");
    await bot.caminarHasta(492, "ir a la escalera");
    const inicio = await bot.estado();
    // Mantener abajo + salto dentro de la zona de la escalera.
    const resultado = await page.evaluate(() => window.__bot.paso(["ArrowDown", "Space"], "false", 1500));
    await bot.soltar();
    const subida = inicio.pies - resultado.minPies;
    assert(subida <= alturaMaxima + 6,
        `[${bot.etiqueta}] abajo+salto en la escalera sube ${subida.toFixed(1)} (salto normal ${alturaMaxima.toFixed(1)})`);
    await bot.esperarEnSuelo("volver al suelo tras la escalera");
}

async function medirSalto(bot) {
    const antes = await bot.estado();
    const resultado = await bot.page.evaluate(() => window.__bot.paso(["Space"], "e.sobre === null", 1000));
    const vuelo = await bot.page.evaluate(() => window.__bot.paso([], "e.plataforma !== null", 3000));
    await bot.soltar();
    assert(resultado.ok && vuelo.ok, `[${bot.etiqueta}] el salto de prueba despega y aterriza`);
    return antes.pies - Math.min(resultado.minPies, vuelo.minPies);
}

async function medirVelocidad(bot) {
    const t0 = await bot.page.evaluate(() => performance.now());
    const inicio = await bot.estado();
    const fin = await bot.paso(["ArrowRight"], `e.x >= ${inicio.x + 60}`, 3000, "medir velocidad");
    const t1 = await bot.page.evaluate(() => performance.now());
    await bot.soltar();
    return (fin.x - inicio.x) / ((t1 - t0) / 1000);
}

async function comprobarResolucion(browser, resolucion, alturaMaxima, proyectos) {
    const ejecutar = async (nombre, prueba) => {
        const partida = await abrirPartida(browser, resolucion);
        try {
            const resultado = await prueba(partida);
            assert.deepEqual(partida.errores, [], `[${resolucion.nombre}] ${nombre}: errores en la pagina`);
            return resultado;
        } finally {
            await partida.contexto.close();
        }
    };

    const medidas = await ejecutar("medidas", async ({ bot }) => {
        const altura = await medirSalto(bot);
        const velocidad = await medirVelocidad(bot);
        const { escala } = await bot.estado();
        return { altura, velocidad, escala };
    });
    assert(Math.abs(medidas.altura - alturaMaxima) < 3,
        `[${resolucion.nombre}] altura del salto ${medidas.altura.toFixed(1)} u. (esperada ${alturaMaxima.toFixed(1)})`);

    await ejecutar("ruta principal", ({ bot }) => rutaPrincipal(bot));
    await ejecutar("recuperacion desde el espejo", ({ bot }) => rutaRecuperacionEspejo(bot));
    await ejecutar("recuperacion hasta el inicio", ({ bot }) => rutaRecuperacionInicio(bot));
    await ejecutar("proyectos", ({ page, bot }) => rutaProyectos(page, bot, proyectos));
    await ejecutar("escalera", ({ page, bot }) => comprobarEscaleraSinSaltoInfinito(page, bot, alturaMaxima));

    console.log(`  ${resolucion.nombre.padEnd(16)} escala ${medidas.escala.toFixed(3)}  salto ${medidas.altura.toFixed(1)} u. `
        + `(${(medidas.altura * medidas.escala).toFixed(0)} px)  velocidad ${medidas.velocidad.toFixed(0)} u./s  rutas OK`);
}

async function comprobarCambiosDeTamano(browser) {
    const partida = await abrirPartida(browser, RESOLUCIONES[1]);
    const { page, bot } = partida;
    try {
        // De pie: al redimensionar, el jugador sigue en la misma plataforma y en el mismo punto del mundo.
        await bajarHastaSubidaCentral(bot);
        await bot.caminarHasta(680, "centro de subida central");
        const referencia = await bot.estado();
        for (const viewport of [{ width: 1366, height: 768 }, { width: 3840, height: 2160 }, { width: 900, height: 420 }, { width: 2560, height: 1440 }]) {
            await page.setViewportSize(viewport);
            await page.waitForTimeout(250);
            const e = await bot.estado();
            assert.equal(e.plataforma, referencia.plataforma, `resize a ${viewport.width}x${viewport.height}: sigue en ${referencia.plataforma}`);
            assert(Math.abs(e.x - referencia.x) < 2, `resize a ${viewport.width}x${viewport.height}: x del mundo ${e.x.toFixed(1)} vs ${referencia.x.toFixed(1)}`);
        }

        // Ciclos repetidos en los que cambia el tamano responsive del personaje: sin deriva acumulada.
        for (let ciclo = 0; ciclo < 10; ciclo += 1) {
            for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]) {
                await page.setViewportSize(viewport);
                await page.waitForTimeout(80);
            }
        }
        await page.waitForTimeout(250);
        const trasCiclos = await bot.estado();
        assert.equal(trasCiclos.plataforma, referencia.plataforma, "10 ciclos de resize: sigue en la misma plataforma");
        assert(Math.abs(trasCiclos.x - referencia.x) < 2,
            `10 ciclos de resize: x del mundo ${trasCiclos.x.toFixed(1)} vs ${referencia.x.toFixed(1)} (deriva)`);

        // En el aire: redimensionar a mitad del salto no impide llegar a la plataforma prevista.
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(250);
        await bot.irAlBorde(758 - (await bot.estado()).anchoMundo * 0.2, "derecha", "borde derecho de subida central");
        await bot.paso(["ArrowRight", "Space"], "e.sobre === null", 1000, "despegue");
        await page.setViewportSize({ width: 2560, height: 1440 });
        const aterrizaje = await bot.paso(["ArrowRight"], "e.plataforma !== null", 4000, "aterrizaje tras resize");
        await bot.soltar();
        assert(["plataforma-central-derecha", "plataforma-colgante-central"].includes(aterrizaje.plataforma),
            `resize en el aire: aterriza en ${aterrizaje.plataforma}`);
        if (aterrizaje.plataforma === "plataforma-colgante-central") {
            await bot.caminarHastaPlataforma("ArrowRight", "plataforma-central-derecha", "bajar de la colgante");
        }
        await bot.caminarHasta(1240, "colocarse bajo superior derecha");
        await bot.paso(["Space"], "e.sobre === null", 1000, "despegue");
        await page.setViewportSize({ width: 1366, height: 768 });
        const llegada = await bot.paso([], "e.plataforma !== null", 4000, "aterrizaje tras resize");
        assert.equal(llegada.plataforma, "plataforma-superior-derecha", "resize en el aire hacia el portal");
        assert.deepEqual(partida.errores, [], "errores en la pagina durante los resize");
    } finally {
        await partida.contexto.close();
    }
}

async function main() {
    const alturaMaxima = await comprobarAnalisisEstatico();
    console.log(`Analisis estatico OK: salto maximo ${alturaMaxima.toFixed(1)} u. del mundo.`);

    const proyectos = (process.env.PROYECTOS
        || "objeto-proyecto-uno:panel-proyecto-uno,objeto-proyecto-lunar:panel-proyecto-lunar,objeto-proyecto-psicod:panel-proyecto-psicod")
        .split(",").map((par) => par.split(":"));
    const browser = await chromium.launch({
        ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
    });
    try {
        const seleccion = RESOLUCIONES.filter((r) => !process.env.SOLO || r.nombre === process.env.SOLO);
        for (const resolucion of seleccion) {
            await comprobarResolucion(browser, resolucion, alturaMaxima, proyectos);
        }
        if (!process.env.SOLO) {
            await comprobarCambiosDeTamano(browser);
            console.log("  cambios de tamano en mitad de la partida OK");
        }
    } finally {
        await browser.close();
    }
    console.log("OK: salto constante en el mundo, rutas obligatorias alcanzables, resize/zoom y escalera.");
}

module.exports = { abrirPartida, Bot, RESOLUCIONES, rutaPrincipal, rutaRecuperacionEspejo, rutaRecuperacionInicio, rutaProyectos };

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
