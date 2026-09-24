// 遊戲入口：狀態機、固定步長、投放（SPEC 4.3～4.5）。
import { GAME, MAX_TIER, tierInfo } from './config.js';
import { createRng } from './rng.js';
import { createSpawner } from './spawner.js';
import { createWorld } from './world.js';
import { createMergeSystem } from './merge.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createGame(Matter, { seed = Date.now(), storage = null } = {}) {
  const rng = createRng(seed);
  const world = createWorld(Matter);
  const listeners = {};

  let spawner;
  let accumulator;
  let lastDropAt;
  let moonSeen;

  const merge = createMergeSystem(Matter, world, { onMerge: handleMerge });

  const game = {
    state: 'ready',
    paused: false,
    now: 0,
    current: 0,
    next: 0,
    aimX: GAME.WIDTH / 2,
    score: 0,
    best: 0,
    maxTier: 0,
    overTime: 0,
    world,

    fruits: () => world.fruits(),

    on(event, fn) {
      (listeners[event] ||= []).push(fn);
    },

    start() {
      if (game.state === 'ready') game.state = 'playing';
    },

    restart() {
      resetRound();
      game.state = 'playing';
    },

    pause() { game.paused = true; },
    resume() { game.paused = false; },

    moveTo(x) {
      const r = tierInfo(game.current).radius;
      game.aimX = clamp(x, r, GAME.WIDTH - r);
    },

    drop() {
      if (game.state !== 'playing' || game.paused) return null;
      if (lastDropAt !== null && game.now - lastDropAt < GAME.DROP_COOLDOWN) return null;
      const tier = game.current;
      const x = game.aimX;
      const body = world.addFruit(tier, x, GAME.DROP_Y, { bornAt: game.now });
      lastDropAt = game.now;
      game.maxTier = Math.max(game.maxTier, tier);
      game.current = spawner.next();
      game.next = spawner.peek();
      game.moveTo(game.aimX);
      emit('drop', { tier, x, y: GAME.DROP_Y });
      return body;
    },

    step(dtMs) {
      if (game.state !== 'playing' || game.paused) return;
      accumulator += Math.min(dtMs, GAME.MAX_FRAME_DT);
      while (accumulator >= GAME.TIMESTEP && game.state === 'playing') {
        accumulator -= GAME.TIMESTEP;
        substep();
      }
    },
  };

  function emit(event, payload) {
    for (const fn of listeners[event] || []) fn(payload);
  }

  function substep() {
    Matter.Engine.update(world.engine, GAME.TIMESTEP);
    merge.flush(game.now);
    limitSpeeds();
    game.now += GAME.TIMESTEP;
  }

  function handleMerge({ fromTier, toTier, x, y }) {
    const gained = tierInfo(toTier).score;
    game.score += gained;
    game.maxTier = Math.max(game.maxTier, toTier);
    emit('merge', { fromTier, toTier, x, y, gained, score: game.score });
    if (toTier === MAX_TIER && !moonSeen) {
      moonSeen = true;
      emit('moon', { x, y });
    }
  }

  function limitSpeeds() {
    for (const body of world.fruits()) {
      const { x, y } = body.velocity;
      const speed = Math.hypot(x, y);
      if (speed > GAME.MAX_SPEED) {
        const k = GAME.MAX_SPEED / speed;
        Matter.Body.setVelocity(body, { x: x * k, y: y * k });
      }
    }
  }

  function resetRound() {
    world.clear();
    spawner = createSpawner({ rng });
    game.current = spawner.next();
    game.next = spawner.peek();
    game.aimX = GAME.WIDTH / 2;
    game.now = 0;
    game.score = 0;
    game.maxTier = 0;
    game.overTime = 0;
    game.paused = false;
    accumulator = 0;
    lastDropAt = null;
    moonSeen = false;
  }

  resetRound();
  return game;
}
