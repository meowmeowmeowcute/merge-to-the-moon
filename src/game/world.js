// Matter engine 與容器（地板＋左右牆），以及 fruit 的建立與移除（SPEC 4.1、4.2）。
import { GAME, tierInfo } from './config.js';

const CIRCLE_MAX_SIDES = 48;

export function createWorld(Matter) {
  const { Engine, Bodies, Composite } = Matter;
  const engine = Engine.create();
  engine.gravity.y = GAME.GRAVITY_Y;
  // 堆疊較穩、重疊較少
  engine.positionIterations = 10;
  engine.velocityIterations = 8;

  const { WIDTH: W, HEIGHT: H, WALL_THICKNESS: T } = GAME;
  const wallHeight = H * 2 + T;
  const wallCenterY = H + T - wallHeight / 2; // 底部對齊地板底部，頂端遠高於畫面
  const statics = [
    Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, { isStatic: true, label: 'floor' }),
    Bodies.rectangle(-T / 2, wallCenterY, T, wallHeight, { isStatic: true, label: 'wall-left' }),
    Bodies.rectangle(W + T / 2, wallCenterY, T, wallHeight, { isStatic: true, label: 'wall-right' }),
  ];
  Composite.add(engine.world, statics);

  const fruitSet = new Set();

  function addFruit(tier, x, y, { bornAt = 0 } = {}) {
    // Matter 的圓是正多邊形；提高邊數上限讓大物件的碰撞外形更貼近真圓
    const body = Bodies.circle(x, y, tierInfo(tier).radius, {
      restitution: GAME.RESTITUTION,
      friction: GAME.FRICTION,
      label: 'fruit',
    }, CIRCLE_MAX_SIDES);
    body.isFruit = true;
    body.tier = tier;
    body.bornAt = bornAt;
    body.merging = false;
    Composite.add(engine.world, body);
    fruitSet.add(body);
    return body;
  }

  function removeFruit(body) {
    if (!fruitSet.delete(body)) return;
    Composite.remove(engine.world, body);
  }

  return {
    engine,
    addFruit,
    removeFruit,
    fruits: () => [...fruitSet],
    clear() {
      for (const body of fruitSet) Composite.remove(engine.world, body);
      fruitSet.clear();
    },
  };
}
