// 同階合成：碰撞時排入佇列，Engine.update 之後統一處理（SPEC 4.6）。
import { GAME, MAX_TIER, tierInfo } from './config.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function capSpeed(vx, vy) {
  const speed = Math.hypot(vx, vy);
  if (speed <= GAME.MAX_SPEED) return { x: vx, y: vy };
  const k = GAME.MAX_SPEED / speed;
  return { x: vx * k, y: vy * k };
}

export function createMergeSystem(Matter, world, { onMerge = () => {} } = {}) {
  const queue = [];

  function collect(event) {
    for (const { bodyA: a, bodyB: b } of event.pairs) {
      if (!a.isFruit || !b.isFruit) continue;
      if (a.tier !== b.tier || a.tier >= MAX_TIER) continue;
      if (a.merging || b.merging) continue;
      a.merging = true;
      b.merging = true;
      queue.push([a, b]);
    }
  }

  Matter.Events.on(world.engine, 'collisionStart', collect);
  Matter.Events.on(world.engine, 'collisionActive', collect);

  function flush(now) {
    const pairs = queue.splice(0);
    for (const [a, b] of pairs) {
      const toTier = a.tier + 1;
      const R = tierInfo(toTier).radius;
      const x = clamp((a.position.x + b.position.x) / 2, R, GAME.WIDTH - R);
      const y = Math.min((a.position.y + b.position.y) / 2, GAME.HEIGHT - R);

      // 保留兩者的平均速度（慣性），再往上彈一下
      const velocity = capSpeed(
        (a.velocity.x + b.velocity.x) / 2,
        (a.velocity.y + b.velocity.y) / 2 - GAME.MERGE_POP,
      );

      world.removeFruit(a);
      world.removeFruit(b);
      const body = world.addFruit(toTier, x, y, { bornAt: Math.min(a.bornAt, b.bornAt) });
      Matter.Body.setVelocity(body, velocity);
      pushNeighbors(body, R);

      onMerge({ fromTier: a.tier, toTier, x, y, body, now });
    }
  }

  /** 把新物件周圍的 fruit 往外推，推力隨邊緣距離線性衰減。 */
  function pushNeighbors(center, R) {
    for (const other of world.fruits()) {
      if (other === center) continue;
      const dx = other.position.x - center.position.x;
      const dy = other.position.y - center.position.y;
      const dist = Math.hypot(dx, dy);
      const gap = dist - R - tierInfo(other.tier).radius;
      if (gap > GAME.MERGE_PUSH_RANGE) continue;
      const strength = GAME.MERGE_PUSH * (1 - Math.max(0, gap) / GAME.MERGE_PUSH_RANGE);
      const [nx, ny] = dist > 1e-9 ? [dx / dist, dy / dist] : [0, -1];
      Matter.Body.setVelocity(other, capSpeed(
        other.velocity.x + nx * strength,
        other.velocity.y + ny * strength,
      ));
    }
  }

  return { flush };
}
