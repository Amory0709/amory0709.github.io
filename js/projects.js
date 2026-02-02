const projects = [
    {
        title: "High Performance Points",
        description: "A high-performance web-based volume renderer using Angular and Three.js, capable of rendering large datasets in real-time.",
        image: "img/high_performance_points_thumb.png",
        link: "high-performance-points/index.html",
        tags: ["WebGL", "Three.js", "Angular"]
    },
    {
        title: "2024 IDPwD",
        description: "A new engaging and interactive experience designed for the International Day of Persons with Disabilities 2024.",
        image: "img/2024IDPwD.png",
        link: "https://amory0709.github.io/2024IDPwD/",
        tags: ["Interactive", "Design", "2024"]
    },
    {
        title: "Sound of Humanity",
        description: "A simulation of birth and death occurrences in the U.S. region based on 2019 population data.",
        image: "img/SoundOfHumanity.png",
        link: "datavis/soundofhumanity/index.html",
        tags: ["Data Vis", "Simulation", "D3.js"]
    },
    {
        title: "Electoral Map",
        description: "Visualizing the difference in support each party obtained from 1940-2016 across the United States.",
        image: "img/ElectionMap.png",
        link: "datavis/Electoral/index.html", // Assuming index.html exists in the folder, or just the folder path works if served correctly
        tags: ["History", "Mapping", "Analysis"]
    },
    {
        title: "BLUEbikes Availability",
        description: "Real-time analysis of BLUEbikes availability within each station in the Boston region.",
        image: "img/bluebikes.png",
        link: "datavis/BLUEbikes/index.html", // Assuming index.html exists
        tags: ["Real-time", "Urban", "Boston"]
    }
];

const projectsContainer = document.getElementById('projects-grid');

function renderProjects() {
    if (!projectsContainer) return;

    projectsContainer.innerHTML = projects.map((project, index) => {
        // Stagger animation delay
        const delay = index * 100;
        return `
            <a href="${project.link}" class="card" style="animation-delay: ${delay}ms" target="_blank">
                <div class="card-image-wrapper">
                    <img src="${project.image}" alt="${project.title}" class="card-image">
                </div>
                <div class="card-content">
                    <h3 class="card-title">${project.title}</h3>
                    <p class="card-desc">${project.description}</p>
                    <span class="card-cta">View Project</span>
                </div>
            </a>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', renderProjects);
