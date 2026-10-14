import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
} from 'three';
import { Body, Box, Vec3 } from 'cannon-es';

const OPEN_LID_ANGLE = -Math.PI * 1.1;
const WOOD_SEGMENTS = 32;
const WOOD_THICKNESS_SEGMENTS = 4;

function configureWoodTexture(texture, colorSpace) {
  texture.colorSpace = colorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;

  return texture;
}

function createWoodMaps(textures, repeatX, repeatY) {
  const offsetX = Math.random() * (1 - repeatX);
  const offsetY = Math.random() * (1 - repeatY);

  const cropTexture = (texture) => {
    const cropped = texture.clone();
    cropped.repeat.set(repeatX, repeatY);
    cropped.offset.set(offsetX, offsetY);
    return cropped;
  };
  const displacementMap = cropTexture(textures.displacement);

  return {
    map: cropTexture(textures.color),
    normalMap: cropTexture(textures.normal),
    normalScale: new Vector2(0.35, 0.35),
    roughnessMap: cropTexture(textures.roughness),
    bumpMap: displacementMap,
    bumpScale: 0.08,
    displacementMap,
    displacementScale: 0.08,
    displacementBias: -0.04,
  };
}

function loadWoodTexture(url, colorSpace = NoColorSpace) {
  return configureWoodTexture(new TextureLoader().load(
    url,
    undefined,
    undefined,
    (error) => console.error(`Could not load wood texture: ${url}`, error),
  ), colorSpace);
}

function addStaticBox(scene, world, name, size, position, rotation, material, physicsMaterial) {
  const [width, height, depth] = size;

  const mesh = new Mesh(
    new BoxGeometry(
      width,
      height,
      depth,
      WOOD_SEGMENTS,
      WOOD_THICKNESS_SEGMENTS,
      WOOD_SEGMENTS,
    ),
    material,
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const body = new Body({ mass: 0, material: physicsMaterial });
  body.addShape(new Box(new Vec3(width / 2, height / 2, depth / 2)));
  body.position.set(...position);
  body.quaternion.setFromEuler(...rotation);
  world.addBody(body);
}

export function createTray(scene, world, physicsMaterial) {
  const woodTextures = {
    color: loadWoodTexture(
      new URL('./textures/oak_veneer_01_diff_1k.jpg', import.meta.url).href,
      SRGBColorSpace,
    ),
    normal: loadWoodTexture(
      new URL('./textures/oak_veneer_01_nor_gl_1k.jpg', import.meta.url).href,
    ),
    roughness: loadWoodTexture(
      new URL('./textures/oak_veneer_01_rough_1k.jpg', import.meta.url).href,
    ),
    displacement: loadWoodTexture(
      new URL('./textures/oak_veneer_01_disp_1k.jpg', import.meta.url).href,
    ),
  };

  const trimMaterial = new MeshStandardMaterial({
    color: 0x684326,
    roughness: 0.72,
  });

  const hingeMaterial = new MeshStandardMaterial({
    color: 0x403b35,
    metalness: 0.72,
    roughness: 0.32,
  });

  const boxes = [
    ['tray-floor', [260, 5, 260], [0, -2.5, 0]],
    ['back-wall', [260, 50, 5], [0, 25, -127.5]],
    ['front-wall', [260, 50, 5], [0, 25, 127.5]],
    ['left-wall', [5, 50, 250], [-127.5, 25, 0]],
    ['right-wall', [5, 50, 250], [127.5, 25, 0]],
  ];

  for (const [name, size, position, rotation = [0, 0, 0]] of boxes) {
    const isFloor = name === 'tray-floor';

    const material = new MeshStandardMaterial({
      ...createWoodMaps(woodTextures, 0.45, isFloor ? 0.45 : 0.22),
      roughness: isFloor ? 0.86 : 0.78,
    });

    addStaticBox(scene, world, name, size, position, rotation, material, physicsMaterial);
  }

  const lidPivot = new Group();
  lidPivot.position.set(0, 52, -130);
  scene.add(lidPivot);

  const lidMaterial = new MeshStandardMaterial({
    ...createWoodMaps(woodTextures, 0.45, 0.45),
    roughness: 0.76,
  });

  const lid = new Mesh(
    new BoxGeometry(
      255,
      4,
      255,
      WOOD_SEGMENTS,
      WOOD_THICKNESS_SEGMENTS,
      WOOD_SEGMENTS,
    ),
    lidMaterial,
  );
  lid.position.z = 130;
  lid.castShadow = true;
  lid.receiveShadow = true;
  lidPivot.add(lid);

  const battenGeometry = new BoxGeometry(255, 1.5, 10);
  for (const z of [42.5, 132.5, 222.5]) {
    const batten = new Mesh(battenGeometry, trimMaterial);
    batten.position.set(0, 2.8, z);
    batten.castShadow = true;
    lidPivot.add(batten);
  }

  const handleSupports = new BoxGeometry(5, 8, 5);
  for (const x of [-9, 9]) {
    const support = new Mesh(handleSupports, trimMaterial);
    support.position.set(x, 7, 222.5);
    lidPivot.add(support);
  }
  const handle = new Mesh(new BoxGeometry(28, 4, 6), trimMaterial);
  handle.position.set(0, 11, 222.5);
  lidPivot.add(handle);

  const hingeGeometry = new CylinderGeometry(2.5, 2.5, 22, 32);
  for (const x of [-82, 0, 82]) {
    const hinge = new Mesh(hingeGeometry, hingeMaterial);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(x, 52.5, -130);
    hinge.castShadow = true;
    scene.add(hinge);

    const wallLeaf = new Mesh(new BoxGeometry(22, 7, 3), hingeMaterial);
    wallLeaf.position.set(x, 49, -129);
    wallLeaf.castShadow = true;
    scene.add(wallLeaf);

    const lidLeaf = new Mesh(new BoxGeometry(22, 0.8, 14), hingeMaterial);
    lidLeaf.position.set(x, -2.45, 7.5);
    lidLeaf.castShadow = true;
    lidPivot.add(lidLeaf);
  }

  let angle = 0;
  let targetAngle = angle;

  function update(delta) {
    if (delta <= 0) return;

    angle += (targetAngle - angle) * Math.min(1, delta * 3.5);
    if (Math.abs(targetAngle - angle) < 0.002) angle = targetAngle;

    lidPivot.rotation.x = angle;
  }

  return {
    update,
    openLid() {
      targetAngle = OPEN_LID_ANGLE;
    },
    isOpen() {
      return angle <= OPEN_LID_ANGLE + 0.002;
    },
  };
}
