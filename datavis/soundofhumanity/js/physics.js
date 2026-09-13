(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory;
    else root.createParticleWorld = factory;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Matter, initialBounds, random = Math.random) {
    const { Engine, Bodies, Body, Composite, Sleeping } = Matter;
    const engine = Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
    // Preserve the previous sketch's 0.5 px/frame² gravity at 60 Hz.
    // Matter's default gravity scale uses px/ms², so this is 1800 px/s².
    engine.gravity.y = 1.8;
    let bounds = { ...initialBounds };
    let walls = [];
    let accumulator = 0;
    const particles = [];
    const step = 1000 / 240;

    function rebuildWalls() {
        walls.forEach(wall => Composite.remove(engine.world, wall));
        const thickness = 100;
        const height = bounds.bottom - bounds.top + thickness * 2;
        const options = { isStatic: true, friction: 0.8, restitution: 0.2, render: { visible: false } };
        walls = [
            Bodies.rectangle((bounds.left + bounds.right) / 2, bounds.bottom + thickness / 2,
                bounds.right - bounds.left + thickness * 2, thickness, options),
            Bodies.rectangle(bounds.left - thickness / 2, bounds.top + height / 2 - thickness,
                thickness, height, options),
            Bodies.rectangle(bounds.right + thickness / 2, bounds.top + height / 2 - thickness,
                thickness, height, options)
        ];
        Composite.add(engine.world, walls);
    }

    function add(x, y, radius, color) {
        // Use enough vertices for the collision hull to match the drawn circle.
        const body = Bodies.polygon(x, y, 32, radius, {
            restitution: 0.6, friction: 0.05, frictionStatic: 0.5,
            frictionAir: 0, slop: 0.02, sleepThreshold: 120,
            render: { fillStyle: color }
        });
        body.circleRadius = radius;
        // Start at the exact map marker, without remapping or teleporting.
        // Matter expresses velocity per 60 Hz frame: retain the old ±2 px
        // horizontal release velocity, and let contacts produce natural spin.
        Body.setVelocity(body, { x: random() * 4 - 2, y: 0 });
        Composite.add(engine.world, body);
        particles.push(body);
        return body;
    }

    function advance(milliseconds) {
        // Fixed steps keep the pile stable at different display refresh rates.
        accumulator += Math.min(Math.max(milliseconds, 0), 100);
        while (accumulator + 1e-7 >= step) {
            Engine.update(engine, step);
            accumulator = Math.max(0, accumulator - step);
        }
    }

    function resize(nextBounds, radiusScale = 1) {
        const oldBounds = bounds;
        bounds = { ...nextBounds };
        const scaleX = (bounds.right - bounds.left) / (oldBounds.right - oldBounds.left);
        const scaleY = (bounds.bottom - bounds.top) / (oldBounds.bottom - oldBounds.top);
        rebuildWalls();
        for (const body of particles) {
            const velocity = { x: body.velocity.x * scaleX, y: body.velocity.y * scaleY };
            if (radiusScale !== 1) Body.scale(body, radiusScale, radiusScale);
            const radius = body.circleRadius;
            Body.setPosition(body, {
                x: Math.max(bounds.left + radius, Math.min(bounds.right - radius,
                    bounds.left + (body.position.x - oldBounds.left) * scaleX)),
                y: Math.min(bounds.bottom - radius,
                    bounds.bottom - (oldBounds.bottom - body.position.y) * scaleY)
            });
            Body.setVelocity(body, velocity);
            Sleeping.set(body, false);
        }
        accumulator = 0;
    }

    rebuildWalls();
    return { add, advance, resize, particles, get bounds() { return { ...bounds }; } };
});
