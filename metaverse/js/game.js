// 游戏管理器
class GameManager {
    constructor() {
        this.score = 0;
        this.collectedItems = 0;
        this.totalItems = 5;
        this.gameStartTime = null;
        this.gameTimer = null;
        this.gameStarted = false;
        this.gameCompleted = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showWelcomePanel();
        this.updateUI();
    }

    setupEventListeners() {
        // 开始游戏按钮
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startGame();
        });

        // 重新开始按钮
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartGame();
        });

        // 申请职位按钮
        document.getElementById('apply-btn').addEventListener('click', () => {
            window.open('https://careers.slb.com/job-listing', '_blank');
        });

        // 模态框关闭
        document.querySelector('.close').addEventListener('click', () => {
            this.hideInfoModal();
        });

        // 点击模态框外部关闭
        document.getElementById('info-modal').addEventListener('click', (event) => {
            if (event.target === document.getElementById('info-modal')) {
                this.hideInfoModal();
            }
        });

        // 控制说明切换
        document.getElementById('controls-toggle').addEventListener('click', () => {
            this.toggleControlsHelp();
        });

        // ESC键关闭模态框
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Escape') {
                this.hideInfoModal();
            }
        });
    }

    showWelcomePanel() {
        document.getElementById('welcome-panel').style.display = 'block';
        document.getElementById('game-info').style.display = 'none';
    }

    startGame() {
        this.gameStarted = true;
        this.gameStartTime = Date.now();
        
        // 隐藏欢迎面板，显示游戏信息
        document.getElementById('welcome-panel').style.display = 'none';
        document.getElementById('game-info').style.display = 'block';
        
        // 启动计时器
        this.startTimer();
        
        // 显示游戏提示
        this.showGameHint();
    }

    startTimer() {
        this.gameTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            document.getElementById('timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    showGameHint() {
        // 显示游戏提示信息
        const hint = document.createElement('div');
        hint.className = 'game-hint';
        hint.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: rgba(0,0,0,0.8); padding: 20px; border-radius: 10px; 
                        color: white; text-align: center; z-index: 2000;">
                <h3>游戏目标</h3>
                <p>收集所有5个蓝色信息方块</p>
                <p>探索公司信息展示板</p>
                <p>点击任意处开始游戏</p>
            </div>
        `;
        
        document.body.appendChild(hint);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            hint.remove();
        }, 3000);
        
        // 点击隐藏
        hint.addEventListener('click', () => {
            hint.remove();
        });
    }

    collectItem(collectible) {
        if (collectible.userData.collected) return;
        
        collectible.userData.collected = true;
        this.collectedItems++;
        this.score += 100;
        
        // 收集动画效果
        this.playCollectAnimation(collectible);
        
        // 显示收集信息
        this.showCollectedInfo(collectible.userData.info, collectible.userData.content);
        
        // 更新UI
        this.updateUI();
        
        // 检查游戏是否完成
        if (this.collectedItems >= this.totalItems) {
            this.completeGame();
        }
        
        // 播放收集音效（模拟）
        this.playCollectSound();
    }

    playCollectAnimation(collectible) {
        // 创建收集粒子效果
        const particles = [];
        for (let i = 0; i < 10; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x4facfe,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(collectible.position);
            
            // 随机速度
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 5,
                (Math.random() - 0.5) * 5
            );
            
            metaverse.scene.add(particle);
            particles.push(particle);
        }
        
        // 动画粒子
        const animateParticles = () => {
            particles.forEach((particle, index) => {
                particle.position.add(particle.velocity.clone().multiplyScalar(0.05));
                particle.velocity.y -= 0.1; // 重力
                particle.material.opacity -= 0.02;
                
                if (particle.material.opacity <= 0) {
                    metaverse.scene.remove(particle);
                    particles.splice(index, 1);
                }
            });
            
            if (particles.length > 0) {
                requestAnimationFrame(animateParticles);
            }
        };
        
        animateParticles();
        
        // 隐藏原始收集品
        collectible.visible = false;
    }

    showCollectedInfo(title, content) {
        const infoPopup = document.createElement('div');
        infoPopup.className = 'collection-popup';
        infoPopup.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; 
                        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); 
                        color: white; padding: 15px; border-radius: 10px; 
                        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                        z-index: 1500; max-width: 300px;">
                <h4 style="margin: 0 0 10px 0;">✨ 收集成功！</h4>
                <h5 style="margin: 0 0 5px 0;">${title}</h5>
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">${content}</p>
            </div>
        `;
        
        document.body.appendChild(infoPopup);
        
        // 3秒后自动移除
        setTimeout(() => {
            infoPopup.remove();
        }, 3000);
    }

    playCollectSound() {
        // 使用Web Audio API创建收集音效
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('音效播放失败:', e);
        }
    }

    showInfoModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('info-modal').style.display = 'flex';
    }

    hideInfoModal() {
        document.getElementById('info-modal').style.display = 'none';
    }

    showInteractionHint(show) {
        const hint = document.getElementById('interaction-hint');
        hint.style.display = show ? 'block' : 'none';
    }

    toggleControlsHelp() {
        const content = document.getElementById('controls-content');
        const isVisible = content.style.display === 'block';
        content.style.display = isVisible ? 'none' : 'block';
    }

    updateUI() {
        document.getElementById('collection-progress').textContent = 
            `${this.collectedItems}/${this.totalItems}`;
        document.getElementById('score').textContent = this.score;
    }

    completeGame() {
        if (this.gameCompleted) return;
        
        this.gameCompleted = true;
        clearInterval(this.gameTimer);
        
        // 计算最终分数
        const timeBonus = Math.max(0, 300 - Math.floor((Date.now() - this.gameStartTime) / 1000));
        this.score += timeBonus;
        
        // 显示完成面板
        document.getElementById('final-score-value').textContent = this.score;
        document.getElementById('completion-panel').style.display = 'block';
        
        // 创建庆祝动画
        this.playCompletionAnimation();
        
        // 播放完成音效
        this.playCompletionSound();
    }

    playCompletionAnimation() {
        // 创建彩带效果
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xffeaa7];
        const confetti = [];
        
        for (let i = 0; i < 50; i++) {
            const geometry = new THREE.PlaneGeometry(0.5, 0.5);
            const material = new THREE.MeshBasicMaterial({ 
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 0.8
            });
            const piece = new THREE.Mesh(geometry, material);
            
            piece.position.set(
                (Math.random() - 0.5) * 20,
                20,
                (Math.random() - 0.5) * 20
            );
            
            piece.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            );
            
            piece.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            metaverse.scene.add(piece);
            confetti.push(piece);
        }
        
        // 动画彩带
        const animateConfetti = () => {
            confetti.forEach((piece, index) => {
                piece.position.add(piece.velocity.clone().multiplyScalar(0.1));
                piece.velocity.y -= 0.05; // 重力
                piece.rotation.x += 0.1;
                piece.rotation.y += 0.1;
                piece.material.opacity -= 0.005;
                
                if (piece.material.opacity <= 0 || piece.position.y < -10) {
                    metaverse.scene.remove(piece);
                    confetti.splice(index, 1);
                }
            });
            
            if (confetti.length > 0) {
                requestAnimationFrame(animateConfetti);
            }
        };
        
        animateConfetti();
    }

    playCompletionSound() {
        // 播放胜利音效
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            
            notes.forEach((frequency, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + index * 0.2);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + index * 0.2);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.2 + 0.3);
                
                oscillator.start(audioContext.currentTime + index * 0.2);
                oscillator.stop(audioContext.currentTime + index * 0.2 + 0.3);
            });
        } catch (e) {
            console.log('音效播放失败:', e);
        }
    }

    restartGame() {
        // 重置游戏状态
        this.score = 0;
        this.collectedItems = 0;
        this.gameStarted = false;
        this.gameCompleted = false;
        
        // 重置UI
        document.getElementById('completion-panel').style.display = 'none';
        document.getElementById('game-info').style.display = 'none';
        
        // 重置收集品
        metaverse.collectibles.forEach(collectible => {
            collectible.userData.collected = false;
            collectible.visible = true;
        });
        
        // 重置玩家位置
        metaverse.player.position.set(0, 2, 5);
        metaverse.camera.position.set(0, 3.5, 5);
        metaverse.camera.rotation.set(0, 0, 0);
        
        // 清除计时器
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        
        // 显示欢迎面板
        this.showWelcomePanel();
        this.updateUI();
    }

    // 添加成就系统
    checkAchievements() {
        const achievements = [
            { id: 'fast_collector', name: '快速收集者', condition: () => this.collectedItems >= 3 },
            { id: 'explorer', name: '探索者', condition: () => this.score >= 500 },
            { id: 'completionist', name: '完美主义者', condition: () => this.collectedItems >= this.totalItems }
        ];

        achievements.forEach(achievement => {
            if (achievement.condition() && !this.hasAchievement(achievement.id)) {
                this.unlockAchievement(achievement);
            }
        });
    }

    hasAchievement(id) {
        const achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
        return achievements.includes(id);
    }

    unlockAchievement(achievement) {
        const achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
        achievements.push(achievement.id);
        localStorage.setItem('achievements', JSON.stringify(achievements));
        
        // 显示成就通知
        this.showAchievementNotification(achievement.name);
    }

    showAchievementNotification(name) {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="position: fixed; top: 50px; right: 20px; 
                        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                        color: white; padding: 15px; border-radius: 10px; 
                        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                        z-index: 1500; animation: slideIn 0.3s ease-out;">
                <h4 style="margin: 0 0 5px 0;">🏆 成就解锁！</h4>
                <p style="margin: 0; font-size: 14px;">${name}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // 保存游戏进度
    saveProgress() {
        const progress = {
            score: this.score,
            collectedItems: this.collectedItems,
            completedTime: Date.now() - this.gameStartTime
        };
        localStorage.setItem('gameProgress', JSON.stringify(progress));
    }

    // 加载游戏进度
    loadProgress() {
        const progress = JSON.parse(localStorage.getItem('gameProgress') || '{}');
        if (progress.score) {
            this.score = progress.score;
            this.collectedItems = progress.collectedItems;
            this.updateUI();
        }
    }
}

// 工具函数
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 性能监控
function monitorPerformance() {
    const stats = {
        fps: 0,
        memory: 0,
        drawCalls: 0
    };
    
    let lastTime = performance.now();
    let frameCount = 0;
    
    function updateStats() {
        const now = performance.now();
        frameCount++;
        
        if (now - lastTime >= 1000) {
            stats.fps = Math.round(frameCount * 1000 / (now - lastTime));
            frameCount = 0;
            lastTime = now;
            
            // 更新性能显示
            if (window.performance && window.performance.memory) {
                stats.memory = Math.round(window.performance.memory.usedJSHeapSize / 1048576);
            }
            
            // 可以在这里添加性能警告
            if (stats.fps < 30) {
                console.warn('低帧率警告:', stats.fps, 'FPS');
            }
        }
        
        requestAnimationFrame(updateStats);
    }
    
    updateStats();
    return stats;
}

// 启动性能监控
document.addEventListener('DOMContentLoaded', () => {
    const stats = monitorPerformance();
    window.performanceStats = stats;
});

// 错误处理
window.addEventListener('error', (event) => {
    console.error('游戏错误:', event.error);
    
    // 如果是Three.js未定义错误，显示特定提示
    if (event.error.message.includes('THREE is not defined')) {
        document.body.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: #ff4444; color: white; padding: 20px; border-radius: 10px; 
                        text-align: center; z-index: 9999;">
                <h2>⚠️ 3D引擎加载失败</h2>
                <p>Three.js库未能正确加载</p>
                <button onclick="location.reload()">重新加载</button>
            </div>
        `;
    }
    
    // 如果是game对象未定义错误，尝试重新初始化
    if (event.error.message.includes('game') && event.error.message.includes('undefined')) {
        console.warn('游戏对象未初始化，尝试重新创建...');
        setTimeout(() => {
            if (typeof GameManager !== 'undefined' && !window.game) {
                window.game = new GameManager();
                console.log('游戏对象重新创建成功');
            }
        }, 1000);
    }
});

// 移动端适配
function detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (detectMobile()) {
    document.addEventListener('DOMContentLoaded', () => {
        // 添加移动端控制提示
        const mobileHint = document.createElement('div');
        mobileHint.innerHTML = `
            <div style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); 
                        background: rgba(0,0,0,0.8); color: white; padding: 10px; 
                        border-radius: 5px; font-size: 12px; z-index: 2000;">
                移动端体验：点击屏幕移动视角，使用屏幕按钮控制
            </div>
        `;
        document.body.appendChild(mobileHint);
        
        setTimeout(() => {
            mobileHint.remove();
        }, 5000);
    });
} 