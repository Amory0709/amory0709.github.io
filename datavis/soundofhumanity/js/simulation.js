(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.SoundSimulation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    class Simulation {
        constructor() {
            this.elapsed = 0;
            this.births = 0;
            this.deaths = 0;
            this.startPopulation = 328731186;
        }

        get population() { return this.startPopulation + this.births - this.deaths; }

        advance(seconds) {
            const target = this.elapsed + Math.max(0, seconds);
            const events = [];
            // Preserve every scheduled event and the remainder between frames.
            for (;;) {
                const birthTime = (this.births + 1) * 8;
                const deathTime = (this.deaths + 1) * 11;
                const time = Math.min(birthTime, deathTime);
                if (time > target + 1e-8) break;
                const type = birthTime <= deathTime ? 'birth' : 'death';
                if (type === 'birth') this.births++;
                else this.deaths++;
                events.push({ type, time, id: this.births + this.deaths, population: this.population });
            }
            this.elapsed = target;
            return events;
        }
    }

    function eventAppearance(age) {
        const releaseAt = 1.8;
        const progress = Math.max(0, Math.min(1, age / releaseAt));
        return {
            markerScale: Math.min(1, age / 0.22),
            rippleScale: 1 + 3.5 * (1 - Math.pow(1 - progress, 2)),
            rippleOpacity: 0.38 * (1 - progress),
            labelOpacity: Math.min(1, age / 0.2) * Math.max(0, Math.min(1, (2.6 - age) / 0.6)),
            released: age >= releaseAt, finished: age >= 2.6
        };
    }
    return { Simulation, eventAppearance };
});
