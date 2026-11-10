const IDIOMA_PREDETERMINADO = "es";
const IDIOMAS_DISPONIBLES = new Set(["es", "en"]);
const CLAVE_STORAGE_IDIOMA = "portfolio.idioma";

const ATRIBUTOS_TRADUCIBLES = [
    ["data-i18n-placeholder", "placeholder"],
    ["data-i18n-title", "title"],
    ["data-i18n-aria-label", "aria-label"],
    ["data-i18n-alt", "alt"],
    ["data-i18n-data-skill-title", "data-skill-title"],
    ["data-i18n-data-skill-text", "data-skill-text"]
];

export async function inicializarI18n() {
    const i18next = window.i18next ?? crearI18nextFallback();
    window.i18next = i18next;

    const idiomaInicial = obtenerIdiomaGuardado();
    const recursos = await cargarRecursosTraduccion();

    await i18next.init({
        lng: idiomaInicial,
        fallbackLng: IDIOMA_PREDETERMINADO,
        resources: recursos,
        interpolation: {
            escapeValue: false
        }
    });

    configurarSelectorIdioma();
    aplicarTraducciones();
}

export function traducir(clave, opciones = {}) {
    if (!clave) {
        return opciones.defaultValue ?? "";
    }

    if (!window.i18next?.isInitialized) {
        return opciones.defaultValue ?? clave;
    }

    return window.i18next.t(clave, opciones);
}

export function aplicarTraducciones(contexto = document) {
    if (!window.i18next?.isInitialized) {
        return;
    }

    document.documentElement.lang = window.i18next.language || IDIOMA_PREDETERMINADO;
    document.title = traducir("meta.title");

    contexto.querySelectorAll("[data-i18n]").forEach((elemento) => {
        elemento.textContent = traducir(elemento.dataset.i18n);
    });

    ATRIBUTOS_TRADUCIBLES.forEach(([atributoClave, atributoDestino]) => {
        contexto.querySelectorAll(`[${atributoClave}]`).forEach((elemento) => {
            elemento.setAttribute(atributoDestino, traducir(elemento.getAttribute(atributoClave)));
        });
    });

    document.dispatchEvent(new CustomEvent("portfolio:idioma-cambiado", {
        detail: {
            idioma: window.i18next.language
        }
    }));
}

function obtenerIdiomaGuardado() {
    const idiomaGuardado = window.localStorage.getItem(CLAVE_STORAGE_IDIOMA);

    if (IDIOMAS_DISPONIBLES.has(idiomaGuardado)) {
        return idiomaGuardado;
    }

    return IDIOMA_PREDETERMINADO;
}

async function cargarRecursosTraduccion() {
    const [es, en] = await Promise.all([
        cargarArchivoIdioma("es"),
        cargarArchivoIdioma("en")
    ]);

    return {
        es: {
            translation: es
        },
        en: {
            translation: en
        }
    };
}

async function cargarArchivoIdioma(idioma) {
    const respuesta = await fetch(`src/lang/${idioma}.json`);

    if (!respuesta.ok) {
        throw new Error(`No se pudo cargar src/lang/${idioma}.json`);
    }

    return respuesta.json();
}

function configurarSelectorIdioma() {
    const selectorIdioma = document.querySelector("[data-selector-idioma]");

    if (!selectorIdioma) {
        return;
    }

    selectorIdioma.value = window.i18next.language || IDIOMA_PREDETERMINADO;
    selectorIdioma.addEventListener("change", () => {
        const idiomaSeleccionado = selectorIdioma.value;

        if (!IDIOMAS_DISPONIBLES.has(idiomaSeleccionado)) {
            return;
        }

        window.localStorage.setItem(CLAVE_STORAGE_IDIOMA, idiomaSeleccionado);
        window.location.reload();
    });
}

function crearI18nextFallback() {
    const estado = {
        language: IDIOMA_PREDETERMINADO,
        resources: {},
        isInitialized: false
    };

    return {
        get language() {
            return estado.language;
        },
        get isInitialized() {
            return estado.isInitialized;
        },
        async init(opciones) {
            estado.language = opciones.lng ?? IDIOMA_PREDETERMINADO;
            estado.resources = opciones.resources ?? {};
            estado.isInitialized = true;
        },
        async changeLanguage(idioma) {
            estado.language = idioma;
        },
        t(clave, opciones = {}) {
            const valor = obtenerValorPorRuta(
                estado.resources[estado.language]?.translation,
                clave
            ) ?? obtenerValorPorRuta(
                estado.resources[IDIOMA_PREDETERMINADO]?.translation,
                clave
            ) ?? opciones.defaultValue ?? clave;

            return interpolar(String(valor), opciones);
        }
    };
}

function obtenerValorPorRuta(objeto, ruta) {
    if (!objeto || !ruta) {
        return undefined;
    }

    return ruta.split(".").reduce((valor, segmento) => valor?.[segmento], objeto);
}

function interpolar(texto, valores) {
    return texto.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (coincidencia, clave) => (
        valores[clave] ?? coincidencia
    ));
}
