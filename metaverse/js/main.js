// 主要的Three.js场景管理器
class MetaverseScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.player = null;
        this.interactiveObjects = [];
        this.collectibles = [];
        this.keys = {};
        this.isPointerLocked = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveSpeed = 5;
        this.jumpHeight = 8;
        this.gravity = -20;
        this.isOnGround = false;
        this.clock = new THREE.Clock();
        
        this.init();
    }

    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createLights();
        this.createEnvironment();
        this.createPlayer();
        this.createInteractiveObjects();
        this.setupControls();
        this.setupEventListeners();
        this.animate();
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // 天蓝色背景
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    }

    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);
    }

    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('three-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x87CEEB);
    }

    createLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        // 主要方向光（太阳）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        // 点光源
        const pointLight = new THREE.PointLight(0x4facfe, 1, 100);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);
    }

    createEnvironment() {
        // 地面
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x90EE90,
            transparent: true,
            opacity: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // 办公楼建筑
        this.createBuilding();
        
        // 装饰性建筑
        this.createDecorations();
        
        // 天空盒
        this.createSkybox();
    }

    createBuilding() {
        // 主建筑
        const buildingGeometry = new THREE.BoxGeometry(30, 20, 20);
        const buildingMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4A90E2,
            transparent: true,
            opacity: 0.9
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(0, 10, -30);
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);

        // 建筑标志
        const signGeometry = new THREE.PlaneGeometry(8, 3);
        const signMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(0, 25, -19);
        this.scene.add(sign);

        // 添加文字纹理到标志上
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        context.fillStyle = '#4facfe';
        context.fillRect(0, 0, 512, 128);
        context.fillStyle = '#ffffff';
        context.font = '48px Arial';
        context.textAlign = 'center';
        context.fillText('SLB 招聘中心', 256, 80);
        
        const texture = new THREE.CanvasTexture(canvas);
        sign.material.map = texture;
        sign.material.needsUpdate = true;
    }

    createDecorations() {
        // 创建多个装饰性建筑
        for (let i = 0; i < 8; i++) {
            const decorGeometry = new THREE.BoxGeometry(
                Math.random() * 5 + 3,
                Math.random() * 10 + 5,
                Math.random() * 5 + 3
            );
            const decorMaterial = new THREE.MeshLambertMaterial({ 
                color: new THREE.Color().setHSL(Math.random(), 0.5, 0.6)
            });
            const decoration = new THREE.Mesh(decorGeometry, decorMaterial);
            
            decoration.position.set(
                (Math.random() - 0.5) * 80,
                decorGeometry.parameters.height / 2,
                (Math.random() - 0.5) * 80
            );
            
            decoration.castShadow = true;
            decoration.receiveShadow = true;
            this.scene.add(decoration);
        }

        // 创建树木
        this.createTrees();
    }

    createTrees() {
        for (let i = 0; i < 15; i++) {
            const treeGroup = new THREE.Group();
            
            // 树干
            const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 4);
            const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = 2;
            trunk.castShadow = true;
            treeGroup.add(trunk);
            
            // 树叶
            const leavesGeometry = new THREE.SphereGeometry(3, 8, 6);
            const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = 6;
            leaves.castShadow = true;
            treeGroup.add(leaves);
            
            treeGroup.position.set(
                (Math.random() - 0.5) * 90,
                0,
                (Math.random() - 0.5) * 90
            );
            
            this.scene.add(treeGroup);
        }
    }

    createSkybox() {
        const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }

    createPlayer() {
        const playerGeometry = new THREE.CapsuleGeometry(1, 2, 4, 8);
        const playerMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xff4444,
            transparent: true,
            opacity: 0.8
        });
        this.player = new THREE.Mesh(playerGeometry, playerMaterial);
        this.player.position.set(0, 2, 5);
        this.player.castShadow = true;
        this.scene.add(this.player);
    }

    createInteractiveObjects() {
        // 创建可收集的信息方块
        const collectibleData = [
            { pos: [10, 2, 0], info: "公司文化", content: "SLB是一家全球领先的油田服务公司，致力于为能源行业提供创新的技术解决方案。" },
            { pos: [-10, 2, 0], info: "工作环境", content: "我们提供开放包容的工作环境，鼓励员工创新和专业发展。" },
            { pos: [0, 2, -10], info: "职业发展", content: "公司提供完善的培训体系和晋升机会，帮助员工实现职业目标。" },
            { pos: [15, 2, -15], info: "薪资福利", content: "具有竞争力的薪酬体系，完善的社会保险和福利待遇。" },
            { pos: [-15, 2, 15], info: "团队合作", content: "我们重视团队合作，提倡多元化和包容性的工作文化。" }
        ];

        collectibleData.forEach((data, index) => {
            const collectibleGeometry = new THREE.BoxGeometry(2, 2, 2);
            const collectibleMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x4facfe,
                transparent: true,
                opacity: 0.8
            });
            const collectible = new THREE.Mesh(collectibleGeometry, collectibleMaterial);
            collectible.position.set(...data.pos);
            collectible.castShadow = true;
            collectible.receiveShadow = true;
            
            // 添加浮动动画
            collectible.userData = {
                originalY: data.pos[1],
                floatOffset: Math.random() * Math.PI * 2,
                info: data.info,
                content: data.content,
                collected: false,
                id: index
            };
            
            this.scene.add(collectible);
            this.collectibles.push(collectible);
        });

        // 创建交互式展示板
        this.createInfoBoards();
    }

    createInfoBoards() {
        const boardPositions = [
            { pos: [20, 5, 0], text: "招聘信息" },
            { pos: [-20, 5, 0], text: "公司简介" },
            { pos: [0, 5, 20], text: "联系我们" }
        ];

        boardPositions.forEach((boardData, index) => {
            const boardGeometry = new THREE.PlaneGeometry(8, 6);
            const boardMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x2c3e50,
                transparent: true,
                opacity: 0.9
            });
            const board = new THREE.Mesh(boardGeometry, boardMaterial);
            board.position.set(...boardData.pos);
            board.lookAt(0, 5, 0);
            
            board.userData = {
                type: 'infoBoard',
                title: boardData.text,
                id: index
            };
            
            this.scene.add(board);
            this.interactiveObjects.push(board);
        });
    }

    setupControls() {
        // 鼠标指针锁定
        const canvas = this.renderer.domElement;
        
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === canvas;
        });

        document.addEventListener('mousemove', (event) => {
            if (this.isPointerLocked) {
                const sensitivity = 0.002;
                this.camera.rotation.y -= event.movementX * sensitivity;
                this.camera.rotation.x -= event.movementY * sensitivity;
                this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x));
            }
        });
    }

    setupEventListeners() {
        // 键盘事件
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
        });

        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });

        // 窗口大小调整
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    updatePlayer() {
        const delta = this.clock.getDelta();
        
        // 移动控制
        this.direction.set(0, 0, 0);
        
        if (this.keys['KeyW']) this.direction.z -= 1;
        if (this.keys['KeyS']) this.direction.z += 1;
        if (this.keys['KeyA']) this.direction.x -= 1;
        if (this.keys['KeyD']) this.direction.x += 1;
        
        // 标准化方向向量
        if (this.direction.length() > 0) {
            this.direction.normalize();
        }
        
        // 应用摄像机旋转到移动方向
        this.direction.applyQuaternion(this.camera.quaternion);
        this.direction.y = 0; // 保持在水平面
        
        // 更新速度
        const speed = this.keys['ShiftLeft'] ? this.moveSpeed * 2 : this.moveSpeed;
        this.velocity.x = this.direction.x * speed;
        this.velocity.z = this.direction.z * speed;
        
        // 跳跃
        if (this.keys['Space'] && this.isOnGround) {
            this.velocity.y = this.jumpHeight;
            this.isOnGround = false;
        }
        
        // 应用重力
        this.velocity.y += this.gravity * delta;
        
        // 更新位置
        this.player.position.add(this.velocity.clone().multiplyScalar(delta));
        
        // 地面碰撞检测
        if (this.player.position.y <= 2) {
            this.player.position.y = 2;
            this.velocity.y = 0;
            this.isOnGround = true;
        }
        
        // 更新摄像机位置
        this.camera.position.copy(this.player.position);
        this.camera.position.y += 1.5; // 眼睛高度
        
        // 边界检测
        const boundary = 45;
        this.player.position.x = Math.max(-boundary, Math.min(boundary, this.player.position.x));
        this.player.position.z = Math.max(-boundary, Math.min(boundary, this.player.position.z));
    }

    updateCollectibles() {
        const time = Date.now() * 0.001;
        
        this.collectibles.forEach(collectible => {
            if (!collectible.userData.collected) {
                // 浮动动画
                collectible.position.y = collectible.userData.originalY + 
                    Math.sin(time + collectible.userData.floatOffset) * 0.5;
                
                // 旋转动画
                collectible.rotation.y += 0.01;
                
                // 检查收集距离
                const distance = this.player.position.distanceTo(collectible.position);
                if (distance < 3) {
                    // 显示交互提示
                    safeCallGame('showInteractionHint', true);
                    
                    // E键收集
                    if (this.keys['KeyE']) {
                        safeCallGame('collectItem', collectible);
                    }
                } else {
                    safeCallGame('showInteractionHint', false);
                }
            }
        });
    }

    checkInteractions() {
        this.interactiveObjects.forEach(obj => {
            const distance = this.player.position.distanceTo(obj.position);
            if (distance < 5) {
                safeCallGame('showInteractionHint', true);
                
                if (this.keys['KeyE']) {
                    safeCallGame('showInfoModal', obj.userData.title, this.getInfoContent(obj.userData.title));
                }
            }
        });
    }

    getInfoContent(title) {
        const infoContent = {
            "招聘信息": `
                <h4>当前开放职位</h4>
                <ul>
                    <li>软件工程师 - 5年经验</li>
                    <li>数据分析师 - 3年经验</li>
                    <li>产品经理 - 5年经验</li>
                    <li>UI/UX设计师 - 3年经验</li>
                </ul>
                <p>更多职位信息请访问我们的招聘网站</p>
            `,
            "公司简介": `
                <h4>关于SLB</h4>
                <p>SLB是一家全球领先的油田服务公司，为能源行业提供创新的技术解决方案。</p>
                <p>我们在全球超过100个国家开展业务，拥有专业的技术团队和丰富的行业经验。</p>
                <p>加入我们，成为推动全球能源转型的一份子！</p>
            `,
            "联系我们": `
                <h4>联系方式</h4>
                <p>📧 邮箱: careers@slb.com</p>
                <p>📞 电话: 400-123-4567</p>
                <p>🌐 网站: https://careers.slb.com</p>
                <p>📍 地址: 上海市浦东新区XXX路XXX号</p>
            `
        };
        return infoContent[title] || "暂无相关信息";
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.updatePlayer();
        this.updateCollectibles();
        this.checkInteractions();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// 全局变量
let metaverse;
let game;

// 安全调用游戏方法的工具函数
function safeCallGame(methodName, ...args) {
    if (window.game && typeof window.game[methodName] === 'function') {
        try {
            return window.game[methodName](...args);
        } catch (error) {
            console.warn(`调用游戏方法 ${methodName} 失败:`, error);
            return null;
        }
    }
    return null;
}

// 检查Three.js是否加载完成
function checkThreeJSLoaded() {
    return typeof THREE !== 'undefined';
}

// 初始化函数
function initializeApp() {
    if (checkThreeJSLoaded()) {
        // 显示加载界面
        showLoadingScreen();
        
        // 模拟加载过程
        setTimeout(() => {
            hideLoadingScreen();
            
            // 检查GameManager是否已定义
            if (typeof GameManager !== 'undefined') {
                game = new GameManager();
                window.game = game; // 确保全局可用
                console.log('游戏管理器初始化成功');
            } else {
                console.error('GameManager未定义，无法初始化游戏');
            }
            
            metaverse = new MetaverseScene();
            window.metaverse = metaverse; // 确保全局可用
            console.log('元宇宙场景初始化成功');
        }, 2000);
    } else {
        // 如果Three.js还没加载完成，等待一段时间再检查
        setTimeout(initializeApp, 100);
    }
}

// 初始化 - 使用window.onload确保所有资源都加载完成
window.addEventListener('load', () => {
    initializeApp();
});

// 加载界面控制
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('progress-bar');
    const loadingText = document.querySelector('.loading-text');
    
    let progress = 0;
    const stages = [
        { progress: 20, text: '正在加载Three.js...' },
        { progress: 40, text: '正在初始化场景...' },
        { progress: 60, text: '正在创建游戏对象...' },
        { progress: 80, text: '正在加载资源...' },
        { progress: 100, text: '加载完成！' }
    ];
    
    let currentStage = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        
        // 更新加载文本
        while (currentStage < stages.length && progress >= stages[currentStage].progress) {
            loadingText.textContent = stages[currentStage].text;
            currentStage++;
        }
        
        if (progress > 100) {
            progress = 100;
            clearInterval(interval);
        }
        progressBar.style.width = progress + '%';
    }, 200);
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.display = 'none';
} 