export class Entidad {
    constructor({
        id,
        elemento,
        posicionX = 0,
        posicionY = 0,
        ancho = 0,
        alto = 0
    }) {
        this.id = id;
        this.elemento = elemento;
        this.posicionX = posicionX;
        this.posicionY = posicionY;
        this.ancho = ancho;
        this.alto = alto;
        this.visible = true;
        this.activo = true;

        if (!this.elemento) {
            console.warn(`No se encontró el elemento de la entidad "${this.id}".`);
            return;
        }

        this.elemento.style.width = `${this.ancho}px`;
        this.elemento.style.height = `${this.alto}px`;
        this.actualizarPosicion();
    }

    actualizarPosicion() {
        if (!this.elemento) {
            return;
        }

        this.elemento.style.left = `${this.posicionX}px`;
        this.elemento.style.bottom = `${this.posicionY}px`;
    }

    mostrar() {
        this.visible = true;

        if (this.elemento) {
            this.elemento.classList.remove("oculto");
            this.elemento.setAttribute("aria-hidden", "false");
        }
    }

    ocultar() {
        this.visible = false;

        if (this.elemento) {
            this.elemento.classList.add("oculto");
            this.elemento.setAttribute("aria-hidden", "true");
        }
    }

    activar() {
        this.activo = true;
    }

    desactivar() {
        this.activo = false;
    }

    obtenerRectangulo() {
        if (!this.elemento) {
            console.warn(`No se pudo obtener el rectángulo de "${this.id}" porque falta su elemento.`);
            return new DOMRect(0, 0, 0, 0);
        }

        return this.elemento.getBoundingClientRect();
    }
}
