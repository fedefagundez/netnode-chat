function calculatePositions(nodes, width, height) {
  if (nodes.length === 0) return [];

  if (nodes.length === 1) {
    return [{ x: width / 2, y: height / 2, node: nodes[0] }];
  }

  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);
  const cellW = width / (cols + 1);
  const cellH = height / (rows + 1);

  return nodes.map((n, i) => ({
    x: cellW * (i % cols + 1),
    y: cellH * (Math.floor(i / cols) + 1),
    node: n,
  }));
}

export { calculatePositions };
