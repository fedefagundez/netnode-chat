import { bfs } from './pathfinding.js';
import { TopologyBuilder } from './TopologyBuilder.js';
import { MessageLog } from './MessageLog.js';

class Room {
  constructor(code, groupName, teacherSocketId) {
    this.code = code;
    this.groupName = groupName;
    this.teacherSocketId = teacherSocketId;
    this.nodes = new Map();
    this.edges = [];
    this.messageLog = new MessageLog();
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
    this._connectNewNode(id);
    this.assignPositions();
    return node;
  }

  _connectNewNode(newId) {
    const ids = Array.from(this.nodes.keys()).filter(id => id !== newId);
    TopologyBuilder.buildIncremental(this.topology, ids, newId, this.edges, this.nodes);
  }

  changeTopology(type) {
    this.topology = type;
    const ids = Array.from(this.nodes.keys());
    this.edges = TopologyBuilder.buildFull(type, ids);
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
    if (this.edges.some(e => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId))) {
      return false;
    }
    this.edges.push({ from: fromId, to: toId });
    return true;
  }

  removeEdge(fromId, toId) {
    this.edges = this.edges.filter(
      e => !((e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId))
    );
  }

  bfs(srcId, dstId) {
    return bfs(this.nodes, this.edges, srcId, dstId);
  }

  logMessage(fromId, toId, text) {
    this.messageLog.log(fromId, toId, text);
  }

  getChatLog(nodeA, nodeB) {
    return this.messageLog.getChatLog(nodeA, nodeB);
  }

  getAllChats() {
    return this.messageLog.getAllChats();
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
