import { Jugador } from "../entities/Jugador.js";
import { Nivel } from "../entities/Nivel.js";
import { ObjetoInteractivo } from "../entities/ObjetoInteractivo.js";
import { PlataformaColision } from "../entities/PlataformaColision.js";
import { GestorControles } from "./controles.js";
import { traducir } from "./i18n.js";
import { sonidos } from "./sonidos.js";
import {
    CONFIGURACION_ANIMACION,
    CONFIGURACION_ESCENARIO,
    CONFIGURACION_JUGADOR,
    CONFIGURACION_NIVELES,
    CODIGOS_TECLAS,
    PENSAMIENTOS_NIVELES,
    RUTAS_OBJETO_PROYECTO,
    RUTAS_PORTAL_NIVEL
} from "./configuracion.js";

export class Juego {
    constructor() {
        this.escenario = document.querySelector("#escenario");
        this.mensajeInteraccion = document.querySelector("#mensaje-interaccion");
        this.pensamientoJugador = document.querySelector("#pensamiento-jugador");
        this.panelOrdenador = document.querySelector("#panel-ordenador");
        this.botonCerrarPanel = document.querySelector("#boton-cerrar-panel");
        this.botonCambiarNivel = document.querySelector("#boton-cambiar-nivel");
        this.tiempoAnterior = 0;
        this.idAnimacion = null;
        this.jugador = null;
        this.nivelActual = null;
        this.indiceNivelActual = 1;
        this.objetosInteractivos = [];
        this.objetosInteractivosPorId = new Map();
        this.escalerasNivelActual = [];
        this.objetoInteractivoCercano = null;
        this.panelActivo = null;
        this.gestorControles = null;
        this.capaColisiones = null;
        this.configuracionNivelActual = null;
        this.datosObjetosInteractivos = new Map();
        this.estaReapareciendoJugador = false;
        this.estaTeletransportandoJugador = false;
        this.estaCambiandoNivel = false;
        this.estaNavegandoDesdeCabecera = false;
        this.estaTransicionandoEscalera = false;
        this.spritePortalNivel = document.querySelector("#portal-nivel-sprite");
        this.framePortalNivel = 0;
        this.tiempoUltimoFramePortalNivel = 0;
        this.objetosProyectoHover = new Set();
        this.estadosObjetosProyecto = new Map();
        this.tutorialInicialMostrado = false;
        this.jugadorAparecioTrasTutorial = false;
        this.temporizadorPensamiento = null;
        this.indiceFormacionActual = 0;
        this.formacionesAdicionales = [
            "training.items.0",
            "training.items.1",
            "training.items.2",
            "training.items.3",
            "training.items.4",
            "training.items.5"
        ];
    }

    async iniciar() {
        if (!this.validarElementosPrincipales()) {
            return;
        }

        this.crearJugador();
        this.crearNivelPrincipal();
        this.jugador?.bloquearMovimiento();
        this.configurarControles();
        this.configurarInterfaz();
        this.exponerFuncionesTemporalesDePrueba();
        this.mostrarTutorialInicial();
        this.tiempoAnterior = performance.now();
        this.idAnimacion = requestAnimationFrame((tiempoActual) => this.ejecutarBuclePrincipal(tiempoActual));
    }

    validarElementosPrincipales() {
        const elementosRequeridos = [
            ["#escenario", this.escenario],
            ["#mensaje-interaccion", this.mensajeInteraccion],
            ["#pensamiento-jugador", this.pensamientoJugador],
            ["#panel-ordenador", this.panelOrdenador],
            ["#boton-cerrar-panel", this.botonCerrarPanel]
        ];

        const faltanElementos = elementosRequeridos.some(([selector, elemento]) => {
            if (!elemento) {
                console.error(`Falta el elemento obligatorio ${selector}.`);
                return true;
            }

            return false;
        });

        return !faltanElementos;
    }

    crearJugador() {
        const contenedorPersonaje = document.querySelector("#contenedor-personaje");
        const imagenPersonaje = document.querySelector("#personaje");

        if (!contenedorPersonaje || !imagenPersonaje) {
            console.error("No se pudo crear el jugador porque faltan sus elementos HTML.");
            return;
        }

        this.jugador = new Jugador({
            id: "jugador",
            elemento: contenedorPersonaje,
            elementoImagen: imagenPersonaje,
            posicionX: CONFIGURACION_JUGADOR.posicionInicialX,
            posicionY: CONFIGURACION_JUGADOR.posicionInicialY,
            ancho: CONFIGURACION_JUGADOR.ancho,
            alto: CONFIGURACION_JUGADOR.alto
        });
        this.aplicarTamanoResponsiveJugador();
    }

    crearNivelPrincipal() {
        const elementoNivel = document.querySelector("#nivel-principal");
        this.capaColisiones = this.crearCapaColisiones();

        this.nivelActual = new Nivel({
            id: "nivel-principal",
            nombre: "Nivel principal",
            elemento: elementoNivel,
            posicionInicialJugador: {
                x: CONFIGURACION_JUGADOR.posicionInicialX,
                y: CONFIGURACION_JUGADOR.posicionInicialY
            }
        });

        this.nivelActual.activar();
        this.irANivel(this.indiceNivelActual);
        this.colocarJugadorEnPlataformaInicial();

        if (CONFIGURACION_ESCENARIO.mostrarColisiones) {
            this.escenario.classList.add("mostrar-colisiones");
        }
    }

    configurarControles() {
        this.gestorControles = new GestorControles({
            jugador: this.jugador,
            alInteractuar: (codigoTecla) => this.interactuarConObjetoCercano(codigoTecla),
            alCerrarPanel: () => this.cerrarPanelActivo(),
            alProbarAparicion: () => this.probarAparicionTemporal(),
            alProbarDesaparicion: () => this.probarDesaparicionTemporal(),
            alAlternarColisiones: () => this.alternarColisiones()
        });
        this.gestorControles.activar();
    }

    configurarInterfaz() {
        document.querySelectorAll("[data-cerrar-panel]").forEach((boton) => {
            boton.addEventListener("click", () => this.cerrarPanelActivo());
        });

        this.jugador?.elemento?.addEventListener("click", (evento) => {
            evento.preventDefault();
            evento.stopPropagation();
            this.teletransportarJugadorAleatoriamente();
        });

        this.botonCambiarNivel?.addEventListener("click", () => this.cambiarNivelDesdePortal());
        this.configurarNavegacionCabecera();
        this.configurarObjetosProyecto();
        this.configurarFormularioContacto();
        this.configurarBotonesHardSkills();
        this.configurarCarruselFormacion();
        this.configurarControlesMoviles();
        window.addEventListener("resize", () => {
            this.aplicarTamanoResponsiveJugador();
            this.mostrarTutorialInicial();
        });
        window.addEventListener("orientationchange", () => {
            window.setTimeout(() => this.mostrarTutorialInicial(), 180);
        });
        document.addEventListener("portfolio:idioma-cambiado", () => this.actualizarTextosDinamicos());
    }

    configurarObjetosProyecto() {
        document.querySelectorAll("[data-objeto-proyecto]").forEach((elementoObjeto) => {
            const idObjeto = elementoObjeto.dataset.objetoProyecto;

            if (!idObjeto) {
                return;
            }

            this.estadosObjetosProyecto.set(idObjeto, {
                abierto: false,
                animando: false,
                deseadoAbierto: false
            });

            elementoObjeto.addEventListener("pointerenter", () => {
                this.objetosProyectoHover.add(idObjeto);
                elementoObjeto.classList.add("objeto-proyecto-hover");
                this.solicitarEstadoObjetoProyecto(idObjeto, true);
            });

            elementoObjeto.addEventListener("pointerleave", () => {
                this.objetosProyectoHover.delete(idObjeto);
                elementoObjeto.classList.remove("objeto-proyecto-hover");
                this.actualizarEstadoVisualObjetosProyecto();
            });
        });
    }

    configurarNavegacionCabecera() {
        document.querySelectorAll("[data-accion-nav]").forEach((enlace) => {
            enlace.addEventListener("click", (evento) => {
                evento.preventDefault();
                this.navegarDesdeCabecera(enlace.dataset.accionNav);
            });
        });

        this.marcarEnlaceCabeceraActivo("inicio");
    }

    configurarControlesMoviles() {
        const mapaControles = {
            izquierda: CODIGOS_TECLAS.izquierda,
            derecha: CODIGOS_TECLAS.derecha,
            arriba: CODIGOS_TECLAS.arriba,
            salto: CODIGOS_TECLAS.salto
        };

        document.querySelectorAll("[data-control-movil]").forEach((boton) => {
            const codigoTecla = mapaControles[boton.dataset.controlMovil];

            if (!codigoTecla) {
                return;
            }

            const pulsar = (evento) => {
                evento.preventDefault();
                this.gestorControles?.pulsarControlVirtual(codigoTecla);
                boton.classList.add("boton-control-movil-activo");
            };
            const liberar = (evento) => {
                evento.preventDefault();
                this.gestorControles?.liberarControlVirtual(codigoTecla);
                boton.classList.remove("boton-control-movil-activo");
            };

            boton.addEventListener("pointerdown", pulsar);
            boton.addEventListener("pointerup", liberar);
            boton.addEventListener("pointercancel", liberar);
            boton.addEventListener("pointerleave", liberar);
        });

        document.querySelectorAll("[data-interaccion-movil]").forEach((boton) => {
            const mapaInteracciones = {
                normal: CODIGOS_TECLAS.interaccion,
                contacto: CODIGOS_TECLAS.interaccionContacto
            };
            const codigoTecla = mapaInteracciones[boton.dataset.interaccionMovil];

            if (!codigoTecla) {
                return;
            }

            const activar = (evento) => {
                evento.preventDefault();
                this.interactuarConObjetoCercano(codigoTecla);
                boton.classList.add("boton-control-movil-activo");
            };
            const liberar = (evento) => {
                evento.preventDefault();
                boton.classList.remove("boton-control-movil-activo");
            };

            boton.addEventListener("pointerdown", activar);
            boton.addEventListener("pointerup", liberar);
            boton.addEventListener("pointercancel", liberar);
            boton.addEventListener("pointerleave", liberar);
        });
    }

    configurarFormularioContacto() {
        const formularioContacto = document.querySelector("#formulario-contacto");

        formularioContacto?.addEventListener("submit", (evento) => {
            evento.preventDefault();

            const datosFormulario = new FormData(formularioContacto);
            const nombre = String(datosFormulario.get("nombre") ?? "").trim();
            const email = String(datosFormulario.get("email") ?? "").trim();
            const mensaje = String(datosFormulario.get("mensaje") ?? "").trim();
            const nombreAsunto = nombre || traducir("contact.mailSubjectNoName");
            const asunto = traducir("contact.mailSubject", {
                name: nombreAsunto
            });
            const cuerpo = [
                traducir("contact.mailBodyName", { name: nombre }),
                traducir("contact.mailBodyEmail", { email }),
                "",
                mensaje
            ].join("\n");
            const parametrosCorreo = new URLSearchParams({
                view: "cm",
                fs: "1",
                to: "diegohoyopino@gmail.com",
                su: asunto,
                body: cuerpo
            });
            const enlaceCorreo = `https://mail.google.com/mail/?${parametrosCorreo.toString()}`;

            window.open(enlaceCorreo, "_blank", "noopener,noreferrer");
            formularioContacto.reset();
        });
    }

    aplicarTamanoResponsiveJugador() {
        if (!this.jugador?.elemento) {
            return;
        }

        const anchoViewport = window.innerWidth;
        const altoViewport = window.innerHeight;
        let ancho = CONFIGURACION_JUGADOR.ancho;
        let alto = CONFIGURACION_JUGADOR.alto;

        if (anchoViewport <= 720 || altoViewport <= 480) {
            ancho = 64;
            alto = 75;
        } else if (anchoViewport <= 1366 || altoViewport <= 900) {
            ancho = 80;
            alto = 94;
        }

        this.jugador.ancho = ancho;
        this.jugador.alto = alto;
        this.jugador.elemento.style.width = `${ancho}px`;
        this.jugador.elemento.style.height = `${alto}px`;
    }

    configurarBotonesHardSkills() {
        const botones = Array.from(document.querySelectorAll("[data-skill-trigger]"));

        botones.forEach((boton) => {
            boton.addEventListener("click", () => {
                botones.forEach((botonSkill) => botonSkill.classList.remove("boton-hard-skill-activo"));
                boton.classList.add("boton-hard-skill-activo");
                this.actualizarDetalleSkillActivo();
            });
        });
    }

    configurarCarruselFormacion() {
        const botonAnterior = document.querySelector("[data-formacion-anterior]");
        const botonSiguiente = document.querySelector("[data-formacion-siguiente]");

        botonAnterior?.addEventListener("click", () => {
            const totalFormaciones = this.formacionesAdicionales.length;
            this.indiceFormacionActual = (this.indiceFormacionActual - 1 + totalFormaciones) % totalFormaciones;
            this.actualizarCarruselFormacion();
        });

        botonSiguiente?.addEventListener("click", () => {
            const totalFormaciones = this.formacionesAdicionales.length;
            this.indiceFormacionActual = (this.indiceFormacionActual + 1) % totalFormaciones;
            this.actualizarCarruselFormacion();
        });

        this.actualizarCarruselFormacion();
    }

    actualizarDetalleSkillActivo() {
        const botonActivo = document.querySelector("[data-skill-trigger].boton-hard-skill-activo");
        const tituloDetalle = document.querySelector("[data-skill-detalle-titulo]");
        const textoDetalle = document.querySelector("[data-skill-detalle-texto]");

        if (tituloDetalle) {
            tituloDetalle.textContent = botonActivo?.dataset.skillTitle ?? "";
        }

        if (textoDetalle) {
            textoDetalle.textContent = botonActivo?.dataset.skillText ?? "";
        }
    }

    actualizarCarruselFormacion() {
        const textoFormacion = document.querySelector("[data-formacion-texto]");
        const contadorFormacion = document.querySelector("[data-formacion-contador]");
        const totalFormaciones = this.formacionesAdicionales.length;

        if (textoFormacion) {
            const claveFormacion = this.formacionesAdicionales[this.indiceFormacionActual];
            textoFormacion.textContent = traducir(claveFormacion, {
                defaultValue: claveFormacion ?? ""
            });
        }

        if (contadorFormacion) {
            contadorFormacion.textContent = `${this.indiceFormacionActual + 1}/${totalFormaciones}`;
        }
    }

    async navegarDesdeCabecera(accionNav) {
        if (!this.jugador || this.estaNavegandoDesdeCabecera || this.estaCambiandoNivel || this.estaReapareciendoJugador) {
            return;
        }

        this.estaNavegandoDesdeCabecera = true;

        try {
            this.cerrarPanelActivo();
            this.limpiarObjetoInteractivoCercano();
            this.marcarEnlaceCabeceraActivo(accionNav);
            this.ocultarPensamientoJugador();
            await this.jugador.desaparecer();

            switch (accionNav) {
                case "experiencia":
                    this.irANivel(2);
                    this.colocarJugadorEnPlataformaInicial();
                    this.actualizarCamaraJugador(true);
                    await this.aparecerJugadorConPensamiento();
                    break;
                case "proyectos":
                    this.irANivel(3);
                    this.colocarJugadorEnPlataformaInicial();
                    this.actualizarObjetosInteractivos();
                    this.actualizarCamaraJugador(true);
                    await this.aparecerJugadorConPensamiento();
                    break;
                case "contacto":
                    this.irANivel(4);
                    this.colocarJugadorEnPlataformaInicial();
                    this.actualizarObjetosInteractivos();
                    this.actualizarCamaraJugador(true);
                    await this.aparecerJugadorConPensamiento();
                    break;
                case "inicio":
                default:
                    this.irANivel(1);
                    this.colocarJugadorEnPlataformaInicial();
                    this.actualizarObjetosInteractivos();
                    this.actualizarCamaraJugador(true);
                    await this.aparecerJugadorConPensamiento();
                    break;
            }
        } finally {
            this.estaNavegandoDesdeCabecera = false;
        }
    }

    marcarEnlaceCabeceraActivo(accionNav) {
        document.querySelectorAll("[data-accion-nav]").forEach((enlace) => {
            enlace.classList.toggle("enlace-activo", enlace.dataset.accionNav === accionNav);
        });
    }

    irANivel(indiceNivel) {
        const configuracionNivel = this.obtenerConfiguracionNivel(indiceNivel);

        this.indiceNivelActual = indiceNivel;
        this.configuracionNivelActual = configuracionNivel;

        if (this.escenario) {
            this.escenario.dataset.nivelActual = String(indiceNivel);
        }

        if (this.nivelActual) {
            this.nivelActual.nombre = configuracionNivel.nombre;
            this.nivelActual.posicionInicialJugador = {
                x: configuracionNivel.posicionInicialX ?? CONFIGURACION_JUGADOR.posicionInicialX,
                y: CONFIGURACION_JUGADOR.posicionInicialY
            };
        }

        this.crearPlataformasColision(configuracionNivel.plataformas);
        this.crearEscaleras(configuracionNivel.escaleras ?? []);
        this.actualizarPlataformasColision();
        this.actualizarEscaleras();
        this.crearObjetosInteractivos(configuracionNivel.objetos);
        this.actualizarObjetosInteractivos();
        this.objetosInteractivos = this.nivelActual?.objetosInteractivos ?? [];
        this.marcarEnlaceCabeceraActivoPorNivel(indiceNivel);
    }

    obtenerConfiguracionNivel(indiceNivel) {
        return CONFIGURACION_NIVELES[indiceNivel] ?? CONFIGURACION_NIVELES[1];
    }

    marcarEnlaceCabeceraActivoPorNivel(indiceNivel) {
        const accionesPorNivel = {
            1: "inicio",
            2: "experiencia",
            3: "proyectos",
            4: "contacto"
        };
        const accionNav = accionesPorNivel[indiceNivel];

        if (accionNav) {
            this.marcarEnlaceCabeceraActivo(accionNav);
        }
    }

    colocarJugadorJuntoAObjeto(idObjeto) {
        const objetoDestino = this.nivelActual?.objetosInteractivos.find((objeto) => objeto.id === idObjeto);

        if (!objetoDestino || !this.escenario) {
            this.colocarJugadorEnPlataformaInicial();
            return;
        }

        this.actualizarObjetosInteractivos();

        const margen = 14;
        const posicionX = Math.max(
            0,
            Math.min(
                objetoDestino.posicionX - this.jugador.ancho - margen,
                this.escenario.clientWidth - this.jugador.ancho
            )
        );

        this.jugador.posicionX = posicionX;
        this.jugador.posicionY = objetoDestino.posicionY;
        this.jugador.posicionSuelo = objetoDestino.posicionY;
        this.jugador.velocidadVertical = 0;
        this.jugador.estaEnElSuelo = true;
        this.jugador.estaSaltando = false;
        this.jugador.actualizarPosicion();
    }

    ejecutarBuclePrincipal(tiempoActual) {
        const deltaTime = Math.min(
            (tiempoActual - this.tiempoAnterior) / 1000,
            CONFIGURACION_ESCENARIO.deltaTimeMaximo
        );
        this.tiempoAnterior = tiempoActual;

        this.actualizarControles();
        this.actualizarMovimientoJugador(deltaTime);
        this.actualizarCamaraJugador();
        this.actualizarAnimacionJugador(tiempoActual);
        this.actualizarAnimacionPortalNivel(tiempoActual);
        this.comprobarObjetosInteractivos();
        this.actualizarControlSubirMovil();
        this.renderizar();

        this.idAnimacion = requestAnimationFrame((nuevoTiempoActual) => this.ejecutarBuclePrincipal(nuevoTiempoActual));
    }

    actualizarControles() {
        this.gestorControles?.actualizarControles();
    }

    actualizarControlSubirMovil() {
        const contenedorControles = document.querySelector(".controles-moviles");

        if (!contenedorControles) {
            return;
        }

        const debeMostrarSubida = this.esViewportMovilOTablet() && Boolean(this.obtenerEscaleraBajoJugador());
        const debeMostrarInteraccion = (
            this.esViewportMovilOTablet() &&
            !this.panelActivo &&
            this.objetoInteractivoCercano?.teclaInteraccion === CODIGOS_TECLAS.interaccionContacto
        );
        const debeMostrarInteraccionNormal = (
            this.esViewportMovilOTablet() &&
            !this.panelActivo &&
            this.objetoInteractivoCercano?.teclaInteraccion === CODIGOS_TECLAS.interaccion
        );
        contenedorControles.classList.toggle("mostrar-control-subir", debeMostrarSubida);
        contenedorControles.classList.toggle("mostrar-control-interaccion-e", debeMostrarInteraccion);
        contenedorControles.classList.toggle("mostrar-control-interaccion-i", debeMostrarInteraccionNormal);

        if (!debeMostrarSubida) {
            this.gestorControles?.liberarControlVirtual(CODIGOS_TECLAS.arriba);
        }

        if (!debeMostrarInteraccion) {
            contenedorControles
                .querySelector("[data-interaccion-movil='contacto']")
                ?.classList.remove("boton-control-movil-activo");
        }

        if (!debeMostrarInteraccionNormal) {
            contenedorControles
                .querySelector("[data-interaccion-movil='normal']")
                ?.classList.remove("boton-control-movil-activo");
        }
    }

    actualizarMovimientoJugador(deltaTime) {
        if (!this.jugador || !this.escenario) {
            return;
        }

        this.actualizarPlataformasColision();
        this.actualizarEscaleras();
        this.actualizarObjetosInteractivos();

        const limiteIzquierdo = 0;
        const limiteDerecho = Math.max(
            0,
            this.escenario.clientWidth - this.jugador.elemento.offsetWidth
        );

        if (this.actualizarMovimientoJugadorEnEscalera(deltaTime, limiteIzquierdo, limiteDerecho)) {
            this.comprobarCaidaJugador();
            return;
        }

        this.jugador.actualizarMovimiento(
            deltaTime,
            limiteIzquierdo,
            limiteDerecho,
            this.nivelActual?.plataformasColision ?? [],
            this.escenario.clientHeight
        );
        this.comprobarCaidaJugador();
    }

    actualizarMovimientoJugadorEnEscalera(deltaTime, limiteIzquierdo, limiteDerecho) {
        if (this.estaTransicionandoEscalera) {
            return true;
        }

        const escaleraActiva = this.obtenerEscaleraBajoJugador();

        if (!escaleraActiva) {
            this.jugador.estaEnEscalera = false;
            return false;
        }

        const pulsaArriba = this.jugador.teclasPulsadas.has(CODIGOS_TECLAS.arriba);
        const pulsaAbajo = this.jugador.teclasPulsadas.has(CODIGOS_TECLAS.abajo);
        const pulsaSalto = this.jugador.teclasPulsadas.has(CODIGOS_TECLAS.salto);
        const estaUsandoEscalera = pulsaArriba || pulsaAbajo || this.jugador.estaEnEscalera;

        if (!estaUsandoEscalera) {
            return false;
        }

        if (pulsaArriba) {
            this.transportarJugadorArribaDeEscalera(escaleraActiva);
            return true;
        }

        if (pulsaSalto) {
            this.jugador.estaEnEscalera = false;
            this.jugador.estaEnElSuelo = true;
            this.jugador.saltar();
            return false;
        }

        const velocidadEscalera = (escaleraActiva.velocidad ?? CONFIGURACION_JUGADOR.velocidadMovimiento) * deltaTime;
        let desplazamientoVertical = 0;

        if (pulsaAbajo) {
            desplazamientoVertical -= velocidadEscalera;
        }

        if (this.jugador.teclasPulsadas.has(CODIGOS_TECLAS.derecha)) {
            this.jugador.moverALaDerecha();
        } else if (this.jugador.teclasPulsadas.has(CODIGOS_TECLAS.izquierda)) {
            this.jugador.moverALaIzquierda();
        } else {
            this.jugador.detenerMovimientoHorizontal();
        }

        this.jugador.posicionX += this.jugador.velocidadHorizontal * deltaTime;
        this.jugador.posicionX = Math.max(limiteIzquierdo, Math.min(this.jugador.posicionX, limiteDerecho));
        this.jugador.posicionY += desplazamientoVertical;
        this.jugador.posicionY = this.limitarPosicionJugadorEnEscalera(this.jugador.posicionY, escaleraActiva);
        this.jugador.posicionSuelo = this.jugador.posicionY;
        this.jugador.velocidadVertical = 0;
        this.jugador.estaEnElSuelo = false;
        this.jugador.estaSaltando = false;
        this.jugador.estaEnEscalera = true;
        this.jugador.actualizarEstadoPorMovimiento();
        this.jugador.actualizarDireccion();
        this.jugador.actualizarPosicion();

        return true;
    }

    obtenerEscaleraBajoJugador() {
        if (!this.jugador || this.escalerasNivelActual.length === 0 || !this.escenario) {
            return null;
        }

        const centroXJugador = this.jugador.posicionX + this.jugador.ancho / 2;
        const piesYJugador = this.escenario.clientHeight - this.jugador.posicionY;

        return this.escalerasNivelActual.find((escalera) => {
            const rectangulo = escalera.rectanguloPantalla;

            return (
                centroXJugador >= rectangulo.left &&
                centroXJugador <= rectangulo.right &&
                piesYJugador >= rectangulo.top &&
                piesYJugador <= rectangulo.bottom
            );
        }) ?? null;
    }

    limitarPosicionJugadorEnEscalera(posicionY, escalera) {
        if (!this.escenario) {
            return posicionY;
        }

        const posicionMinima = this.escenario.clientHeight - escalera.rectanguloPantalla.bottom;
        const posicionMaxima = this.escenario.clientHeight - escalera.rectanguloPantalla.top;

        return Math.max(posicionMinima, Math.min(posicionY, posicionMaxima));
    }

    async transportarJugadorArribaDeEscalera(escalera) {
        if (!this.jugador || this.estaTransicionandoEscalera) {
            return;
        }

        const plataformaDestino = this.nivelActual?.obtenerPlataformaColision(escalera.destinoSubidaPlataformaId);

        if (!plataformaDestino) {
            return;
        }

        this.estaTransicionandoEscalera = true;

        try {
            this.jugador.estaEnEscalera = false;
            this.jugador.bloquearMovimiento();
            await this.jugador.desaparecer();

            const rectanguloPlataforma = plataformaDestino.obtenerRectanguloPantalla();
            const rectanguloImagen = this.calcularRectanguloImagenFondo();
            const xDestinoPreferido = rectanguloImagen.left + (escalera.destinoSubidaX ?? escalera.x + escalera.ancho + 12) * rectanguloImagen.escala;
            const margen = 10;

            this.jugador.posicionX = Math.max(
                rectanguloPlataforma.left + margen,
                Math.min(xDestinoPreferido, rectanguloPlataforma.right - this.jugador.ancho - margen)
            );
            this.jugador.posicionY = plataformaDestino.obtenerPosicionSuperiorDesdeAbajo(this.escenario.clientHeight);
            this.jugador.posicionSuelo = this.jugador.posicionY;
            this.jugador.velocidadVertical = 0;
            this.jugador.estaEnElSuelo = true;
            this.jugador.estaSaltando = false;
            this.jugador.actualizarPosicion();
            this.actualizarCamaraJugador(true);
            await this.jugador.aparecer();
        } finally {
            this.gestorControles?.liberarControlVirtual(CODIGOS_TECLAS.arriba);
            this.estaTransicionandoEscalera = false;
        }
    }

    actualizarAnimacionJugador(tiempoActual) {
        this.jugador?.actualizarAnimacion(tiempoActual);
    }

    actualizarAnimacionPortalNivel(tiempoActual) {
        if (!this.spritePortalNivel || RUTAS_PORTAL_NIVEL.length === 0) {
            return;
        }

        if (this.tiempoUltimoFramePortalNivel === 0) {
            this.tiempoUltimoFramePortalNivel = tiempoActual;
            this.spritePortalNivel.src = RUTAS_PORTAL_NIVEL[this.framePortalNivel];
            return;
        }

        if (tiempoActual - this.tiempoUltimoFramePortalNivel < CONFIGURACION_ANIMACION.intervaloPortalNivel) {
            return;
        }

        this.framePortalNivel = (this.framePortalNivel + 1) % RUTAS_PORTAL_NIVEL.length;
        this.tiempoUltimoFramePortalNivel = tiempoActual;
        this.spritePortalNivel.src = RUTAS_PORTAL_NIVEL[this.framePortalNivel];
    }

    comprobarObjetosInteractivos() {
        if (!this.jugador || this.panelActivo) {
            this.limpiarObjetoInteractivoCercano();
            return;
        }

        let objetoMasCercano = null;
        let distanciaMasCercana = Number.POSITIVE_INFINITY;

        this.objetosInteractivos.forEach((objetoInteractivo) => {
            const estaCerca = objetoInteractivo.comprobarCercania(this.jugador);

            if (!estaCerca) {
                return;
            }

            const distancia = this.calcularDistanciaHorizontal(this.jugador, objetoInteractivo);

            if (distancia < distanciaMasCercana) {
                objetoMasCercano = objetoInteractivo;
                distanciaMasCercana = distancia;
            }
        });

        this.objetosInteractivos.forEach((objetoInteractivo) => {
            if (objetoInteractivo !== objetoMasCercano) {
                objetoInteractivo.desactivarInteraccion();
            }
        });

        this.objetoInteractivoCercano = objetoMasCercano;
        this.actualizarEstadoVisualObjetosProyecto();
    }

    actualizarEstadoVisualObjetosProyecto() {
        document.querySelectorAll("[data-objeto-proyecto]").forEach((elementoObjeto) => {
            const idObjeto = elementoObjeto.dataset.objetoProyecto;

            if (!idObjeto) {
                return;
            }

            const estaActivoPorJugador = this.objetoInteractivoCercano?.id === idObjeto;
            const estaActivoPorHover = this.objetosProyectoHover.has(idObjeto);
            const debeEstarAbierto = estaActivoPorJugador || estaActivoPorHover;

            elementoObjeto.classList.toggle("objeto-proyecto-hover", debeEstarAbierto);
            this.solicitarEstadoObjetoProyecto(idObjeto, debeEstarAbierto);
        });
    }

    solicitarEstadoObjetoProyecto(idObjeto, debeAbrirse) {
        const estadoObjeto = this.estadosObjetosProyecto.get(idObjeto);

        if (!estadoObjeto) {
            return;
        }

        estadoObjeto.deseadoAbierto = debeAbrirse;

        if (estadoObjeto.animando || estadoObjeto.abierto === estadoObjeto.deseadoAbierto) {
            return;
        }

        this.procesarAnimacionObjetoProyecto(idObjeto);
    }

    async procesarAnimacionObjetoProyecto(idObjeto) {
        const estadoObjeto = this.estadosObjetosProyecto.get(idObjeto);
        const elementoObjeto = document.querySelector(`[data-objeto-proyecto="${idObjeto}"]`);
        const spriteObjeto = elementoObjeto?.querySelector(".objeto-proyecto-sprite");

        if (!estadoObjeto || !spriteObjeto) {
            return;
        }

        estadoObjeto.animando = true;

        while (estadoObjeto.abierto !== estadoObjeto.deseadoAbierto) {
            const abrir = estadoObjeto.deseadoAbierto;
            const frames = abrir ? RUTAS_OBJETO_PROYECTO : [...RUTAS_OBJETO_PROYECTO].reverse();

            for (const rutaFrame of frames) {
                spriteObjeto.src = rutaFrame;
                await this.esperar(CONFIGURACION_ANIMACION.intervaloObjetoProyecto);
            }

            estadoObjeto.abierto = abrir;
        }

        estadoObjeto.animando = false;
    }

    restablecerObjetoProyectoSiCorresponde(elementoObjeto) {
        const idObjeto = elementoObjeto?.dataset?.objetoProyecto;

        if (!idObjeto) {
            return;
        }

        const estadoObjeto = this.estadosObjetosProyecto.get(idObjeto);
        const spriteObjeto = elementoObjeto.querySelector(".objeto-proyecto-sprite");

        if (estadoObjeto) {
            estadoObjeto.abierto = false;
            estadoObjeto.deseadoAbierto = false;
        }

        if (spriteObjeto) {
            spriteObjeto.src = RUTAS_OBJETO_PROYECTO[0];
        }

        elementoObjeto.classList.remove("objeto-proyecto-hover");
        this.objetosProyectoHover.delete(idObjeto);
    }

    renderizar() {
        this.posicionarPensamientoJugador();

        if (!this.mensajeInteraccion) {
            return;
        }

        if (!this.objetoInteractivoCercano) {
            this.mensajeInteraccion.classList.add("oculto");
            return;
        }

        if (this.pensamientoJugador && !this.pensamientoJugador.classList.contains("oculto")) {
            this.mensajeInteraccion.classList.add("oculto");
            return;
        }

        this.mensajeInteraccion.textContent = this.objetoInteractivoCercano.mensajeInteraccion;
        this.mensajeInteraccion.classList.remove("oculto");
        this.posicionarMensajeInteraccionSobreJugador();
    }

    posicionarMensajeInteraccionSobreJugador() {
        if (!this.mensajeInteraccion || !this.jugador || !this.escenario) {
            return;
        }

        const separacionCabeza = 14;
        const margenEscenario = 10;
        const mitadMensaje = this.mensajeInteraccion.offsetWidth / 2;
        const centroJugador = this.jugador.posicionX + this.jugador.ancho / 2;
        const posicionX = Math.max(
            margenEscenario + mitadMensaje,
            Math.min(centroJugador, this.escenario.clientWidth - margenEscenario - mitadMensaje)
        );
        const posicionBottomMaxima = Math.max(
            margenEscenario,
            this.escenario.clientHeight - this.mensajeInteraccion.offsetHeight - margenEscenario
        );
        const posicionBottom = Math.min(
            this.jugador.posicionY + this.jugador.alto + separacionCabeza,
            posicionBottomMaxima
        );

        this.mensajeInteraccion.style.left = `${posicionX}px`;
        this.mensajeInteraccion.style.bottom = `${posicionBottom}px`;
    }

    async aparecerJugadorConPensamiento() {
        if (!this.jugador) {
            return;
        }

        await this.jugador.aparecer();
        this.centrarCamaraTrasAparicionSiHaceFalta();
        this.mostrarPensamientoNivelActual();
    }

    centrarCamaraTrasAparicionSiHaceFalta() {
        if (this.indiceNivelActual !== 3 && this.indiceNivelActual !== 4) {
            return;
        }

        this.actualizarCamaraJugador(true);
        window.requestAnimationFrame(() => this.actualizarCamaraJugador(true));
    }

    mostrarPensamientoNivelActual() {
        if (!this.pensamientoJugador) {
            return;
        }

        const textoPensamiento = PENSAMIENTOS_NIVELES[this.indiceNivelActual];

        if (!textoPensamiento) {
            this.ocultarPensamientoJugador();
            return;
        }

        if (this.temporizadorPensamiento) {
            window.clearTimeout(this.temporizadorPensamiento);
        }

        this.pensamientoJugador.textContent = traducir(textoPensamiento, {
            defaultValue: textoPensamiento
        });
        this.pensamientoJugador.classList.remove("oculto");
        this.posicionarPensamientoJugador();
        this.temporizadorPensamiento = window.setTimeout(() => {
            this.ocultarPensamientoJugador();
        }, 3400);
    }

    ocultarPensamientoJugador() {
        if (this.temporizadorPensamiento) {
            window.clearTimeout(this.temporizadorPensamiento);
            this.temporizadorPensamiento = null;
        }

        this.pensamientoJugador?.classList.add("oculto");
    }

    posicionarPensamientoJugador() {
        if (
            !this.pensamientoJugador ||
            this.pensamientoJugador.classList.contains("oculto") ||
            !this.jugador ||
            !this.escenario
        ) {
            return;
        }

        const separacionCabeza = 28;
        const margenEscenario = 12;
        const mitadPensamiento = this.pensamientoJugador.offsetWidth / 2;
        const centroJugador = this.jugador.posicionX + this.jugador.ancho / 2;
        const posicionX = Math.max(
            margenEscenario + mitadPensamiento,
            Math.min(centroJugador, this.escenario.clientWidth - margenEscenario - mitadPensamiento)
        );
        const posicionBottomMaxima = Math.max(
            margenEscenario,
            this.escenario.clientHeight - this.pensamientoJugador.offsetHeight - margenEscenario
        );
        const posicionBottom = Math.min(
            this.jugador.posicionY + this.jugador.alto + separacionCabeza,
            posicionBottomMaxima
        );

        this.pensamientoJugador.style.left = `${posicionX}px`;
        this.pensamientoJugador.style.bottom = `${posicionBottom}px`;
    }

    interactuarConObjetoCercano(codigoTecla = CODIGOS_TECLAS.interaccion) {
        if (!this.objetoInteractivoCercano || this.panelActivo) {
            return;
        }

        if (this.objetoInteractivoCercano.teclaInteraccion !== codigoTecla) {
            return;
        }

        this.objetoInteractivoCercano.interactuarPorProximidad();
    }

    abrirPanel(idPanel) {
        const panel = document.querySelector(`#${idPanel}`);

        if (!panel) {
            console.warn(`No se encontró el panel "${idPanel}".`);
            return;
        }

        this.panelActivo = panel;
        if (idPanel !== "panel-tutorial-inicio") sonidos.reproducirSonidoPanel(idPanel, "abrir");
        document.body.classList.add("panel-abierto");
        panel.classList.remove("oculto");
        this.jugador?.bloquearMovimiento();
        this.limpiarObjetoInteractivoCercano();
    }

    mostrarTutorialInicial() {
        if (this.tutorialInicialMostrado) {
            return;
        }

        if (this.debeMostrarAvisoOrientacion()) {
            return;
        }

        this.tutorialInicialMostrado = true;
        this.abrirPanel("panel-tutorial-inicio");
    }

    debeMostrarAvisoOrientacion() {
        const esPantallaVertical = window.matchMedia("(orientation: portrait)").matches;
        const esTactil = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;

        return esPantallaVertical && (esTactil || window.innerWidth <= 1024);
    }

    cerrarPanelActivo() {
        if (!this.panelActivo) {
            return;
        }

        this.panelActivo.classList.add("oculto");
        const panelCerrado = this.panelActivo;
        if (panelCerrado.id !== "panel-tutorial-inicio") sonidos.reproducirSonidoPanel(panelCerrado.id, "cerrar");
        this.panelActivo = null;
        document.body.classList.remove("panel-abierto");
        this.jugador?.desbloquearMovimiento();

        if (panelCerrado.id === "panel-tutorial-inicio") {
            this.aparecerJugadorTrasTutorialInicial();
        }
    }

    async aparecerJugadorTrasTutorialInicial() {
        if (this.jugadorAparecioTrasTutorial) {
            return;
        }

        this.jugadorAparecioTrasTutorial = true;
        await this.aparecerJugadorConPensamiento();
    }

    limpiarObjetoInteractivoCercano() {
        this.objetosInteractivos.forEach((objetoInteractivo) => objetoInteractivo.desactivarInteraccion());
        this.objetoInteractivoCercano = null;
        this.actualizarEstadoVisualObjetosProyecto();

        if (this.mensajeInteraccion) {
            this.mensajeInteraccion.classList.add("oculto");
        }
    }

    calcularDistanciaHorizontal(primeraEntidad, segundaEntidad) {
        const primerRectangulo = primeraEntidad.obtenerRectangulo();
        const segundoRectangulo = segundaEntidad.obtenerRectangulo();
        const primerCentro = primerRectangulo.left + primerRectangulo.width / 2;
        const segundoCentro = segundoRectangulo.left + segundoRectangulo.width / 2;

        return Math.abs(primerCentro - segundoCentro);
    }

    exponerFuncionesTemporalesDePrueba() {
        if (!this.jugador) {
            return;
        }

        // Funciones temporales para pruebas manuales desde la consola del navegador.
        window.probarAparicion = async () => {
            await this.jugador.aparecer();
        };

        window.probarDesaparicion = async () => {
            await this.jugador.desaparecer();
        };

        window.probarTeletransporte = async () => {
            await this.jugador.desaparecer();
            await new Promise((resolve) => setTimeout(resolve, 300));
            await this.jugador.aparecer();
        };

        window.alternarColisiones = () => this.alternarColisiones();
    }

    alternarColisiones() {
        this.escenario?.classList.toggle("mostrar-colisiones");
    }

    async probarAparicionTemporal() {
        if (!this.jugador || this.panelActivo) {
            return;
        }

        await this.jugador.aparecer();
    }

    async probarDesaparicionTemporal() {
        if (!this.jugador || this.panelActivo) {
            return;
        }

        await this.jugador.desaparecer();
    }

    crearCapaColisiones() {
        const capa = document.createElement("div");
        capa.className = "capa-colisiones";
        this.escenario.append(capa);
        return capa;
    }

    crearPlataformasColision(plataformasNivel = []) {
        if (!this.capaColisiones || !this.nivelActual) {
            return;
        }

        this.capaColisiones.replaceChildren();
        this.nivelActual.plataformasColision = [];
        this.escalerasNivelActual = [];

        plataformasNivel.forEach((datosPlataforma) => {
            const elementoPlataforma = document.createElement("div");
            elementoPlataforma.className = "plataforma-colision";
            elementoPlataforma.dataset.id = datosPlataforma.id;
            this.capaColisiones.append(elementoPlataforma);

            this.nivelActual.agregarPlataformaColision(new PlataformaColision({
                ...datosPlataforma,
                elemento: elementoPlataforma
            }));
        });
    }

    crearEscaleras(escalerasNivel = []) {
        if (!this.capaColisiones) {
            return;
        }

        this.escalerasNivelActual = escalerasNivel.map((datosEscalera) => {
            const elementoEscalera = document.createElement("div");
            elementoEscalera.className = "zona-escalera";
            elementoEscalera.dataset.id = datosEscalera.id;
            this.capaColisiones.append(elementoEscalera);

            return {
                ...datosEscalera,
                elemento: elementoEscalera,
                rectanguloPantalla: {
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 0,
                    height: 0
                }
            };
        });
    }

    crearObjetosInteractivos(objetosNivel = []) {
        if (!this.nivelActual) {
            return;
        }

        this.nivelActual.objetosInteractivos = [];
        this.datosObjetosInteractivos.clear();
        this.objetosInteractivosPorId.forEach((objetoInteractivo) => {
            objetoInteractivo.desactivarInteraccion();
            objetoInteractivo.desactivar();
            objetoInteractivo.ocultar();
            this.restablecerObjetoProyectoSiCorresponde(objetoInteractivo.elemento);
        });

        objetosNivel.forEach((datosObjeto) => {
            const objetoInteractivo = this.obtenerOCrearObjetoInteractivo(datosObjeto);

            if (!objetoInteractivo) {
                return;
            }

            objetoInteractivo.nombre = datosObjeto.nombre;
            objetoInteractivo.ancho = datosObjeto.ancho;
            objetoInteractivo.alto = datosObjeto.alto;
            objetoInteractivo.distanciaInteraccion = datosObjeto.distanciaInteraccion;
            objetoInteractivo.teclaInteraccion = datosObjeto.teclaInteraccion;
            objetoInteractivo.mensajeInteraccion = this.obtenerMensajeInteraccionObjeto(datosObjeto);
            objetoInteractivo.accion = () => {
                const datosActualesObjeto = this.datosObjetosInteractivos.get(objetoInteractivo.id);

                this.ejecutarAccionObjetoInteractivo(datosActualesObjeto);
            };
            objetoInteractivo.activar();
            objetoInteractivo.mostrar();

            this.datosObjetosInteractivos.set(objetoInteractivo.id, datosObjeto);
            this.nivelActual.agregarObjetoInteractivo(objetoInteractivo);
        });
    }

    obtenerOCrearObjetoInteractivo(datosObjeto) {
        const objetoExistente = this.objetosInteractivosPorId.get(datosObjeto.id);

        if (objetoExistente) {
            return objetoExistente;
        }

        const elementoObjeto = document.querySelector(datosObjeto.selector);

        if (!elementoObjeto) {
            console.warn(`No se encontrÃƒÂ³ el elemento del objeto "${datosObjeto.id}".`);
            return null;
        }

        const objetoInteractivo = new ObjetoInteractivo({
            id: datosObjeto.id,
            nombre: datosObjeto.nombre,
            elemento: elementoObjeto,
            posicionX: 0,
            posicionY: 0,
            ancho: datosObjeto.ancho,
            alto: datosObjeto.alto,
            distanciaInteraccion: datosObjeto.distanciaInteraccion,
            teclaInteraccion: datosObjeto.teclaInteraccion,
            mensajeInteraccion: this.obtenerMensajeInteraccionObjeto(datosObjeto),
            accion: () => {
                const datosActualesObjeto = this.datosObjetosInteractivos.get(datosObjeto.id);

                this.ejecutarAccionObjetoInteractivo(datosActualesObjeto);
            }
        });

        this.objetosInteractivosPorId.set(objetoInteractivo.id, objetoInteractivo);
        return objetoInteractivo;
    }

    obtenerMensajeInteraccionObjeto(datosObjeto) {
        if (datosObjeto.id !== "portal-nivel") {
            return traducir(datosObjeto.mensajeInteraccionKey, {
                defaultValue: datosObjeto.mensajeInteraccion
            });
        }

        const indiceSiguienteNivel = this.obtenerSiguienteIndiceNivel();
        const configuracionSiguienteNivel = CONFIGURACION_NIVELES[indiceSiguienteNivel];
        const nombreSiguienteNivel = traducir(configuracionSiguienteNivel?.nombreKey, {
            defaultValue: configuracionSiguienteNivel?.nombre ?? "siguiente nivel"
        });

        return traducir("interactions.goToLevel", {
            level: nombreSiguienteNivel,
            defaultValue: `Pulsa I para ir a ${nombreSiguienteNivel}`
        });
    }

    actualizarTextosDinamicos() {
        this.actualizarCarruselFormacion();
        this.actualizarDetalleSkillActivo();

        this.objetosInteractivos.forEach((objetoInteractivo) => {
            const datosObjeto = this.datosObjetosInteractivos.get(objetoInteractivo.id);

            if (datosObjeto) {
                objetoInteractivo.mensajeInteraccion = this.obtenerMensajeInteraccionObjeto(datosObjeto);
            }
        });

        if (this.mensajeInteraccion && this.objetoInteractivoCercano) {
            this.mensajeInteraccion.textContent = this.objetoInteractivoCercano.mensajeInteraccion;
        }

        if (this.pensamientoJugador && !this.pensamientoJugador.classList.contains("oculto")) {
            const clavePensamiento = PENSAMIENTOS_NIVELES[this.indiceNivelActual];
            this.pensamientoJugador.textContent = traducir(clavePensamiento, {
                defaultValue: clavePensamiento ?? ""
            });
        }
    }

    ejecutarAccionObjetoInteractivo(datosObjeto) {
        if (!datosObjeto) {
            return;
        }

        if (datosObjeto.accionEspecial === "enfocarFormularioContacto") {
            sonidos.reproducir("contactoEnfoque");
            this.enfocarFormularioContacto();
            return;
        }

        if (datosObjeto.url) {
            sonidos.reproducir("contactoEnlace");
            this.abrirUrlObjeto(datosObjeto);
            return;
        }

        if (datosObjeto.panelId) {
            this.abrirPanel(datosObjeto.panelId);
        }
    }

    abrirUrlObjeto(datosObjeto) {
        if (datosObjeto.descarga) {
            const enlaceDescarga = document.createElement("a");
            enlaceDescarga.href = datosObjeto.url;
            enlaceDescarga.download = datosObjeto.nombreArchivo ?? "";
            enlaceDescarga.target = "_blank";
            enlaceDescarga.rel = "noopener noreferrer";
            document.body.append(enlaceDescarga);
            enlaceDescarga.click();
            enlaceDescarga.remove();
            return;
        }

        window.open(datosObjeto.url, "_blank", "noopener,noreferrer");
    }

    enfocarFormularioContacto() {
        const formularioContacto = document.querySelector("#formulario-contacto-nivel");
        const primerCampo = formularioContacto?.querySelector("input, textarea, button");

        if (!formularioContacto) {
            return;
        }

        formularioContacto.classList.remove("formulario-contacto-destacado");
        void formularioContacto.offsetWidth;
        formularioContacto.classList.add("formulario-contacto-destacado");
        primerCampo?.focus({ preventScroll: true });
    }

    crearObjetosInteractivosAnterior() {
        return;
        [].forEach((datosObjeto) => {
            const elementoObjeto = document.querySelector(datosObjeto.selector);

            if (!elementoObjeto) {
                console.warn(`No se encontrÃ³ el elemento del objeto "${datosObjeto.id}".`);
                return;
            }

            const objetoInteractivo = new ObjetoInteractivo({
                id: datosObjeto.id,
                nombre: datosObjeto.nombre,
                elemento: elementoObjeto,
                posicionX: 0,
                posicionY: 0,
                ancho: datosObjeto.ancho,
                alto: datosObjeto.alto,
                distanciaInteraccion: datosObjeto.distanciaInteraccion,
                teclaInteraccion: datosObjeto.teclaInteraccion,
                mensajeInteraccion: datosObjeto.mensajeInteraccion,
                accion: () => {
                    this.abrirPanel(datosObjeto.panelId);
                }
            });

            this.datosObjetosInteractivos.set(objetoInteractivo.id, datosObjeto);
            this.nivelActual.agregarObjetoInteractivo(objetoInteractivo);
        });
    }

    actualizarPlataformasColision() {
        if (!this.escenario || !this.nivelActual) {
            return;
        }

        const rectanguloImagen = this.calcularRectanguloImagenFondo();
        this.nivelActual.plataformasColision.forEach((plataforma) => plataforma.renderizar(rectanguloImagen));
    }

    actualizarEscaleras() {
        if (!this.escenario || this.escalerasNivelActual.length === 0) {
            return;
        }

        const rectanguloImagen = this.calcularRectanguloImagenFondo();

        this.escalerasNivelActual.forEach((escalera) => {
            const left = rectanguloImagen.left + escalera.x * rectanguloImagen.escala;
            const top = rectanguloImagen.top + escalera.y * rectanguloImagen.escala;
            const width = escalera.ancho * rectanguloImagen.escala;
            const height = escalera.alto * rectanguloImagen.escala;

            escalera.rectanguloPantalla = {
                left,
                top,
                right: left + width,
                bottom: top + height,
                width,
                height
            };

            if (!escalera.elemento) {
                return;
            }

            escalera.elemento.style.left = `${left}px`;
            escalera.elemento.style.top = `${top}px`;
            escalera.elemento.style.width = `${width}px`;
            escalera.elemento.style.height = `${height}px`;
        });
    }

    calcularRectanguloImagenFondo() {
        const anchoEscenario = this.escenario.clientWidth;
        const altoEscenario = this.escenario.clientHeight;
        const escala = Math.max(
            anchoEscenario / CONFIGURACION_ESCENARIO.anchoImagenFondo,
            altoEscenario / CONFIGURACION_ESCENARIO.altoImagenFondo
        );
        const anchoRenderizado = CONFIGURACION_ESCENARIO.anchoImagenFondo * escala;
        const altoRenderizado = CONFIGURACION_ESCENARIO.altoImagenFondo * escala;

        return {
            left: (anchoEscenario - anchoRenderizado) / 2,
            top: 0,
            width: anchoRenderizado,
            height: altoRenderizado,
            escala
        };
    }

    actualizarObjetosInteractivos() {
        if (!this.escenario || !this.nivelActual) {
            return;
        }

        const rectanguloImagen = this.calcularRectanguloImagenFondo();

        this.nivelActual.objetosInteractivos.forEach((objetoInteractivo) => {
            const datosObjeto = this.datosObjetosInteractivos.get(objetoInteractivo.id);

            if (!datosObjeto) {
                return;
            }

            const plataforma = this.nivelActual.obtenerPlataformaColision(datosObjeto.plataformaId);
            const yMundo = datosObjeto.y ?? (plataforma ? plataforma.y : 0);
            const escalaObjeto = Math.min(rectanguloImagen.escala, 1);

            objetoInteractivo.posicionX = rectanguloImagen.left + datosObjeto.x * rectanguloImagen.escala;
            objetoInteractivo.posicionY = this.escenario.clientHeight - (rectanguloImagen.top + yMundo * rectanguloImagen.escala);
            objetoInteractivo.ancho = datosObjeto.ancho * escalaObjeto;
            objetoInteractivo.alto = datosObjeto.alto * escalaObjeto;

            if (objetoInteractivo.elemento) {
                objetoInteractivo.elemento.style.width = `${objetoInteractivo.ancho}px`;
                objetoInteractivo.elemento.style.height = `${objetoInteractivo.alto}px`;
            }

            objetoInteractivo.actualizarPosicion();
        });
    }

    colocarJugadorEnPlataformaInicial() {
        const idPlataformaInicial = this.configuracionNivelActual?.plataformaInicialJugador
            ?? CONFIGURACION_ESCENARIO.plataformaInicialJugador;
        const posicionInicialX = this.configuracionNivelActual?.posicionInicialX
            ?? CONFIGURACION_JUGADOR.posicionInicialX;
        const plataformaInicial = this.nivelActual.obtenerPlataformaColision(
            idPlataformaInicial
        );

        if (!plataformaInicial) {
            this.nivelActual.colocarJugadorEnPosicionInicial(this.jugador);
            return;
        }

        this.jugador.posicionX = posicionInicialX;
        this.jugador.posicionY = plataformaInicial.obtenerPosicionSuperiorDesdeAbajo(this.escenario.clientHeight);
        this.jugador.posicionSuelo = this.jugador.posicionY;
        this.jugador.estaEnElSuelo = true;
        this.jugador.velocidadVertical = 0;
        this.jugador.estaSaltando = false;
        this.jugador.actualizarPosicion();
    }

    comprobarCaidaJugador() {
        if (
            !this.jugador ||
            this.estaReapareciendoJugador ||
            this.jugador.posicionY > CONFIGURACION_ESCENARIO.limiteCaidaJugador
        ) {
            return;
        }

        this.reaparecerJugadorEnInicio();
    }

    async reaparecerJugadorEnInicio() {
        this.estaReapareciendoJugador = true;
        this.jugador.bloquearMovimiento();
        this.jugador.ocultar();
        this.colocarJugadorEnPlataformaInicial();
        this.actualizarCamaraJugador(true);
        await this.jugador.aparecer();
        this.estaReapareciendoJugador = false;
    }

    async cambiarNivelDesdePortal() {
        if (!this.jugador || this.estaCambiandoNivel || this.estaReapareciendoJugador) {
            return;
        }

        this.estaCambiandoNivel = true;

        if (this.botonCambiarNivel) {
            this.botonCambiarNivel.disabled = true;
        }

        const portalNivel = document.querySelector("#portal-nivel");
        portalNivel?.setAttribute("data-estado-portal", "abriendo");

        try {
            if (this.panelActivo) {
                this.panelActivo.classList.add("oculto");
                this.panelActivo = null;
                document.body.classList.remove("panel-abierto");
            }

            this.limpiarObjetoInteractivoCercano();
            this.ocultarPensamientoJugador();
            await this.jugador.desaparecer();
            await this.esperar(180);
            this.irANivel(this.obtenerSiguienteIndiceNivel());
            this.colocarJugadorEnPlataformaInicial();
            this.actualizarObjetosInteractivos();
            this.actualizarCamaraJugador(true);
            await this.aparecerJugadorConPensamiento();
        } finally {
            portalNivel?.setAttribute("data-estado-portal", "reposo");

            if (this.botonCambiarNivel) {
                this.botonCambiarNivel.disabled = false;
            }

            this.estaCambiandoNivel = false;
        }
    }

    obtenerSiguienteIndiceNivel() {
        const siguienteNivelConfigurado = this.configuracionNivelActual?.siguienteNivel;

        if (siguienteNivelConfigurado && CONFIGURACION_NIVELES[siguienteNivelConfigurado]) {
            return siguienteNivelConfigurado;
        }

        const indicesNivel = Object.keys(CONFIGURACION_NIVELES)
            .map((indice) => Number(indice))
            .filter((indice) => Number.isInteger(indice))
            .sort((primero, segundo) => primero - segundo);
        const indiceActual = indicesNivel.indexOf(this.indiceNivelActual);
        const indiceSiguiente = indiceActual === -1 ? 0 : (indiceActual + 1) % indicesNivel.length;

        return indicesNivel[indiceSiguiente] ?? 1;
    }

    esperar(tiempoMilisegundos) {
        return new Promise((resolve) => {
            window.setTimeout(resolve, tiempoMilisegundos);
        });
    }

    async teletransportarJugadorAleatoriamente() {
        if (
            !this.jugador ||
            this.panelActivo ||
            this.estaReapareciendoJugador ||
            this.estaCambiandoNivel ||
            this.estaNavegandoDesdeCabecera ||
            this.estaTeletransportandoJugador
        ) {
            return;
        }

        const probabilidadDesgracias = 0.2;
        const debeCaerAlVacio = Math.random() < probabilidadDesgracias;
        const plataformaDestino = debeCaerAlVacio ? null : this.obtenerPlataformaAleatoriaParaJugador();

        this.estaTeletransportandoJugador = true;
        await this.jugador.desaparecer();

        if (debeCaerAlVacio) {
            this.colocarJugadorSobreVacio();
        } else if (plataformaDestino) {
            this.colocarJugadorEnPlataforma(plataformaDestino);
        } else {
            console.warn("No hay una plataforma valida para teletransportar al jugador.");
            this.colocarJugadorSobreVacio();
        }

        this.actualizarCamaraJugador(true);
        await this.jugador.aparecer();
        this.estaTeletransportandoJugador = false;
    }

    obtenerPlataformaAleatoriaParaJugador() {
        const plataformasValidas = (this.nivelActual?.plataformasColision ?? []).filter((plataforma) => {
            const rectangulo = plataforma.obtenerRectanguloPantalla();
            return rectangulo.width >= this.jugador.ancho + 24 && rectangulo.right > 0 && rectangulo.left < this.escenario.clientWidth;
        });

        if (plataformasValidas.length === 0) {
            return null;
        }

        const indiceAleatorio = Math.floor(Math.random() * plataformasValidas.length);
        return plataformasValidas[indiceAleatorio];
    }

    colocarJugadorEnPlataforma(plataformaDestino) {
        const rectangulo = plataformaDestino.obtenerRectanguloPantalla();
        const margen = 12;
        const minimoX = Math.max(0, rectangulo.left + margen);
        const maximoX = Math.min(
            this.escenario.clientWidth - this.jugador.ancho,
            rectangulo.right - this.jugador.ancho - margen
        );
        const posicionX = minimoX >= maximoX
            ? Math.max(0, rectangulo.left)
            : minimoX + Math.random() * (maximoX - minimoX);

        this.jugador.posicionX = posicionX;
        this.jugador.posicionY = plataformaDestino.obtenerPosicionSuperiorDesdeAbajo(this.escenario.clientHeight);
        this.jugador.posicionSuelo = this.jugador.posicionY;
        this.jugador.velocidadVertical = 0;
        this.jugador.estaEnElSuelo = true;
        this.jugador.estaSaltando = false;
        this.jugador.actualizarPosicion();
    }

    colocarJugadorSobreVacio() {
        if (!this.jugador || !this.escenario) {
            return;
        }

        const margenLateral = 18;
        const posicionX = this.obtenerPosicionHorizontalSobreVacio(margenLateral);
        const posicionY = Math.max(220, this.escenario.clientHeight - this.jugador.alto - 90);

        this.jugador.posicionX = posicionX;
        this.jugador.posicionY = posicionY;
        this.jugador.posicionSuelo = posicionY;
        this.jugador.velocidadVertical = -40;
        this.jugador.estaEnElSuelo = false;
        this.jugador.estaSaltando = false;
        this.jugador.actualizarPosicion();
    }

    obtenerPosicionHorizontalSobreVacio(margenLateral) {
        const anchoDisponible = Math.max(0, this.escenario.clientWidth - this.jugador.ancho - margenLateral * 2);
        const plataformas = this.nivelActual?.plataformasColision ?? [];

        for (let intento = 0; intento < 24; intento += 1) {
            const posicionX = margenLateral + Math.random() * anchoDisponible;
            const izquierdaJugador = posicionX + this.jugador.ancho * 0.22;
            const derechaJugador = posicionX + this.jugador.ancho * 0.78;
            const estaSobrePlataforma = plataformas.some((plataforma) => {
                const rectangulo = plataforma.obtenerRectanguloPantalla();
                return derechaJugador > rectangulo.left && izquierdaJugador < rectangulo.right;
            });

            if (!estaSobrePlataforma) {
                return posicionX;
            }
        }

        return Math.max(0, this.escenario.clientWidth - this.jugador.ancho - margenLateral);
    }

    actualizarCamaraJugador(forzarCentrado = false) {
        if (!this.jugador?.elemento) {
            return;
        }

        if (!this.debeCamaraSeguirJugador(forzarCentrado)) {
            return;
        }

        const rectanguloJugador = this.jugador.elemento.getBoundingClientRect();
        const altoViewport = window.innerHeight;
        const scrollMaximo = Math.max(0, document.documentElement.scrollHeight - altoViewport);
        let nuevoScroll = window.scrollY;

        if (forzarCentrado) {
            const centroJugador = rectanguloJugador.top + window.scrollY + rectanguloJugador.height / 2;
            nuevoScroll = centroJugador - altoViewport * 0.42;
        } else {
            const limiteSuperior = CONFIGURACION_ESCENARIO.margenCamaraSuperior;
            const limiteInferior = altoViewport - CONFIGURACION_ESCENARIO.margenCamaraInferior;

            if (rectanguloJugador.top < limiteSuperior) {
                nuevoScroll -= limiteSuperior - rectanguloJugador.top;
            } else if (rectanguloJugador.bottom > limiteInferior) {
                nuevoScroll += rectanguloJugador.bottom - limiteInferior;
            }
        }

        const scrollAjustado = Math.max(0, Math.min(nuevoScroll, scrollMaximo));

        if (Math.abs(scrollAjustado - window.scrollY) > 1) {
            window.scrollTo({
                top: scrollAjustado,
                behavior: "auto"
            });
        }
    }

    debeCamaraSeguirJugador(forzarCentrado) {
        if (forzarCentrado) {
            return true;
        }

        if (this.esViewportMovilOTablet()) {
            return false;
        }

        const jugadorEstaEnElAire = !this.jugador.estaEnElSuelo;
        const jugadorSeMueve = this.jugador.velocidadHorizontal !== 0 || Math.abs(this.jugador.velocidadVertical) > 1;

        return jugadorEstaEnElAire || jugadorSeMueve;
    }

    esViewportMovilOTablet() {
        const tieneEntradaTactil = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;

        return (
            tieneEntradaTactil ||
            window.innerWidth <= 820 ||
            window.innerHeight <= 520
        );
    }
}
