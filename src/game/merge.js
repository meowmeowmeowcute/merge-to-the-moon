// 同階合成：碰撞時排入佇列，Engine.update 之後統一處理（SPEC 4.6）。
import { GAME, MAX_TIER, tierInfo } from './config.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

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

      let vx = (a.velocity.x + b.velocity.x) / 2;
      let vy = (a.velocity.y + b.velocity.y) / 2;
      const speed = Math.hypot(vx, vy);
      if (speed > GAME.MAX_SPEED) {
        vx *= GAME.MAX_SPEED / speed;
        vy *= GAME.MAX_SPEED / speed;
      }

      world.removeFruit(a);
      world.removeFruit(b);
      const body = world.addFruit(toTier, x, y, { bornAt: Math.min(a.bornAt, b.bornAt) });
      Matter.Body.setVelocity(body, { x: vx, y: vy });

      onMerge({ fromTier: a.tier, toTier, x, y, body, now });
    }
  }

  return { flush };
}
