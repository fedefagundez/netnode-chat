class Node {
  constructor(id, x, y, label, name, on = true) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.label = label;
    this.name = name;
    this.on = on;
  }

  toggle() {
    this.on = !this.on;
  }
}

export { Node };
