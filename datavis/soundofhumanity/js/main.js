(() => {
    'use strict';
    const { Simulation, eventAppearance } = SoundSimulation;
    const simulation = new Simulation();
    const container = document.getElementById('container');
    const canvas = document.getElementById('particles');
    const context = canvas.getContext('2d');
    const svg = d3.select('#viz').append('svg').attr('aria-hidden', 'true');
    const mapLayer = svg.append('g');
    const labelSvg = d3.select('#container').append('svg').attr('id', 'event-labels').attr('aria-hidden', 'true');
    const eventLayer = labelSvg.append('g');
    const projection = d3.geoAlbersUsa();
    const path = d3.geoPath().projection(projection);
    const colors = { birth: '#ffce6d', death: '#ff4b42' };
    const dialogs = Array.from(document.querySelectorAll('dialog'));
    const records = [];
    const activeEvents = [];
    const tableBody = document.getElementById('event-rows');
    const tableFilter = document.getElementById('event-filter');
    let geography;
    let places = [];
    let layout;
    let physics;
    let animationTime = 0;
    let lastFrame;
    let speed = 1;
    let ready = false;
    let audioContext;
    let soundEnabled = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function getLayout() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const compact = width < 760;
        const compositionHeight = Math.min(height, width * 737 / 1440);
        return {
            width, height, radius: compact ? 7 : Math.max(7, width / 144),
            map: compact
                ? [[width * 0.05, Math.max(380, height * 0.47)], [width * 0.95, height * 0.76]]
                : [[width * 0.209, compositionHeight * 0.058], [width * 0.752, compositionHeight * 0.673]],
            bounds: { left: compact ? 10 : width * 0.1, right: compact ? width - 10 : width * 0.94, top: 0, bottom: height * 0.92 }
        };
    }

    function resize() {
        const previous = layout;
        layout = getLayout();
        const density = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(layout.width * density);
        canvas.height = Math.round(layout.height * density);
        canvas.style.width = layout.width + 'px';
        canvas.style.height = layout.height + 'px';
        context.setTransform(density, 0, 0, density, 0, 0);
        svg.attr('width', layout.width).attr('height', layout.height);
        labelSvg.attr('width', layout.width).attr('height', layout.height);
        if (geography) {
            projection.fitExtent(layout.map, geography);
            mapLayer.selectAll('path').attr('d', path);
            positionAllLabels();
        }
        if (physics) physics.resize(layout.bounds, layout.radius / previous.radius);
        else physics = createParticleWorld(Matter, layout.bounds);
        draw();
    }

    function formatTime(seconds) {
        const value = Math.floor(seconds);
        return [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60]
            .map(part => String(part).padStart(2, '0')).join(':');
    }

    function updateCounters() {
        document.getElementById('current-population').textContent = simulation.population;
        document.getElementById('birth-count').textContent = simulation.births;
        document.getElementById('death-count').textContent = simulation.deaths;
        document.getElementById('elapsed-time').textContent = formatTime(simulation.elapsed);
    }

    function playSound(type) {
        if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        const now = audioContext.currentTime;
        const birth = type === 'birth';
        oscillator.type = birth ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(birth ? 800 : 200, now);
        oscillator.frequency.exponentialRampToValueAtTime(birth ? 1200 : 100, now + 0.15);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.07, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
        oscillator.start(now);
        oscillator.stop(now + 0.6);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }

    async function setSound(enabled) {
        if (enabled) {
            try {
                audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
                await audioContext.resume();
            } catch (_) { enabled = false; }
        }
        soundEnabled = enabled;
        document.getElementById('sound-toggle').checked = enabled;
    }

    function positionLabel(event) {
        const coords = projection(event.place.coords);
        event.x = coords[0];
        event.y = coords[1];
        const textWidth = Math.max(...event.group.selectAll('text').nodes().map(node => node.getComputedTextLength()));
        const margin = layout.radius + 3;
        const rightLimit = layout.width < 760 ? layout.width - 12 : layout.width * 0.797;
        const onLeft = event.x + margin + textWidth > rightLimit;
        event.group.attr('transform', 'translate(' + event.x + ',' + event.y + ')');
        event.group.selectAll('text')
            .attr('text-anchor', onLeft ? 'end' : 'start')
            .attr('x', onLeft ? -margin : margin);
        event.group.select('.label-text').attr('y', -layout.radius * 2);
        event.group.select('.sub-label').attr('y', -layout.radius * 0.2);
        const connector = event.group.select('line').style('display', 'none');
        const box = event.group.node().getBBox();
        const occupied = activeEvents.filter(other => other !== event && other.labelBounds)
            .map(other => other.labelBounds);
        const overlaps = (a, b) => a.left < b.right + 6 && a.right > b.left - 6 &&
            a.top < b.bottom + 6 && a.bottom > b.top - 6;
        const offsets = [0, -1, 1, -2, 2, -3, 3].map(step => step * (box.height + 8));
        let offset = 0;
        for (const candidate of offsets) {
            const bounds = {
                left: event.x + box.x, right: event.x + box.x + box.width,
                top: event.y + box.y + candidate, bottom: event.y + box.y + box.height + candidate
            };
            if (bounds.top >= 12 && bounds.bottom < layout.height * 0.85 && !occupied.some(other => overlaps(bounds, other))) {
                offset = candidate;
                break;
            }
        }
        event.labelBounds = {
            left: event.x + box.x, right: event.x + box.x + box.width,
            top: event.y + box.y + offset, bottom: event.y + box.y + box.height + offset
        };
        event.group.attr('transform', 'translate(' + event.x + ',' + (event.y + offset) + ')');
        if (offset !== 0) connector.style('display', null).attr('x1', 0).attr('y1', -offset)
            .attr('x2', onLeft ? -layout.radius : layout.radius).attr('y2', -layout.radius);
    }

    function positionAllLabels() {
        activeEvents.forEach(event => { event.labelBounds = null; });
        activeEvents.forEach(positionLabel);
    }

    function triggerEvent(record) {
        const place = places[Math.floor(Math.random() * places.length)];
        const event = { ...record, place, start: animationTime, released: false };
        records.unshift({ ...record, location: place.name });
        if (records.length > 1000) records.pop();
        event.group = eventLayer.append('g').attr('class', 'event-label');
        event.group.append('line').attr('class', 'label-connector');
        event.group.append('text').attr('class', 'label-text').attr('y', -layout.radius * 2)
            .text(event.type === 'birth' ? 'A child is born.' : 'A person passes.');
        event.group.append('text').attr('class', 'sub-label').attr('y', -layout.radius * 0.2)
            .text(place.name);
        positionLabel(event);
        activeEvents.push(event);
        playSound(event.type);
    }

    function drawCircle(x, y, radius, color, opacity = 1) {
        context.globalAlpha = opacity;
        context.fillStyle = color;
        context.beginPath();
        context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
        context.fill();
    }

    function draw() {
        if (!layout || !physics) return;
        context.clearRect(0, 0, layout.width, layout.height);
        for (const event of activeEvents) {
            const appearance = eventAppearance(animationTime - event.start);
            if (!appearance.released) {
                if (!reducedMotion.matches) drawCircle(event.x, event.y,
                    layout.radius * appearance.rippleScale, colors[event.type], appearance.rippleOpacity);
                drawCircle(event.x, event.y, layout.radius * appearance.markerScale, colors[event.type]);
            }
            event.group.style('opacity', appearance.labelOpacity);
        }
        for (const body of physics.particles) {
            drawCircle(body.position.x, body.position.y, body.circleRadius, body.render.fillStyle);
        }
        context.globalAlpha = 1;
    }

    function tick(now) {
        const dt = lastFrame === undefined ? 0 : Math.min((now - lastFrame) / 1000, 0.1);
        lastFrame = now;
        if (ready && !document.hidden && !dialogs.some(dialog => dialog.open)) {
            animationTime += dt;
            for (const record of simulation.advance(dt * speed)) triggerEvent(record);
            physics.advance(dt * 1000);
            for (let index = activeEvents.length - 1; index >= 0; index--) {
                const event = activeEvents[index];
                const appearance = eventAppearance(animationTime - event.start);
                if (appearance.released && !event.released) {
                    physics.add(event.x, event.y, layout.radius, colors[event.type]);
                    event.released = true;
                }
                if (appearance.finished) {
                    event.group.remove();
                    activeEvents.splice(index, 1);
                }
            }
            updateCounters();
            draw();
        }
        requestAnimationFrame(tick);
    }

    function renderTable() {
        const filter = tableFilter.value;
        const filtered = records.filter(record => filter === 'all' || record.type === filter);
        const fragment = document.createDocumentFragment();
        for (const record of filtered) {
            const row = document.createElement('tr');
            for (const value of [formatTime(record.time), record.type === 'birth' ? 'Birth' : 'Death', record.location, String(record.population)]) {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.appendChild(cell);
            }
            row.children[1].className = record.type;
            fragment.appendChild(row);
        }
        tableBody.replaceChildren(fragment);
        document.getElementById('table-empty').hidden = filtered.length > 0;
        document.getElementById('table-summary').textContent = simulation.births + ' births · ' + simulation.deaths + ' deaths · ' + formatTime(simulation.elapsed) + ' elapsed';
        document.getElementById('table-count').textContent = filtered.length + ' matching events · latest 1,000 retained · newest first';
    }

    for (const name of ['about', 'table']) {
        const button = document.getElementById('btn-' + name);
        const dialog = document.getElementById(name + '-dialog');
        button.addEventListener('click', () => {
            if (name === 'table') renderTable();
            dialog.showModal();
            button.setAttribute('aria-expanded', 'true');
        });
        dialog.addEventListener('close', () => {
            button.setAttribute('aria-expanded', 'false');
            lastFrame = undefined;
            button.focus();
        });
        dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
        dialog.addEventListener('keydown', event => {
            if (event.key !== 'Tab') return;
            const controls = Array.from(dialog.querySelectorAll('button, input, select, a[href], [tabindex="0"]'))
                .filter(control => !control.disabled && control.getClientRects().length);
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
        dialog.addEventListener('click', event => {
            const rect = dialog.getBoundingClientRect();
            if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right ||
                event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
        });
    }
    tableFilter.addEventListener('change', renderTable);
    document.getElementById('speed-slider').addEventListener('input', event => {
        speed = Number(event.target.value) / 100;
        document.getElementById('speed-value').textContent = event.target.value;
        event.target.setAttribute('aria-valuetext', event.target.value + ' percent');
    });
    document.getElementById('sound-toggle').addEventListener('change', event => setSound(event.target.checked));
    document.addEventListener('pointerdown', event => {
        if (event.target.id !== 'sound-toggle') setSound(true);
    }, { once: true });
    document.addEventListener('visibilitychange', () => { lastFrame = undefined; });
    new ResizeObserver(resize).observe(container);
    resize();
    requestAnimationFrame(tick);

    Promise.all([d3.json('data/counties-10m.json'), d3.json('data/states-reference.json')]).then(([us, referenceStates]) => {
        const states = topojson.feature(us, us.objects.states).features.filter(feature => Number(feature.id) < 60);
        geography = referenceStates;
        const names = new Map(states.map(feature => [String(feature.id).padStart(2, '0'), feature.properties.name]));
        mapLayer.selectAll('path').data(referenceStates.features).enter().append('path').attr('class', 'states');
        resize();
        places = topojson.feature(us, us.objects.counties).features.flatMap(feature => {
            const stateName = names.get(String(feature.id).padStart(5, '0').slice(0, 2));
            const coords = d3.geoCentroid(feature);
            return stateName && projection(coords) ? [{ name: feature.properties.name + ', ' + stateName, coords }] : [];
        });
        if (!places.length) throw new Error('No map locations available');
        ready = true;
        document.getElementById('loading-status').hidden = true;
        lastFrame = undefined;
        document.fonts.ready.then(positionAllLabels);
    }).catch(() => {
        document.getElementById('loading-status').textContent = 'The map could not be loaded. Please reload to try again.';
    });
})();
