import { calculatePositions } from '../domain/layout.js';

class TeacherDashboard {
  constructor(socket) {
    this.socket = socket;
    this.roomCode = null;
    this.groupName = null;
    this.state = { nodes: [], edges: [] };
    this.chatPairs = [];
    this.selectedChat = null;
    this.chatLog = [];
    this.onChatLogUpdate = null;

    this.packetPos = null;
    this.pathHL = [];
    this.packetT = 0;
    this.packetEdgeIdx = 0;
    this.animId = null;

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

    this.btnCopyLink.addEventListener('click', () => this.copyToClipboard(this.shareLinkEl));
    this.btnCopyCode.addEventListener('click', () => this.copyToClipboard(this.roomCodeEl, true));
    this.chatSearchEl.addEventListener('input', () => this.filterChatPairs());
    this.btnMonitorBack.addEventListener('click', () => this.showListView());
    this.setupSocketListeners();
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
      this.shareLinkEl.value = baseUrl + '?code=' + data.code;
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
        this.animatePacket(data.path);
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

  animatePacket(path) {
    this.stopAnimation();
    this.pathHL = path;
    this.packetEdgeIdx = 0;
    this.packetT = 0;
    this.animateStep();
  }

  animateStep() {
    this.packetT += 0.04;
    if (this.packetT >= 1) {
      this.packetT = 0;
      this.packetEdgeIdx++;
    }

    if (this.packetEdgeIdx >= this.pathHL.length - 1) {
      this.finishAnimation();
      return;
    }

    const canvas = document.getElementById('teacher-canvas');
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const positions = calculatePositions(this.state.nodes, w, h);

    const a = positions.find(p => p.node.id === this.pathHL[this.packetEdgeIdx]);
    const b = positions.find(p => p.node.id === this.pathHL[this.packetEdgeIdx + 1]);
    if (!a || !b) return;

    this.packetPos = {
      x: a.x + (b.x - a.x) * this.packetT,
      y: a.y + (b.y - a.y) * this.packetT,
    };

    this.drawTopology();
    this.animId = requestAnimationFrame(() => this.animateStep());
  }

  finishAnimation() {
    this.packetPos = null;
    this.pathHL = [];
    this.drawTopology();
    this.animId = null;
  }

  stopAnimation() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.packetPos = null;
    this.pathHL = [];
  }

  drawTopology() {
    const canvas = document.getElementById('teacher-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const isDark = matchMedia('(prefers-color-scheme: dark)').matches;

    ctx.fillStyle = isDark ? '#1e1e1c' : '#f0efeb';
    ctx.fillRect(0, 0, w, h);

    const nodes = this.state.nodes;
    const edges = this.state.edges;

    if (nodes.length === 0) {
      ctx.fillStyle = isDark ? '#666' : '#999';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Esperando nodos...', w / 2, h / 2);
      return;
    }

    const positions = calculatePositions(nodes, w, h);

    ctx.lineCap = 'round';
    for (const edge of edges) {
      const a = positions.find(p => p.node.id === edge.from);
      const b = positions.find(p => p.node.id === edge.to);
      if (!a || !b) continue;

      const na = nodes.find(n => n.id === edge.from);
      const nb = nodes.find(n => n.id === edge.to);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);

      if (!na.on || !nb.on) {
        ctx.strokeStyle = isDark ? '#262624' : '#e2e1db';
        ctx.setLineDash([4, 4]);
      } else {
        ctx.strokeStyle = isDark ? '#3a3a36' : '#c8c7c0';
        ctx.setLineDash([]);
      }
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const nr = Math.max(18, Math.round(w * 0.035));
    for (const pos of positions) {
      const n = pos.node;
      let fill, border;
      if (!n.on) {
        fill = isDark ? '#363634' : '#bebdb8';
        border = isDark ? '#282826' : '#a0a09a';
      } else {
        fill = isDark ? '#4a76d4' : '#5b87e0';
        border = isDark ? '#2a4fa4' : '#3a5fa8';
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nr, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (!n.on) {
        ctx.save();
        ctx.strokeStyle = isDark ? '#666' : '#ccc';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        const s = Math.round(nr * .38);
        ctx.beginPath();
        ctx.moveTo(pos.x - s, pos.y - s);
        ctx.lineTo(pos.x + s, pos.y + s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x + s, pos.y - s);
        ctx.lineTo(pos.x - s, pos.y + s);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(11, nr * 0.6)}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, pos.x, pos.y);

      ctx.fillStyle = isDark ? '#aaa' : '#666';
      ctx.font = `${Math.max(9, nr * 0.35)}px -apple-system, sans-serif`;
      ctx.fillText(n.name, pos.x, pos.y + nr + 12);
    }

    if (this.packetPos) {
      const pr = Math.max(7, Math.round(w * 0.012));
      ctx.beginPath();
      ctx.arc(this.packetPos.x, this.packetPos.y, pr, 0, Math.PI * 2);
      ctx.fillStyle = '#f5a623';
      ctx.fill();
      ctx.strokeStyle = '#b87a10';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.packetPos.x, this.packetPos.y, pr + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#f5a62355';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

export { TeacherDashboard };
