# Cálculo y geometría — versión 0.3

La tabla de la imagen original se conserva como referencia histórica, pero no se suman sus rieles de nuevo sobre las longitudes geométricas. Las últimas instrucciones del usuario determinan los herrajes y tornillos. Los manuales oficiales Ascender siguen pendientes de consulta/validación; no se afirma certificación ni dimensionamiento resistente.

## Filas independientes

Cada panel tiene una envolvente en su plano: ancho = |cos θ| × ancho nominal + |sin θ| × largo nominal; largo = |sin θ| × ancho nominal + |cos θ| × largo nominal. Dentro de cada fila se suman los anchos con la separación entre piezas, sin usar una cuadrícula de columnas compartida con otras filas. El largo de la fila es el mayor largo de envolvente de sus piezas.

Las filas se colocan consecutivamente desde el frente, con la separación configurada. El borde oeste y el frente de referencia se calculan con el módulo nominal de la cama y se mantienen al girar paneles. Por tanto, girar la fila superior de una cama 2×4 no desplaza los paneles, patas ni rieles de la fila inferior. Las celdas de paneles retirados conservan su hueco para no mover los demás.

Los rieles E–O siguen cada tramo continuo de su propia fila. Los N–S, cuando se habilitan, cruzan sólo el ancho compartido de los tramos que unen; no extienden la fila corta hasta el ancho de la fila larga. La representación de una estructura mixta y sus conexiones aún requiere revisión técnica.

## Patas y ejes

Cada tramo E–O dispone de dos líneas de apoyo por fila. Su distancia N–S horizontal es editable y se limita al fondo de esa fila menos 10 cm si no cabe. Los proyectos antiguos sin ese valor conservan los puntos al 20% y 80% del largo de fila. Las estaciones E–O se distribuyen con retranqueo de hasta 20 cm y con distancia no mayor que la seleccionada.

Cada pata guarda el ID del riel al que pertenece. Sobre un riel E–O puede cambiar X y mantiene fija su coordenada N–S; sobre un riel N–S puede cambiar Y (almacenada internamente como Z de Three.js) y mantiene fija X. El movimiento se proyecta y se limita al segmento de ese riel. Cambiar de riel es una acción explícita del usuario.

La longitud es altura frontal + distancia horizontal desde el frente × tan(inclinación). Se mide desde la cara superior del bloque, sin descuentos de herrajes. Si se usan bases, hay un bloque sólido por pata. No se calcula lastre, capacidad, anclaje, viento, nieve ni sismo.

## Perfiles y abrazaderas

La partida **Riel (total)** reúne los perfiles E–O, N–S habilitados y contravientos. Cada miembro usa `ceil((longitud − tolerancia numérica) / longitud comercial)` piezas; no se aprovechan automáticamente sobrantes entre miembros. Los rieles E–O agregan el sobrante para end clamp en ambos extremos; N–S usa su largo inclinado y agrega el mismo sobrante en los rieles de montaje de paneles horizontales. Los empalmes son piezas por miembro menos uno. Las patas conservan sus longitudes en el despiece, pero **Pata · perfil vertical** ya no aparece como partida en materiales ni en sus exportaciones. Su corte no se suma al stock de rieles.

E–O y N–S se eligen explícitamente e independientemente de las filas. Una cama sencilla tiene una fila y una doble dos; cambiar filas no altera los sentidos elegidos. Los proyectos antiguos con N–S automático se migran a incluido para que exista una elección explícita en la interfaz.

Los paneles verticales reciben clamps en sus lados largos mediante los rieles E–O. Los paneles horizontales reciben dos líneas N–S de montaje situadas a un cuarto y tres cuartos del ancho; las líneas consecutivas coincidentes se unen entre filas. Los puntos de sujeción se comparten entre conteo y dibujo: dos paneles vecinos con puntos opuestos separados por el hueco configurado comparten un Mid Clamp; los puntos libres llevan End Clamp. Las filas mixtas no comparten clamps entre orientaciones distintas. Sin el sentido de montaje habilitado, sus clamps automáticos son cero; no se activa ningún riel de manera implícita. Las cantidades finales manuales siguen prevaleciendo.

Beam Clip = cruces efectivos entre E–O y N–S × factor editable por cruce (inicialmente 1). Si uno de los dos sentidos está deshabilitado, su conteo automático es cero.

## Contravientos y tornillos confirmados por el usuario

Sólo se colocan uniones elegidas entre dos patas distintas alineadas en E–O o N–S. La diagonal va desde la zona inferior de una hasta la zona superior de la otra; puede invertirse. Su longitud se calcula en 3D. Se conservan IDs locales de patas y de la unión. Si una pata desaparece o la unión queda desalineada, no se cuenta ni se dibuja hasta corregirla.

- Cada pata: 1 L-Foot inferior + 1 Tilt Plate superior.
- T-Bolt en patas: 1 por L-Foot y 2 por Tilt Plate; 3 por pata estándar.
- Contraviento E–O: 2 L-Foot, uno por extremo; cada uno lleva 2 T-Bolt.
- Contraviento N–S: 2 Tilt Plate, uno por extremo; cada uno lleva 2 T-Bolt.
- Cada contraviento suma así 4 T-Bolt.

Las cantidades base de L-Foot y Tilt Plate corresponden a las patas dibujadas, y se añaden los extremos de contravientos. Al editar la cantidad final de herrajes, los T-Bolt automáticos siguen el total con la distinción de L-Foot de contravientos. Si el total manual de L-Foot queda por debajo de los requeridos por las diagonales, se atribuyen primero a esos extremos. El T-Bolt también puede fijarse manualmente.

La puesta a tierra automática es **una por cama con paneles**, aunque existan huecos o varios tramos. En el total del proyecto se suman las camas. Las cantidades fijadas manualmente se identifican como tales y prevalecen hasta restablecerlas.

## Techo y varias camas

La imagen es raster local JPEG, PNG o WebP, validada por cabecera, redimensionada y recodificada a JPEG. No se admiten imágenes SVG ni enlaces remotos. Se guarda en el navegador y en las copias del proyecto; no se transmite al repositorio ni a un servidor de la aplicación.

Una referencia define una distancia entre dos puntos normalizados de la foto y conserva su proporción original. Con dos referencias se resuelven ancho² y largo² a partir de las dos ecuaciones de distancia. Se rechazan puntos iguales, medidas no positivas, referencias que no determinan ambos ejes y escalas fuera de 0.5–200 m. Dos referencias no rectifican la perspectiva de una foto oblicua.

Cada cama tiene posición propia y giro en planta. El movimiento de la cama transforma su grupo completo, manteniendo intactas sus medidas locales; otras camas permanecen en sus posiciones. La navegación y el desplazamiento de cámara no modifican el proyecto. Los ejes de herrajes/contravientos son los ejes locales de la cama.

## Compatibilidad y presentación

Los proyectos versión 1 siguen siendo válidos. Se asignan posiciones a camas antiguas que antes no las tenían y se conservan como uniones explícitas los contravientos heredados. Las patas antiguas fuera del eje se proyectan al riel al que se asignan. Los ajustes antiguos E–O/N–S de cantidades se conservan dentro del total de rieles.

Los precios anteriores se ignoran; no se muestran ni se exportan importes. No se presenta un apartado de reglas en la aplicación ni en los documentos. Esta documentación técnica se conserva en el repositorio para trazabilidad. La verificación funcional y de malware no sustituye la revisión de ingeniería o de manuales del fabricante.

## Cuadrícula y patas individuales

La cuadrícula manual aplica E–O × N–S a toda la cama, con 1–20 posiciones por sentido. Cuando E–O está habilitado, se generan líneas de apoyo E–O en las posiciones N–S elegidas y estaciones a lo largo de cada una; las líneas se suman a los rieles de montaje si no coinciden con ellos. Si sólo N–S está habilitado, se usan líneas N–S para las posiciones E–O y estaciones sobre ellas. Sin rieles no se generan patas. Los puntos tienen retranqueo de hasta 20 cm respecto a extremos. Con filas de distintos anchos la longitud de cada línea sigue el tramo de la fila más cercana; no altera los paneles.

Retirar una pata conserva su ID en el proyecto para poder reponerla. Una pata añadida guarda un ID propio, el riel y su posición; todas se proyectan sobre el riel. Si su riel desaparece, la pata extra se conserva en datos pero no se cuenta ni dibuja. Las uniones a patas ausentes dejan de contarse. Cada pata activa actualiza longitudes, bloque si corresponde, L-Foot, Tilt Plate y T-Bolt. El modo previo por separación sigue disponible. Los cambios de cuadrícula conservan las excepciones por ID; reponer patas limpia las retiradas.

## PDF sencillo

El PDF contiene sólo nombre del proyecto, cliente, ubicación, logo o texto SOLEON naranja, tabla Material/Cantidad/Unidad y las vistas seleccionadas. No añade informes de patas, camas, reglas ni techo. Las capturas se guardan durante la sesión (hasta ocho) con la cámara actual; la ventana de exportación permite elegirlas y también ofrece la vista actual. El logo raster original y la ubicación se guardan en el JSON. El PDF respeta la proporción de imágenes y puede generarse sin vistas. Las cotas se dibujan con texturas sobre sprites dentro del canvas, sin insertar nodos HTML, y se incluyen en las capturas. Word y Excel mantienen el detalle técnico.
