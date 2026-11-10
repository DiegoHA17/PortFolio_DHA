import { traducir } from "./i18n.js";

const CLAVE_SONIDO = "portfolio.sonido";
const CLAVE_VOLUMENES = "portfolio.audio.volumenes";

const EFECTOS = {
    salto: { archivo: "salto", volumen: 0.22 },
    aparecer: { archivo: "teletransporte_aparecer", volumen: 0.5, importante: true },
    desaparecer: { archivo: "teletransporte_desaparecer", volumen: 0.5, importante: true },
    carpetaAbrir: { archivo: "carpeta_abrir", volumen: 0.38 },
    carpetaCerrar: { archivo: "carpeta_cerrar", volumen: 0.3 },
    espejoAbrir: { archivo: "espejo_abrir", volumen: 0.4 },
    espejoCerrar: { archivo: "espejo_cerrar", volumen: 0.32 },
    portalAbrir: { archivo: "portal_abrir", volumen: 0.4 },
    portalCerrar: { archivo: "portal_cerrar", volumen: 0.32 },
    contactoEnfoque: { archivo: "contacto_enfoque", volumen: 0.3 },
    contactoEnlace: { archivo: "contacto_enlace", volumen: 0.3 },
    paso1: { archivo: "paso1", volumen: 0.16 },
    paso2: { archivo: "paso2", volumen: 0.16 }
};

// Que panel usa que pareja de sonidos al abrirse/cerrarse. Un panel sin entrada aqui
// (por ejemplo el tutorial inicial) se queda en silencio, como ya ocurria antes.
const SONIDOS_POR_PANEL = {
    "panel-proyecto-uno": { abrir: "carpetaAbrir", cerrar: "carpetaCerrar" },
    "panel-ordenador": { abrir: "espejoAbrir", cerrar: "espejoCerrar" },
    "panel-cambio-nivel": { abrir: "portalAbrir", cerrar: "portalCerrar" }
};

const MUSICA = { archivo: "ambiente_principal_loop" };

const VOLUMENES_PREDETERMINADOS = { maestro: 0.8, musica: 0.55, efectos: 0.9 };
const DUCKING = { factor: 0.4, ataqueSeg: 0.08, liberacionSeg: 0.6 };

export class GestorSonidos {
    constructor() {
        this.activado = true;
        this.volumenes = { ...VOLUMENES_PREDETERMINADOS };
        this.contexto = null;
        this.buffers = new Map();
        this.archivos = new Map();
        this.fuentes = new Set();
        this.ultimaReproduccion = new Map();
        this.inicializado = false;
        this.generacion = 0;
        this.musicaIniciada = false;
        this.musicaFuente = null;
        this.contadorPaso = 0;
    }

    iniciar() {
        if (this.inicializado) return;
        this.inicializado = true;
        try {
            this.activado = localStorage.getItem(CLAVE_SONIDO) !== "off";
            const guardados = JSON.parse(localStorage.getItem(CLAVE_VOLUMENES) ?? "null");
            if (guardados) this.volumenes = { ...VOLUMENES_PREDETERMINADOS, ...guardados };
        } catch { /* El sonido sigue funcionando sin almacenamiento disponible. */ }

        this.boton = document.querySelector("#boton-sonido");
        if (!(window.AudioContext || window.webkitAudioContext)) {
            this.activado = false;
            if (this.boton) this.boton.hidden = true;
            return;
        }

        for (const [nombre, efecto] of Object.entries(EFECTOS)) {
            const url = new URL(`../assets/audio/${efecto.archivo}.wav`, import.meta.url);
            this.archivos.set(nombre, fetch(url)
                .then((respuesta) => respuesta.ok ? respuesta.arrayBuffer() : null)
                .catch(() => null));
        }
        const urlMusica = new URL(`../assets/audio/${MUSICA.archivo}.wav`, import.meta.url);
        this.archivoMusica = fetch(urlMusica)
            .then((respuesta) => respuesta.ok ? respuesta.arrayBuffer() : null)
            .catch(() => null);

        // Se crea/reanuda dentro del gesto del usuario, tambien en Safari movil.
        const desbloquear = (evento) => {
            if (evento.isTrusted && this.activado && !document.hidden) this.desbloquear();
        };
        document.addEventListener("pointerdown", desbloquear, { capture: true, passive: true });
        document.addEventListener("keydown", desbloquear, { capture: true });
        this.boton?.addEventListener("click", () => this.alternar());
        // Space/Enter sobre este control no deben activar el salto del juego.
        for (const tipo of ["keydown", "keyup"]) {
            this.boton?.addEventListener(tipo, (evento) => evento.stopPropagation());
        }
        document.addEventListener("portfolio:idioma-cambiado", () => this.actualizarBoton());
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) this.detener();
        });
        window.addEventListener("blur", () => this.detener());

        this.configurarMezclador();
        this.actualizarBoton();
    }

    desbloquear() {
        try {
            if (!this.contexto) {
                const Contexto = window.AudioContext || window.webkitAudioContext;
                this.contexto = new Contexto();

                this.gananciaMaestra = this.contexto.createGain();
                this.gananciaMusica = this.contexto.createGain();
                this.gananciaEfectos = this.contexto.createGain();
                this.gananciaMusica.connect(this.gananciaMaestra);
                this.gananciaEfectos.connect(this.gananciaMaestra);
                this.gananciaMaestra.connect(this.contexto.destination);
                this.aplicarVolumenes();

                for (const [nombre, archivo] of this.archivos) {
                    this.buffers.set(nombre, archivo.then((datos) => datos
                        ? this.contexto.decodeAudioData(datos) : null).catch(() => null));
                }
                this.bufferMusica = this.archivoMusica.then((datos) => datos
                    ? this.contexto.decodeAudioData(datos) : null).catch(() => null);
            }
            if (this.contexto.state !== "running") this.contexto.resume().catch(() => {});
            this.iniciarMusica();
        } catch { /* Un bloqueo de audio nunca debe interrumpir el juego. */ }
    }

    async iniciarMusica() {
        if (this.musicaIniciada || !this.activado || !this.contexto) return;
        this.musicaIniciada = true; // se marca antes del await para evitar arranques duplicados
        const buffer = await this.bufferMusica;
        // Si detener() se disparo mientras se decodificaba (p.ej. se oculto la pestaña), no arrancar.
        if (!buffer || !this.activado || !this.contexto || document.hidden || !this.musicaIniciada || this.musicaFuente) return;
        const fuente = this.contexto.createBufferSource();
        fuente.buffer = buffer;
        fuente.loop = true;
        fuente.connect(this.gananciaMusica);
        fuente.start();
        this.musicaFuente = fuente;
    }

    async reproducir(nombre) {
        if (!this.activado || document.hidden || !this.contexto || !EFECTOS[nombre]) return;
        const ahora = performance.now();
        const generacion = this.generacion;
        if (ahora - (this.ultimaReproduccion.get(nombre) ?? -Infinity) < 100) return;
        this.ultimaReproduccion.set(nombre, ahora);
        const buffer = await this.buffers.get(nombre);
        // No reproducir efectos atrasados si la carga o el desbloqueo tardan. El margen es mayor
        // que antes porque ahora hay mas buffers (11 efectos + musica) decodificando a la vez
        // justo en el primer gesto del usuario.
        if (!buffer || !this.activado || document.hidden || generacion !== this.generacion ||
            this.contexto.state !== "running" || performance.now() - ahora > 700) return;
        try {
            if (this.fuentes.size >= 4) {
                const anterior = this.fuentes.values().next().value;
                anterior.stop();
                this.fuentes.delete(anterior);
            }
            const efecto = EFECTOS[nombre];
            const fuente = this.contexto.createBufferSource();
            const ganancia = this.contexto.createGain();
            fuente.buffer = buffer;
            ganancia.gain.value = efecto.volumen;
            fuente.connect(ganancia).connect(this.gananciaEfectos);
            fuente.onended = () => {
                this.fuentes.delete(fuente);
                fuente.disconnect();
                ganancia.disconnect();
            };
            this.fuentes.add(fuente);
            fuente.start();
            if (efecto.importante) this.duckMusica(buffer.duration);
        } catch { /* Degradacion silenciosa ante dispositivos de audio no disponibles. */ }
    }

    /** Baja momentaneamente la musica para que un efecto importante (teletransporte) se oiga claro. */
    duckMusica(duracionEfectoSeg) {
        if (!this.gananciaMusica) return;
        const ahora = this.contexto.currentTime;
        const nivelBase = this.volumenes.musica;
        const gain = this.gananciaMusica.gain;
        gain.cancelScheduledValues(ahora);
        gain.setValueAtTime(gain.value, ahora);
        gain.linearRampToValueAtTime(nivelBase * DUCKING.factor, ahora + DUCKING.ataqueSeg);
        gain.setValueAtTime(nivelBase * DUCKING.factor, ahora + Math.max(DUCKING.ataqueSeg, duracionEfectoSeg * 0.6));
        gain.linearRampToValueAtTime(nivelBase, ahora + Math.max(DUCKING.ataqueSeg, duracionEfectoSeg * 0.6) + DUCKING.liberacionSeg);
    }

    /** Reproduce el sonido de apertura/cierre asociado a un panel, si hay uno definido. */
    reproducirSonidoPanel(idPanel, accion) {
        const nombre = SONIDOS_POR_PANEL[idPanel]?.[accion];
        if (nombre) this.reproducir(nombre);
    }

    /** Pisada del jugador al caminar: alterna entre dos variantes para que no suene repetitivo. */
    reproducirPaso() {
        this.contadorPaso = (this.contadorPaso + 1) % 2;
        this.reproducir(this.contadorPaso === 0 ? "paso1" : "paso2");
    }

    detener() {
        this.generacion += 1;
        for (const fuente of this.fuentes) {
            try { fuente.stop(); } catch { /* La fuente puede haber terminado. */ }
        }
        this.fuentes.clear();
        if (this.musicaFuente) {
            try { this.musicaFuente.stop(); } catch { /* La fuente puede haber terminado. */ }
            this.musicaFuente.disconnect();
            this.musicaFuente = null;
            this.musicaIniciada = false;
        }
    }

    alternar() {
        this.activado = !this.activado;
        try { localStorage.setItem(CLAVE_SONIDO, this.activado ? "on" : "off"); } catch {}
        if (this.activado) {
            this.desbloquear();
            this.reproducir("contactoEnfoque");
        } else {
            this.detener();
        }
        this.actualizarBoton();
    }

    aplicarVolumenes() {
        if (!this.gananciaMaestra) return;
        this.gananciaMaestra.gain.value = this.volumenes.maestro;
        this.gananciaMusica.gain.value = this.volumenes.musica;
        this.gananciaEfectos.gain.value = this.volumenes.efectos;
    }

    guardarVolumenes() {
        try { localStorage.setItem(CLAVE_VOLUMENES, JSON.stringify(this.volumenes)); } catch {}
    }

    configurarMezclador() {
        const botonMezclador = document.querySelector("#boton-mezclador");
        const panel = document.querySelector("#panel-mezclador");
        if (!botonMezclador || !panel) return;

        const deslizadores = {
            maestro: document.querySelector("#volumen-maestro"),
            musica: document.querySelector("#volumen-musica"),
            efectos: document.querySelector("#volumen-efectos")
        };
        for (const [clave, entrada] of Object.entries(deslizadores)) {
            if (!entrada) continue;
            entrada.value = String(Math.round(this.volumenes[clave] * 100));
            entrada.addEventListener("input", () => {
                this.volumenes[clave] = Number(entrada.value) / 100;
                this.aplicarVolumenes();
                this.guardarVolumenes();
            });
            for (const tipo of ["keydown", "keyup"]) {
                entrada.addEventListener(tipo, (evento) => evento.stopPropagation());
            }
        }

        const alternarPanel = (mostrar) => {
            const visible = mostrar ?? panel.classList.contains("oculto");
            panel.classList.toggle("oculto", !visible);
            botonMezclador.setAttribute("aria-expanded", String(visible));
        };
        botonMezclador.addEventListener("click", (evento) => {
            evento.stopPropagation();
            alternarPanel();
        });
        document.addEventListener("click", (evento) => {
            if (!panel.classList.contains("oculto") && !panel.contains(evento.target) && evento.target !== botonMezclador) {
                alternarPanel(false);
            }
        });
        document.addEventListener("keydown", (evento) => {
            if (evento.key === "Escape") alternarPanel(false);
        });
    }

    actualizarBoton() {
        if (!this.boton) return;
        const etiqueta = traducir(this.activado ? "audio.mute" : "audio.enable");
        this.boton.setAttribute("aria-label", etiqueta);
        this.boton.setAttribute("title", etiqueta);
        this.boton.setAttribute("aria-pressed", String(this.activado));
        this.boton.querySelector("[data-icono-sonido='on']").hidden = !this.activado;
        this.boton.querySelector("[data-icono-sonido='off']").hidden = this.activado;
    }
}

export const sonidos = new GestorSonidos();
