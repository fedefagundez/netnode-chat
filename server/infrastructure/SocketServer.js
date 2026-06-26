import { Server } from 'socket.io';
import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { NetworkState } from '../domain/NetworkState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SocketServer {
  constructor(port = 3000) {
    this.port = port;
    this.network = new NetworkState();

    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupStaticFiles();
    this.setupSocketEvents();
  }

  setupStaticFiles() {
    const clientPath = join(__dirname, '..', '..');
    this.app.use(express.static(clientPath));
  }

  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log(`[Server] Cliente conectado: ${socket.id}`);

      socket.on('register', (name) => {
        const node = this.network.addNode(name, socket.id);
        console.log(`[Server] Nodo registrado: ${node.label} (${name})`);

        socket.emit('registered', {
          nodeId: node.id,
          label: node.label,
          state: this.network.getState(),
        });

        this.io.emit('state-update', this.network.getState());
      });

      socket.on('send-message', (data) => {
        const sender = this.network.getNodeBySocket(socket.id);
        if (!sender) return;

        const receiver = this.network.getNode(data.toNodeId);
        if (!receiver) return;

        const path = this.network.bfs(sender.id, receiver.id);

        this.io.emit('packet', {
          from: sender.id,
          to: receiver.id,
          path: path,
          text: data.text,
        });

        this.io.to(receiver.socketId).emit('receive-message', {
          from: sender.id,
          fromLabel: sender.label,
          fromName: sender.name,
          text: data.text,
          timestamp: Date.now(),
        });
      });

      socket.on('disconnect', () => {
        const node = this.network.removeNode(socket.id);
        if (node) {
          console.log(`[Server] Nodo desconectado: ${node.label} (${node.name})`);
          this.io.emit('state-update', this.network.getState());
        }
      });
    });
  }

  start() {
    this.httpServer.listen(this.port, () => {
      console.log(`[Server] NetNode Chat server corriendo en http://localhost:${this.port}`);
    });
  }
}

export { SocketServer };
