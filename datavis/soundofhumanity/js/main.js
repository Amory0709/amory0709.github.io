// Configuration
const CONFIG = {
    birthRate: 8.0, // seconds per birth
    deathRate: 11.0, // seconds per death
    baseSpeed: 1.0,
    startPopulation: 328731186,
    startDate: new Date("2020-04-08T00:00:00")
};

let state = {
    population: CONFIG.startPopulation,
    births: 0,
    deaths: 0,
    elapsedTime: 0, // seconds
    speedMultiplier: 1.0,
    isPlaying: true
};

// State Centers
const US_STATES_COORDS = [
    { name: "Alabama", lat: 32.806671, lon: -86.791130 },
    { name: "Alaska", lat: 61.370716, lon: -152.404419 },
    { name: "Arizona", lat: 33.729759, lon: -111.431221 },
    { name: "Arkansas", lat: 34.969704, lon: -92.373123 },
    { name: "California", lat: 36.116203, lon: -119.681564 },
    { name: "Colorado", lat: 39.059811, lon: -105.311104 },
    { name: "Connecticut", lat: 41.597782, lon: -72.755371 },
    { name: "Delaware", lat: 39.318523, lon: -75.507141 },
    { name: "Florida", lat: 27.766279, lon: -81.686783 },
    { name: "Georgia", lat: 33.040619, lon: -83.643074 },
    { name: "Hawaii", lat: 21.094318, lon: -157.498337 },
    { name: "Idaho", lat: 44.240459, lon: -114.478828 },
    { name: "Illinois", lat: 40.349457, lon: -88.986137 },
    { name: "Indiana", lat: 39.849426, lon: -86.258278 },
    { name: "Iowa", lat: 42.011539, lon: -93.210526 },
    { name: "Kansas", lat: 38.526600, lon: -96.726486 },
    { name: "Kentucky", lat: 37.668140, lon: -84.670067 },
    { name: "Louisiana", lat: 31.169546, lon: -91.867805 },
    { name: "Maine", lat: 44.693947, lon: -69.381927 },
    { name: "Maryland", lat: 39.063946, lon: -76.802101 },
    { name: "Massachusetts", lat: 42.230171, lon: -71.530106 },
    { name: "Michigan", lat: 43.326618, lon: -84.536095 },
    { name: "Minnesota", lat: 45.694454, lon: -93.900192 },
    { name: "Mississippi", lat: 32.741646, lon: -89.678696 },
    { name: "Missouri", lat: 38.456085, lon: -92.288368 },
    { name: "Montana", lat: 46.921925, lon: -110.454353 },
    { name: "Nebraska", lat: 41.125370, lon: -98.268082 },
    { name: "Nevada", lat: 38.313515, lon: -117.055374 },
    { name: "New Hampshire", lat: 43.452492, lon: -71.563896 },
    { name: "New Jersey", lat: 40.298904, lon: -74.521011 },
    { name: "New Mexico", lat: 34.840515, lon: -106.248482 },
    { name: "New York", lat: 42.165726, lon: -74.948051 },
    { name: "North Carolina", lat: 35.630066, lon: -79.806419 },
    { name: "North Dakota", lat: 47.528912, lon: -99.784012 },
    { name: "Ohio", lat: 40.388783, lon: -82.764915 },
    { name: "Oklahoma", lat: 35.565342, lon: -96.928917 },
    { name: "Oregon", lat: 44.572021, lon: -122.070938 },
    { name: "Pennsylvania", lat: 40.590752, lon: -77.209755 },
    { name: "Rhode Island", lat: 41.680893, lon: -71.511780 },
    { name: "South Carolina", lat: 33.856892, lon: -80.945007 },
    { name: "South Dakota", lat: 44.299782, lon: -99.438828 },
    { name: "Tennessee", lat: 35.747845, lon: -86.692345 },
    { name: "Texas", lat: 31.054487, lon: -97.563461 },
    { name: "Utah", lat: 40.150032, lon: -111.862434 },
    { name: "Vermont", lat: 44.045876, lon: -72.710686 },
    { name: "Virginia", lat: 37.769337, lon: -78.169968 },
    { name: "Washington", lat: 47.400902, lon: -121.490494 },
    { name: "West Virginia", lat: 38.491226, lon: -80.954453 },
    { name: "Wisconsin", lat: 44.268543, lon: -89.616508 },
    { name: "Wyoming", lat: 42.755966, lon: -107.302490 }
];

// --------------------------------------------------------------------------
// P5.js Particle System (Physics & Visuals)
// --------------------------------------------------------------------------
let particleSystem;

const p5Sketch = (p) => {
    let particles = [];
    const gravity = 0.5;
    const bounceFactor = -0.55;
    // Box containment layout (recomputed in resize / each frame).
    //
    // Box is a TALL VERTICAL COLUMN at the bottom-center of the
    // canvas where particles accumulate. The user (2026-07-01)
    // asked for "a vertical-axis box boundary after falling" —
    // the visual model is a container you can see particles stack
    // up inside, not a wide catcher tray along the bottom.
    //
    // The box's tall+narrow shape is what makes particles pile
    // vertically: a wide box just lays them out in a row on the
    // floor (the previous bug). Width = 320px is narrow enough
    // that 4-5 particles span the floor horizontally, forcing
    // the 6th+ to stack on top.
    //
    // State x is mapped to box x so the geographic spread is
    // preserved in the pile: events from Maine land on the right
    // side of the box, Alaska on the left.
    const BOX_WIDTH = 320;
    const BOX_BOTTOM_OFFSET = 50;     // box bottom this many px from canvas bottom
    const BOX_HEIGHT = 480;           // vertical extent of the box
    const FLOOR_FRICTION = 0.92;      // horizontal velocity decay on floor contact
    const PARTICLE_R = 8;             // matches addParticle below

    let floorY = 0;
    let boxTop = 0;
    let boxLeft = 0;
    let boxRight = 0;

    function recomputeBox() {
        floorY = p.height - BOX_BOTTOM_OFFSET;
        boxTop = floorY - BOX_HEIGHT;
        // Center the box horizontally so the visual focus is
        // straight down the middle of the screen (under the map).
        boxLeft = (p.width - BOX_WIDTH) / 2;
        boxRight = boxLeft + BOX_WIDTH;
    }

    p.setup = () => {
        let canvas = p.createCanvas(window.innerWidth, window.innerHeight);
        canvas.parent('p5-container');
        p.clear(); // Transparent background
        recomputeBox();
    };

    p.draw = () => {
        // Cheap (constant time) — keeps the box responsive to
        // resize without needing a separate resize listener chain.
        recomputeBox();
        p.clear();

        // Draw box outline so the user can SEE the containment.
        // Faint white stroke — present but not visually loud. Without
        // this, the box physics work invisibly and the user wonders
        // why particles pile up at the bottom (bug report
        // 2026-07-01: "after falling, should have a vertical box
        // boundary, currently only the bottom boundary exists").
        p.push();
        p.noFill();
        p.stroke(255, 255, 255, 80);
        p.strokeWeight(1);
        p.rect(boxLeft, boxTop, boxRight - boxLeft, BOX_HEIGHT);
        p.pop();

        p.noStroke();

        for (let i = particles.length - 1; i >= 0; i--) {
            let part = particles[i];

            // Physics: gravity then integrate position.
            part.vy += gravity;
            part.x += part.vx;
            part.y += part.vy;

            // === Box containment ===
            // Floor: position-correct + bounce + friction.
            if (part.y + part.r >= floorY) {
                part.y = floorY - part.r;
                part.vy *= bounceFactor;
                part.vx *= FLOOR_FRICTION;
            }

            // Left/right walls only enforce when the particle is
            // WITHIN the box vertically. Above the box (during the
            // free-fall from spawn point) the particle can travel
            // horizontally to land at its proportional x. Once
            // inside the box, walls clamp position so particles
            // pile up vertically instead of spreading along the
            // floor.
            if (part.y > boxTop - part.r) {
                if (part.x - part.r < boxLeft) {
                    part.x = boxLeft + part.r;
                    if (part.vx < 0) part.vx = -part.vx * 0.5;
                } else if (part.x + part.r > boxRight) {
                    part.x = boxRight - part.r;
                    if (part.vx > 0) part.vx = -part.vx * 0.5;
                }
            }

            // Particle-particle collision (O(N^2), N is capped at
            // 200 — fast enough). Use squared distance for the
            // first check to skip sqrt. Position correction is
            // split 50/50 to keep momentum exchange symmetric;
            // velocity exchange uses the relative normal velocity
            // so particles don't gain energy from overlap.
            for (let j = i - 1; j >= 0; j--) {
                let other = particles[j];
                let dx = other.x - part.x;
                let dy = other.y - part.y;
                let minDist = part.r + other.r;
                let distSq = dx * dx + dy * dy;

                if (distSq < minDist * minDist && distSq > 1e-6) {
                    let dist = Math.sqrt(distSq);
                    let overlap = minDist - dist;
                    let nx = dx / dist;
                    let ny = dy / dist;

                    // Position correction (push apart).
                    let push = overlap * 0.5;
                    part.x -= nx * push;
                    part.y -= ny * push;
                    other.x += nx * push;
                    other.y += ny * push;

                    // Velocity exchange along normal (elastic, but
                    // with restitution < 1 so collisions settle).
                    let relVx = other.vx - part.vx;
                    let relVy = other.vy - part.vy;
                    let sep = relVx * nx + relVy * ny;
                    if (sep < 0) {
                        let restitution = 0.4;
                        let impulse = sep * (1 + restitution) * 0.5;
                        part.vx += impulse * nx;
                        part.vy += impulse * ny;
                        other.vx -= impulse * nx;
                        other.vy -= impulse * ny;
                    }
                }
            }

            // Draw
            p.fill(part.color);
            p.circle(part.x, part.y, part.r * 2);

            // Settled marker (kept for potential future use — no
            // visible UI reads it today, but cheaper to compute
            // than re-derive later).
            if (
                Math.abs(part.vy) < 0.05 &&
                Math.abs(part.vx) < 0.05 &&
                part.y > floorY - part.r - 2
            ) {
                part.isSettled = true;
            }
        }

        // Limit number of particles for performance.
        if (particles.length > 200) {
            particles.shift();
        }
    };

    p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        recomputeBox();
    };

    // External hook to add particle. The (x, y) arg is the
    // state-projected map coordinate passed by triggerEvent. We
    // ignore its y and remap x into the box's horizontal range
    // so particles pile up in proportion to their geographic
    // location (East-coast events on the right, West-coast on
    // the left). Spawning at the TOP of the box gives a clean
    // "falls into the container" visual.
    p.addParticle = (x, _y, type) => {
        // Clamp into box range with a small margin so the
        // particle spawns clearly inside the walls.
        const margin = PARTICLE_R + 2;
        const boxX = p.constrain(x, boxLeft + margin, boxRight - margin);
        const boxY = boxTop + margin;

        particles.push({
            x: boxX + p.random(-2, 2),
            y: boxY,
            vx: p.random(-0.4, 0.4),
            vy: 0,
            r: PARTICLE_R,
            color: type === 'birth' ? '#FDD835' : '#E53935',
            isSettled: false,
        });
    };
};

particleSystem = new p5(p5Sketch);


// --------------------------------------------------------------------------
// Audio System
// --------------------------------------------------------------------------
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'birth') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
    }
}

// --------------------------------------------------------------------------
// D3 Map & Simulation Logic
// --------------------------------------------------------------------------
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#viz")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale(1200);

const path = d3.geoPath().projection(projection);

d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(function (us) {
    // Draw Map
    svg.append("g")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("d", path)
        .attr("class", "states");

    // Start Simulation
    startSimulation();
});

function getRandomState() {
    return US_STATES_COORDS[Math.floor(Math.random() * US_STATES_COORDS.length)];
}

function triggerEvent(type) {
    const loc = getRandomState();
    if (!loc) return;

    // Update Stats
    if (type === 'birth') {
        state.births++;
        state.population++;
        document.getElementById('birth-count').innerText = state.births;
    } else {
        state.deaths++;
        state.population--;
        document.getElementById('death-count').innerText = state.deaths;
    }

    document.getElementById('current-population').innerText = state.population;

    if (state.isPlaying) playSound(type);

    // Visual Effect (D3 Pop)
    const coords = projection([loc.lon, loc.lat]);
    if (!coords) return;

    const color = type === 'birth' ? '#FDD835' : '#E53935';

    // Map Ripple Effect
    const circle = svg.append("circle")
        .attr("cx", coords[0])
        .attr("cy", coords[1])
        .attr("r", 0)
        .attr("fill", color)
        .attr("class", "event-circle");

    circle.transition()
        .duration(500)
        .attr("r", 8)
        .on("end", function () {
            // Once max size reached, remove D3 circle and spawn physics particle
            d3.select(this).remove();

            // --- P5.js Falling Particle ---
            if (particleSystem && particleSystem.addParticle) {
                particleSystem.addParticle(coords[0], coords[1], type);
            }
        });

    // Ripple Effect (Water Ripple) - Applies to both Birth and Death
    const ripple = svg.append("circle")
        .attr("cx", coords[0])
        .attr("cy", coords[1])
        .attr("r", 8)
        .attr("stroke", color)
        .attr("class", "event-ripple");

    ripple.transition()
        .duration(1500)
        .attr("r", 30)
        .style("opacity", 0)
        .remove();

    /* 
if (type === 'death') {
     // Death logic was here, now unified.
} 
*/

    // Text Label
    const textGroup = svg.append("g")
        .attr("transform", `translate(${coords[0]}, ${coords[1]})`);

    textGroup.append("text")
        .text(type === 'birth' ? "A child is born." : "A person passes.")
        .attr("x", 15)
        .attr("y", -5)
        .attr("class", "label-text");

    textGroup.append("text")
        .text(`${loc.name}`)
        .attr("x", 15)
        .attr("y", 10)
        .attr("class", "sub-label");

    textGroup.style("opacity", 0)
        .transition()
        .duration(500)
        .style("opacity", 1)
        .transition()
        .delay(1500)
        .duration(500)
        .style("opacity", 0)
        .remove();
}

// Simulation Loop
let lastBirthTime = 0;
let lastDeathTime = 0;
let lastTick = performance.now();

function startSimulation() {
    function tick(now) {
        if (!state.isPlaying) {
            requestAnimationFrame(tick);
            return;
        }

        const delta = (now - lastTick) / 1000; // seconds
        lastTick = now;

        const timeStep = delta * state.speedMultiplier;
        state.elapsedTime += timeStep;

        // Update Clocks
        const currentDate = new Date(CONFIG.startDate.getTime() + state.elapsedTime * 1000);
        document.getElementById('elapsed-time').innerText = new Date(state.elapsedTime * 1000).toISOString().substr(11, 8);
        document.getElementById('current-date').innerHTML = currentDate.toDateString() + "<br>" + currentDate.toTimeString().split(' ')[0];

        // Check for Events
        lastBirthTime += timeStep;
        lastDeathTime += timeStep;

        if (lastBirthTime >= CONFIG.birthRate) {
            triggerEvent('birth');
            lastBirthTime = 0;
        }

        if (lastDeathTime >= CONFIG.deathRate) {
            triggerEvent('death');
            lastDeathTime = 0;
        }

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

// Listeners
document.getElementById('speed-slider').addEventListener('input', (e) => {
    state.speedMultiplier = e.target.value / 100;
    document.getElementById('speed-label').innerText = e.target.value + '%';
});

document.body.addEventListener('click', () => {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}, { once: true });
