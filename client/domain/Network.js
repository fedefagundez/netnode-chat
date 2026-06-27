import { Node } from './Node.js';
import { Edge } from './Edge.js';
import { calculatePositions } from './layout.js';
import { bfs } from './pathfinding.js';

class Network {
  constructor(camera) {
    this.camera = camera;
    this.nodes = [];
    this.edges = [];
    this.myNodeId = null;
    this.topology = 'chain';
  }

  nodeR() {
    return Math.max(20, Math.round(this.camera.width * 0.04));
  }

  updateState(serverState) {
    this.nodes = serverState.nodes.map(n => new Node(n.id, 0, 0, n.label, n.name, n.on));
    this.edges = serverState.edges.map(e => new Edge(e.from, e.to));
    if (serverState.topology) this.topology = serverState.topology;
    this.assignPositions();
  }

  assignPositions() {
    const positions = calculatePositions(this.nodes, this.camera.width, this.camera.height, this.topology);
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
    return bfs(this.nodes, this.edges, srcId, dstId);
  }

  nodeCount() {
    return this.nodes.length;
  }
}

export { Network };
