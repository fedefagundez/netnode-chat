import { Node } from './Node.js';
import { Edge } from './Edge.js';
import { calculatePositions } from './layout.js';

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
    const positions = calculatePositions(this.nodes, this.camera.width, this.camera.height);
    positions.forEach(pos => {
      pos.node.x = pos.x;
      pos.node.y = pos.y;
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
