import { Entidad } from "./Entidad.js";
import { sonidos } from "../js/sonidos.js";
import { aplicarFrame, obtenerFramesInvertidos, reproducirAnimacionUnaVez } from "../js/animaciones.js";
import {
    CONFIGURACION_ANIMACION,
    CONFIGURACION_JUGADOR,
    ESTADOS_JUGADOR,
    RUTAS_PERSONAJE
} from "../js/configuracion.js";

export class Jugador extends Entidad {
    constructor({ id, elemento, elementoImagen, posicionX, posicionY, ancho, alto }) {
        super({
            id,
            elemento,
            posicionX,
            posicionY,
            ancho,
            alto
        });

        this.elementoImagen = elementoImagen;
        this.velocidadHorizontal = 0;
        this.velocidadVertical = 0;
        this.velocidadMovimiento = CONFIGURACION_JUGADOR.velocidadMovimiento;
        this.fuerzaSalto = CONFIGURACION_JUGADOR.fuerzaSalto;
        this.gravedad = CONFIGURACION_JUGADOR.gravedad;
        this.estaEnElSuelo = true;
        this.estaSaltando = false;
        this.direccion = "derecha";
        this.estadoActual = ESTADOS_JUGADOR.quieto;
        this.teclasPulsadas = new Set();
        this.animacionActual = ESTADOS_JUGADOR.quieto;
        this.frameActual = 0;
        this.movimientoBloqueado = false;
        this.tiempoUltimoFrame = 0;
        this.posicionSuelo = posicionY;

        this.configurarImagen();
        this.actualizarAnimacion(0);
    }

    configurarImagen() {
        if (!this.elementoImagen) {
            console.warn("No se encontró la imagen del personaje.");
            return;
        }

        this.elementoImagen.addEventListener("error", () => {
            console.warn(`No se pudo cargar la imagen del personaje: ${this.elementoImagen.src}`);
        });
    }

    moverALaDerecha() {
        if (this.movimientoBloqueado) {
            return;
        }

        this.velocidadHorizontal = this.velocidadMovimiento;
        this.direccion = "derecha";
    }

    moverALaIzquierda() {
        if (this.movimientoBloqueado) {
            return;
        }

        this.velocidadHorizontal = -this.velocidadMovimiento;
        this.direccion = "izquierda";
    }

    detenerMovimientoHorizontal() {
        this.velocidadHorizontal = 0;
    }

    saltar() {
        if (this.movimientoBloqueado || !this.estaEnElSuelo) {
            return;
        }

        this.velocidadVertical = this.fuerzaSalto;
        sonidos.reproducir("salto");
        this.estaEnElSuelo = false;
        this.estaSaltando = true;
        this.cambiarEstado(ESTADOS_JUGADOR.saltando);
    }

    actualizarSalto() {
        if (this.velocidadVertical > 80 && !this.estaEnElSuelo) {
            this.cambiarEstado(ESTADOS_JUGADOR.saltando);
        }
    }

    actualizarCaida() {
        if (this.velocidadVertical < -80 && !this.estaEnElSuelo) {
            this.cambiarEstado(ESTADOS_JUGADOR.cayendo);
        }
    }

    aplicarGravedad(deltaTime, plataformasColision, altoEscenario, posicionYAnterior) {
        this.velocidadVertical -= this.gravedad * deltaTime;
        this.posicionY += this.velocidadVertical * deltaTime;

        const plataformaAterrizaje = this.obtenerPlataformaDeAterrizaje(
            plataformasColision,
            altoEscenario,
            posicionYAnterior
        );

        if (plataformaAterrizaje) {
            this.posicionY = plataformaAterrizaje.obtenerPosicionSuperiorDesdeAbajo(altoEscenario);
            this.velocidadVertical = 0;
            this.estaEnElSuelo = true;
            this.estaSaltando = false;
            this.posicionSuelo = this.posicionY;
            return;
        }

        this.estaEnElSuelo = false;
    }

    actualizarMovimiento(deltaTime, limiteIzquierdo, limiteDerecho, plataformasColision = [], altoEscenario = 0) {
        if (this.movimientoBloqueado) {
            this.detenerMovimientoHorizontal();
            return;
        }

        if (this.teclasPulsadas.has("ArrowRight")) {
            this.moverALaDerecha();
        } else if (this.teclasPulsadas.has("ArrowLeft")) {
            this.moverALaIzquierda();
        } else {
            this.detenerMovimientoHorizontal();
        }

        if (this.teclasPulsadas.has("Space")) {
            this.saltar();
        }

        this.posicionX += this.velocidadHorizontal * deltaTime;
        this.posicionX = Math.max(limiteIzquierdo, Math.min(this.posicionX, limiteDerecho));

        const posicionYAnterior = this.posicionY;
        this.actualizarSoporteEnSuelo(plataformasColision, altoEscenario);
        this.aplicarGravedad(deltaTime, plataformasColision, altoEscenario, posicionYAnterior);
        this.actualizarSalto();
        this.actualizarCaida();
        this.actualizarEstadoPorMovimiento();
        this.actualizarDireccion();
        this.actualizarPosicion();
    }

    actualizarDireccion() {
        if (!this.elementoImagen) {
            return;
        }

        const direccionVisual = this.obtenerDireccionVisual();
        this.elementoImagen.classList.toggle("personaje-mirando-izquierda", direccionVisual === "izquierda");
    }

    obtenerDireccionVisual() {
        const estaEnAnimacionQuieto = (
            this.estadoActual === ESTADOS_JUGADOR.quieto ||
            this.estadoActual === ESTADOS_JUGADOR.interactuando
        );
        const estaEnAnimacionAerea = (
            this.estadoActual === ESTADOS_JUGADOR.saltando ||
            this.estadoActual === ESTADOS_JUGADOR.cayendo
        );

        if (estaEnAnimacionQuieto && CONFIGURACION_JUGADOR.invertirDireccionVisualQuieto) {
            return this.invertirDireccion(this.direccion);
        }

        if (estaEnAnimacionAerea && CONFIGURACION_JUGADOR.invertirDireccionVisualAlSaltar) {
            return this.invertirDireccion(this.direccion);
        }

        return this.direccion;
    }

    invertirDireccion(direccion) {
        return direccion === "derecha" ? "izquierda" : "derecha";
    }

    actualizarAnimacion(tiempoActual) {
        if (!this.elementoImagen) {
            return;
        }

        if (
            this.estadoActual === ESTADOS_JUGADOR.apareciendo ||
            this.estadoActual === ESTADOS_JUGADOR.desapareciendo
        ) {
            return;
        }

        if (this.estadoActual === ESTADOS_JUGADOR.saltando || this.estadoActual === ESTADOS_JUGADOR.cayendo) {
            this.actualizarAnimacionSalto();
            return;
        }

        const frames = this.obtenerFramesDelEstadoActual();
        const intervalo = this.obtenerIntervaloDelEstadoActual();

        if (this.animacionActual !== this.estadoActual) {
            this.animacionActual = this.estadoActual;
            this.frameActual = 0;
            this.tiempoUltimoFrame = tiempoActual;
            aplicarFrame(this.elementoImagen, frames[this.frameActual]);
            return;
        }

        if (frames.length <= 1) {
            aplicarFrame(this.elementoImagen, frames[0]);
            return;
        }

        if (tiempoActual - this.tiempoUltimoFrame >= intervalo) {
            this.frameActual = (this.frameActual + 1) % frames.length;
            this.tiempoUltimoFrame = tiempoActual;
            aplicarFrame(this.elementoImagen, frames[this.frameActual]);

            // Una pisada por vuelta completa del ciclo de caminar, no por cada fotograma.
            if (this.estadoActual === ESTADOS_JUGADOR.caminando && this.frameActual === 0) {
                sonidos.reproducirPaso();
            }
        }
    }

    actualizarAnimacionSalto() {
        const framesSalto = RUTAS_PERSONAJE.saltar;
        let indiceFrame = 1;

        if (this.velocidadVertical > 120) {
            indiceFrame = 0;
        } else if (this.velocidadVertical < -120) {
            indiceFrame = 2;
        }

        this.animacionActual = this.estadoActual;
        this.frameActual = indiceFrame;
        aplicarFrame(this.elementoImagen, framesSalto[indiceFrame]);
    }

    actualizarSoporteEnSuelo(plataformasColision, altoEscenario) {
        if (!this.estaEnElSuelo) {
            return;
        }

        const plataformaSoporte = this.obtenerPlataformaBajoLosPies(plataformasColision, altoEscenario);

        if (!plataformaSoporte) {
            this.estaEnElSuelo = false;
        }
    }

    obtenerPlataformaDeAterrizaje(plataformasColision, altoEscenario, posicionYAnterior) {
        if (!Array.isArray(plataformasColision) || this.velocidadVertical > 0) {
            return null;
        }

        return plataformasColision.find((plataforma) => {
            const posicionSuperior = plataforma.obtenerPosicionSuperiorDesdeAbajo(altoEscenario);
            const estabaEncima = posicionYAnterior >= posicionSuperior;
            const haCruzadoLaSuperficie = this.posicionY <= posicionSuperior;

            return (
                estabaEncima &&
                haCruzadoLaSuperficie &&
                this.seSolapaHorizontalmenteConPlataforma(plataforma)
            );
        }) ?? null;
    }

    obtenerPlataformaBajoLosPies(plataformasColision, altoEscenario) {
        if (!Array.isArray(plataformasColision)) {
            return null;
        }

        return plataformasColision.find((plataforma) => {
            const posicionSuperior = plataforma.obtenerPosicionSuperiorDesdeAbajo(altoEscenario);
            const diferenciaVertical = Math.abs(this.posicionY - posicionSuperior);

            return diferenciaVertical <= 3 && this.seSolapaHorizontalmenteConPlataforma(plataforma);
        }) ?? null;
    }

    seSolapaHorizontalmenteConPlataforma(plataforma) {
        const rectanguloPlataforma = plataforma.obtenerRectanguloPantalla();
        const margenPies = this.ancho * 0.22;
        const izquierdaJugador = this.posicionX + margenPies;
        const derechaJugador = this.posicionX + this.ancho - margenPies;

        return derechaJugador > rectanguloPlataforma.left && izquierdaJugador < rectanguloPlataforma.right;
    }

    cambiarEstado(nuevoEstado) {
        if (this.estadoActual === nuevoEstado) {
            return;
        }

        this.estadoActual = nuevoEstado;
    }

    async aparecer() {
        if (!this.elementoImagen) {
            return;
        }

        this.bloquearMovimiento();
        this.cambiarEstado(ESTADOS_JUGADOR.apareciendo);
        sonidos.reproducir("aparecer");
        const framesAparicion = obtenerFramesInvertidos(RUTAS_PERSONAJE.teletransporte);
        aplicarFrame(this.elementoImagen, framesAparicion[0]);
        this.mostrar();
        await reproducirAnimacionUnaVez(
            this.elementoImagen,
            framesAparicion,
            CONFIGURACION_ANIMACION.intervaloTeletransporte
        );
        this.cambiarEstado(ESTADOS_JUGADOR.quieto);
        this.desbloquearMovimiento();
    }

    async desaparecer() {
        if (!this.elementoImagen) {
            return;
        }

        this.bloquearMovimiento();
        this.cambiarEstado(ESTADOS_JUGADOR.desapareciendo);
        sonidos.reproducir("desaparecer");
        await reproducirAnimacionUnaVez(
            this.elementoImagen,
            RUTAS_PERSONAJE.teletransporte,
            CONFIGURACION_ANIMACION.intervaloTeletransporte
        );
        this.ocultar();
        this.cambiarEstado(ESTADOS_JUGADOR.quieto);
        this.desbloquearMovimiento();
    }

    bloquearMovimiento() {
        this.movimientoBloqueado = true;
        this.teclasPulsadas.clear();
        this.detenerMovimientoHorizontal();
    }

    desbloquearMovimiento() {
        this.movimientoBloqueado = false;
    }

    obtenerFramesDelEstadoActual() {
        if (this.estadoActual === ESTADOS_JUGADOR.caminando) {
            return RUTAS_PERSONAJE.caminar;
        }

        return RUTAS_PERSONAJE.quieto;
    }

    obtenerIntervaloDelEstadoActual() {
        if (this.estadoActual === ESTADOS_JUGADOR.caminando) {
            return CONFIGURACION_ANIMACION.intervaloCaminar;
        }

        return CONFIGURACION_ANIMACION.intervaloSalto;
    }

    actualizarEstadoPorMovimiento() {
        if (!this.estaEnElSuelo) {
            return;
        }

        if (this.movimientoBloqueado) {
            this.cambiarEstado(ESTADOS_JUGADOR.interactuando);
            return;
        }

        if (this.velocidadHorizontal !== 0) {
            this.cambiarEstado(ESTADOS_JUGADOR.caminando);
            return;
        }

        this.cambiarEstado(ESTADOS_JUGADOR.quieto);
    }
}
