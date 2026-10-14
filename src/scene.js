import {
  ACESFilmicToneMapping,
  CanvasTexture,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  PCFShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  SpotLight,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const BACKGROUND_COLOR = 0x120e0b;

function createBackdropTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  const vignette = context.createRadialGradient(256, 200, 20, 256, 256, 380);
  vignette.addColorStop(0, '#4a3a2c');
  vignette.addColorStop(0.45, '#1f1812');
  vignette.addColorStop(1, '#070504');
  context.fillStyle = vignette;
  context.fillRect(0, 0, 512, 512);

  const glow = context.createRadialGradient(256, 150, 0, 256, 150, 220);
  glow.addColorStop(0, 'rgba(255, 196, 130, 0.14)');
  glow.addColorStop(1, 'rgba(255, 196, 130, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, 512, 512);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createScene(container) {
  const scene = new Scene();
  scene.background = createBackdropTexture();
  scene.fog = new FogExp2(BACKGROUND_COLOR, 0.0007);
  scene.environmentIntensity = 0.08;

  const camera = new PerspectiveCamera(48, 1, 1, 1000);
  camera.position.set(0, 210, 300);
  camera.lookAt(0, 20, 0);

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.append(renderer.domElement);

  const pmremGenerator = new PMREMGenerator(renderer);
  const environment = new RoomEnvironment();
  const environmentTarget = pmremGenerator.fromScene(environment);
  scene.environment = environmentTarget.texture;
  environment.dispose();
  pmremGenerator.dispose();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 20, 0);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.65;
  controls.minDistance = 140;
  controls.maxDistance = 700;

  scene.add(new HemisphereLight(0xffffff, 0x93806a, 2.1));

  const spotLight = new SpotLight(0xffd9a8, 1.6, 0, Math.PI / 5, 0.6, 0);
  spotLight.position.set(40, 420, 120);
  spotLight.target.position.set(0, 0, 0);
  scene.add(spotLight, spotLight.target);

  const rimLight = new DirectionalLight(0x8fb8ff, 1.4);
  rimLight.position.set(200, 140, -220);
  rimLight.target.position.set(0, 20, 0);
  scene.add(rimLight, rimLight.target);

  const keyLight = new DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-150, 240, 180);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -240;
  keyLight.shadow.camera.right = 240;
  keyLight.shadow.camera.top = 280;
  keyLight.shadow.camera.bottom = -180;
  keyLight.shadow.bias = -0.0003;
  scene.add(keyLight);

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    scene,
    camera,
    renderer,
    controls,
    resize,
    dispose() {
      window.removeEventListener('resize', resize);
      controls.dispose();
      environmentTarget.dispose();
      scene.background.dispose();
      renderer.dispose();
    },
  };
}
