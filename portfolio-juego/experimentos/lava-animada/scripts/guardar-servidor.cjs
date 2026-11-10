// Servidor temporal solo para recibir frames PNG en base64 generados en el navegador
// y guardarlos a disco. No forma parte del juego.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const carpetaSalida = process.argv[2] || __dirname;
const puerto = Number(process.argv[3] || 5501);

http.createServer((req, res) => {
    if (req.method !== "POST") { res.writeHead(405); res.end(); return; }
    const urlObj = new URL(req.url, "http://localhost");
    if (urlObj.pathname !== "/guardar") { res.writeHead(404); res.end(); return; }
    const nombre = urlObj.searchParams.get("nombre") || "frame.png";
    let cuerpo = "";
    req.on("data", (trozo) => { cuerpo += trozo; });
    req.on("end", () => {
        const base64 = cuerpo.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64, "base64");
        const ruta = path.join(carpetaSalida, nombre);
        fs.writeFileSync(ruta, buffer);
        console.log(`Guardado: ${ruta} (${buffer.length} bytes)`);
        res.writeHead(200, { "Access-Control-Allow-Origin": "*" });
        res.end("ok");
    });
}).listen(puerto, "127.0.0.1", () => console.log(`Servidor de guardado en http://127.0.0.1:${puerto}/`));
