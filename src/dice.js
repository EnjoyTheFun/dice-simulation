import {
  BoxGeometry,
  CircleGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { Body, Box, Vec3 } from 'cannon-es';

const dieGeometry = new BoxGeometry(20, 20, 20);

const pipGeometry = new CircleGeometry(1.2, 32);
const pipMaterial = new MeshBasicMaterial({
  color: 0xffffff,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
const pipFaces = [
  { normal: [0, 0, 1], positions: [[0, 0]] },
  { normal: [-1, 0, 0], positions: [[-5, -5], [5, 5]] },
  { normal: [0, 1, 0], positions: [[-5, -5], [0, 0], [5, 5]] },
  { normal: [0, -1, 0], positions: [[-5, -5], [-5, 5], [5, -5], [5, 5]] },
  { normal: [1, 0, 0], positions: [[-5, -5], [-5, 5], [0, 0], [5, -5], [5, 5]] },
  { normal: [0, 0, -1], positions: [[-5, -5], [-5, 0], [-5, 5], [5, -5], [5, 0], [5, 5]] },
];

export function createDie(scene, world, physicsMaterial) {
  const mesh = new Mesh(
    dieGeometry,
    new MeshPhysicalMaterial({
      color: 0xcb171b,
      roughness: 0.4,
      metalness: 0.02,
      transmission: 0.04,
      thickness: 1,
      ior: 1.2,
      specularIntensity: 0.35,
      clearcoat: 0.12,
      clearcoatRoughness: 0.4,
      depthWrite: false,
    }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  for (const face of pipFaces) {
    const normal = new Vector3(...face.normal);
    const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal);
    const horizontal = new Vector3(1, 0, 0).applyQuaternion(rotation);
    const vertical = new Vector3(0, 1, 0).applyQuaternion(rotation);

    for (const [x, y] of face.positions) {
      const pip = new Mesh(pipGeometry, pipMaterial);
      pip.quaternion.copy(rotation);
      pip.position
        .copy(normal)
        .multiplyScalar(10.12)
        .addScaledVector(horizontal, x)
        .addScaledVector(vertical, y);
        
      mesh.add(pip);
    }
  }

  const body = new Body({
    mass: 1,
    material: physicsMaterial,
    shape: new Box(new Vec3(10, 10, 10)),
    linearDamping: 0.05,
    angularDamping: 0.07,
    allowSleep: true,
    sleepSpeedLimit: 2,
    sleepTimeLimit: 0.8,
  });

  scene.add(mesh);
  world.addBody(body);

  return { mesh, body };
}
