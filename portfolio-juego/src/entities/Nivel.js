export class Nivel {
    constructor({
        id,
        nombre,
        elemento,
        objetosInteractivos = [],
        plataformasColision = [],
        posicionInicialJugador = { x: 0, y: 0 }
    }) {
        this.id = id;
        this.nombre = nombre;
        this.elemento = elemento;
        this.objetosInteractivos = objetosInteractivos;
        this.plataformasColision = plataformasColision;
        this.posicionInicialJugador = posicionInicialJugador;
        this.activo = false;

        if (!this.elemento) {
            console.warn(`No se encontró el elemento del nivel "${this.id}".`);
        }
    }

    activar() {
        this.activo = true;

        if (this.elemento) {
            this.elemento.classList.add("nivel-activo");
            this.elemento.classList.remove("oculto");
        }
    }

    desactivar() {
        this.activo = false;

        if (this.elemento) {
            this.elemento.classList.remove("nivel-activo");
            this.elemento.classList.add("oculto");
        }
    }

    agregarObjetoInteractivo(objetoInteractivo) {
        if (!objetoInteractivo) {
            console.warn(`No se pudo agregar un objeto interactivo al nivel "${this.id}".`);
            return;
        }

        this.objetosInteractivos.push(objetoInteractivo);
    }

    eliminarObjetoInteractivo(idObjetoInteractivo) {
        this.objetosInteractivos = this.objetosInteractivos.filter((objeto) => objeto.id !== idObjetoInteractivo);
    }

    agregarPlataformaColision(plataformaColision) {
        if (!plataformaColision) {
            console.warn(`No se pudo agregar una plataforma de colision al nivel "${this.id}".`);
            return;
        }

        this.plataformasColision.push(plataformaColision);
    }

    obtenerPlataformaColision(idPlataformaColision) {
        return this.plataformasColision.find((plataforma) => plataforma.id === idPlataformaColision) ?? null;
    }

    colocarJugadorEnPosicionInicial(jugador) {
        if (!jugador) {
            console.warn(`No se pudo colocar el jugador en el nivel "${this.id}".`);
            return;
        }

        jugador.posicionX = this.posicionInicialJugador.x;
        jugador.posicionY = this.posicionInicialJugador.y;
        jugador.posicionSuelo = this.posicionInicialJugador.y;
        jugador.actualizarPosicion();
    }
}
