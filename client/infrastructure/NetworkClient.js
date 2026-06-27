class NetworkClient {
  constructor() {
    this.socket = null;
    this.myNodeId = null;
    this.myLabel = null;
    this.state = { nodes: [], edges: [] };
    this.roomCode = null;

    this.onRegistered = null;
    this.onStateUpdate = null;
    this.onPacket = null;
    this.onReceiveMessage = null;
    this.onMessageError = null;
    this.onRoomCreated = null;
    this.onRoomJoined = null;
    this.onError = null;
    this.onRoomClosed = null;
  }

  connect() {
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('[Client] Conectado al servidor');
    });

    this.socket.on('room-created', (data) => {
      if (this.onRoomCreated) this.onRoomCreated(data);
    });

    this.socket.on('registered', (data) => {
      this.myNodeId = data.nodeId;
      this.myLabel = data.label;
      this.state = data.state;
      if (this.onRegistered) this.onRegistered(data);
    });

    this.socket.on('room-joined', (data) => {
      this.myNodeId = data.nodeId;
      this.myLabel = data.label;
      this.state = data.state;
      this.roomCode = data.state.code;
      if (this.onRoomJoined) this.onRoomJoined(data);
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

    this.socket.on('message-error', (data) => {
      if (this.onMessageError) this.onMessageError(data);
    });

    this.socket.on('error', (data) => {
      if (this.onError) this.onError(data);
    });

    this.socket.on('room-closed', (data) => {
      if (this.onRoomClosed) this.onRoomClosed(data);
    });

    this.socket.on('disconnect', () => {
      console.log('[Client] Desconectado del servidor');
    });
  }

  createRoom(groupName, teacherName, topology) {
    this.socket.emit('create-room', { groupName, teacherName, topology });
  }

  joinRoom(code, name) {
    this.socket.emit('join-room', { code, name });
  }

  changeTopology(topology) {
    this.socket.emit('change-topology', { topology });
  }

  sendMessage(toNodeId, text) {
    this.socket.emit('send-message', { toNodeId, text });
  }

  toggleNode() {
    this.socket.emit('toggle-node');
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
