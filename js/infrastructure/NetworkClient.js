class NetworkClient {
  constructor() {
    this.socket = null;
    this.myNodeId = null;
    this.myLabel = null;
    this.state = { nodes: [], edges: [] };

    this.onRegistered = null;
    this.onStateUpdate = null;
    this.onPacket = null;
    this.onReceiveMessage = null;
  }

  connect() {
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('[Client] Conectado al servidor');
    });

    this.socket.on('registered', (data) => {
      this.myNodeId = data.nodeId;
      this.myLabel = data.label;
      this.state = data.state;
      if (this.onRegistered) this.onRegistered(data);
    });

    this.socket.on('state-update', (newState) => {
      this.state = newState;
      if (this.onStateUpdate) this.onStateUpdate(newState);
    });

    this.socket.on('packet', (data) => {
      if (this.onPacket) this.onPacket(data);
    });

    this.socket.on('receive-message', (data) => {
      if (this.onReceiveMessage) this.onReceiveMessage(data);
    });

    this.socket.on('disconnect', () => {
      console.log('[Client] Desconectado del servidor');
    });
  }

  register(name) {
    this.socket.emit('register', name);
  }

  sendMessage(toNodeId, text) {
    this.socket.emit('send-message', { toNodeId, text });
  }

  getMyNodeId() {
    return this.myNodeId;
  }

  getMyLabel() {
    return this.myLabel;
  }

  getState() {
    return this.state;
  }

  getOtherNodes() {
    return this.state.nodes.filter(n => n.id !== this.myNodeId);
  }
}

export { NetworkClient };
