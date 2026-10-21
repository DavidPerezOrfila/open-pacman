// e2e.playwright.js
// E2E en Chrome real sobre src/index.html con playwright-cli: overlay, Start,
// bucle de juego, teclado, dots y colision con fantasma.
//
// Necesita un servidor local (playwright-cli bloquea file://). Desde la raiz:
//   python -m http.server 8765 --bind 127.0.0.1
//   playwright-cli open --browser=chrome --headed
//   playwright-cli run-code --filename=tests/e2e.playwright.js
// --headed no es opcional si quieres ver la partida: sin el, playwright-cli
// corre Chrome en modo headless (ventana invisible).
// Sale con codigo != 0 si algun check falla. Cerrar con: playwright-cli close
//
// El script es un unico `async page => {}` porque run-code lo envuelve en (...).
// Los `let game` de main.js viven en el entorno lexico global, por eso
// page.evaluate puede leer game.score, game.lives, etc. sin nuevos globals.

async page => {
  const TEST_URL = 'http://127.0.0.1:8765/src/index.html';
  const results = [];
  const check = ( name, ok, detail ) => results.push( { name, ok: !!ok, detail: detail || '' } );

  const errors = [];
  const urlOf = ( m ) => ( m.location && m.location().url ) || '';
  page.on( 'pageerror', ( e ) => errors.push( 'pageerror: ' + e ) );
  page.on( 'console', ( m ) => {
    // El 404 de favicon.ico no existe en el repo y no afecta al juego.
    if ( m.type() !== 'error' || urlOf( m ).endsWith( 'favicon.ico' ) ) return;
    errors.push( m.text() + ' @ ' + urlOf( m ) );
  } );

  await page.goto( TEST_URL );
  await page.waitForFunction( () => typeof game === 'object' );

  const overlay = page.locator( '#overlay' );
  check( 'overlay inicial visible', await overlay.evaluate( ( el ) => el.classList.contains( 'show' ) ) );
  check( 'titulo PAC-MAN', ( await overlay.locator( 'h1' ).textContent() ) === 'PAC-MAN' );

  const fresh = await page.evaluate( () => ( {
    state: game.state, score: game.score, lives: game.lives, dots: game.dotsRemaining,
  } ) );
  check( 'estado inicial start', fresh.state === 'start', fresh.state );
  check( 'HUD inicial score=0 vidas=3', fresh.score === 0 && fresh.lives === 3, JSON.stringify( fresh ) );

  await page.getByRole( 'button', { name: 'Start' } ).click();
  await page.waitForTimeout( 100 );
  check( 'overlay oculta al iniciar', !( await overlay.evaluate( ( el ) => el.classList.contains( 'show' ) ) ) );

  const init = await page.evaluate( () => ( {
    state: game.state, score: game.score, lives: game.lives, dots: game.dotsRemaining,
    x: game.pacman.x, ghosts: game.ghosts.length,
  } ) );
  check( 'estado playing', init.state === 'playing', init.state );
  // El bucle ya corre, asi que se toleran los dots comidos en los primeros frames.
  check( 'partida nueva con el laberinto lleno', init.dots >= fresh.dots - 5, init.dots + '/' + fresh.dots );
  check( '4 fantasmas', init.ghosts === 4, String( init.ghosts ) );

  await page.keyboard.press( 'ArrowLeft' );
  await page.waitForTimeout( 800 );
  const after = await page.evaluate( () => ( {
    x: game.pacman.x, dir: game.pacman.dir, score: game.score, dots: game.dotsRemaining,
  } ) );
  check( 'Pac-Man avanza a la izquierda', after.x < init.x && after.dir === 'left', init.x + ' -> ' + after.x );
  check( 'come dots y suma SCORE', after.score > 0 && after.dots < init.dots, 'score=' + after.score + ' dots=' + after.dots );

  await page.keyboard.press( 'ArrowUp' );
  let turned = true;
  try {
    await page.waitForFunction( () => game.pacman.dir === 'up', null, { timeout: 2500 } );
  } catch ( e ) { turned = false; }
  check( 'aplica el giro encolado (nextDir)', turned );

  let lifeLost = true;
  try {
    await page.waitForFunction( () => game.lives < 3 || game.state !== 'playing', null, { timeout: 25000 } );
  } catch ( e ) { lifeLost = false; }
  const mid = await page.evaluate( () => ( { lives: game.lives, state: game.state } ) );
  check( 'colision con fantasma resta vida', lifeLost, JSON.stringify( mid ) );

  check( 'consola sin errores', errors.length === 0, errors.join( ' | ' ) );

  const failed = results.filter( ( r ) => !r.ok );
  if ( failed.length ) {
    throw new Error(
      'E2E FAIL ' + ( results.length - failed.length ) + '/' + results.length + ': ' +
      failed.map( ( r ) => r.name + ( r.detail ? ' (' + r.detail + ')' : '' ) ).join( ', ' )
    );
  }
  return { summary: 'E2E PASS ' + results.length + '/' + results.length, results };
}
