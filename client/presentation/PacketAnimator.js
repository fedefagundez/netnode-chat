class PacketAnimator {
  constructor({ getPosition, onDraw, onComplete }) {
    this.getPosition = getPosition;
    this.onDraw = onDraw;
    this.onComplete = onComplete || (() => {});
    this.packetPos = null;
    this.pathHL = [];
    this.packetT = 0;
    this.packetEdgeIdx = 0;
    this.animId = null;
  }

  animate(path) {
    this.stop();
    this.pathHL = path;
    this.packetEdgeIdx = 0;
    this.packetT = 0;
    this.step();
  }

  step() {
    this.packetT += 0.04;
    if (this.packetT >= 1) {
      this.packetT = 0;
      this.packetEdgeIdx++;
    }

    if (this.packetEdgeIdx >= this.pathHL.length - 1) {
      this.finish();
      return;
    }

    const a = this.getPosition(this.pathHL[this.packetEdgeIdx]);
    const b = this.getPosition(this.pathHL[this.packetEdgeIdx + 1]);
    if (!a || !b) return;

    this.packetPos = {
      x: a.x + (b.x - a.x) * this.packetT,
      y: a.y + (b.y - a.y) * this.packetT,
    };

    this.onDraw();
    this.animId = requestAnimationFrame(() => this.step());
  }

  finish() {
    const last = this.getPosition(this.pathHL[this.pathHL.length - 1]);
    this.packetPos = last ? { x: last.x, y: last.y } : null;
    this.onDraw();

    setTimeout(() => {
      this.packetPos = null;
      this.pathHL = [];
      this.onDraw();
      this.onComplete();
    }, 1000);

    this.animId = null;
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.packetPos = null;
    this.pathHL = [];
  }
}

export { PacketAnimator };
