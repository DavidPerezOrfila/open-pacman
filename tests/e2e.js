// e2e.js
// Pruebas e2e de las specs 01, 02, 03 y 04 con los scripts reales del juego. Sin dependencias.

// La pagina debe cargar limpia: todo error de consola cuenta como fallo.
let erroresConsola = 0;
window.addEventListener( 'error', () => { erroresConsola++; } );
const consoleError = console.error;
console.error = () => { erroresConsola++; };

const resultados = [];

// Caso de prueba: ejecuta fn y apunta ok/fallo con su mensaje.
function test( nombre, fn ) {
  try {
    fn();
    resultados.push( { nombre, ok: true, msg: '' } );
  } catch ( err ) {
    resultados.push( { nombre, ok: false, msg: err.message } );
  }
}

function fallo( msg ) { throw new Error( msg ); }

function esIgual( a, b ) {
  if ( a !== b ) fallo( 'se esperaba ' + b + ', hubo ' + a );
}

function cercano( a, b ) {
  if ( Math.abs( a - b ) > 1e-9 ) fallo( 'se esperaba ' + b + ', hubo ' + a );
}

function celdaEs( t, x, y ) {
  if ( t.x !== x || t.y !== y ) fallo( 'se esperaba {x:' + x + ',y:' + y + '}, hubo {x:' + t.x + ',y:' + t.y + '}' );
}

// --- 1. Carga de los 4 modulos en el orden de index.html ---

test( 'carga: globals de maze/ghosts/game/render', () => {
  esIgual( MAZE.length, 31 );
  esIgual( MAZE[ 0 ].length, 28 );
  esIgual( GHOST_STARTS.length, 4 );
  esIgual( GHOSTS.length, 4 );
  esIgual( typeof createGame, 'function' );
  esIgual( typeof update, 'function' );
  esIgual( typeof updateGhostMode, 'function' );
  esIgual( typeof draw, 'function' );
} );

// --- 2. Colores por fantasma ---

test( 'colores: rojo, rosa, cian y naranja en GHOSTS', () => {
  const esperados = [ '#ff0000', '#ffb8ff', '#00ffff', '#ffb852' ];
  for ( let i = 0; i < 4; i++ ) esIgual( GHOSTS[ i ].color, esperados[ i ] );
} );

// Canvas real: draw() pinta cada fantasma en su celda de inicio.
const canvas = document.getElementById( 'canvas-test' );
const ctx = canvas.getContext( '2d' );
const game = createGame();
draw( ctx, game, 1 );

function pixel( x, y ) {
  const d = ctx.getImageData( x, y, 1, 1 ).data;
  return [ d[ 0 ], d[ 1 ], d[ 2 ] ];
}

function colorEs( c, r, g, b ) {
  const canales = [ r, g, b ];
  const nombres = [ 'r', 'g', 'b' ];
  canales.forEach( ( esperado, i ) => {
    if ( Math.abs( c[ i ] - esperado ) > 32 ) {
      fallo( 'canal ' + nombres[ i ] + ': se esperaba ~' + esperado + ', hubo ' + c[ i ] );
    }
  } );
}

test( 'canvas: cada fantasma se pinta de su color', () => {
  GHOST_STARTS.forEach( ( s, i ) => {
    const hex = GHOSTS[ i ].color;
    colorEs(
      pixel( s.x * 20 + 10, s.y * 20 + 15 ),
      parseInt( hex.slice( 1, 3 ), 16 ),
      parseInt( hex.slice( 3, 5 ), 16 ),
      parseInt( hex.slice( 5, 7 ), 16 )
    );
  } );
} );

// --- 3-6. Targeting por personalidad ---

test( 'blinky: target = casilla de pacman', () => {
  const g = createGame();
  g.pacman.x = 10.3;
  g.pacman.y = 20.6;
  celdaEs( GHOSTS[ 0 ].target( g ), 10, 21 );
} );

test( 'pinky: 4 celdas delante de pacman segun su dir', () => {
  const g = createGame();
  g.pacman.x = 10;
  g.pacman.y = 20;
  g.pacman.dir = 'left';
  celdaEs( GHOSTS[ 1 ].target( g ), 6, 20 );
  g.pacman.dir = 'up';
  celdaEs( GHOSTS[ 1 ].target( g ), 10, 16 );
} );

test( 'inky: simetrico de blinky respecto al punto 2 delante', () => {
  const g = createGame();
  g.pacman.x = 10;
  g.pacman.y = 20;
  g.pacman.dir = 'right';
  g.ghosts[ 0 ].x = 5;
  g.ghosts[ 0 ].y = 17;
  celdaEs( GHOSTS[ 2 ].target( g ), 19, 23 );
} );

test( 'clyde: persigue a >8 y su corner a <=8 (manhattan)', () => {
  const g = createGame();
  g.pacman.x = 10;
  g.pacman.y = 20;
  g.ghosts[ 3 ].x = 5;
  g.ghosts[ 3 ].y = 5;
  celdaEs( GHOSTS[ 3 ].target( g ), 10, 20 );
  g.ghosts[ 3 ].x = 10;
  g.ghosts[ 3 ].y = 19;
  celdaEs( GHOSTS[ 3 ].target( g ), GHOSTS[ 3 ].corner.x, GHOSTS[ 3 ].corner.y );
} );

// --- 7. Modos scatter y chase (spec 02) ---

test( 'modo: empieza en scatter con 420 frames', () => {
  const g = createGame();
  esIgual( g.phase, 'scatter' );
  esIgual( g.phaseTimer, 420 );
} );

test( 'modo: chase a los 420 frames y scatter otra vez a los 1620', () => {
  const g = createGame();
  // Pacman aparcado en un muro: partida determinista, sin resets.
  g.pacman.x = 5;
  g.pacman.y = 23;
  g.pacman.dir = 'left';
  for ( let f = 1; f < 420; f++ ) update( g );
  esIgual( g.phase, 'scatter' );
  update( g );
  esIgual( g.phase, 'chase' );
  esIgual( g.phaseTimer, 1200 );
  for ( let f = 0; f < 1200; f++ ) update( g );
  esIgual( g.phase, 'scatter' );
  esIgual( g.phaseTimer, 420 );
} );

test( 'modo: en scatter apunta al corner y en chase a la personalidad', () => {
  const g = createGame();
  for ( let i = 0; i < 4; i++ ) {
    celdaEs( ghostTarget( g, i ), GHOSTS[ i ].corner.x, GHOSTS[ i ].corner.y );
  }
  g.phase = 'chase';
  g.pacman.x = 10;
  g.pacman.y = 20;
  celdaEs( ghostTarget( g, 0 ), 10, 20 );
} );

test( 'modo: media vuelta al cambiar de fase, salvo dentro del corral', () => {
  const g = createGame();
  g.ghosts[ 0 ].x = 5;
  g.ghosts[ 0 ].y = 5;
  g.ghosts[ 0 ].dir = 'left';
  g.ghosts[ 1 ].x = 13;
  g.ghosts[ 1 ].y = 14;
  g.ghosts[ 1 ].dir = 'up';
  g.phaseTimer = 1;
  updateGhostMode( g );
  esIgual( g.ghosts[ 0 ].dir, 'right' );
  esIgual( g.ghosts[ 1 ].dir, 'up' );
} );

test( 'modo: resetPositions devuelve a scatter', () => {
  const g = createGame();
  g.phase = 'chase';
  g.phaseTimer = 10;
  resetPositions( g );
  esIgual( g.phase, 'scatter' );
  esIgual( g.phaseTimer, 420 );
} );

// --- 8. Muros y puerta del corral ---

test( 'muros: 600 frames y ningun fantasma entra en pared', () => {
  const g = createGame();
  for ( let f = 0; f < 600; f++ ) {
    update( g );
    for ( const ghost of g.ghosts ) {
      if ( g.grid[ Math.round( ghost.y ) ][ Math.round( ghost.x ) ] === 1 ) {
        fallo( 'fantasma en pared en frame ' + f + ': (' + ghost.x + ',' + ghost.y + ')' );
      }
    }
  }
} );

test( 'puerta: bloquea a pacman', () => {
  const g = createGame();
  const p = g.pacman;
  p.x = 13;
  p.y = 13;
  p.dir = 'up';
  for ( let f = 0; f < 60; f++ ) {
    update( g );
    if ( Math.round( p.y ) < 13 ) fallo( 'pacman cruzo la puerta: y=' + p.y );
  }
} );

test( 'corral: los 4 fantasmas salen en 600 frames', () => {
  const g = createGame();
  g.state = 'playing';
  // Pacman aparcado en un muro: partida determinista, sin resets.
  g.pacman.x = 5;
  g.pacman.y = 23;
  g.pacman.dir = 'left';
  const minY = [ 99, 99, 99, 99 ];
  for ( let f = 0; f < 600; f++ ) {
    update( g );
    g.ghosts.forEach( ( ghost, i ) => {
      minY[ i ] = Math.min( minY[ i ], Math.round( ghost.y ) );
    } );
  }
  minY.forEach( ( y, i ) => {
    if ( y > 11 ) fallo( 'fantasma ' + i + ' nunca salio del corral (min y=' + y + ')' );
  } );
} );

// --- 9. Movimiento de pacman intacto ---

test( 'pacman: velocidad 1/8 celda por frame', () => {
  const g = createGame();
  const p = g.pacman;
  esIgual( p.speed, 0.125 );
  update( g );
  cercano( p.x, 12.875 );
  esIgual( p.y, 23 );
} );

test( 'pacman: giro bufferado al quedar alineado', () => {
  const g = createGame();
  const p = g.pacman;
  p.x = 6;
  p.y = 23;
  p.dir = 'left';
  p.nextDir = 'up';
  update( g );
  esIgual( p.dir, 'up' );
  esIgual( p.nextDir, null );
  cercano( p.y, 22.875 );
} );

test( 'pacman: tunel con wrap en la fila 14', () => {
  const g = createGame();
  const p = g.pacman;
  p.x = 0;
  p.y = 14;
  p.dir = 'left';
  for ( let f = 0; f < 8; f++ ) update( g );
  cercano( p.x, 27 );
} );

// --- 10. Power pellets y modo frightened (spec 03) ---

test( 'pellets: 4 en las esquinas del laberinto con tile 4', () => {
  const esquinas = [ [ 1, 3 ], [ 26, 3 ], [ 1, 23 ], [ 26, 23 ] ];
  for ( const [ x, y ] of esquinas ) esIgual( MAZE[ y ][ x ], 4 );
  let pellets = 0;
  for ( const row of MAZE ) for ( const v of row ) if ( v === 4 ) pellets++;
  esIgual( pellets, 4 );
} );

test( 'pellets: createGame las cuenta para vaciar el laberinto', () => {
  const g = createGame();
  let dots = 0;
  let pellets = 0;
  for ( const row of MAZE ) for ( const v of row ) {
    if ( v === 2 ) dots++;
    if ( v === 4 ) pellets++;
  }
  // -1: la celda de inicio de Pacman arranca vacia.
  esIgual( g.dotsRemaining, dots + pellets - 1 );
} );

test( 'canvas: la power pellet se dibuja mas grande que un dot', () => {
  // Centro de la pellet en (1,3) mas 4 px: dentro del circulo grande.
  colorEs( pixel( 1 * 20 + 10 + 4, 3 * 20 + 10 ), 255, 184, 151 );
  // Misma distancia del centro de un dot en (1,1): fondo negro.
  colorEs( pixel( 1 * 20 + 10 + 4, 1 * 20 + 10 ), 0, 0, 0 );
} );

test( 'pellet: comer suma 50, vacia la celda, resta 1 y arranca frightened', () => {
  const g = createGame();
  const p = g.pacman;
  p.x = 1;
  p.y = 3;
  p.dir = 'right';
  const restantes = g.dotsRemaining;
  update( g );
  esIgual( g.score, 50 );
  esIgual( g.grid[ 3 ][ 1 ], 0 );
  esIgual( g.dotsRemaining, restantes - 1 );
  esIgual( g.frightenedTimer, 480 );
} );

test( 'frightened: 480 frames y media vuelta solo fuera del corral', () => {
  const g = createGame();
  g.ghosts[ 0 ].x = 5;
  g.ghosts[ 0 ].y = 5;
  g.ghosts[ 0 ].dir = 'left';
  g.ghosts[ 1 ].dir = 'up'; // dentro del corral
  startFrightened( g );
  esIgual( g.frightenedTimer, 480 );
  esIgual( g.ghosts[ 0 ].dir, 'right' );
  esIgual( g.ghosts[ 1 ].dir, 'up' );
} );

test( 'frightened: se descuenta cada frame y acaba en 0', () => {
  const g = createGame();
  // Pacman aparcado en un muro: partida determinista, sin resets.
  g.pacman.x = 5;
  g.pacman.y = 23;
  g.pacman.dir = 'left';
  g.frightenedTimer = 480;
  update( g );
  esIgual( g.frightenedTimer, 479 );
  for ( let f = 0; f < 479; f++ ) update( g );
  esIgual( g.frightenedTimer, 0 );
  esIgual( frightened( g ), false );
} );

test( 'frightened: target = esquina opuesta a pacman para los 4', () => {
  const g = createGame();
  g.pacman.x = 5;
  g.pacman.y = 23;
  g.frightenedTimer = 480;
  for ( let i = 0; i < 4; i++ ) celdaEs( ghostTarget( g, i ), 27 - 5, 30 - 23 );
} );

test( 'frightened: 1/20 celda por frame; al terminar vuelve a 1/10', () => {
  const conMiedo = createGame();
  conMiedo.ghosts[ 0 ].x = 5;
  conMiedo.ghosts[ 0 ].y = 5;
  conMiedo.ghosts[ 0 ].dir = 'left';
  conMiedo.pacman.x = 5;
  conMiedo.pacman.y = 23;
  conMiedo.pacman.dir = 'left';
  conMiedo.frightenedTimer = 480;
  update( conMiedo );
  const andado = Math.abs( conMiedo.ghosts[ 0 ].x - 5 ) + Math.abs( conMiedo.ghosts[ 0 ].y - 5 );
  cercano( andado, 0.05 );

  const normal = createGame();
  normal.ghosts[ 0 ].x = 5;
  normal.ghosts[ 0 ].y = 5;
  normal.ghosts[ 0 ].dir = 'left';
  normal.pacman.x = 5;
  normal.pacman.y = 23;
  normal.pacman.dir = 'left';
  update( normal );
  const andadoNormal = Math.abs( normal.ghosts[ 0 ].x - 5 ) + Math.abs( normal.ghosts[ 0 ].y - 5 );
  cercano( andadoNormal, 0.1 );
} );

test( 'frightened: tocar un fantasma comestible lo come y no resta vida', () => {
  const g = createGame();
  g.pacman.x = 5;
  g.pacman.y = 5;
  g.pacman.dir = 'left';
  g.frightenedTimer = 480;
  g.grid[ 5 ][ 5 ] = 0; // sin dot: el score solo cuenta el fantasma
  g.ghosts[ 0 ].x = 5;
  g.ghosts[ 0 ].y = 5;
  update( g );
  esIgual( g.lives, 3 );
  esIgual( g.score, 200 );
} );

// --- 11. Comer fantasmas asustados (spec 04) ---

test( 'comer fantasma: 200, 400, 800 y 1600 dentro de la misma pellet', () => {
  const g = createGame();
  g.pacman.x = 5;
  g.pacman.y = 5;
  g.pacman.dir = 'left';
  g.frightenedTimer = 480;
  g.grid[ 5 ][ 5 ] = 0; // sin dot: el score solo cuenta fantasmas
  const puntos = [];
  for ( let i = 0; i < 4; i++ ) {
    const antes = g.score;
    g.pacman.x = 5;
    g.pacman.y = 5;
    g.ghosts[ i ].x = 5;
    g.ghosts[ i ].y = 5;
    update( g );
    puntos.push( g.score - antes );
  }
  esIgual( puntos.join( ',' ), '200,400,800,1600' );
  esIgual( g.ghostsEaten, 4 );
} );

test( 'comer fantasma: otra pellet reinicia la escala a 200', () => {
  const g = createGame();
  g.pacman.x = 5;
  g.pacman.y = 5;
  g.pacman.dir = 'left';
  g.frightenedTimer = 480;
  g.grid[ 5 ][ 5 ] = 0; // sin dot: el score solo cuenta fantasmas
  g.ghosts[ 0 ].x = 5;
  g.ghosts[ 0 ].y = 5;
  update( g );
  esIgual( g.score, 200 );
  startFrightened( g );
  esIgual( g.ghostsEaten, 0 );
  g.ghosts[ 1 ].x = 5;
  g.ghosts[ 1 ].y = 5;
  update( g );
  esIgual( g.score, 400 );
} );

test( 'comer fantasma: vuelve al corral mirando arriba y deja de ser comestible', () => {
  const g = createGame();
  g.pacman.x = 5;
  g.pacman.y = 5;
  g.pacman.dir = 'left';
  g.frightenedTimer = 480;
  g.ghosts[ 2 ].x = 5;
  g.ghosts[ 2 ].y = 5;
  update( g );
  celdaEs( g.ghosts[ 2 ], GHOST_STARTS[ 2 ].x, GHOST_STARTS[ 2 ].y );
  esIgual( g.ghosts[ 2 ].dir, 'up' );
  esIgual( ghostEdible( g, g.ghosts[ 2 ] ), false );
  esIgual( ghostEdible( g, g.ghosts[ 0 ] ), true );
} );

test( 'comer fantasma: uno ya comido no vuelve a puntuar ni resta vida', () => {
  const g = createGame();
  g.pacman.x = 5;
  g.pacman.y = 5;
  g.pacman.dir = 'left';
  g.frightenedTimer = 480;
  g.grid[ 5 ][ 5 ] = 0; // sin dot: el score solo cuenta fantasmas
  g.ghosts[ 0 ].eaten = true;
  g.ghosts[ 0 ].x = 5;
  g.ghosts[ 0 ].y = 5;
  const antes = g.score;
  update( g );
  esIgual( g.score, antes );
  esIgual( g.lives, 3 );
} );

test( 'comer fantasma: el comido ya no huye ni va a media velocidad', () => {
  const g = createGame();
  g.pacman.x = 5;
  g.pacman.y = 23;
  g.pacman.dir = 'left';
  g.frightenedTimer = 480;
  g.ghosts[ 0 ].x = 5;
  g.ghosts[ 0 ].y = 5;
  g.ghosts[ 0 ].dir = 'left';
  g.ghosts[ 0 ].eaten = true;
  update( g );
  const andado = Math.abs( g.ghosts[ 0 ].x - 5 ) + Math.abs( g.ghosts[ 0 ].y - 5 );
  cercano( andado, 0.1 );
  celdaEs( ghostTarget( g, 0 ), GHOSTS[ 0 ].corner.x, GHOSTS[ 0 ].corner.y );
} );

test( 'frightened: al acabar los comidos vuelven a ser normales', () => {
  const g = createGame();
  g.pacman.x = 5;
  g.pacman.y = 23;
  g.pacman.dir = 'left';
  g.ghosts[ 0 ].eaten = true;
  g.frightenedTimer = 1;
  update( g );
  esIgual( g.frightenedTimer, 0 );
  esIgual( g.ghosts[ 0 ].eaten, false );
} );

test( 'canvas: el fantasma comestible se pinta azul y el comido con su color', () => {
  const s = GHOST_STARTS[ 0 ];
  const g = createGame();
  g.frightenedTimer = 480;
  draw( ctx, g, 1 );
  colorEs( pixel( s.x * 20 + 10, s.y * 20 + 15 ), 33, 33, 255 );
  g.ghosts[ 0 ].eaten = true;
  draw( ctx, g, 1 );
  colorEs( pixel( s.x * 20 + 10, s.y * 20 + 15 ), 255, 0, 0 );
} );

test( 'colision normal: sigue restando vida', () => {
  const g = createGame();
  g.pacman.x = 5;
  g.pacman.y = 5;
  g.pacman.dir = 'left';
  g.ghosts[ 0 ].x = 5;
  g.ghosts[ 0 ].y = 5;
  update( g );
  esIgual( g.lives, 2 );
} );

test( 'pellet: no pausa ni reinicia el temporizador scatter/chase', () => {
  const g = createGame();
  g.pacman.x = 1;
  g.pacman.y = 3;
  g.pacman.dir = 'right';
  g.phaseTimer = 100;
  update( g );
  esIgual( g.phase, 'scatter' );
  esIgual( g.phaseTimer, 99 );
} );

test( 'victoria: vaciar el laberinto incluidas las pellets gana', () => {
  const g = createGame();
  for ( const row of g.grid ) row.fill( 0 );
  g.dotsRemaining = 0;
  g.frightenedTimer = 480; // sin fantasmas peligrosos en el frame final
  g.pacman.x = 5;
  g.pacman.y = 23;
  g.pacman.dir = 'left';
  update( g );
  esIgual( g.state, 'won' );
} );

// --- Consola limpia (se evalua al final) ---

resultados.push( {
  nombre: 'consola limpia durante toda la ejecucion',
  ok: erroresConsola === 0,
  msg: erroresConsola ? erroresConsola + ' errores de consola' : '',
} );

// --- Resumen en el DOM y en el titulo ---

let pass = 0;
const lista = document.getElementById( 'e2e-results' );
for ( const r of resultados ) {
  if ( r.ok ) pass++;
  const li = document.createElement( 'li' );
  li.className = r.ok ? 'ok' : 'fallo';
  li.textContent = ( r.ok ? 'OK   ' : 'FALLO' ) + '  ' + r.nombre + ( r.msg ? ' - ' + r.msg : '' );
  lista.appendChild( li );
}
const total = resultados.length;
const todoOk = pass === total;
document.getElementById( 'e2e-summary' ).textContent =
  'E2E ' + ( todoOk ? 'PASS' : 'FAIL' ) + ' ' + pass + '/' + total;
document.title = todoOk ? 'E2E OK' : 'E2E FALLOS';
