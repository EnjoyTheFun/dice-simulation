import { Timer } from 'three';
import { createGame } from './game.js';
import { createPhysicsWorld } from './physics.js';
import { createScene } from './scene.js';
import { createTray } from './tray.js';
import './style.css';

const FIXED_TIME_STEP = 1 / 60;
const MAX_FRAME_DELTA = 0.1;
const MAX_PHYSICS_SUBSTEPS = 8;

const app = document.querySelector('#app');

if (!app) throw new Error('The application root element #app was not found.');

const view = createScene(app);

const { world, groundMaterial, dieMaterial } = createPhysicsWorld();

const tray = createTray(view.scene, world, groundMaterial);

const game = createGame({
  scene: view.scene,
  world,
  dieMaterial,
  tray,
  renderer: view.renderer,
  camera: view.camera,
});

const timer = new Timer();
timer.connect(document);

function animate(time) {
  timer.update(time);

  const delta = Math.min(timer.getDelta(), MAX_FRAME_DELTA);
  view.controls.update();
  tray.update(delta);
  world.step(FIXED_TIME_STEP, delta, MAX_PHYSICS_SUBSTEPS);

  game.update();

  view.renderer.render(view.scene, view.camera);
}

view.renderer.setAnimationLoop(animate);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {

    view.renderer.setAnimationLoop(null);
    
    timer.disconnect();

    game.dispose();
    view.dispose();
  });
}
