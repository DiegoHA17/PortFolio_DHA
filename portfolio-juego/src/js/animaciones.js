export function aplicarFrame(elementoImagen, rutaFrame) {
    if (!elementoImagen || !rutaFrame) {
        console.warn("No se pudo aplicar el frame del personaje: falta la imagen o la ruta.");
        return;
    }

    if (elementoImagen.dataset.frameActual === rutaFrame) {
        return;
    }

    elementoImagen.dataset.frameActual = rutaFrame;
    elementoImagen.src = rutaFrame;
}

export function reproducirAnimacionUnaVez(elementoImagen, frames, intervaloMilisegundos) {
    return new Promise((resolve) => {
        if (!elementoImagen || !Array.isArray(frames) || frames.length === 0) {
            console.warn("No se pudo reproducir la animación: faltan el elemento o los frames.");
            resolve();
            return;
        }

        let indiceFrame = 0;

        const reproducirSiguienteFrame = () => {
            aplicarFrame(elementoImagen, frames[indiceFrame]);
            indiceFrame += 1;

            if (indiceFrame >= frames.length) {
                window.setTimeout(resolve, intervaloMilisegundos);
                return;
            }

            window.setTimeout(reproducirSiguienteFrame, intervaloMilisegundos);
        };

        reproducirSiguienteFrame();
    });
}

export function obtenerFramesInvertidos(frames) {
    if (!Array.isArray(frames)) {
        return [];
    }

    return [...frames].reverse();
}
