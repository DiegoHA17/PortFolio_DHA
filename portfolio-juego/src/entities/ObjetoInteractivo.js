import { Entidad } from "./Entidad.js";

export class ObjetoInteractivo extends Entidad {
    constructor({
        id,
        nombre,
        elemento,
        posicionX,
        posicionY,
        ancho,
        alto,
        distanciaInteraccion,
        teclaInteraccion,
        mensajeInteraccion,
        accion
    }) {
        super({
            id,
            elemento,
            posicionX,
            posicionY,
            ancho,
            alto
        });

        this.nombre = nombre;
        this.distanciaInteraccion = distanciaInteraccion;
        this.teclaInteraccion = teclaInteraccion;
        this.mensajeInteraccion = mensajeInteraccion;
        this.accion = accion;
        this.estaDisponible = false;

        this.gestionarClick = this.gestionarClick.bind(this);
        this.configurarInteraccionPorClick();
    }

    configurarInteraccionPorClick() {
        if (!this.elemento) {
            return;
        }

        this.elemento.addEventListener("click", this.gestionarClick);
        this.elemento.setAttribute("role", "button");
        this.elemento.setAttribute("tabindex", "0");
        this.elemento.setAttribute("aria-disabled", "false");
    }

    gestionarClick(evento) {
        evento.preventDefault();
        this.interactuar();
    }

    comprobarCercania(jugador) {
        if (!this.activo || !jugador || !this.elemento) {
            this.desactivarInteraccion();
            return false;
        }

        if (this.seSolapaConJugador(jugador)) {
            this.activarInteraccion();
            return true;
        }

        this.desactivarInteraccion();
        return false;
    }

    seSolapaConJugador(jugador) {
        const rectanguloObjeto = this.obtenerRectangulo();
        const rectanguloJugador = jugador.obtenerRectangulo();

        return (
            rectanguloJugador.right > rectanguloObjeto.left &&
            rectanguloJugador.left < rectanguloObjeto.right &&
            rectanguloJugador.bottom > rectanguloObjeto.top &&
            rectanguloJugador.top < rectanguloObjeto.bottom
        );
    }

    activarInteraccion() {
        this.estaDisponible = true;

        if (this.elemento) {
            this.elemento.classList.add("objeto-interactivo-activo");
        }
    }

    desactivarInteraccion() {
        this.estaDisponible = false;

        if (this.elemento) {
            this.elemento.classList.remove("objeto-interactivo-activo");
        }
    }

    interactuar() {
        if (!this.activo || typeof this.accion !== "function") {
            return;
        }

        this.accion();
    }

    interactuarPorProximidad() {
        if (!this.estaDisponible) {
            return;
        }

        this.interactuar();
    }
}
