export class PlataformaColision {
    constructor({ id, x, y, ancho, alto, elemento }) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.ancho = ancho;
        this.alto = alto;
        this.elemento = elemento;
        this.rectanguloPantalla = {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            width: 0,
            height: 0
        };
    }

    renderizar(rectanguloImagen) {
        if (!rectanguloImagen) {
            return;
        }

        const left = rectanguloImagen.left + this.x * rectanguloImagen.escala;
        const top = rectanguloImagen.top + this.y * rectanguloImagen.escala;
        const width = this.ancho * rectanguloImagen.escala;
        const height = this.alto * rectanguloImagen.escala;

        this.rectanguloPantalla = {
            left,
            top,
            right: left + width,
            bottom: top + height,
            width,
            height
        };

        if (!this.elemento) {
            return;
        }

        this.elemento.style.left = `${left}px`;
        this.elemento.style.top = `${top}px`;
        this.elemento.style.width = `${width}px`;
        this.elemento.style.height = `${height}px`;
    }

    obtenerRectanguloPantalla() {
        return this.rectanguloPantalla;
    }

    obtenerPosicionSuperiorDesdeAbajo(altoEscenario) {
        return altoEscenario - this.rectanguloPantalla.top;
    }
}
