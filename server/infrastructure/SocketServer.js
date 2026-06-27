import { Server } from 'socket.io';
import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { RoomManager } from '../domain/RoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SocketServer {
  constructor(port = 3000) {
    this.port = port;
    this.roomManager = new RoomManager();

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

      socket.on('create-room', (data) => {
        const { groupName, teacherName, topology } = data;
        if (!groupName || !groupName.trim()) {
          socket.emit('error', { message: 'Nombre de grupo inválido' });
          return;
        }

        const room = this.roomManager.createRoom(groupName.trim(), socket.id);
        room.teacherName = teacherName || 'Profesor';
        if (topology) room.topology = topology;
        socket.join(room.code);

        socket.emit('room-created', {
          code: room.code,
          groupName: room.groupName,
          teacherName: room.teacherName,
          topology: room.topology,
        });

        console.log(`[Server] Profesor creó sala: ${room.code} (${room.groupName}) - Topología: ${room.topology}`);
      });

      socket.on('join-room', (data) => {
        const { code, name } = data;
        if (!code || !name) {
          socket.emit('error', { message: 'Código y nombre son requeridos' });
          return;
        }

        const room = this.roomManager.getRoom(code);
        if (!room) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }

        const node = room.addNode(name.trim(), socket.id);
        socket.join(code);

        socket.emit('room-joined', {
          nodeId: node.id,
          label: node.label,
          state: room.getState(),
        });

        this.io.to(code).emit('state-update', room.getState());

        this.io.to(room.teacherSocketId).emit('student-joined', {
          nodeId: node.id,
          label: node.label,
          name: node.name,
          totalNodes: room.nodeCount(),
        });

        console.log(`[Server] Nodo registrado en sala ${code}: ${node.label} (${name})`);
      });

      socket.on('send-message', (data) => {
        const room = this.roomManager.getRoomByStudentSocket(socket.id);
        if (!room) return;

        const sender = room.getNodeBySocket(socket.id);
        if (!sender) return;

        const receiver = room.getNode(data.toNodeId);
        if (!receiver) {
          socket.emit('message-error', { reason: 'receptor-no-existe' });
          return;
        }

        if (!receiver.on) {
          socket.emit('message-error', { reason: 'receptor-apagado', receiverName: receiver.name });
          return;
        }

        const path = room.bfs(sender.id, receiver.id);
        if (!path) {
          socket.emit('message-error', { reason: 'sin-ruta', receiverName: receiver.name });
          return;
        }

        room.logMessage(sender.id, receiver.id, data.text);

        this.io.to(room.code).emit('packet', {
          from: sender.id,
          to: receiver.id,
          path: path,
          text: data.text,
        });

        this.io.to(room.teacherSocketId).emit('packet', {
          from: sender.id,
          to: receiver.id,
          path: path,
          text: data.text,
        });

        this.io.to(receiver.socketId).emit('receive-message', {
          from: sender.id,
          fromLabel: sender.label,
          fromName: sender.name,
          toNodeId: receiver.id,
          text: data.text,
          timestamp: Date.now(),
        });

        this.io.to(room.teacherSocketId).emit('room-message', {
          from: sender.name,
          fromLabel: sender.label,
          to: receiver.name,
          toLabel: receiver.label,
          text: data.text,
          timestamp: Date.now(),
        });
      });

      socket.on('toggle-node', (data) => {
        const room = this.roomManager.getRoomByStudentSocket(socket.id);
        if (!room) return;

        const node = room.getNodeBySocket(socket.id);
        if (node) {
          room.toggleNode(node.id);
          this.io.to(room.code).emit('state-update', room.getState());
          console.log(`[Server] Nodo toggled en sala ${room.code}: ${node.label} → on: ${room.getNode(node.id).on}`);
        }
      });

      socket.on('change-topology', (data) => {
        const room = this.roomManager.getRoomByTeacherSocket(socket.id);
        if (!room) return;

        const { topology } = data;
        room.changeTopology(topology);
        this.io.to(room.code).emit('state-update', room.getState());
        console.log(`[Server] Topología cambiada en sala ${room.code}: ${topology}`);
      });

      socket.on('get-chat-log', (data) => {
        const room = this.roomManager.getRoomByTeacherSocket(socket.id);
        if (!room) return;

        const { nodeA, nodeB } = data;
        const log = room.getChatLog(nodeA, nodeB);
        socket.emit('chat-log', { nodeA, nodeB, messages: log });
      });

      socket.on('get-chat-pairs', () => {
        const room = this.roomManager.getRoomByTeacherSocket(socket.id);
        if (!room) return;

        const pairs = room.getChatPairs();
        socket.emit('chat-pairs', pairs);
      });

      socket.on('disconnect', () => {
        const teacherRoom = this.roomManager.getRoomByTeacherSocket(socket.id);
        if (teacherRoom) {
          this.io.to(teacherRoom.code).emit('room-closed', {
            reason: 'El profesor cerró la sala',
          });

          for (const node of teacherRoom.nodes.values()) {
            this.io.to(node.socketId).emit('room-closed', {
              reason: 'El profesor cerró la sala',
            });
          }

          this.roomManager.removeRoom(teacherRoom.code);
          console.log(`[Server] Sala cerrada por profesor: ${teacherRoom.code}`);
          return;
        }

        const result = this.roomManager.removeStudentFromAllRooms(socket.id);
        if (result) {
          const { room, node } = result;
          this.io.to(room.code).emit('state-update', room.getState());
          this.io.to(room.teacherSocketId).emit('student-left', {
            nodeId: node.id,
            label: node.label,
            name: node.name,
            totalNodes: room.nodeCount(),
          });
          console.log(`[Server] Nodo desconectado de sala ${room.code}: ${node.label} (${node.name})`);
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
