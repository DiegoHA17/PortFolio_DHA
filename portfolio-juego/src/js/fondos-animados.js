import { CONFIGURACION_ESCENARIO } from "./configuracion.js";
import {
    CAPAS_FONDO_ANIMADO,
    COLGANTES_FONDO_ANIMADO,
    FOTOGRAMAS_FONDO_ANIMADO
} from "./fondos-animados-datos.js";

// Animaciones ambientales de los fondos (lava, agua, lamparas, brillos, senales y objetos
// colgantes). Integradas desde experimentos/lava-animada.
//
// - Todo se coloca dentro de un contenedor con el rectangulo REAL de la imagen de fondo
//   (background cover + center top), igual que plataformas y objetos interactivos, para que
//   coincida con el fondo en cualquier tamano de ventana.
// - Cada capa es una hoja vertical de fotogramas animada solo con CSS (steps), sin bucle JS.
// - El CSS muestra solo el grupo del nivel activo (data-nivel-actual del escenario).
// - La clase "fondos-animados-activos" en el escenario es la que cambia el fondo del nivel 2 por
//   la version sin objetos colgantes: si este modulo no llega a ejecutarse, el juego se queda
//   exactamente con los fondos originales.

const RUTA_RECURSOS = new URL("../assets/imagenes/escenarios/animados/", import.meta.url);
const RUTA_FONDO_NIVEL_2 = new URL("../assets/imagenes/escenarios/escenario2-sin-colgantes.png", import.meta.url);

function porcentaje(valor, total) {
    return `${(valor / total) * 100}%`;
}

function colocarEnImagen(elemento, { x, y, ancho, alto }) {
    const { anchoImagenFondo, altoImagenFondo } = CONFIGURACION_ESCENARIO;

    elemento.style.left = porcentaje(x, anchoImagenFondo);
    elemento.style.top = porcentaje(y, altoImagenFondo);
    elemento.style.width = porcentaje(ancho, anchoImagenFondo);
    elemento.style.height = porcentaje(alto, altoImagenFondo);
}

function crearCapa(capa) {
    const elemento = document.createElement("div");

    elemento.className = "capa-fondo-animado";
    elemento.dataset.capa = capa.id;
    elemento.style.backgroundImage = `url("${new URL(capa.archivo, RUTA_RECURSOS).href}")`;
    elemento.style.backgroundSize = `100% ${FOTOGRAMAS_FONDO_ANIMADO * 100}%`;
    colocarEnImagen(elemento, capa);

    return elemento;
}

function crearColgante(colgante) {
    const elemento = document.createElement("img");

    elemento.className = `colgante-fondo-animado ${colgante.animacion}`;
    elemento.dataset.colgante = colgante.id;
    elemento.alt = "";
    elemento.decoding = "async";
    elemento.draggable = false;
    elemento.src = new URL(colgante.archivo, RUTA_RECURSOS).href;
    elemento.style.transformOrigin = `${colgante.origenX}% ${colgante.origenY}%`;
    colocarEnImagen(elemento, colgante);

    return elemento;
}

function crearContenedor() {
    const contenedor = document.createElement("div");
    const niveles = new Set([
        ...Object.keys(CAPAS_FONDO_ANIMADO),
        ...COLGANTES_FONDO_ANIMADO.map((colgante) => String(colgante.nivel))
    ]);

    contenedor.className = "fondos-animados";
    contenedor.setAttribute("aria-hidden", "true");

    niveles.forEach((nivel) => {
        const grupo = document.createElement("div");

        grupo.className = "fondos-animados-nivel";
        grupo.dataset.nivel = nivel;
        (CAPAS_FONDO_ANIMADO[nivel] ?? []).forEach((capa) => grupo.append(crearCapa(capa)));
        COLGANTES_FONDO_ANIMADO
            .filter((colgante) => String(colgante.nivel) === nivel)
            .forEach((colgante) => grupo.append(crearColgante(colgante)));
        contenedor.append(grupo);
    });

    return contenedor;
}

function precargarRecursos() {
    // Las capas de los niveles no visibles estan en display:none y el navegador no descarga sus
    // fondos hasta mostrarlas; se precargan en un momento ocioso para que el cambio de nivel no
    // muestre las capas apareciendo tarde (ni el fondo del nivel 2 en blanco).
    const urls = [
        RUTA_FONDO_NIVEL_2.href,
        ...Object.values(CAPAS_FONDO_ANIMADO).flat().map((capa) => new URL(capa.archivo, RUTA_RECURSOS).href)
    ];
    const precargar = () => urls.forEach((url) => {
        const imagen = new Image();
        imagen.decoding = "async";
        imagen.src = url;
    });

    if ("requestIdleCallback" in window) {
        window.requestIdleCallback(precargar, { timeout: 4000 });
    } else {
        window.setTimeout(precargar, 1500);
    }
}

export function iniciarFondosAnimados(escenario) {
    if (!escenario || escenario.querySelector(".fondos-animados")) {
        return null;
    }

    const contenedor = crearContenedor();
    const { anchoImagenFondo, altoImagenFondo } = CONFIGURACION_ESCENARIO;

    const ajustarAlFondo = () => {
        // Misma formula que Juego.calcularRectanguloImagenFondo().
        const anchoEscenario = escenario.clientWidth;
        const altoEscenario = escenario.clientHeight;
        const escala = Math.max(anchoEscenario / anchoImagenFondo, altoEscenario / altoImagenFondo);
        const anchoRenderizado = anchoImagenFondo * escala;

        contenedor.style.left = `${(anchoEscenario - anchoRenderizado) / 2}px`;
        contenedor.style.width = `${anchoRenderizado}px`;
        contenedor.style.height = `${altoImagenFondo * escala}px`;
    };

    escenario.prepend(contenedor);
    ajustarAlFondo();
    escenario.classList.add("fondos-animados-activos");

    if ("ResizeObserver" in window) {
        new ResizeObserver(ajustarAlFondo).observe(escenario);
    } else {
        window.addEventListener("resize", ajustarAlFondo);
    }

    precargarRecursos();

    return contenedor;
}
