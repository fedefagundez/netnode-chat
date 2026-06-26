class ChatPanel {
  constructor(receiveMessage, sendMessage) {
    this.receiveMessage = receiveMessage;
    this.sendMessage = sendMessage;
    this.selectedContact = null;

    this.contactsList = document.getElementById('contacts-list');
    this.chatWith = document.getElementById('chat-with');
    this.chatMessages = document.getElementById('chat-messages');
    this.msgInput = document.getElementById('msg-input');
    this.btnSend = document.getElementById('btn-send');

    this.btnSend.addEventListener('click', () => this.handleSend());
    this.msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSend();
    });

    this.receiveMessage.onNewMessage = (data) => {
      if (this.selectedContact && data.from === this.selectedContact.id) {
        this.appendMessage(data.fromName, data.text, 'in');
      }
    };
  }

  updateContacts(nodes, myNodeId) {
    this.contactsList.innerHTML = '';
    nodes
      .filter(n => n.id !== myNodeId)
      .forEach(n => {
        const div = document.createElement('div');
        div.className = 'contact-item' + (this.selectedContact && this.selectedContact.id === n.id ? ' active' : '');
        div.innerHTML = `
          <div class="contact-dot"></div>
          <div>
            <div class="contact-name">${n.name}</div>
            <div class="contact-label">Nodo ${n.label}</div>
          </div>
        `;
        div.addEventListener('click', () => this.selectContact(n));
        this.contactsList.appendChild(div);
      });
  }

  selectContact(node) {
    this.selectedContact = node;
    this.chatWith.textContent = `Chat con ${node.name} (${node.label})`;
    this.msgInput.disabled = false;
    this.btnSend.disabled = false;
    this.chatMessages.innerHTML = '';

    this.updateContacts(this.lastNodes || [], this.lastMyNodeId);

    const history = this.receiveMessage.getMessages().filter(
      m => m.from === node.id || (m.toNodeId === node.id)
    );
    history.forEach(m => {
      const dir = m.from === node.id ? 'in' : 'out';
      const name = dir === 'in' ? m.fromName : 'Yo';
      this.appendMessage(name, m.text, dir);
    });
  }

  appendMessage(sender, text, direction) {
    const div = document.createElement('div');
    div.className = 'message ' + direction;
    if (direction === 'in') {
      div.innerHTML = `<div class="sender">${sender}</div>${text}`;
    } else {
      div.textContent = text;
    }
    this.chatMessages.appendChild(div);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  handleSend() {
    if (!this.selectedContact) return;
    const text = this.msgInput.value.trim();
    if (!text) return;

    const result = this.sendMessage.execute(this.selectedContact.id, text);
    if (result.success) {
      this.appendMessage('Yo', text, 'out');
      this.msgInput.value = '';
    }
  }

  storeContext(nodes, myNodeId) {
    this.lastNodes = nodes;
    this.lastMyNodeId = myNodeId;
  }
}

export { ChatPanel };
