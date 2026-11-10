import { CODIGOS_TECLAS } from "./configuracion.js";

const TECLAS_CON_SCROLL = new Set([
    CODIGOS_TECLAS.izquierda,
    CODIGOS_TECLAS.derecha,
    CODIGOS_TECLAS.arriba,
    CODIGOS_TECLAS.abajo,
    CODIGOS_TECLAS.salto
]);

export class GestorControles {
    constructor({
        jugador,
        alInteractuar,
        alCerrarPanel,
        alProbarAparicion,
        alProbarDesaparicion,
        alAlternarColisiones
    }) {
        this.jugador = jugador;
        this.alInteractuar = alInteractuar;
        this.alCerrarPanel = alCerrarPanel;
        this.alProbarAparicion = alProbarAparicion;
        this.alProbarDesaparicion = alProbarDesaparicion;
        this.alAlternarColisiones = alAlternarColisiones;
        this.teclasPulsadas = new Set();
        this.controlesActivos = false;

        this.gestionarTeclaPulsada = this.gestionarTeclaPulsada.bind(this);
        this.gestionarTeclaLiberada = this.gestionarTeclaLiberada.bind(this);
    }

    activar() {
        if (this.controlesActivos) {
            return;
        }

        window.addEventListener("keydown", this.gestionarTeclaPulsada);
        window.addEventListener("keyup", this.gestionarTeclaLiberada);
        this.controlesActivos = true;
    }

    desactivar() {
        window.removeEventListener("keydown", this.gestionarTeclaPulsada);
        window.removeEventListener("keyup", this.gestionarTeclaLiberada);
        this.teclasPulsadas.clear();
        this.sincronizarTeclasConJugador();
        this.controlesActivos = false;
    }

    actualizarControles() {
        this.sincronizarTeclasConJugador();
    }

    pulsarControlVirtual(codigoTecla) {
        if (this.jugador?.movimientoBloqueado || !this.esTeclaDeMovimiento(codigoTecla)) {
            return;
        }

        this.teclasPulsadas.add(codigoTecla);
        this.sincronizarTeclasConJugador();
    }

    liberarControlVirtual(codigoTecla) {
        this.teclasPulsadas.delete(codigoTecla);
        this.sincronizarTeclasConJugador();
    }

    gestionarTeclaPulsada(evento) {
        if (this.debeIgnorarTeclaPorEdicion(evento)) {
            return;
        }

        if (TECLAS_CON_SCROLL.has(evento.code)) {
            evento.preventDefault();
        }

        if (evento.code === CODIGOS_TECLAS.interaccion || evento.code === CODIGOS_TECLAS.interaccionContacto) {
            this.ejecutarInteraccion(evento.code);
            return;
        }

        if (evento.code === CODIGOS_TECLAS.cerrar) {
            this.ejecutarCierrePanel();
            return;
        }

        if (evento.code === CODIGOS_TECLAS.aparecerTemporal) {
            this.ejecutarAparicionTemporal(evento);
            return;
        }

        if (evento.code === CODIGOS_TECLAS.desaparecerTemporal) {
            this.ejecutarDesaparicionTemporal(evento);
            return;
        }

        if (evento.code === CODIGOS_TECLAS.alternarColisiones) {
            this.ejecutarAlternarColisiones(evento);
            return;
        }

        if (this.jugador?.movimientoBloqueado) {
            return;
        }

        if (this.esTeclaDeMovimiento(evento.code)) {
            this.teclasPulsadas.add(evento.code);
        }
    }

    gestionarTeclaLiberada(evento) {
        if (this.debeIgnorarTeclaPorEdicion(evento)) {
            return;
        }

        if (TECLAS_CON_SCROLL.has(evento.code)) {
            evento.preventDefault();
        }

        this.teclasPulsadas.delete(evento.code);
    }

    debeIgnorarTeclaPorEdicion(evento) {
        const elemento = evento.target;

        return Boolean(
            elemento?.isContentEditable ||
            elemento?.closest?.("input, textarea, select, [contenteditable='true']")
        );
    }

    ejecutarInteraccion(codigoTecla) {
        if (this.jugador?.movimientoBloqueado) {
            return;
        }

        if (typeof this.alInteractuar === "function") {
            this.alInteractuar(codigoTecla);
        }
    }

    ejecutarCierrePanel() {
        if (typeof this.alCerrarPanel === "function") {
            this.alCerrarPanel();
        }
    }

    ejecutarAparicionTemporal(evento) {
        if (evento.repeat || this.jugador?.movimientoBloqueado) {
            return;
        }

        if (typeof this.alProbarAparicion === "function") {
            this.alProbarAparicion();
        }
    }

    ejecutarDesaparicionTemporal(evento) {
        if (evento.repeat || this.jugador?.movimientoBloqueado) {
            return;
        }

        if (typeof this.alProbarDesaparicion === "function") {
            this.alProbarDesaparicion();
        }
    }

    ejecutarAlternarColisiones(evento) {
        if (evento.repeat) {
            return;
        }

        if (typeof this.alAlternarColisiones === "function") {
            this.alAlternarColisiones();
        }
    }

    esTeclaDeMovimiento(codigoTecla) {
        return (
            codigoTecla === CODIGOS_TECLAS.izquierda ||
            codigoTecla === CODIGOS_TECLAS.derecha ||
            codigoTecla === CODIGOS_TECLAS.arriba ||
            codigoTecla === CODIGOS_TECLAS.abajo ||
            codigoTecla === CODIGOS_TECLAS.salto
        );
    }

    sincronizarTeclasConJugador() {
        if (!this.jugador) {
            return;
        }

        this.jugador.teclasPulsadas = new Set(this.teclasPulsadas);
    }
}
