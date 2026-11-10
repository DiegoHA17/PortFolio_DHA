const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

(async () => {
    const browser = await chromium.launch({ headless: true,
        ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
    const errores = [];
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        page.on("pageerror", (error) => errores.push(error.message));
        page.on("console", (message) => {
            if (message.type() === "error" && !message.location().url.endsWith('/favicon.ico')) {
                errores.push(`${message.text()} (${message.location().url})`);
            }
        });
        await page.addInitScript(() => {
            window.reproducciones = [];
            const start = AudioBufferSourceNode.prototype.start;
            AudioBufferSourceNode.prototype.start = function (...args) {
                window.reproducciones.push(this.buffer?.duration);
                return start.apply(this, args);
            };
        });
        await page.goto(process.env.PORTFOLIO_URL || "http://127.0.0.1:5500/");
        await page.waitForSelector("#panel-tutorial-inicio:not(.oculto)");
        assert.equal(await page.evaluate(() => window.reproducciones.length), 0, "Sin autoplay");
        await page.locator('[data-i18n="tutorial.start"]').click();
        await page.waitForFunction(() => window.reproducciones.length > 0);
        await page.waitForTimeout(1000);
        const buffers = await page.evaluate(async () => {
            const { sonidos } = await import("./src/js/sonidos.js");
            return Promise.all([...sonidos.buffers].map(async ([nombre, promesa]) => {
                const buffer = await promesa;
                return { nombre, duracion: buffer?.duration,
                    audible: buffer && buffer.getChannelData(0).some((muestra) => Math.abs(muestra) > 0.01) };
            }));
        });
        assert.equal(buffers.length, 11);
        assert(buffers.every((buffer) => buffer.duracion > 0 && buffer.audible));
        let total = await page.evaluate(() => window.reproducciones.length);
        await page.keyboard.down("Space");
        await page.waitForTimeout(100);
        await page.keyboard.up("Space");
        await page.waitForFunction((antes) => window.reproducciones.length > antes, total);
        await page.waitForTimeout(1600);
        total = await page.evaluate(() => window.reproducciones.length);
        await page.locator('#ordenador').click();
        await page.waitForSelector('#panel-ordenador:not(.oculto)');
        await page.waitForFunction((antes) => window.reproducciones.length > antes, total);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        assert(await page.evaluate(() => window.reproducciones.length) >= total + 2, 'Abrir/cerrar panel');
        await page.locator('#boton-sonido').click();
        assert.equal(await page.locator('#boton-sonido').getAttribute('aria-pressed'), 'false');
        total = await page.evaluate(() => window.reproducciones.length);
        await page.locator('#boton-sonido').evaluate((boton) => boton.blur());
        await page.keyboard.down('Space');
        await page.waitForTimeout(100);
        await page.keyboard.up('Space');
        await page.waitForTimeout(700);
        assert.equal(await page.evaluate(() => window.reproducciones.length), total, 'Silencio');
        await page.reload();
        await page.waitForSelector('#panel-tutorial-inicio:not(.oculto)');
        assert.equal(await page.locator('#boton-sonido').getAttribute('aria-pressed'), 'false', 'Persistencia');
        await page.locator('[data-i18n="tutorial.start"]').click();
        await page.waitForTimeout(900);
        await page.locator('[data-selector-idioma]').selectOption('en');
        await page.waitForFunction(() => document.documentElement.lang === 'en');
        await page.waitForSelector('#panel-tutorial-inicio:not(.oculto)');
        assert.equal(await page.locator('#boton-sonido').getAttribute('title'), 'Enable sound');
        await page.locator('[data-i18n="tutorial.start"]').click();
        await page.waitForTimeout(900);
        await page.locator('#boton-sonido').click();
        await page.waitForFunction(() => window.reproducciones.length > 0);
        await page.locator('[data-accion-nav="proyectos"]').click();
        await page.waitForSelector('#escenario[data-nivel-actual="3"]');
        await page.waitForTimeout(1100);
        assert(await page.evaluate(() => window.reproducciones.length) >= 3, 'Teletransporte');

        for (const [ancho, alto] of [[1280,800], [844,390], [1024,768], [390,844], [320,568]]) {
            await page.setViewportSize({ width: ancho, height: alto });
            await page.evaluate(() => window.scrollTo(0, 0));
            const cajas = await page.evaluate(() => {
                const selectores = ['.marca-portfolio', '.menu-portfolio', '.selector-idioma', '#boton-sonido', '.mezclador-audio'];
                return selectores.map((selector) => {
                    const r = document.querySelector(selector).getBoundingClientRect();
                    return { selector, left:r.left, right:r.right, top:r.top, bottom:r.bottom };
                });
            });
            assert(cajas.every((r) => r.left >= 0 && r.right <= ancho + 1), `Cabecera ${ancho}`);
            assert(cajas.every((r,i) => cajas.slice(i+1).every((s) =>
                r.right <= s.left + 1 || s.right <= r.left + 1 ||
                r.bottom <= s.top + 1 || s.bottom <= r.top + 1)), `Solape ${ancho}`);
            if (process.env.ARTIFACTS_DIR) {
                await page.screenshot({ path: path.join(process.env.ARTIFACTS_DIR, `audio-${ancho}.png`) });
            }
        }
        const mobile = await browser.newContext({ viewport:{width:844,height:390}, hasTouch:true, isMobile:true });
        const touch = await mobile.newPage();
        await touch.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:5500/');
        await touch.locator('[data-i18n="tutorial.start"]').tap();
        await touch.waitForTimeout(900);
        await touch.locator('#boton-sonido').tap();
        assert.equal(await touch.locator('#boton-sonido').getAttribute('aria-pressed'), 'false');
        await mobile.close();
        assert.deepEqual(errores, [], 'Sin errores de consola');
        console.log('OK: audio decodificado, sin autoplay, salto, paneles, teletransporte, mute, persistencia, ES/EN, tactil y cabecera responsive.');
        console.log(JSON.stringify(buffers));
    } finally {
        await browser.close();
    }
})().catch((error) => { console.error(error); process.exitCode = 1; });
