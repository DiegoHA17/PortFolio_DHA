import { Juego } from "./juego.js";
import { inicializarI18n } from "./i18n.js";
import { sonidos } from "./sonidos.js";

function cargarFondosAnimados() {
    // Importacion dinamica: las animaciones de fondo son decorativas y, si su modulo o sus datos
    // fallan, el juego sigue funcionando con los fondos originales.
    import("./fondos-animados.js")
        .then(({ iniciarFondosAnimados }) => iniciarFondosAnimados(document.querySelector("#escenario")))
        .catch((error) => console.warn("No se pudieron iniciar los fondos animados.", error));
}

document.addEventListener("DOMContentLoaded", async () => {
    cargarFondosAnimados();
    await inicializarI18n();
    sonidos.iniciar();
    const juego = new Juego();
    juego.iniciar();
});
