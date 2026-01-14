# AgentCraft - RTS Agent Orchestration Interface

A **Warcraft 3-inspired** real-time strategy interface for managing and orchestrating AI agents. This project demonstrates the concept of using familiar RTS game mechanics to control and coordinate AI agents in a visually stunning, medieval fantasy-themed interface.

![Warcraft 3 Inspired UI](https://img.shields.io/badge/Style-Warcraft%203-gold)
![Interactive](https://img.shields.io/badge/Type-Interactive-green)
![Web Based](https://img.shields.io/badge/Platform-Web-blue)

## 🎮 Concept

Manage AI agents like units in an RTS game! Each agent is represented as a building/unit on a strategic map. Assign missions, monitor progress, and orchestrate multiple agents simultaneously using the familiar Warcraft 3 interface paradigm.

## ✨ Features

### Authentic Warcraft 3 UI Elements

- **Resource Bar**: Track gold, lumber, and food supply (representing computational resources)
- **Quest Log**: New missions and objectives appear dynamically
- **Active Missions Panel**: Monitor ongoing agent tasks with progress bars
- **Tactical Map (Minimap)**: Overview of all agent positions and status
- **Agent Selection Grid**: Select and manage individual agents
- **Command Cards**: Issue commands with hotkeys (D, T, S, A, U, R)

### Interactive Agent Management

- **5 Agent Types**:
  - 🏰 **Research Agent** - Deep research and pattern analysis
  - 🗼 **Planning Agent** - Strategic planning and coordination
  - ⚒️ **Executor Agent** - Task execution and implementation
  - 🛡️ **Validator Agent** - Quality control and validation
  - 📚 **Writer Agent** - Documentation and content generation

- **Real-time Status Tracking**:
  - Active (green) - Currently processing tasks
  - Idle (orange) - Available for new assignments
  - Training (blue) - Learning and optimization

- **Mission Progress**: Live progress bars showing completion status
- **Resource Simulation**: Dynamic resource changes over time

### Controls & Hotkeys

- **Mouse**: Click agents to select, click command cards to execute
- **Number Keys (1-5)**: Quick-select agents
- **Hotkeys**:
  - `D` - Deploy agent
  - `T` - Assign task
  - `S` - Stop current task
  - `A` - Analyze target
  - `U` - Upgrade agent
  - `R` - Recall agent

## 🎨 Design Philosophy

This implementation stays true to the **Warcraft 3 aesthetic**:

- **Stone and wood textures** with golden accents
- **Medieval fantasy color palette** (dark browns, golds, greens)
- **Cinzel font** for that authentic fantasy feel
- **Beveled borders and ornate panels** reminiscent of WC3 UI
- **Green terrain** representing the classic RTS battlefield
- **Glowing effects** for active elements and status indicators

## 🚀 Getting Started

### Installation

1. Clone this repository
2. Open `index.html` in a modern web browser
3. No build process or dependencies required!

```bash
git clone <repository-url>
cd UIAgentRTS
open index.html  # or just double-click the file
```

### Usage

1. **Select an Agent**: Click any agent building on the map or use number keys (1-5)
2. **View Details**: Selected agent info appears in the info panel
3. **Issue Commands**: Click command cards or use hotkeys (D, T, S, A, U, R)
4. **Monitor Progress**: Watch missions complete in real-time on the right panel
5. **Track Resources**: Resources update automatically in the top bar

## 🏗️ Technical Details

- **Pure Vanilla JavaScript** - No frameworks or libraries
- **Canvas API** for terrain rendering and minimap
- **CSS Grid & Flexbox** for responsive layout
- **CSS Animations** for smooth transitions and effects
- **Event-driven architecture** for interactive elements

## 🎯 Use Cases

- **AI Agent Management**: Visual interface for multi-agent systems
- **Workflow Orchestration**: Monitor and control automated workflows
- **System Monitoring**: Track distributed processes in a game-like interface
- **Educational Tool**: Demonstrate agent-based systems concepts
- **Nostalgia Project**: Bring back the classic RTS feel to modern applications

## 🔮 Future Enhancements

- [ ] Drag-and-drop agent deployment
- [ ] Multi-select agents for group commands
- [ ] Agent upgrade trees and skill progression
- [ ] Mission replay and history
- [ ] Custom mission designer
- [ ] Multiplayer agent orchestration
- [ ] Sound effects and voice lines
- [ ] Day/night cycle on the map

## 📜 License

This is an original concept and implementation. Feel free to use and modify for your own projects.

## 🙏 Acknowledgments

Inspired by **Warcraft 3** by Blizzard Entertainment - the legendary RTS that defined a generation of gamers. This project pays homage to its incredible UI design and game mechanics.

---

**Built with nostalgia and code** ⚔️✨
