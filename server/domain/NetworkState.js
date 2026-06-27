class NetworkState {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.nextNodeId = 0;
    this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
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

    const existingNodes = Array.from(this.nodes.values()).filter(n => n.id !== id);
    if (existingNodes.length > 0) {
      const lastNode = existingNodes[existingNodes.length - 1];
      this.edges.push({ from: lastNode.id, to: id });
    }

    this.assignPositions();
    return node;
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
    const exists = this.edges.some(
      e => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    );
    if (exists) return false;
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
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }

  nodeCount() {
    return this.nodes.size;
  }
}

export { NetworkState };
