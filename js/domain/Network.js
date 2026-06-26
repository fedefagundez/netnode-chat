import { Node } from './Node.js';
import { Edge } from './Edge.js';

class Network {
  constructor(camera) {
    this.camera = camera;
    this.nodes = [];
    this.edges = [];
    this.myNodeId = null;
  }

  nodeR() {
    return Math.max(20, Math.round(this.camera.width * 0.04));
  }

  updateState(serverState) {
    this.nodes = serverState.nodes.map(n => new Node(n.id, 0, 0, n.label, n.name, n.on));
    this.edges = serverState.edges.map(e => new Edge(e.from, e.to));
    this.assignPositions();
  }

  assignPositions() {
    const count = this.nodes.length;
    if (count === 0) return;

    const cw = this.camera.width;
    const ch = this.camera.height;

    if (count === 1) {
      this.nodes[0].x = cw / 2;
      this.nodes[0].y = ch / 2;
      return;
    }

    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = cw / (cols + 1);
    const cellH = ch / (rows + 1);

    this.nodes.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      node.x = cellW * (col + 1);
      node.y = cellH * (row + 1);
    });
  }

  getNode(id) {
    return this.nodes.find(n => n.id === id) || null;
  }

  getNodeAt(sx, sy) {
    const nr = this.nodeR();
    for (const n of this.nodes) {
      const sp = this.camera.worldToScr(n.x, n.y);
      if (Math.hypot(sp.x - sx, sp.y - sy) <= nr * this.camera.scale + 6) return n.id;
    }
    return null;
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

  nodeCount() {
    return this.nodes.length;
  }
}

export { Network };
