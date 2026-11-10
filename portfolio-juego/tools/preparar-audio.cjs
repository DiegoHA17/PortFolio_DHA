const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

// Convierte los originales CC0 sin instalar un codificador de audio adicional.
(async () => {
    const browser = await chromium.launch({
        headless: true,
        ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
    });
    try {
        const page = await browser.newPage();
        const carpeta = path.resolve(__dirname, "../src/assets/audio");
        for (const archivo of (await fs.readdir(carpeta)).filter((nombre) => nombre.endsWith(".ogg"))) {
            const original = await fs.readFile(path.join(carpeta, archivo));
            const audio = await page.evaluate(async (base64) => {
                const datos = Uint8Array.from(atob(base64), (letra) => letra.charCodeAt(0));
                const contexto = new OfflineAudioContext(1, 1, 44100);
                const buffer = await contexto.decodeAudioData(datos.buffer);
                return { frecuencia: buffer.sampleRate, canales: Array.from(
                    { length: buffer.numberOfChannels }, (_, i) => Array.from(buffer.getChannelData(i))
                ) };
            }, original.toString("base64"));
            const canales = audio.canales.length;
            const longitud = audio.canales[0].length;
            const bytes = longitud * canales * 2;
            const wav = Buffer.alloc(44 + bytes);
            wav.write("RIFF");
            wav.writeUInt32LE(36 + bytes, 4);
            wav.write("WAVEfmt ", 8);
            wav.writeUInt32LE(16, 16);
            wav.writeUInt16LE(1, 20);
            wav.writeUInt16LE(canales, 22);
            wav.writeUInt32LE(audio.frecuencia, 24);
            wav.writeUInt32LE(audio.frecuencia * canales * 2, 28);
            wav.writeUInt16LE(canales * 2, 32);
            wav.writeUInt16LE(16, 34);
            wav.write("data", 36);
            wav.writeUInt32LE(bytes, 40);
            for (let i = 0; i < longitud; i++) {
                for (let c = 0; c < canales; c++) {
                    const valor = Math.max(-1, Math.min(1, audio.canales[c][i]));
                    wav.writeInt16LE(Math.round(valor * (valor < 0 ? 32768 : 32767)), 44 + (i * canales + c) * 2);
                }
            }
            await fs.writeFile(path.join(carpeta, archivo.replace(/\.ogg$/, ".wav")), wav);
            console.log(`${archivo}: ${(longitud / audio.frecuencia).toFixed(2)}s, ${wav.length} bytes`);
        }
    } finally {
        await browser.close();
    }
})().catch((error) => { console.error(error); process.exitCode = 1; });
