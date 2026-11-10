import { Juego } from "./juego.js";
import { inicializarI18n } from "./i18n.js";
import { sonidos } from "./sonidos.js";

document.addEventListener("DOMContentLoaded", async () => {
    await inicializarI18n();
    sonidos.iniciar();
    const juego = new Juego();
    juego.iniciar();
});
