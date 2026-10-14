import { ContactMaterial, Material, Vec3, World } from 'cannon-es';

export function createPhysicsWorld() {
  const world = new World({
    gravity: new Vec3(0, -160, 0),
  });

  world.allowSleep = true;
  world.solver.iterations = 18;
  world.defaultContactMaterial.friction = 0.4;
  world.defaultContactMaterial.restitution = 0.16;

  const groundMaterial = new Material('ground');
  const dieMaterial = new Material('die');

  world.addContactMaterial(new ContactMaterial(groundMaterial, dieMaterial, {
    friction: 0.35,
    restitution: 0.14,
  }));

  world.addContactMaterial(new ContactMaterial(dieMaterial, dieMaterial, {
    friction: 0.4,
    restitution: 0.05,
  }));

  return { world, groundMaterial, dieMaterial };
}
