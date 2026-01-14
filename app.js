// AgentCraft - Interactive RTS Agent Orchestration System
// Warcraft 3 Inspired UI

class AgentCraftGame {
    constructor() {
        this.selectedAgent = null;
        this.agents = new Map();
        this.resources = {
            gold: 2225548,
            lumber: 62,
            foodUsed: 172,
            foodTotal: 200
        };

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupMinimap();
        this.setupEventListeners();
        this.initializeAgents();
        this.startGameLoop();
        this.startResourceSimulation();
    }

    setupCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.drawTerrain();
    }

    drawTerrain() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Draw base terrain gradient
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) / 1.5
        );
        gradient.addColorStop(0, '#2d5a2d');
        gradient.addColorStop(0.5, '#1a4d1a');
        gradient.addColorStop(1, '#0d260d');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw terrain texture (trees, grass patches)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 30 + 10;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw paths
        ctx.strokeStyle = 'rgba(139, 90, 43, 0.4)';
        ctx.lineWidth = 40;
        ctx.beginPath();
        ctx.moveTo(width * 0.2, height * 0.3);
        ctx.quadraticCurveTo(width * 0.4, height * 0.5, width * 0.6, height * 0.4);
        ctx.lineTo(width * 0.8, height * 0.7);
        ctx.stroke();

        // Add lighting effect
        const lightGradient = ctx.createRadialGradient(
            width * 0.3, height * 0.2, 0,
            width * 0.3, height * 0.2, width * 0.6
        );
        lightGradient.addColorStop(0, 'rgba(255, 255, 200, 0.1)');
        lightGradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
        ctx.fillStyle = lightGradient;
        ctx.fillRect(0, 0, width, height);
    }

    setupMinimap() {
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.drawMinimap();

        // Update minimap every second
        setInterval(() => this.drawMinimap(), 1000);
    }

    drawMinimap() {
        const ctx = this.minimapCtx;
        const size = 180;

        // Clear and draw background
        ctx.fillStyle = '#0d260d';
        ctx.fillRect(0, 0, size, size);

        // Draw terrain base
        const gradient = ctx.createRadialGradient(90, 90, 0, 90, 90, 90);
        gradient.addColorStop(0, '#2d5a2d');
        gradient.addColorStop(1, '#1a4d1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Draw grid
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= size; i += 30) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(size, i);
            ctx.stroke();
        }

        // Draw agent positions on minimap
        document.querySelectorAll('.agent-building').forEach(building => {
            const leftPercent = parseFloat(building.style.left) / 100;
            const topPercent = parseFloat(building.style.top) / 100;
            const status = building.querySelector('.building-status');

            let color = '#ffa500'; // idle
            if (status.classList.contains('active')) color = '#4ade80';
            if (status.classList.contains('constructing')) color = '#00bfff';

            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(leftPercent * size, topPercent * size, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Draw border
        ctx.strokeStyle = '#6b5644';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, size, size);
    }

    initializeAgents() {
        const agentData = [
            { name: 'researcher', type: 'Research Agent', status: 'active', tasks: 3, efficiency: 92 },
            { name: 'planner', type: 'Planning Agent', status: 'active', tasks: 2, efficiency: 88 },
            { name: 'executor', type: 'Executor Agent', status: 'idle', tasks: 0, efficiency: 95 },
            { name: 'validator', type: 'Validator Agent', status: 'idle', tasks: 0, efficiency: 90 },
            { name: 'writer', type: 'Writer Agent', status: 'training', tasks: 1, efficiency: 75 }
        ];

        agentData.forEach(data => {
            this.agents.set(data.name, data);
        });
    }

    setupEventListeners() {
        // Agent building clicks
        document.querySelectorAll('.agent-building').forEach(building => {
            building.addEventListener('click', (e) => {
                const agentName = building.dataset.agent;
                this.selectAgent(agentName);
            });
        });

        // Agent portrait clicks
        document.querySelectorAll('.agent-portrait').forEach(portrait => {
            portrait.addEventListener('click', (e) => {
                const agentName = portrait.dataset.agent;
                this.selectAgent(agentName);
            });
        });

        // Command card clicks
        document.querySelectorAll('.command-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const command = card.dataset.command;
                this.executeCommand(command);
            });
        });

        // Quest item clicks
        document.querySelectorAll('.quest-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.showNotification('Quest selected!');
            });
        });

        // Mission clicks
        document.querySelectorAll('.active-mission').forEach(mission => {
            mission.addEventListener('click', (e) => {
                this.showNotification('Mission details opened!');
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e.key.toLowerCase());
        });

        // Close info panel on clicking outside
        document.addEventListener('click', (e) => {
            const infoPanel = document.getElementById('infoPanel');
            if (!e.target.closest('.agent-building') &&
                !e.target.closest('.agent-portrait') &&
                !e.target.closest('.info-panel')) {
                infoPanel.style.display = 'none';
                this.selectedAgent = null;
                this.clearAgentSelection();
            }
        });
    }

    selectAgent(agentName) {
        this.selectedAgent = agentName;
        const agentInfo = this.agents.get(agentName);

        // Highlight selected agent
        document.querySelectorAll('.agent-building').forEach(b => {
            b.style.filter = '';
        });
        document.querySelectorAll('.agent-portrait').forEach(p => {
            p.style.borderColor = '#6b5644';
        });

        const selectedBuilding = document.querySelector(`.agent-building[data-agent="${agentName}"]`);
        const selectedPortrait = document.querySelector(`.agent-portrait[data-agent="${agentName}"]`);

        if (selectedBuilding) {
            selectedBuilding.style.filter = 'drop-shadow(0 0 30px rgba(212, 175, 55, 0.8))';
        }
        if (selectedPortrait) {
            selectedPortrait.style.borderColor = '#d4af37';
        }

        // Show info panel
        this.showAgentInfo(agentInfo);

        // Play selection sound (visual feedback)
        this.showNotification(`${agentInfo.type} selected!`);
    }

    showAgentInfo(agentInfo) {
        const infoPanel = document.getElementById('infoPanel');
        const icons = {
            researcher: '🏰',
            planner: '🗼',
            executor: '⚒️',
            validator: '🛡️',
            writer: '📚'
        };

        infoPanel.innerHTML = `
            <div class="info-header">
                <span class="info-icon">${icons[agentInfo.name] || '🏰'}</span>
                <span class="info-title">${agentInfo.type.toUpperCase()}</span>
            </div>
            <div class="info-content">
                <div class="info-stats">
                    <div class="stat-row">
                        <span class="stat-label">Status:</span>
                        <span class="stat-value ${agentInfo.status}">${agentInfo.status.charAt(0).toUpperCase() + agentInfo.status.slice(1)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Active Tasks:</span>
                        <span class="stat-value">${agentInfo.tasks}/5</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Efficiency:</span>
                        <span class="stat-value">${agentInfo.efficiency}%</span>
                    </div>
                </div>
                <div class="info-abilities">
                    <div class="ability">Advanced ${agentInfo.type.split(' ')[0]} Protocol</div>
                    <div class="ability">Parallel Task Processing</div>
                    <div class="ability">Self-Optimization Module</div>
                </div>
            </div>
        `;

        infoPanel.style.display = 'block';
    }

    clearAgentSelection() {
        document.querySelectorAll('.agent-building').forEach(b => {
            b.style.filter = '';
        });
        document.querySelectorAll('.agent-portrait').forEach(p => {
            p.style.borderColor = '#6b5644';
        });
    }

    executeCommand(command) {
        if (!this.selectedAgent) {
            this.showNotification('Select an agent first!');
            return;
        }

        const messages = {
            deploy: `Deploying ${this.selectedAgent} agent...`,
            task: `Assigning new task to ${this.selectedAgent}...`,
            stop: `${this.selectedAgent} agent stopped.`,
            analyze: `${this.selectedAgent} analyzing target...`,
            upgrade: `Upgrading ${this.selectedAgent} agent...`,
            recall: `Recalling ${this.selectedAgent} agent...`
        };

        this.showNotification(messages[command] || 'Command executed!');

        // Visual feedback
        const card = document.querySelector(`.command-card[data-command="${command}"]`);
        if (card) {
            card.style.transform = 'translateY(-1px) scale(0.95)';
            setTimeout(() => {
                card.style.transform = '';
            }, 200);
        }
    }

    handleKeyPress(key) {
        const keyCommands = {
            'd': 'deploy',
            't': 'task',
            's': 'stop',
            'a': 'analyze',
            'u': 'upgrade',
            'r': 'recall'
        };

        if (keyCommands[key]) {
            this.executeCommand(keyCommands[key]);
        }

        // Number keys for quick agent selection
        const agentKeys = ['1', '2', '3', '4', '5'];
        if (agentKeys.includes(key)) {
            const portraits = Array.from(document.querySelectorAll('.agent-portrait'));
            const index = parseInt(key) - 1;
            if (portraits[index]) {
                const agentName = portraits[index].dataset.agent;
                this.selectAgent(agentName);
            }
        }
    }

    showNotification(message) {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.95) 0%, rgba(139, 115, 85, 0.95) 100%);
            color: #1a1209;
            padding: 12px 30px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 14px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 175, 55, 0.5);
            z-index: 10000;
            border: 2px solid #8b7355;
            animation: slideDown 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    startGameLoop() {
        const animate = () => {
            // Update any animations
            this.updateAnimations();
            requestAnimationFrame(animate);
        };
        animate();
    }

    updateAnimations() {
        // Pulse effect for active missions
        const time = Date.now() / 1000;
        document.querySelectorAll('.mission-priority.high').forEach(priority => {
            const opacity = 0.8 + Math.sin(time * 3) * 0.2;
            priority.style.opacity = opacity;
        });
    }

    startResourceSimulation() {
        // Simulate resource changes
        setInterval(() => {
            // Gold increases
            this.resources.gold += Math.floor(Math.random() * 100 + 50);

            // Lumber changes
            if (Math.random() > 0.7) {
                this.resources.lumber += Math.floor(Math.random() * 5);
            }

            // Food usage fluctuates slightly
            const foodChange = Math.floor(Math.random() * 3) - 1;
            this.resources.foodUsed = Math.max(170, Math.min(this.resources.foodTotal - 1, this.resources.foodUsed + foodChange));

            this.updateResourceDisplay();
        }, 3000);

        // Simulate mission progress
        setInterval(() => {
            document.querySelectorAll('.progress-fill').forEach(fill => {
                const currentWidth = parseFloat(fill.style.width) || 0;
                const newWidth = Math.min(100, currentWidth + Math.random() * 2);
                fill.style.width = newWidth + '%';

                const progressText = fill.parentElement.nextElementSibling;
                if (progressText) {
                    progressText.textContent = Math.floor(newWidth) + '%';
                }

                // Complete notification
                if (newWidth >= 100 && currentWidth < 100) {
                    this.showNotification('Mission completed!');
                }
            });
        }, 5000);
    }

    updateResourceDisplay() {
        document.getElementById('gold').textContent = this.resources.gold.toLocaleString();
        document.getElementById('lumber').textContent = this.resources.lumber;
        document.getElementById('food-used').textContent = this.resources.foodUsed;
        document.getElementById('food-total').textContent = this.resources.foodTotal;
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new AgentCraftGame();
    console.log('🎮 AgentCraft initialized! Use number keys 1-5 to select agents, and D/T/S/A/U/R for commands.');
});
