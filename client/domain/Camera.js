class Camera {
  constructor(dpr = 1) {
    this.dpr = dpr;
    this.width = 0;
    this.height = 0;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  scrToWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    };
  }

  worldToScr(wx, wy) {
    return {
      x: wx * this.scale + this.offsetX,
      y: wy * this.scale + this.offsetY,
    };
  }

  setSize(width, height, dpr) {
    this.width = width;
    this.height = height;
    if (dpr !== undefined) this.dpr = dpr;
  }

  reset() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }
}

export { Camera };
