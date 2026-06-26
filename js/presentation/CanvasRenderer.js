class CanvasRenderer {
  constructor(canvasAdapter, camera, network) {
    this.canvas = canvasAdapter;
    this.camera = camera;
    this.network = network;
    this.packetPos = null;
    this.pathHL = [];
    this.packetT = 0;
    this.packetEdgeIdx = 0;
    this.animId = null;
  }

  isDark() {
    return matchMedia('(prefers-color-scheme: dark)').matches;
  }

  pal() {
    const d = this.isDark();
    return {
      bg: d ? '#1e1e1c' : '#f0efeb',
      grid: d ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.035)',
      edge: d ? '#3a3a36' : '#c8c7c0',
      nodeActive: d ? '#4a76d4' : '#5b87e0',
      nodeActiveBr: d ? '#2a4fa4' : '#3a5fa8',
      nodeMe: '#3db86b',
      nodeMeBr: '#1e8a44',
      pkt: '#f5a623',
      pktBr: '#b87a10',
      lblOn: '#fff',
      hover: d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
    };
  }

  draw() {
    const cam = this.camera;
    const net = this.network;
    const ctx = this.canvas.ctx;

    if (!cam.width || !cam.height) return;

    const c = this.pal();
    const nr = net.nodeR();

    ctx.clearRect(0, 0, cam.width, cam.height);
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, cam.width, cam.height);

    ctx.save();
    ctx.translate(cam.offsetX, cam.offsetY);
    ctx.scale(cam.scale, cam.scale);

    this.drawGrid(ctx, cam, c);
    this.drawEdges(ctx, cam, net, c);
    this.drawNodes(ctx, cam, net, c, nr);
    this.drawPacket(ctx, cam, c);

    ctx.restore();
  }

  drawGrid(ctx, cam, c) {
    const step = Math.round(cam.width / 17 / cam.scale);
    const wLeft = -cam.offsetX / cam.scale;
    const wTop = -cam.offsetY / cam.scale;
    const wRight = (cam.width - cam.offsetX) / cam.scale;
    const wBottom = (cam.height - cam.offsetY) / cam.scale;

    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 1 / cam.scale;

    for (let x = Math.floor(wLeft / step) * step; x <= wRight; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, wTop);
      ctx.lineTo(x, wBottom);
      ctx.stroke();
    }
    for (let y = Math.floor(wTop / step) * step; y <= wBottom; y += step) {
      ctx.beginPath();
      ctx.moveTo(wLeft, y);
      ctx.lineTo(wRight, y);
      ctx.stroke();
    }
  }

  drawEdges(ctx, cam, net, c) {
    ctx.lineCap = 'round';
    for (const edge of net.edges) {
      const na = net.getNode(edge.from);
      const nb = net.getNode(edge.to);
      if (!na || !nb) continue;

      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = c.edge;
      ctx.lineWidth = 1.5 / cam.scale;
      ctx.stroke();
    }
  }

  drawNodes(ctx, cam, net, c, nr) {
    for (const n of net.nodes) {
      const isMe = n.id === net.myNodeId;
      const fill = isMe ? c.nodeMe : c.nodeActive;
      const border = isMe ? c.nodeMeBr : c.nodeActiveBr;

      ctx.beginPath();
      ctx.arc(n.x, n.y, nr, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 2 / cam.scale;
      ctx.stroke();

      const fs = Math.max(12, Math.round(nr * 0.6));
      ctx.fillStyle = c.lblOn;
      ctx.font = `bold ${fs}px -apple-system,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x, n.y);

      const nameFs = Math.max(9, Math.round(nr * 0.35));
      ctx.font = `${nameFs}px -apple-system,sans-serif`;
      ctx.fillStyle = isMe ? c.nodeMeBr : (this.isDark() ? '#aaa' : '#666');
      ctx.fillText(n.name, n.x, n.y + nr + nameFs + 4);
    }
  }

  drawPacket(ctx, cam, c) {
    if (!this.packetPos) return;

    const pr = Math.max(7, Math.round(cam.width * 0.012));
    ctx.beginPath();
    ctx.arc(this.packetPos.x, this.packetPos.y, pr, 0, Math.PI * 2);
    ctx.fillStyle = c.pkt;
    ctx.fill();
    ctx.strokeStyle = c.pktBr;
    ctx.lineWidth = 2 / cam.scale;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.packetPos.x, this.packetPos.y, pr + 5, 0, Math.PI * 2);
    ctx.strokeStyle = c.pkt + '55';
    ctx.lineWidth = 1 / cam.scale;
    ctx.stroke();
  }

  animatePacket(path) {
    this.stopAnimation();
    this.pathHL = path;
    this.packetEdgeIdx = 0;
    this.packetT = 0;
    this.animateStep();
  }

  animateStep() {
    this.packetT += 0.04;
    if (this.packetT >= 1) {
      this.packetT = 0;
      this.packetEdgeIdx++;
    }

    if (this.packetEdgeIdx >= this.pathHL.length - 1) {
      this.finishAnimation();
      return;
    }

    const a = this.network.getNode(this.pathHL[this.packetEdgeIdx]);
    const b = this.network.getNode(this.pathHL[this.packetEdgeIdx + 1]);
    if (!a || !b) return;

    this.packetPos = {
      x: a.x + (b.x - a.x) * this.packetT,
      y: a.y + (b.y - a.y) * this.packetT,
    };

    this.draw();
    this.animId = requestAnimationFrame(() => this.animateStep());
  }

  finishAnimation() {
    const last = this.network.getNode(this.pathHL[this.pathHL.length - 1]);
    this.packetPos = last ? { x: last.x, y: last.y } : null;
    this.draw();

    setTimeout(() => {
      this.packetPos = null;
      this.pathHL = [];
      this.draw();
    }, 1000);

    this.animId = null;
  }

  stopAnimation() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.packetPos = null;
    this.pathHL = [];
  }
}

export { CanvasRenderer };
