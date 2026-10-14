import { MathUtils, Scene } from 'three';
import { Body, Vec3 } from 'cannon-es';
import { createDie } from './dice.js';

const MAX_DICE = 24;
const MAX_HISTORY = 5;
const ROLL_COOLDOWN = 700;
const DIE_COLOR = 0xcb171b;
const PREVIOUS_ROLL_COLOR = 0x257bb2;

const faceNormals = [
  { value: 1, normal: new Vec3(0, 0, 1) },
  { value: 2, normal: new Vec3(-1, 0, 0) },
  { value: 3, normal: new Vec3(0, 1, 0) },
  { value: 4, normal: new Vec3(0, -1, 0) },
  { value: 5, normal: new Vec3(1, 0, 0) },
  { value: 6, normal: new Vec3(0, 0, -1) },
];

function getUpValue(body) {
  let bestValue = 1;
  let highest = -Infinity;

  for (const face of faceNormals) {
    const worldNormal = body.quaternion.vmult(face.normal);

    if (worldNormal.y > highest) {
      highest = worldNormal.y;
      bestValue = face.value;
    }
  }

  return bestValue;
}

function isStuck({ body }) {
  return body.sleepState === Body.SLEEPING
    || (body.velocity.length() < 1.5 && body.angularVelocity.length() < 0.7);
}

function createButton(label, primary, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `control-button${primary ? ' control-button--primary' : ''}`;
  button.textContent = label;
  button.addEventListener('click', action);

  return button;
}

export function createGame({ scene, world, dieMaterial, tray, renderer, camera }) {
  const dice = [];
  const dicePool = [];
  const rollEntries = [];
  const rollHistory = [];
  const rollDetails = document.querySelector('#roll-details');
  const rollHistoryElement = document.querySelector('#roll-history');
  const controlActions = document.querySelector('#control-actions');
  const openLidButton = document.querySelector('#open-lid');

  let nextRollAt = 0;
  let lastRoll = null;
  let playStarted = false;
  let playControlsVisible = false;
  let throwButton = null;
  let clearButton = null;
  let nudgeButton = null;
  let preparingDice = false;

  function renderRollHistory() {
    rollHistoryElement.replaceChildren(...rollHistory.map((values) => {
      const item = document.createElement('li');
      item.textContent = `${values[0]} + ${values[1]} = ${values[0] + values[1]}`;

      return item;
    }));

    if (rollHistory.length === 0) {
      const item = document.createElement('li');
      item.textContent = 'No completed rolls';

      rollHistoryElement.append(item);
    }
  }

  function updateRollStatus() {
    if (lastRoll) {
      const firstValue = getUpValue(lastRoll[0].body);
      const secondValue = getUpValue(lastRoll[1].body);
      const settled = lastRoll.every(isStuck);

      rollDetails.textContent = settled
        ? `Result · ${firstValue} + ${secondValue} = ${firstValue + secondValue}`
        : `Settling · ${firstValue} + ${secondValue}`;
    }

    for (const entry of rollEntries) {
      if (entry.recorded || !entry.dice.every(isStuck)) continue;
      const values = entry.dice.map(({ body }) => getUpValue(body));

      rollHistory.unshift(values);
      rollHistory.length = Math.min(rollHistory.length, MAX_HISTORY);

      entry.recorded = true;

      renderRollHistory();
    }
  }

  function showPlayControls() {
    playControlsVisible = true;

    controlActions.replaceChildren(
      throwButton = createButton('Throw pair', true, roll),
      clearButton = createButton('Remove all', false, removeAll),
      nudgeButton = createButton('Nudge dice', false, nudgeStuckDice),
    );
  }

  function updatePlayControls() {
    if (!playControlsVisible) return;

    throwButton.disabled = preparingDice || !tray.isOpen() || performance.now() < nextRollAt;
    throwButton.textContent = preparingDice ? 'Preparing dice…' : 'Throw pair';

    clearButton.disabled = dice.length === 0;
    nudgeButton.disabled = !lastRoll || !lastRoll.some(isStuck);
  }

  function acquireDie() {
    const die = dicePool.pop();
    if (!die) return createDie(scene, world, dieMaterial);

    die.mesh.material.color.setHex(DIE_COLOR);
    die.mesh.position.set(0, 0, 0);
    die.mesh.quaternion.identity();
    die.body.position.set(0, 0, 0);
    die.body.quaternion.set(0, 0, 0, 1);
    die.body.velocity.set(0, 0, 0);
    die.body.angularVelocity.set(0, 0, 0);
    die.body.force.set(0, 0, 0);
    die.body.torque.set(0, 0, 0);
    die.body.wakeUp();
    die.body.aabbNeedsUpdate = true;

    scene.add(die.mesh);
    world.addBody(die.body);

    return die;
  }

  function releaseDie(die) {
    const entryIndex = rollEntries.findIndex((entry) => entry.dice.includes(die));

    if (entryIndex !== -1) rollEntries.splice(entryIndex, 1);

    scene.remove(die.mesh);
    world.removeBody(die.body);

    die.body.velocity.set(0, 0, 0);
    die.body.angularVelocity.set(0, 0, 0);
    die.body.force.set(0, 0, 0);
    die.body.torque.set(0, 0, 0);

    dicePool.push(die);
  }

  function throwPair() {
    if (!playControlsVisible || !tray.isOpen()) return;

    if (performance.now() < nextRollAt) return;

    nextRollAt = performance.now() + ROLL_COOLDOWN;

    if (dice.length >= MAX_DICE) {
      for (const die of dice.splice(0, 2)) releaseDie(die);
    }

    for (const { mesh } of dice) mesh.material.color.setHex(PREVIOUS_ROLL_COLOR);

    const first = acquireDie();
    const second = acquireDie();

    dice.push(first, second);

    lastRoll = [first, second];
    rollEntries.push({ dice: lastRoll, recorded: false });
    rollDetails.textContent = 'Rolling…';

    const sharedX = MathUtils.randFloat(-6, 6);

    first.body.position.set(
      sharedX + MathUtils.randFloat(-3, 3),
      MathUtils.randFloat(80, 86),
      50,
    );

    second.body.position.set(
      sharedX + MathUtils.randFloat(-3, 3),
      MathUtils.randFloat(80, 86),
      -50,
    );

    first.body.quaternion.setFromEuler(
      MathUtils.randFloat(-Math.PI, Math.PI),
      MathUtils.randFloat(-Math.PI, Math.PI),
      MathUtils.randFloat(-Math.PI, Math.PI),
    );

    second.body.quaternion.setFromEuler(
      MathUtils.randFloat(-Math.PI, Math.PI),
      MathUtils.randFloat(-Math.PI, Math.PI),
      MathUtils.randFloat(-Math.PI, Math.PI),
    );

    first.body.applyImpulse(
      new Vec3(0, 0, -150),
      new Vec3(
        MathUtils.randFloat(-0.5, 0.5),
        MathUtils.randFloat(-0.5, 0.5),
        MathUtils.randFloat(-0.5, 0.5),
      ),
    );

    second.body.applyImpulse(
      new Vec3(0, 0, 150),
      new Vec3(
        MathUtils.randFloat(-0.5, 0.5),
        MathUtils.randFloat(-0.5, 0.5),
        MathUtils.randFloat(-0.5, 0.5),
      ),
    );
  }

  async function prepareDice() {
    const pair = [
      createDie(scene, world, dieMaterial),
      createDie(scene, world, dieMaterial),
    ];

    const warmupScene = new Scene();

    warmupScene.environment = scene.environment;
    warmupScene.environmentIntensity = scene.environmentIntensity;

    for (const child of scene.children) {
      if (child.isLight) warmupScene.add(child.clone());
    }

    pair.forEach((die) => {
      scene.remove(die.mesh);
      world.removeBody(die.body);
      warmupScene.add(die.mesh);
    });

    try {
      await renderer.compileAsync(warmupScene, camera);

      for (const die of pair) {
        warmupScene.remove(die.mesh);
        dicePool.push(die);
      }
    } catch (error) {
      for (const die of pair) {
        warmupScene.remove(die.mesh);
        die.mesh.material.dispose();
      }

      throw error;
    }
  }

  async function roll() {
    if (preparingDice || !playControlsVisible || !tray.isOpen()) return;

    if (performance.now() < nextRollAt) return;

    if (dicePool.length < 2) {
      preparingDice = true;

      try {
        await prepareDice();
      } catch (error) {
        console.error('Could not prepare dice for the first throw.', error);

        rollDetails.textContent = 'Could not prepare dice. Try throwing again.';

        return;
      } finally {
        preparingDice = false;
      }
    }

    throwPair();
  }

  function nudgeStuckDice() {
    let nudged = 0;

    if (!lastRoll) return;

    for (const die of lastRoll) {
      if (!isStuck(die)) continue;

      die.body.wakeUp();

      die.body.applyImpulse(
        new Vec3(
          MathUtils.randFloat(-25, 25),
          14,
          MathUtils.randFloat(-25, 25),
        ),
        new Vec3(
          MathUtils.randFloat(-8, 8),
          MathUtils.randFloat(-8, 8),
          MathUtils.randFloat(-8, 8),
        ),
      );

      nudged += 1;
    }

    if (nudged > 0) {
      rollDetails.textContent = `Nudged ${nudged} stuck ${nudged === 1 ? 'die' : 'dice'}`;
    }
  }

  function removeAll() {
    for (const die of dice.splice(0)) releaseDie(die);

    lastRoll = null;

    rollDetails.textContent = 'No dice rolled yet';
  }

  function openLid() {
    playStarted = true;

    openLidButton.disabled = true;
    openLidButton.textContent = 'Opening…';

    tray.openLid();
  }

  function update() {
    if (playStarted && !playControlsVisible && tray.isOpen()) showPlayControls();

    updatePlayControls();
    updateRollStatus();

    for (const { mesh, body } of dice) {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    }
  }

  function dispose() {
    openLidButton.removeEventListener('click', openLid);
  }

  renderRollHistory();
  openLidButton.addEventListener('click', openLid);

  return { update, dispose };
}
