export const RUTAS_PERSONAJE = {
    quieto: [
        "src/assets/imagenes/personaje/quieto/normal.png"
    ],

    caminar: [
        "src/assets/imagenes/personaje/caminar/ladoD.png",
        "src/assets/imagenes/personaje/caminar/ladoD2.png",
        "src/assets/imagenes/personaje/caminar/ladoD3.png"
    ],

    saltar: [
        "src/assets/imagenes/personaje/saltar/salto1.png",
        "src/assets/imagenes/personaje/saltar/salto2.png",
        "src/assets/imagenes/personaje/saltar/salto3.png"
    ],

    teletransporte: [
        "src/assets/imagenes/personaje/teletransporte/teleport1.png",
        "src/assets/imagenes/personaje/teletransporte/teleport2.png",
        "src/assets/imagenes/personaje/teletransporte/teleport3.png",
        "src/assets/imagenes/personaje/teletransporte/teleport4.png",
        "src/assets/imagenes/personaje/teletransporte/teleport5.png",
        "src/assets/imagenes/personaje/teletransporte/teleport6.png"
    ]
};

export const RUTAS_PORTAL_NIVEL = [
    "src/assets/imagenes/objetos/portal-nivel/portal-1.png",
    "src/assets/imagenes/objetos/portal-nivel/portal-2.png",
    "src/assets/imagenes/objetos/portal-nivel/portal-3.png",
    "src/assets/imagenes/objetos/portal-nivel/portal-4.png",
    "src/assets/imagenes/objetos/portal-nivel/portal-5.png",
    "src/assets/imagenes/objetos/portal-nivel/portal-6.png",
    "src/assets/imagenes/objetos/portal-nivel/portal-7.png"
];

export const RUTAS_OBJETO_PROYECTO = [
    "src/assets/imagenes/objetos/proyectos/normal.png",
    "src/assets/imagenes/objetos/proyectos/abierto-1.png",
    "src/assets/imagenes/objetos/proyectos/aberto-2.png",
    "src/assets/imagenes/objetos/proyectos/abierto-3.png"
];

export const CONFIGURACION_ESCENARIO = {
    altoSuelo: 76,
    margenInteraccion: 18,
    deltaTimeMaximo: 0.05,
    anchoImagenFondo: 1672,
    altoImagenFondo: 941,
    mostrarColisiones: false,
    plataformaInicialJugador: "plataforma-superior-izquierda",
    limiteCaidaJugador: -180,
    margenCamaraSuperior: 160,
    margenCamaraInferior: 220
};

export const PLATAFORMAS_ESCENARIO_1 = [
    {
        id: "plataforma-superior-izquierda",
        x: 0,
        y: 294,
        ancho: 112,
        alto: 50
    },
    {
        id: "plataforma-superior-central-izquierda",
        x: 292,
        y: 389,
        ancho: 306,
        alto: 34
    },
    {
        id: "plataforma-central-izquierda",
        x: 0,
        y: 552,
        ancho: 380,
        alto: 34
    },
    {
        id: "plataforma-colgante-central",
        x: 790,
        y: 360,
        ancho: 138,
        alto: 34
    },
    {
        id: "plataforma-central-derecha",
        x: 952,
        y: 466,
        ancho: 312,
        alto: 34
    },
    {
        id: "plataforma-subida-central",
        x: 600,
        y: 459,
        ancho: 158,
        alto: 34
    },
    {
        id: "plataforma-derecha-media",
        x: 1100,
        y: 632,
        ancho: 516,
        alto: 34
    },
    {
        id: "plataforma-superior-derecha",
        x: 1226,
        y: 348,
        ancho: 292,
        alto: 34
    },
    {
        id: "plataforma-inferior-central",
        x: 424,
        y: 715,
        ancho: 704,
        alto: 36
    }
];

export const PLATAFORMAS_ESCENARIO_2 = [
    {
        id: "experiencia-plataforma-inicio",
        x: 0,
        y: 407,
        ancho: 238,
        alto: 32
    },
    {
        id: "experiencia-plataforma-puente",
        x: 244,
        y: 427,
        ancho: 132,
        alto: 30
    },
    {
        id: "experiencia-plataforma-superior",
        x: 322,
        y: 350,
        ancho: 250,
        alto: 30
    },
    {
        id: "experiencia-plataforma-baja",
        x: 154,
        y: 635,
        ancho: 178,
        alto: 34
    },
    {
        id: "experiencia-plataforma-media",
        x: 425,
        y: 598,
        ancho: 244,
        alto: 34
    },
    {
        id: "experiencia-plataforma-inferior",
        x: 0,
        y: 812,
        ancho: 704,
        alto: 34
    }
];

export const PLATAFORMAS_ESCENARIO_3 = [
    {
        id: "proyectos-plataforma-superior-izquierda",
        x: 0,
        y: 432,
        ancho: 456,
        alto: 34
    },
    {
        id: "proyectos-plataforma-superior-derecha",
        x: 528,
        y: 432,
        ancho: 1144,
        alto: 34
    },
    {
        id: "proyectos-plataforma-inferior",
        x: 0,
        y: 793,
        ancho: 1672,
        alto: 34
    }
];

export const ESCALERAS_ESCENARIO_3 = [
    {
        id: "proyectos-escalera-central",
        x: 456,
        y: 432,
        ancho: 72,
        alto: 361,
        velocidad: 250,
        destinoSubidaPlataformaId: "proyectos-plataforma-superior-derecha",
        destinoSubidaX: 548
    }
];

export const PLATAFORMAS_ESCENARIO_4 = [
    {
        id: "contacto-plataforma-inferior",
        x: 0,
        y: 790,
        ancho: 814,
        alto: 34
    },
    {
        id: "contacto-plataforma-media",
        x: 142,
        y: 535,
        ancho: 560,
        alto: 34
    },
    {
        id: "contacto-plataforma-terminal",
        x: 318,
        y: 348,
        ancho: 206,
        alto: 34
    }
];

export const CONFIGURACION_JUGADOR = {
    posicionInicialX: 18,
    posicionInicialY: 76,
    ancho: 96,
    alto: 112,
    velocidadMovimiento: 270,
    fuerzaSalto: 840,
    gravedad: 1900,
    invertirDireccionVisualQuieto: true,
    invertirDireccionVisualAlSaltar: true
};

export const CONFIGURACION_ANIMACION = {
    intervaloCaminar: 130,
    intervaloSalto: 110,
    intervaloTeletransporte: 90,
    intervaloPortalNivel: 190,
    intervaloObjetoProyecto: 95
};

export const PENSAMIENTOS_NIVELES = {
    1: "thoughts.level1",
    2: "thoughts.level2",
    3: "thoughts.level3",
    4: "thoughts.level4"
};

export const OBJETOS_ESCENARIO_1 = [
    {
        id: "ordenador",
        nombre: "Ordenador",
        selector: "#ordenador",
        plataformaId: "plataforma-derecha-media",
        x: 1420,
        ancho: 82,
        alto: 122,
        distanciaInteraccion: 120,
        teclaInteraccion: "KeyI",
        mensajeInteraccionKey: "interactions.info",
        mensajeInteraccion: "Pulsa I para interactuar",
        panelId: "panel-ordenador"
    },
    {
        id: "portal-nivel",
        nombre: "Cambio de nivel",
        selector: "#portal-nivel",
        plataformaId: "plataforma-superior-derecha",
        x: 1328,
        ancho: 138,
        alto: 184,
        distanciaInteraccion: 120,
        teclaInteraccion: "KeyI",
        mensajeInteraccion: "Pulsa I para cambiar de nivel",
        panelId: "panel-cambio-nivel"
    }
];

export const OBJETOS_ESCENARIO_2 = [
    {
        id: "portal-nivel",
        nombre: "Cambio de nivel",
        selector: "#portal-nivel",
        plataformaId: "experiencia-plataforma-inferior",
        x: 520,
        ancho: 138,
        alto: 184,
        distanciaInteraccion: 120,
        teclaInteraccion: "KeyI",
        mensajeInteraccion: "Pulsa I para bajar de nivel",
        panelId: "panel-cambio-nivel"
    }
];

export const OBJETOS_ESCENARIO_3 = [
    {
        id: "proyecto-uno",
        nombre: "Portfolio",
        selector: "#objeto-proyecto-uno",
        plataformaId: "proyectos-plataforma-superior-izquierda",
        x: 96,
        ancho: 116,
        alto: 116,
        distanciaInteraccion: 90,
        teclaInteraccion: "KeyI",
        mensajeInteraccionKey: "interactions.project",
        mensajeInteraccion: "Portfolio interactivo",
        panelId: "panel-proyecto-uno"
    },
    {
        id: "portal-nivel",
        nombre: "Cambio de nivel",
        selector: "#portal-nivel",
        plataformaId: "proyectos-plataforma-superior-derecha",
        x: 1508,
        ancho: 138,
        alto: 184,
        distanciaInteraccion: 120,
        teclaInteraccion: "KeyI",
        mensajeInteraccion: "Pulsa I para ir a contacto",
        panelId: "panel-cambio-nivel"
    }
];

export const OBJETOS_ESCENARIO_4 = [
    {
        id: "contacto-email",
        nombre: "Email",
        selector: "#contacto-email",
        plataformaId: "contacto-plataforma-inferior",
        x: 114,
        y: 735,
        ancho: 86,
        alto: 78,
        distanciaInteraccion: 80,
        teclaInteraccion: "KeyE",
        mensajeInteraccionKey: "interactions.contactMessage",
        mensajeInteraccion: "Pulsa E para escribir un mensaje",
        accionEspecial: "enfocarFormularioContacto"
    },
    {
        id: "contacto-github",
        nombre: "GitHub",
        selector: "#contacto-github",
        plataformaId: "contacto-plataforma-inferior",
        x: 280,
        y: 735,
        ancho: 86,
        alto: 78,
        distanciaInteraccion: 80,
        teclaInteraccion: "KeyE",
        mensajeInteraccionKey: "interactions.github",
        mensajeInteraccion: "Pulsa E para abrir GitHub",
        url: "https://github.com/DiegoHA17"
    },
    {
        id: "contacto-linkedin",
        nombre: "LinkedIn",
        selector: "#contacto-linkedin",
        plataformaId: "contacto-plataforma-inferior",
        x: 454,
        y: 735,
        ancho: 86,
        alto: 78,
        distanciaInteraccion: 80,
        teclaInteraccion: "KeyE",
        mensajeInteraccionKey: "interactions.linkedin",
        mensajeInteraccion: "Pulsa E para abrir LinkedIn",
        url: "https://www.linkedin.com/in/diego-h-81a281310"
    },
    {
        id: "contacto-cv",
        nombre: "CV",
        selector: "#contacto-cv",
        plataformaId: "contacto-plataforma-inferior",
        x: 630,
        y: 735,
        ancho: 86,
        alto: 78,
        distanciaInteraccion: 80,
        teclaInteraccion: "KeyE",
        mensajeInteraccionKey: "interactions.cv",
        mensajeInteraccion: "Pulsa E para descargar el CV",
        url: "src/assets/documentos/cv/CV.pdf",
        descarga: true
    }
];

export const CONFIGURACION_NIVELES = {
    1: {
        nombre: "Inicio",
        nombreKey: "levels.home",
        plataformas: PLATAFORMAS_ESCENARIO_1,
        objetos: OBJETOS_ESCENARIO_1,
        plataformaInicialJugador: "plataforma-superior-izquierda",
        posicionInicialX: CONFIGURACION_JUGADOR.posicionInicialX,
        siguienteNivel: 2
    },
    2: {
        nombre: "Experiencia",
        nombreKey: "levels.experience",
        plataformas: PLATAFORMAS_ESCENARIO_2,
        objetos: OBJETOS_ESCENARIO_2,
        plataformaInicialJugador: "experiencia-plataforma-inicio",
        posicionInicialX: 22,
        siguienteNivel: 3
    },
    3: {
        nombre: "Proyectos",
        nombreKey: "levels.projects",
        plataformas: PLATAFORMAS_ESCENARIO_3,
        escaleras: ESCALERAS_ESCENARIO_3,
        objetos: OBJETOS_ESCENARIO_3,
        plataformaInicialJugador: "proyectos-plataforma-inferior",
        posicionInicialX: 34,
        siguienteNivel: 4
    },
    4: {
        nombre: "Contacto",
        nombreKey: "levels.contact",
        plataformas: PLATAFORMAS_ESCENARIO_4,
        objetos: OBJETOS_ESCENARIO_4,
        plataformaInicialJugador: "contacto-plataforma-inferior",
        posicionInicialX: 28,
        siguienteNivel: 1
    }
};

export const CODIGOS_TECLAS = {
    derecha: "ArrowRight",
    izquierda: "ArrowLeft",
    arriba: "ArrowUp",
    abajo: "ArrowDown",
    salto: "Space",
    interaccion: "KeyI",
    interaccionContacto: "KeyE",
    cerrar: "Escape",
    aparecerTemporal: "KeyQ",
    desaparecerTemporal: "KeyW",
    alternarColisiones: "KeyO"
};

export const ESTADOS_JUGADOR = {
    quieto: "quieto",
    caminando: "caminando",
    saltando: "saltando",
    cayendo: "cayendo",
    apareciendo: "apareciendo",
    desapareciendo: "desapareciendo",
    interactuando: "interactuando"
};
