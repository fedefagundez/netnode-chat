import { drawNode, drawPacket, isDark } from './NodeRenderer.js';
import { PacketAnimator } from './PacketAnimator.js';

class CanvasRenderer {
  constructor(canvasAdapter, camera, network) {
    this.canvas = canvasAdapter;
    this.camera = camera;
    this.network = network;
    this.onAnimationComplete = null;

    this.animator = new PacketAnimator({
      getPosition: (id) => this.network.getNode(id),
      onDraw: () => this.draw(),
      onComplete: () => { if (this.onAnimationComplete) this.onAnimationComplete(); },
    });
  }

  pal() {
    const d = isDark();
    return {
      bg: d ? '#1e1e1c' : '#f0efeb',
      grid: d ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.035)',
      edge: d ? '#3a3a36' : '#c8c7c0',
      edgeDead: d ? '#262624' : '#e2e1db',
      nodeActive: d ? '#4a76d4' : '#5b87e0',
      nodeActiveBr: d ? '#2a4fa4' : '#3a5fa8',
      nodeOff: d ? '#363634' : '#bebdb8',
      nodeOffBr: d ? '#282826' : '#a0a09a',
      nodeMe: '#3db86b',
      nodeMeBr: '#1e8a44',
      pkt: '#f5a623',
      pktBr: '#b87a10',
      lblOn: '#fff',
      lblOff: d ? '#555' : '#b8b8b0',
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

      if (!na.on || !nb.on) {
        ctx.strokeStyle = c.edgeDead;
        ctx.lineWidth = 1.5 / cam.scale;
        ctx.setLineDash([5 / cam.scale, 5 / cam.scale]);
      } else {
        ctx.strokeStyle = c.edge;
        ctx.lineWidth = 1.5 / cam.scale;
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawNodes(ctx, cam, net, c, nr) {
    const colors = {
      nodeActive: c.nodeActive,
      nodeActiveBr: c.nodeActiveBr,
      nodeOff: c.nodeOff,
      nodeOffBr: c.nodeOffBr,
      nodeMe: c.nodeMe,
      nodeMeBr: c.nodeMeBr,
      lblOn: c.lblOn,
      lblOff: c.lblOff,
      myNodeId: net.myNodeId,
    };
    for (const n of net.nodes) {
      drawNode(ctx, n, n.x, n.y, nr, colors, cam.scale);
    }
  }

  drawPacket(ctx, cam) {
    if (!this.animator.packetPos) return;
    const pr = Math.max(7, Math.round(cam.width * 0.012));
    drawPacket(ctx, this.animator.packetPos.x, this.animator.packetPos.y, pr, cam.scale);
  }

  animatePacket(path) {
    this.animator.animate(path);
  }

  stopAnimation() {
    this.animator.stop();
  }
}

export { CanvasRenderer };
