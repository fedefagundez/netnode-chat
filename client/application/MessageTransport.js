class MessageTransport {
  sendMessage(toNodeId, text) {
    throw new Error('Not implemented');
  }

  createRoom(groupName, teacherName, topology) {
    throw new Error('Not implemented');
  }

  joinRoom(code, name) {
    throw new Error('Not implemented');
  }

  toggleNode() {
    throw new Error('Not implemented');
  }

  getMyNodeId() {
    throw new Error('Not implemented');
  }
}

export { MessageTransport };
