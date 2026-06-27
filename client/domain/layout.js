function calculatePositions(nodes, width, height, topology) {
  if (nodes.length === 0) return [];

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.38;

  switch (topology) {
    case 'chain':
      return layoutChain(nodes, width, height);
    case 'ring':
      return layoutCircle(nodes, cx, cy, radius);
    case 'star':
      return layoutStar(nodes, cx, cy, radius);
    case 'tree':
      return layoutTree(nodes, width, height);
    case 'grid':
      return layoutGrid(nodes, width, height);
    case 'mesh-partial':
    case 'mesh-full':
    case 'small-world':
    case 'scale-free':
    case 'random':
      return layoutCircle(nodes, cx, cy, radius);
    default:
      return layoutGrid(nodes, width, height);
  }
}

function layoutChain(nodes, width, height) {
  const cy = height / 2;
  const margin = width * 0.08;
  const step = nodes.length > 1 ? (width - margin * 2) / (nodes.length - 1) : 0;

  return nodes.map((n, i) => ({
    x: margin + step * i,
    y: cy + (i % 2 === 0 ? -20 : 20) * (nodes.length > 4 ? 1 : 0),
    node: n,
  }));
}

function layoutCircle(nodes, cx, cy, radius) {
  return nodes.map((n, i) => ({
    x: cx + radius * Math.cos((2 * Math.PI * i) / nodes.length - Math.PI / 2),
    y: cy + radius * Math.sin((2 * Math.PI * i) / nodes.length - Math.PI / 2),
    node: n,
  }));
}

function layoutStar(nodes, cx, cy, radius) {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ x: cx, y: cy, node: nodes[0] }];

  const result = [{ x: cx, y: cy, node: nodes[0] }];
  const outer = nodes.slice(1);
  const angleStep = (2 * Math.PI) / outer.length;

  for (let i = 0; i < outer.length; i++) {
    result.push({
      x: cx + radius * Math.cos(angleStep * i - Math.PI / 2),
      y: cy + radius * Math.sin(angleStep * i - Math.PI / 2),
      node: outer[i],
    });
  }
  return result;
}

function layoutTree(nodes, width, height) {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ x: width / 2, y: height * 0.08, node: nodes[0] }];

  const result = [];
  const marginTop = height * 0.08;
  const marginBottom = height * 0.08;
  const availHeight = height - marginTop - marginBottom;

  const levels = Math.ceil(Math.log2(nodes.length + 1));
  const levelHeight = availHeight / (levels || 1);

  let idx = 0;
  for (let level = 0; level < levels && idx < nodes.length; level++) {
    const nodesInLevel = Math.min(Math.pow(2, level), nodes.length - idx);
    const y = marginTop + levelHeight * level;

    for (let i = 0; i < nodesInLevel && idx < nodes.length; i++) {
      const x = nodesInLevel === 1
        ? width / 2
        : (width * 0.1) + ((width * 0.8) / (nodesInLevel - 1 || 1)) * i;
      result.push({ x, y, node: nodes[idx] });
      idx++;
    }
  }
  return result;
}

function layoutGrid(nodes, width, height) {
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
