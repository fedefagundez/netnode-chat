import { SocketServer } from './infrastructure/SocketServer.js';

const PORT = process.env.PORT || 3000;
const server = new SocketServer(PORT);
server.start();
