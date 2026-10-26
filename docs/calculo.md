# Reglas y fuentes del cálculo

## Origen

Fuente disponible: imagen de la hoja de cálculo entregada por el usuario en esta conversación. Se transcriben nueve columnas de cama sencilla (1×2–1×10) y nueve de cama doble (2×2–2×10): Rail, Splice, Mid Clamp, End Clamp, Beam Clip, Tilt Plate, L-Foot, T-Bolt y Tierras.

No hay un manual oficial incluido en el repositorio. El intento de acceder a `https://unirac.com/ascender/` recibió `Tunnel connection failed: 403 Forbidden` de la red. Se guardaron `unirac.com` y `www.unirac.com` como dominios adicionales en el borrador del entorno, sin afirmar que ese guardado los haya habilitado en la máquina. La referencia Ascender debe completarse con documentos oficiales accesibles y su revisión/versión.

## Cantidades de referencia

Para una cama rectangular completa de una o dos filas y entre dos y diez columnas, los componentes de referencia (salvo riel total y Beam Clip, que usan las reglas descritas abajo) coinciden con la tabla cuando la longitud comercial y la longitud de referencia son iguales. `Rail` se interpreta provisionalmente como riel principal este–oeste: **la imagen no confirma si esa cuenta incluye otros perfiles**, por lo que esa interpretación debe revisarse con el autor y el manual.

Al cambiar la longitud comercial: `rieles E–O = ceil(cantidad de tabla × longitud de referencia / longitud comercial)`. La longitud de referencia de 4.70 m se adopta a partir del riel usado por el usuario, pero sigue siendo una suposición sobre la tabla. No se optimizan cortes ni se garantiza que todos los sobrantes sean aprovechables.

Para geometrías irregulares se recorren celdas activas y se agrupan tramos contiguos de una o dos filas, sin solapar ni omitir paneles. Se suman sus cantidades. Un panel aislado, ausente en la tabla original, tiene una estimación explícita en `referenceQuantity`. La separación en tramos puede aumentar herrajes; no se considera una unión estructural validada.

## Rieles agrupados, norte–sur y Beam Clip

El listado de compra muestra una sola partida: **Riel (total)** = E–O de referencia + N–S habilitados + piezas para contravientos. Las cantidades por eje se mantienen sólo como desglose interno para el cálculo, sin duplicarlas en el listado o sus exportaciones.

N–S tiene tres opciones: **Automático** conserva la exclusión en tramos sencillos; **Incluir** los añade también en tramos sencillos; **No incluir** los elimina de cualquier cama. En tramos habilitados, líneas = `ceil(ancho / separación máxima E–O) + 1`; cada línea utiliza `ceil(longitud inclinada / longitud comercial)` piezas. Con giros individuales se usan los anchos y largos de las celdas ampliadas.

Beam Clip automático = suma de `líneas N–S × filas del tramo × 2 cruces E–O por fila × factor por cruce`. El factor inicial es **1**, editable de 1 a 8. Sin N–S habilitado, Beam Clip automático es cero. No se multiplica por las piezas comerciales de una línea para no duplicar cruces en empalmes. Esta regla sustituye el renglón Beam Clip de la tabla por petición del usuario y **no se atribuye a un manual Unirac validado**.

## Contravientos

Cuando se activan se generan las diagonales solicitadas en el eje elegido. Cada diagonal une la zona inferior de una pata con la superior de otra, con pequeños descuentos de representación de 5 cm. Su longitud geométrica es la distancia 3D entre extremos; puede introducirse una longitud considerada manual. Las piezas comerciales de cada diagonal son `ceil(longitud considerada / longitud comercial)` y se suman al total de rieles. No se acredita aprovechamiento de sobrantes entre diagonales. Al mover patas, las longitudes automáticas cambian.

La posición es esquemática: se recorren pares de patas por fila/línea o por pareja N–S. Si se solicitan más diagonales que ubicaciones, pueden repetirse. No hay dimensionamiento de conexión, orientación resistente ni rigidización validada.

## Geometría, patas y concreto

- Ancho de cama: suma de anchos de columna y separaciones. Cada ancho de columna es el mayor ancho de envolvente de sus paneles girados.
- Largo inclinado: suma de largos de fila y separaciones. Cada largo de fila es el mayor largo de envolvente de sus paneles girados. Para giro θ: ancho de envolvente = |cos θ| × ancho + |sin θ| × largo; largo de envolvente = |sin θ| × ancho + |cos θ| × largo. Se reservan también las celdas de paneles retirados.
- Fondo horizontal: largo inclinado × cos(ángulo).
- Altura de cada pata: altura frontal + distancia sobre el plano × sin(ángulo).
- Cada tramo continuo en una fila tiene dos líneas de apoyo centradas con la distancia horizontal N–S seleccionada. Si la distancia no cabe, se limita al fondo horizontal de la fila menos 10 cm. Los proyectos antiguos que no tienen ese campo conservan el 20% y 80% del largo de su fila. Los apoyos laterales se distribuyen con un retranqueo máximo de 0.20 m y una separación no mayor a la seleccionada. Las posiciones y el retranqueo son supuestos de representación, **no posiciones aprobadas de fijación de un módulo**.
- Un perfil vertical por pata dibujada, sin descuentos por herrajes. No se define sección, resistencia ni tipo de conexión del perfil.
- Si las bases están activadas: un bloque sólido por pata y volumen geométrico ancho × fondo × alto × número de bloques. No se calcula masa necesaria, lastre, deslizamiento o vuelco.
- El sobrante para end clamp se agrega a ambos extremos de los rieles E–O dibujados. No incrementa automáticamente la cuenta de la tabla.
- Cambiar orientación, dimensiones o inclinación actualiza el modelo, las patas y los apoyos. Las cantidades de herrajes de la tabla se conservan para cada configuración de filas/columnas; no hay un dimensionamiento resistente asociado a esos cambios.

## Ajustes manuales

Las cantidades manuales sustituyen a las automáticas y permanecen fijas al quitar paneles hasta restablecerlas. La selección N–S controla el cálculo automático, pero no sustituye un total de rieles fijado manualmente. Los ajustes antiguos por eje se suman para conservar la cantidad del proyecto anterior; al restablecer el riel se eliminan también esos ajustes antiguos. Los informes identifican cantidades manuales y exportan los supuestos.

## Posiciones individuales e imagen del techo

Cada pata automática tiene un ID por fila, tramo, posición y línea. Las coordenadas manuales se guardan por ID y sustituyen las automáticas. Sólo se aplican a IDs presentes; al quitar un tramo no se dibujan patas huérfanas. Las posiciones se limitan a la huella actual si la cama cambia de tamaño y se advierte de ello. La altura se calcula sobre el plano de la cama con las coordenadas finales. Los rieles siguen siendo esquemáticos: mover una pata no valida su conexión con ellos.

La imagen del techo tiene ancho/largo físicos, desplazamientos X/Z, giro y opacidad. No interviene en cantidades ni detecta obstáculos. Se acepta una imagen raster local, que se redimensiona a un máximo de 2048 píxeles por lado y se vuelve a codificar como JPEG; no se admiten SVG ni direcciones remotas. El proyecto y la foto se guardan en el navegador y en las copias JSON. Los archivos anteriores sin esos campos siguen siendo válidos.

## Validación pendiente

Revisar contra los manuales oficiales Ascender: sistema/modelo exacto y disponibilidad regional; significado de Rail en la tabla; longitudes de referencia; piezas y códigos; posiciones de sujeción aprobadas por el fabricante de módulos; separaciones admisibles; inclinaciones; alturas de patas y descuentos; reglas para huecos y camas múltiples; puesta a tierra; empalmes y aprovechamiento de cortes; cargas, secciones, conexiones, lastre y anclajes.

La validación funcional de software no sustituye esta revisión técnica.
