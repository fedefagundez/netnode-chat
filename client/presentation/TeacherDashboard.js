import { calculatePositions } from '../domain/layout.js';
import { drawNode, drawPacket, isDark } from './NodeRenderer.js';
import { PacketAnimator } from './PacketAnimator.js';

class TeacherDashboard {
  constructor(socket, canvasAdapter) {
    this.socket = socket;
    this.canvas = canvasAdapter;
    this.roomCode = null;
    this.groupName = null;
    this.state = { nodes: [], edges: [], topology: 'chain' };
    this.chatPairs = [];
    this.selectedChat = null;
    this.chatLog = [];
    this.onChatLogUpdate = null;

    this.animator = new PacketAnimator({
      getPosition: (id) => this._getPosition(id),
      onDraw: () => this.drawTopology(),
    });

    this.shareLinkEl = document.getElementById('teacher-share-link');
    this.roomCodeEl = document.getElementById('teacher-room-code');
    this.btnCopyLink = document.getElementById('btn-copy-link');
    this.btnCopyCode = document.getElementById('btn-copy-code');
    this.groupNameEl = document.getElementById('teacher-group-name');
    this.nodeCountEl = document.getElementById('teacher-node-count');
    this.chatPairsEl = document.getElementById('chat-pairs');
    this.chatLogEl = document.getElementById('teacher-chat-log');
    this.chatTitleEl = document.getElementById('monitor-chat-title');
    this.chatSearchEl = document.getElementById('chat-search-input');
    this.monitorListView = document.getElementById('monitor-list-view');
    this.monitorChatView = document.getElementById('monitor-chat-view');
    this.btnMonitorBack = document.getElementById('btn-monitor-back');
    this.topologySelect = document.getElementById('topology-change-select');
    this.btnApplyTopology = document.getElementById('btn-apply-topology');

    this.btnCopyLink.addEventListener('click', () => this.copyToClipboard(this.shareLinkEl));
    this.btnCopyCode.addEventListener('click', () => this.copyToClipboard(this.roomCodeEl, true));
    this.chatSearchEl.addEventListener('input', () => this.filterChatPairs());
    this.btnMonitorBack.addEventListener('click', () => this.showListView());
    this.btnApplyTopology.addEventListener('click', () => this.applyTopology());
    this.setupSocketListeners();
  }

  _getPosition(nodeId) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const positions = calculatePositions(this.state.nodes, w, h, this.state.topology);
    const pos = positions.find(p => p.node.id === nodeId);
    return pos || null;
  }

  copyToClipboard(element, isCode = false) {
    const text = element.textContent || element.value;
    navigator.clipboard.writeText(text);
    const btn = isCode ? this.btnCopyCode : this.btnCopyLink;
    const original = btn.textContent;
    btn.textContent = '¡Copiado!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  }

  setupSocketListeners() {
    this.socket.on('room-created', (data) => {
      this.roomCode = data.code;
      this.groupName = data.groupName;
      const baseUrl = window.location.origin + window.location.pathname;
      this.shareLinkEl.value = baseUrl + '?join=1';
      this.groupNameEl.textContent = data.groupName;
    });

    this.socket.on('state-update', (newState) => {
      this.state = newState;
      this.nodeCountEl.textContent = newState.nodes.length + ' nodos conectados';
      this.updateChatPairs();
      this.drawTopology();
    });

    this.socket.on('student-joined', (data) => {
      this.nodeCountEl.textContent = data.totalNodes + ' nodos conectados';
      this.addSystemMessage(`${data.name} (Nodo ${data.label}) se unió a la sala`);
    });

    this.socket.on('student-left', (data) => {
      this.nodeCountEl.textContent = data.totalNodes + ' nodos conectados';
      this.addSystemMessage(`${data.name} (Nodo ${data.label}) salió de la sala`);
    });

    this.socket.on('room-message', (data) => {
      if (this.selectedChat) {
        const { fromLabel, toLabel } = this.selectedChat;
        if ((data.fromLabel === fromLabel && data.toLabel === toLabel) ||
            (data.fromLabel === toLabel && data.toLabel === fromLabel)) {
          this.appendChatMessage(data.from, data.text, data.timestamp);
        }
      }
      this.addMessageIndicator(data.fromLabel, data.toLabel);
    });

    this.socket.on('chat-log', (data) => {
      this.chatLog = data.messages;
      this.renderChatLog();
    });

    this.socket.on('chat-pairs', (pairs) => {
      this.chatPairs = pairs;
      this.renderChatPairs();
    });

    this.socket.on('room-closed', (data) => {
      alert(data.reason);
      window.location.reload();
    });

    this.socket.on('packet', (data) => {
      if (data.path && data.path.length > 1) {
        this.animator.animate(data.path);
      }
    });
  }

  createRoom(groupName) {
    this.socket.emit('create-room', { groupName });
  }

  updateChatPairs() {
    this.socket.emit('get-chat-pairs');
  }

  renderChatPairs() {
    const query = this.chatSearchEl ? this.chatSearchEl.value.toLowerCase().trim() : '';
    this.chatPairsEl.innerHTML = '';

    const filtered = query
      ? this.chatPairs.filter(p =>
          p.a.name.toLowerCase().includes(query) ||
          p.b.name.toLowerCase().includes(query) ||
          p.a.label.toLowerCase().includes(query) ||
          p.b.label.toLowerCase().includes(query)
        )
      : this.chatPairs;

    filtered.forEach(pair => {
      const div = document.createElement('div');
      div.className = 'chat-pair-item';
      const isSelected = this.selectedChat &&
        this.selectedChat.a.id === pair.a.id &&
        this.selectedChat.b.id === pair.b.id;
      if (isSelected) div.classList.add('active');

      div.innerHTML = `
        <div class="pair-info">
          <span class="pair-names">${pair.a.name} ↔ ${pair.b.name}</span>
          <span class="pair-labels">Nodo ${pair.a.label} — Nodo ${pair.b.label}</span>
        </div>
        <button class="btn-monitor" data-pair='${JSON.stringify(pair)}'>👁 Ver</button>
      `;

      div.querySelector('.btn-monitor').addEventListener('click', () => {
        this.selectChat(pair);
      });

      this.chatPairsEl.appendChild(div);
    });
  }

  filterChatPairs() {
    this.renderChatPairs();
  }

  showListView() {
    this.monitorListView.classList.remove('hidden');
    this.monitorChatView.classList.add('hidden');
    this.selectedChat = null;
    this.renderChatPairs();
  }

  showChatView() {
    this.monitorListView.classList.add('hidden');
    this.monitorChatView.classList.remove('hidden');
  }

  applyTopology() {
    const topology = this.topologySelect.value;
    this.socket.emit('change-topology', { topology });
  }

  selectChat(pair) {
    this.selectedChat = pair;
    this.chatTitleEl.textContent = `${pair.a.name} ↔ ${pair.b.name}`;
    this.showChatView();
    this.chatLogEl.innerHTML = '';
    this.socket.emit('get-chat-log', { nodeA: pair.a.id, nodeB: pair.b.id });
  }

  renderChatLog() {
    this.chatLogEl.innerHTML = '';
    this.chatLog.forEach(msg => {
      const senderNode = this.state.nodes.find(n => n.id === msg.fromId);
      const senderName = senderNode ? senderNode.name : 'Nodo ' + msg.fromId;
      this.appendChatMessage(senderName, msg.text, msg.timestamp);
    });
  }

  appendChatMessage(sender, text, timestamp) {
    const div = document.createElement('div');
    div.className = 'monitor-message';
    const time = new Date(timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `<span class="msg-time">[${time}]</span> <strong>${sender}:</strong> ${text}`;
    this.chatLogEl.appendChild(div);
    this.chatLogEl.scrollTop = this.chatLogEl.scrollHeight;
  }

  addSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'monitor-system';
    div.textContent = text;
    this.chatLogEl.appendChild(div);
    this.chatLogEl.scrollTop = this.chatLogEl.scrollHeight;
  }

  addMessageIndicator(fromLabel, toLabel) {
    const items = this.chatPairsEl.querySelectorAll('.chat-pair-item');
    items.forEach(item => {
      const btn = item.querySelector('.btn-monitor');
      if (btn) {
        const pair = JSON.parse(btn.dataset.pair);
        if ((pair.a.label === fromLabel && pair.b.label === toLabel) ||
            (pair.a.label === toLabel && pair.b.label === fromLabel)) {
          btn.classList.add('has-message');
          setTimeout(() => btn.classList.remove('has-message'), 2000);
        }
      }
    });
  }

  drawTopology() {
    if (!this.canvas) return;

    const ctx = this.canvas.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const dpr = this.canvas.dpr;

    this.canvas.setSize(w * dpr, h * dpr);
    this.canvas.setStyleSize(w, h);
    this.canvas.setTransform(dpr);

    const dark = isDark();
    ctx.fillStyle = dark ? '#1e1e1c' : '#f0efeb';
    ctx.fillRect(0, 0, w, h);

    const nodes = this.state.nodes;
    const edges = this.state.edges;

    if (nodes.length === 0) {
      ctx.fillStyle = dark ? '#666' : '#999';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Esperando nodos...', w / 2, h / 2);
      return;
    }

    const positions = calculatePositions(nodes, w, h, this.state.topology);
    const posMap = new Map(positions.map(p => [p.node.id, p]));

    ctx.lineCap = 'round';
    for (const edge of edges) {
      const a = posMap.get(edge.from);
      const b = posMap.get(edge.to);
      if (!a || !b) continue;

      const na = nodes.find(n => n.id === edge.from);
      const nb = nodes.find(n => n.id === edge.to);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);

      if (!na.on || !nb.on) {
        ctx.strokeStyle = dark ? '#262624' : '#e2e1db';
        ctx.setLineDash([4, 4]);
      } else {
        ctx.strokeStyle = dark ? '#3a3a36' : '#c8c7c0';
        ctx.setLineDash([]);
      }
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const nr = Math.max(18, Math.round(w * 0.035));
    const colors = {
      nodeActive: dark ? '#4a76d4' : '#5b87e0',
      nodeActiveBr: dark ? '#2a4fa4' : '#3a5fa8',
      nodeOff: dark ? '#363634' : '#bebdb8',
      nodeOffBr: dark ? '#282826' : '#a0a09a',
      nodeMe: dark ? '#4a76d4' : '#5b87e0',
      nodeMeBr: dark ? '#2a4fa4' : '#3a5fa8',
      lblOn: '#fff',
      lblOff: dark ? '#555' : '#b8b8b0',
    };
    for (const pos of positions) {
      drawNode(ctx, pos.node, pos.x, pos.y, nr, colors);
    }

    if (this.animator.packetPos) {
      drawPacket(ctx, this.animator.packetPos.x, this.animator.packetPos.y, Math.max(7, Math.round(w * 0.012)));
    }
  }
}

export { TeacherDashboard };
