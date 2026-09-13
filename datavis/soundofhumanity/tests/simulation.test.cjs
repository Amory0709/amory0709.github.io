const test = require('node:test');
const assert = require('node:assert/strict');
const Matter = require('../vendor/matter.min.js');
const createParticleWorld = require('../js/physics.js');
const { Simulation, eventAppearance } = require('../js/simulation.js');

const bounds = { left: 100, right: 700, top: 0, bottom: 650 };
function settle(world, seconds, fps = 60) {
    for (let frame = 0; frame < seconds * fps; frame++) world.advance(1000 / fps);
}
function seededRandom(seed = 2026) {
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}

test('births, deaths, table records and population stay consistent at 500% speed', () => {
    const simulation = new Simulation();
    const events = [];
    for (let frame = 0; frame < 120 * 60; frame++) events.push(...simulation.advance(5 / 60));
    assert.equal(simulation.births, 75);
    assert.equal(simulation.deaths, 54);
    assert.equal(events.length, 129);
    assert.equal(simulation.population, 328731207);
    assert.equal(events.at(-1).population, simulation.population);
    assert.ok(events.every((event, index) => index === 0 || event.time >= events[index - 1].time));
});

test('large and small simulation steps preserve all events, including simultaneous events', () => {
    const simulation = new Simulation();
    const events = simulation.advance(88);
    assert.equal(events.length, 19);
    assert.deepEqual(events.slice(-2).map(event => [event.time, event.type]), [[88, 'birth'], [88, 'death']]);
    assert.equal(simulation.advance(0).length, 0);
    assert.equal(simulation.elapsed, 88);
});

test('the filled ripple expands and fades before the marker is released into gravity', () => {
    const early = eventAppearance(0.3);
    const late = eventAppearance(1.5);
    assert.ok(late.rippleScale > early.rippleScale);
    assert.ok(late.rippleOpacity < early.rippleOpacity);
    assert.equal(late.released, false);
    assert.equal(eventAppearance(1.8).released, true);
    assert.equal(eventAppearance(1.8).rippleOpacity, 0);
    assert.ok(eventAppearance(1.8).labelOpacity > 0);
    assert.equal(eventAppearance(2.6).finished, true);
});

test('release preserves the map origin, then falls and is caught by the invisible floor', () => {
    const world = createParticleWorld(Matter, bounds, seededRandom());
    const body = world.add(420, 200, 10, '#ffce6d');
    assert.deepEqual(body.position, { x: 420, y: 200 });
    settle(world, 1);
    assert.ok(body.position.y > 200);
    settle(world, 15);
    assert.ok(Math.abs(body.position.y - 640) < 1);
    assert.ok(body.isSleeping);
});

test('free fall retains the old gravity and horizontal drift without air braking', () => {
    for (const direction of [-1, 1]) {
        const world = createParticleWorld(Matter, { ...bounds, bottom: 2000 }, () => direction < 0 ? 0.125 : 0.875);
        const body = world.add(400, 200, 10, '#ffce6d');
        settle(world, 0.25, 120);
        const firstVelocity = body.velocity.y;
        settle(world, 0.25, 120);
        // The old 60 Hz sketch used ±2 px/frame and 0.5 px/frame².
        assert.ok(Math.abs(body.position.x - (400 + direction * 90 * 0.5)) < 0.1);
        assert.ok(Math.abs(body.position.y - (200 + 0.5 * 1800 * 0.5 ** 2)) < 3);
        assert.ok(Math.abs(body.velocity.y - firstVelocity * 2) < 0.01);
        assert.ok(Math.abs(body.velocity.x - direction * 1.5) < 0.01);
    }
});

test('the first floor bounce retains about 60 percent of the impact velocity', () => {
    const world = createParticleWorld(Matter, bounds, () => 0.5);
    const body = world.add(400, 200, 10, '#ffce6d');
    let impactTime;
    let apex = 640;
    for (let frame = 1; frame <= 360; frame++) {
        const incomingVelocity = body.velocity.y;
        world.advance(1000 / 240);
        if (impactTime === undefined && body.velocity.y < 0) {
            impactTime = frame / 240;
            assert.ok(Math.abs(-body.velocity.y / incomingVelocity - 0.6) < 0.03);
        }
        if (impactTime !== undefined) apex = Math.min(apex, body.position.y);
    }
    assert.ok(impactTime > 0.68 && impactTime < 0.72);
    assert.ok((640 - apex) / 440 > 0.33 && (640 - apex) / 440 < 0.38);
});

test('an off-centre impact wakes a resting ball and lets both balls roll apart', () => {
    const world = createParticleWorld(Matter, bounds, () => 0.5);
    const lower = world.add(400, 640, 10, '#ffce6d');
    settle(world, 3);
    assert.ok(lower.isSleeping);
    const upper = world.add(406, 200, 10, '#ff4b42');
    settle(world, 1.1);
    assert.ok(!lower.isSleeping);
    assert.ok(lower.position.x < 380 && upper.position.x > 426);
    assert.ok(Math.abs(lower.angularVelocity) > 0.001);
    assert.ok(Math.abs(upper.angularVelocity) > 0.001);
});

test('120 particles form a stable multi-layer pile without escaping, flattening or disappearing', () => {
    const world = createParticleWorld(Matter, bounds, seededRandom());
    for (let index = 0; index < 120; index++) {
        world.add(220 + (index * 37 % 350), 120, 10, '#ffce6d');
        settle(world, 0.15);
    }
    settle(world, 25);
    assert.equal(world.particles.length, 120);
    assert.ok(world.particles.filter(body => body.position.y < 610).length > 20, 'balls support multiple layers');
    for (const body of world.particles) {
        assert.ok(body.position.x >= bounds.left + 9 && body.position.x <= bounds.right - 9);
        assert.ok(body.position.y <= bounds.bottom - 9);
    }
    let minimumSeparation = Infinity;
    world.particles.forEach((a, index) => {
        for (const b of world.particles.slice(index + 1)) {
            minimumSeparation = Math.min(minimumSeparation, Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y));
        }
    });
    assert.ok(minimumSeparation > 19, 'particles do not collapse into one another');
    const positions = world.particles.map(body => ({ ...body.position }));
    settle(world, 10);
    assert.ok(world.particles.every((body, index) => Math.hypot(body.position.x - positions[index].x, body.position.y - positions[index].y) < 1), 'pile stays at rest');
});

test('resizing retains the pile and updates all three invisible boundaries', () => {
    const world = createParticleWorld(Matter, bounds, seededRandom());
    for (let index = 0; index < 30; index++) world.add(150 + (index % 10) * 40, 150 + Math.floor(index / 10) * 25, 10, '#ff4b42');
    settle(world, 20);
    const small = { left: 20, right: 370, top: 0, bottom: 750 };
    world.resize(small, 0.8);
    settle(world, 20);
    assert.equal(world.particles.length, 30);
    for (const body of world.particles) {
        assert.equal(body.circleRadius, 8);
        assert.ok(body.position.x > small.left && body.position.x < small.right);
        assert.ok(body.position.y <= small.bottom - 7);
    }
});

test('resizing during free fall preserves the direction and scaled velocity', () => {
    const world = createParticleWorld(Matter, bounds, () => 0.875);
    const body = world.add(400, 100, 10, '#ffce6d');
    settle(world, 0.25, 120);
    const velocity = { ...body.velocity };
    world.resize({ left: 20, right: 370, top: 0, bottom: 750 }, 0.8);
    assert.ok(Math.abs(body.velocity.x - velocity.x * 350 / 600) < 0.01);
    assert.ok(Math.abs(body.velocity.y - velocity.y * 750 / 650) < 0.01);
});

test('60 Hz and 120 Hz displays follow the same flight, bounce and settling path', () => {
    const a = createParticleWorld(Matter, bounds, () => 0.875);
    const b = createParticleWorld(Matter, bounds, () => 0.875);
    a.add(300, 100, 10, 'yellow');
    b.add(300, 100, 10, 'yellow');
    for (let frame = 0; frame < 12 * 60; frame++) {
        a.advance(1000 / 60);
        b.advance(1000 / 120);
        b.advance(1000 / 120);
        assert.ok(Math.hypot(a.particles[0].position.x - b.particles[0].position.x,
            a.particles[0].position.y - b.particles[0].position.y) < 0.1);
    }
});
