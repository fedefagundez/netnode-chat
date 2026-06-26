import { Camera } from './domain/Camera.js';
import { Network } from './domain/Network.js';
import { NetworkClient } from './infrastructure/NetworkClient.js';
import { SendMessage } from './application/SendMessage.js';
import { ReceiveMessage } from './application/ReceiveMessage.js';
import { CanvasAdapter } from './infrastructure/CanvasAdapter.js';
import { CanvasRenderer } from './presentation/CanvasRenderer.js';
import { ChatPanel } from './presentation/ChatPanel.js';

class App {
  constructor() {
    this.camera = new Camera();
    this.network = new Network(this.camera);
    this.client = new NetworkClient();
    this.receiveMessage = new ReceiveMessage();
    this.sendMessage = new SendMessage(this.client);

    this.canvasAdapter = null;
    this.renderer = null;
    this.chatPanel = null;

    this.loginScreen = document.getElementById('login-screen');
    this.appEl = document.getElementById('app');
    this.nameInput = document.getElementById('name-input');
    this.btnJoin = document.getElementById('btn-join');
    this.myNameEl = document.getElementById('my-name');
    this.myLabelEl = document.getElementById('my-label');
    this.badgeEl = document.getElementById('badge');
    this.statusEl = document.getElementById('status');

    this.setupLogin();
  }

  setupLogin() {
    this.btnJoin.addEventListener('click', () => this.join());
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.join();
    });
  }

  join() {
    const name = this.nameInput.value.trim();
    if (!name) return;

    this.loginScreen.classList.add('hidden');
    this.appEl.classList.remove('hidden');

    this.myNameEl.textContent = name;

    this.client.connect();

    this.client.onRegistered = (data) => {
      this.myLabelEl.textContent = data.label;
      this.network.myNodeId = data.nodeId;
      this.network.updateState(data.state);
      this.updateBadge();
      this.initCanvas();
      this.initChat();
      this.statusEl.textContent = `Conectado como Nodo ${data.label} — ${data.state.nodes.length} nodos en la red`;
    };

    this.client.onStateUpdate = (newState) => {
      this.network.updateState(newState);
      this.updateBadge();
      if (this.renderer) {
        this.network.assignPositions();
        this.renderer.draw();
      }
      if (this.chatPanel) {
        this.chatPanel.updateContacts(newState.nodes, this.client.getMyNodeId());
        this.chatPanel.storeContext(newState.nodes, this.client.getMyNodeId());
      }
      this.statusEl.textContent = `${newState.nodes.length} nodos en la red`;
    };

    this.client.onPacket = (data) => {
      if (this.renderer && data.path && data.path.length > 1) {
        this.renderer.animatePacket(data.path);
      }
    };

    this.client.onReceiveMessage = (data) => {
      this.receiveMessage.addMessage(data);
    };

    this.client.register(name);
  }

  initCanvas() {
    this.canvasAdapter = new CanvasAdapter('c', 'canvas-outer');
    this.renderer = new CanvasRenderer(this.canvasAdapter, this.camera, this.network);

    new ResizeObserver(() => this.onResize()).observe(this.canvasAdapter.outer);
    this.onResize();
  }

  onResize() {
    if (!this.canvasAdapter) return;

    const outer = this.canvasAdapter.outer;
    const rect = outer.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.camera.setSize(rect.width, rect.height, dpr);
    this.canvasAdapter.setSize(Math.round(rect.width * dpr), Math.round(rect.height * dpr));
    this.canvasAdapter.setStyleSize(rect.width, rect.height);
    this.canvasAdapter.setTransform(dpr);

    this.network.assignPositions();
    this.renderer.draw();
  }

  initChat() {
    this.chatPanel = new ChatPanel(this.receiveMessage, this.sendMessage);
    this.chatPanel.updateContacts(this.network.nodes, this.client.getMyNodeId());
    this.chatPanel.storeContext(this.network.nodes, this.client.getMyNodeId());
  }

  updateBadge() {
    const count = this.network.nodeCount();
    this.badgeEl.textContent = count + ' nodo' + (count !== 1 ? 's' : '');
  }
}

export { App };
