class Room {
  constructor(code, groupName, teacherSocketId) {
    this.code = code;
    this.groupName = groupName;
    this.teacherSocketId = teacherSocketId;
    this.nodes = new Map();
    this.edges = [];
    this.messages = [];
    this.nextNodeId = 0;
    this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.createdAt = new Date();
    this.topology = 'chain';
  }

  addNode(name, socketId) {
    const id = this.nextNodeId++;
    const label = this.alphabet[id] || String(id);
    const node = {
      id,
      label,
      name,
      socketId,
      on: true,
      x: 0,
      y: 0,
    };
    this.nodes.set(id, node);
    this.connectNewNode(id);
    this.assignPositions();
    return node;
  }

  connectNewNode(newId) {
    const ids = Array.from(this.nodes.keys()).filter(id => id !== newId);
    if (ids.length === 0) return;

    switch (this.topology) {
      case 'chain':
        this.edges.push({ from: ids[ids.length - 1], to: newId });
        break;

      case 'star':
        this.edges.push({ from: ids[0], to: newId });
        break;

      case 'ring':
        if (ids.length === 1) {
          this.edges.push({ from: ids[0], to: newId });
        } else {
          this.edges.push({ from: ids[ids.length - 1], to: newId });
          this.edges.push({ from: newId, to: ids[0] });
        }
        break;

      case 'tree':
        if (ids.length <= 1) {
          this.edges.push({ from: ids[0], to: newId });
        } else {
          const nodeIndex = ids.length;
          const parentIndex = Math.floor((nodeIndex - 1) / 2);
          this.edges.push({ from: ids[parentIndex], to: newId });
        }
        break;

      case 'mesh-partial':
        this.connectRandom(newId, 2, 3);
        break;

      case 'mesh-full':
        for (const id of ids) {
          this.edges.push({ from: id, to: newId });
        }
        break;

      case 'small-world':
        this.connectSmallWorld(newId);
        break;

      case 'scale-free':
        this.connectScaleFree(newId);
        break;

      case 'random':
        for (const id of ids) {
          if (Math.random() < 0.3) {
            this.edges.push({ from: id, to: newId });
          }
        }
        if (!this.edges.some(e => e.from === newId || e.to === newId)) {
          const rand = ids[Math.floor(Math.random() * ids.length)];
          this.edges.push({ from: rand, to: newId });
        }
        break;

      case 'grid':
        this.connectGrid(newId);
        break;
    }
  }

  connectRandom(newId, min, max) {
    const ids = Array.from(this.nodes.keys()).filter(id => id !== newId);
    const count = Math.min(ids.length, min + Math.floor(Math.random() * (max - min + 1)));
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      this.edges.push({ from: shuffled[i], to: newId });
    }
  }

  connectSmallWorld(newId) {
    const ids = Array.from(this.nodes.keys()).filter(id => id !== newId);
    if (ids.length === 0) return;

    const cols = Math.ceil(Math.sqrt(ids.length + 1));
    const idx = ids.length;
    const row = Math.floor(idx / cols);
    const col = idx % cols;

    if (col > 0) {
      const left = idx - 1;
      if (ids.includes(left)) this.edges.push({ from: left, to: newId });
    }
    if (row > 0) {
      const up = idx - cols;
      if (ids.includes(up)) this.edges.push({ from: up, to: newId });
    }

    if (Math.random() < 0.2 && ids.length > 2) {
      const others = ids.filter(id => id !== newId);
      const rand = others[Math.floor(Math.random() * others.length)];
      if (!this.edgeExists(newId, rand)) {
        this.edges.push({ from: rand, to: newId });
      }
    }
  }

  connectScaleFree(newId) {
    const ids = Array.from(this.nodes.keys()).filter(id => id !== newId);
    if (ids.length === 0) return;

    const degrees = new Map();
    for (const id of ids) {
      degrees.set(id, 0);
    }
    for (const e of this.edges) {
      if (degrees.has(e.from)) degrees.set(e.from, degrees.get(e.from) + 1);
      if (degrees.has(e.to)) degrees.set(e.to, degrees.get(e.to) + 1);
    }

    const totalDegree = Array.from(degrees.values()).reduce((a, b) => a + b, 0) || 1;
    const connections = Math.min(3, ids.length);

    for (let c = 0; c < connections; c++) {
      let rand = Math.random() * totalDegree;
      for (const [id, deg] of degrees) {
        rand -= deg + 1;
        if (rand <= 0) {
          if (!this.edgeExists(newId, id)) {
            this.edges.push({ from: id, to: newId });
          }
          break;
        }
      }
    }
  }

  connectGrid(newId) {
    const ids = Array.from(this.nodes.keys()).filter(id => id !== newId);
    if (ids.length === 0) return;

    const cols = Math.ceil(Math.sqrt(ids.length + 1));
    const idx = ids.length;
    const row = Math.floor(idx / cols);
    const col = idx % cols;

    if (col > 0) {
      const left = idx - 1;
      if (ids.includes(left)) this.edges.push({ from: left, to: newId });
    }
    if (row > 0) {
      const up = idx - cols;
      if (ids.includes(up)) this.edges.push({ from: up, to: newId });
    }
  }

  edgeExists(a, b) {
    return this.edges.some(
      e => (e.from === a && e.to === b) || (e.from === b && e.to === a)
    );
  }

  changeTopology(type) {
    this.topology = type;
    this.edges = [];
    const ids = Array.from(this.nodes.keys());

    switch (type) {
      case 'chain':
        for (let i = 0; i < ids.length - 1; i++) {
          this.edges.push({ from: ids[i], to: ids[i + 1] });
        }
        break;

      case 'star':
        for (let i = 1; i < ids.length; i++) {
          this.edges.push({ from: ids[0], to: ids[i] });
        }
        break;

      case 'ring':
        for (let i = 0; i < ids.length; i++) {
          this.edges.push({ from: ids[i], to: ids[(i + 1) % ids.length] });
        }
        break;

      case 'tree':
        this.buildTree(ids);
        break;

      case 'mesh-partial':
        for (const id of ids) {
          const others = ids.filter(x => x !== id);
          const count = Math.min(others.length, 2 + Math.floor(Math.random() * 2));
          const shuffled = [...others].sort(() => Math.random() - 0.5);
          for (let i = 0; i < count; i++) {
            if (!this.edgeExists(id, shuffled[i])) {
              this.edges.push({ from: id, to: shuffled[i] });
            }
          }
        }
        break;

      case 'mesh-full':
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            this.edges.push({ from: ids[i], to: ids[j] });
          }
        }
        break;

      case 'small-world':
        this.buildSmallWorld(ids);
        break;

      case 'scale-free':
        this.buildScaleFree(ids);
        break;

      case 'random':
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            if (Math.random() < 0.3) {
              this.edges.push({ from: ids[i], to: ids[j] });
            }
          }
        }
        for (const id of ids) {
          if (!this.edges.some(e => e.from === id || e.to === id)) {
            const others = ids.filter(x => x !== id);
            const rand = others[Math.floor(Math.random() * others.length)];
            this.edges.push({ from: id, to: rand });
          }
        }
        break;

      case 'grid':
        this.buildGrid(ids);
        break;
    }
  }

  buildTree(ids) {
    if (ids.length <= 1) return;

    const levels = Math.ceil(Math.log2(ids.length + 1));
    let idx = 0;
    const levelNodes = [];

    for (let level = 0; level < levels && idx < ids.length; level++) {
      const count = Math.min(Math.pow(2, level), ids.length - idx);
      const levelArr = [];
      for (let i = 0; i < count && idx < ids.length; i++) {
        levelArr.push(ids[idx]);
        idx++;
      }
      levelNodes.push(levelArr);
    }

    for (let level = 1; level < levelNodes.length; level++) {
      for (let i = 0; i < levelNodes[level].length; i++) {
        const parentIdx = Math.floor(i / 2);
        if (parentIdx < levelNodes[level - 1].length) {
          this.edges.push({ from: levelNodes[level - 1][parentIdx], to: levelNodes[level][i] });
        }
      }
    }
  }

  buildSmallWorld(ids) {
    const cols = Math.ceil(Math.sqrt(ids.length));
    for (let i = 0; i < ids.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      if (col < cols - 1 && i + 1 < ids.length) {
        this.edges.push({ from: ids[i], to: ids[i + 1] });
      }
      if (row * cols + col + cols < ids.length) {
        this.edges.push({ from: ids[i], to: ids[i + cols] });
      }
    }
    for (let i = 0; i < ids.length; i++) {
      if (Math.random() < 0.2) {
        const others = ids.filter(x => x !== ids[i]);
        const rand = others[Math.floor(Math.random() * others.length)];
        if (!this.edgeExists(ids[i], rand)) {
          this.edges.push({ from: ids[i], to: rand });
        }
      }
    }
  }

  buildScaleFree(ids) {
    if (ids.length < 2) return;
    this.edges.push({ from: ids[0], to: ids[1] });

    for (let i = 2; i < ids.length; i++) {
      const degrees = new Map();
      for (const id of ids.slice(0, i)) degrees.set(id, 0);
      for (const e of this.edges) {
        if (degrees.has(e.from)) degrees.set(e.from, degrees.get(e.from) + 1);
        if (degrees.has(e.to)) degrees.set(e.to, degrees.get(e.to) + 1);
      }
      const total = Array.from(degrees.values()).reduce((a, b) => a + b, 0) || 1;
      let rand = Math.random() * total;
      for (const [id, deg] of degrees) {
        rand -= deg + 1;
        if (rand <= 0) {
          this.edges.push({ from: id, to: ids[i] });
          break;
        }
      }
    }
  }

  buildGrid(ids) {
    const cols = Math.ceil(Math.sqrt(ids.length));
    for (let i = 0; i < ids.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      if (col < cols - 1 && i + 1 < ids.length) {
        this.edges.push({ from: ids[i], to: ids[i + 1] });
      }
      if (row * cols + col + cols < ids.length) {
        this.edges.push({ from: ids[i], to: ids[i + cols] });
      }
    }
  }

  removeNode(socketId) {
    for (const [id, node] of this.nodes) {
      if (node.socketId === socketId) {
        this.nodes.delete(id);
        this.edges = this.edges.filter(e => e.from !== id && e.to !== id);
        this.assignPositions();
        return node;
      }
    }
    return null;
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  getNodeBySocket(socketId) {
    for (const node of this.nodes.values()) {
      if (node.socketId === socketId) return node;
    }
    return null;
  }

  toggleNode(id) {
    const node = this.nodes.get(id);
    if (node) {
      node.on = !node.on;
      return node;
    }
    return null;
  }

  addEdge(fromId, toId) {
    if (this.edgeExists(fromId, toId)) return false;
    this.edges.push({ from: fromId, to: toId });
    return true;
  }

  removeEdge(fromId, toId) {
    this.edges = this.edges.filter(
      e => !((e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId))
    );
  }

  bfs(srcId, dstId) {
    if (srcId === dstId) return [srcId];
    const visited = new Set([srcId]);
    const queue = [[srcId]];

    while (queue.length) {
      const path = queue.shift();
      const current = path[path.length - 1];

      for (const edge of this.edges) {
        let neighbor = null;
        if (edge.from === current) neighbor = edge.to;
        else if (edge.to === current) neighbor = edge.from;

        if (neighbor === null || visited.has(neighbor)) continue;
        const node = this.getNode(neighbor);
        if (!node || !node.on) continue;

        const newPath = [...path, neighbor];
        if (neighbor === dstId) return newPath;

        visited.add(neighbor);
        queue.push(newPath);
      }
    }
    return null;
  }

  logMessage(fromId, toId, text) {
    this.messages.push({
      fromId,
      toId,
      text,
      timestamp: Date.now(),
    });
  }

  getChatLog(nodeA, nodeB) {
    return this.messages.filter(
      m => (m.fromId === nodeA && m.toId === nodeB) ||
           (m.fromId === nodeB && m.toId === nodeA)
    );
  }

  getAllChats() {
    const chats = new Map();
    for (const msg of this.messages) {
      const key = [msg.fromId, msg.toId].sort().join('-');
      if (!chats.has(key)) {
        chats.set(key, []);
      }
      chats.get(key).push(msg);
    }
    return chats;
  }

  getChatPairs() {
    const pairs = new Map();
    for (const [id, node] of this.nodes) {
      for (const [id2, node2] of this.nodes) {
        if (id < id2) {
          const key = `${id}-${id2}`;
          if (!pairs.has(key)) {
            pairs.set(key, {
              a: { id: node.id, label: node.label, name: node.name },
              b: { id: node2.id, label: node2.label, name: node2.name },
            });
          }
        }
      }
    }
    return Array.from(pairs.values());
  }

  assignPositions() {
    const count = this.nodes.size;
    if (count === 0) return;

    const nodesArray = Array.from(this.nodes.values());

    if (count === 1) {
      nodesArray[0].x = 0.5;
      nodesArray[0].y = 0.5;
      return;
    }

    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = 1 / (cols + 1);
    const cellH = 1 / (rows + 1);

    nodesArray.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      node.x = cellW * (col + 1);
      node.y = cellH * (row + 1);
    });
  }

  getState() {
    return {
      code: this.code,
      groupName: this.groupName,
      topology: this.topology,
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      nodeCount: this.nodes.size,
    };
  }

  nodeCount() {
    return this.nodes.size;
  }
}

export { Room };
