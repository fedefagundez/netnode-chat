// Test de topologías - Copia directa de layout.js para testing

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

// Simular buildTree de Room.js
function buildTree(ids) {
  const edges = [];
  if (ids.length <= 1) return edges;

  const levels = Math.ceil(Math.log2(ids.length + 1));
  let idx = 0;
  const levelNodes = [];

  for (let level = 0; level < levels && idx < ids.length; level++) {
    const count = Math.min(Math.pow(2, level), ids.length - idx);
    const levelArr = [];
    for (let i = 0; i < count && idx < ids.length; i++) {
      levelArr.push(ids[idx]);
      idx++;
    }
    levelNodes.push(levelArr);
  }

  for (let level = 1; level < levelNodes.length; level++) {
    for (let i = 0; i < levelNodes[level].length; i++) {
      const parentIdx = Math.floor(i / 2);
      if (parentIdx < levelNodes[level - 1].length) {
        edges.push({ from: levelNodes[level - 1][parentIdx], to: levelNodes[level][i] });
      }
    }
  }
  return edges;
}

// Tests
console.log('=== TEST: Árbol con 8 nodos ===\n');

const nodes8 = [
  { id: 0, label: 'A' },
  { id: 1, label: 'B' },
  { id: 2, label: 'C' },
  { id: 3, label: 'D' },
  { id: 4, label: 'E' },
  { id: 5, label: 'F' },
  { id: 6, label: 'G' },
  { id: 7, label: 'H' },
];

const positions = calculatePositions(nodes8, 800, 600, 'tree');
const edges = buildTree([0,1,2,3,4,5,6,7]);

console.log('Posiciones:');
positions.forEach(p => {
  const level = Math.round((p.y - 600*0.08) / (600*0.84/3));
  console.log(`  ${p.node.label}: x=${Math.round(p.x)}, y=${Math.round(p.y)} (nivel ${level})`);
});

console.log('\nEdges:');
edges.forEach(e => {
  const from = nodes8.find(n => n.id === e.from);
  const to = nodes8.find(n => n.id === e.to);
  console.log(`  ${from.label} → ${to.label}`);
});

console.log('\n=== Visualización del árbol ===\n');

// Crear gráfico ASCII
const grid = Array(12).fill(null).map(() => Array(40).fill(' '));

positions.forEach(p => {
  const col = Math.round(p.x / 800 * 38) + 1;
  const row = Math.round((p.y - 600*0.08) / (600*0.84/3));
  if (row >= 0 && row < 4 && col >= 0 && col < 40) {
    grid[row * 3][col] = p.node.label;
  }
});

// Dibujar edges
edges.forEach(e => {
  const from = positions.find(p => p.node.id === e.from);
  const to = positions.find(p => p.node.id === e.to);
  if (from && to) {
    const fromCol = Math.round(from.x / 800 * 38) + 1;
    const toCol = Math.round(to.x / 800 * 38) + 1;
    const fromRow = Math.round((from.y - 600*0.08) / (600*0.84/3)) * 3;
    const toRow = Math.round((to.y - 600*0.08) / (600*0.84/3)) * 3;
    
    // Línea vertical
    const midRow = Math.floor((fromRow + toRow) / 2);
    if (fromCol === toCol) {
      for (let r = fromRow + 1; r < toRow; r++) {
        if (r >= 0 && r < 12) grid[r][fromCol] = '│';
      }
    } else {
      // Línea horizontal y vertical
      const midCol = Math.floor((fromCol + toCol) / 2);
      for (let c = Math.min(fromCol, toCol) + 1; c < Math.max(fromCol, toCol); c++) {
        if (fromRow >= 0 && fromRow < 12) grid[fromRow][c] = '─';
      }
      for (let r = fromRow + 1; r < toRow; r++) {
        if (r >= 0 && r < 12) grid[r][midCol] = '│';
      }
      if (fromRow >= 0 && fromRow < 12) grid[fromRow][midCol] = '┬';
      if (toRow >= 0 && toRow < 12) grid[toRow][midCol] = '┴';
    }
  }
});

grid.forEach(row => console.log(row.join('')));

console.log('\n=== TEST: Verificación de estructura ===\n');

// Verificar que es un árbol válido
const visited = new Set();
let isValid = true;

function verifyTree(nodeId, parentId) {
  if (visited.has(nodeId)) {
    console.log(`  ❌ Ciclo detectado en nodo ${nodeId}`);
    isValid = false;
    return;
  }
  visited.add(nodeId);
  
  const children = edges.filter(e => e.from === nodeId).map(e => e.to);
  children.forEach(child => verifyTree(child, nodeId));
}

verifyTree(0, null);

if (visited.size === nodes8.length) {
  console.log('  ✅ Todos los nodos están conectados');
} else {
  console.log(`  ❌ Solo ${visited.size}/${nodes8.length} nodos conectados`);
  isValid = false;
}

if (isValid) {
  console.log('  ✅ Árbol válido\n');
} else {
  console.log('  ❌ Árbol inválido\n');
}

console.log('=== TEST: Otras topologías ===\n');

const topologies = ['chain', 'ring', 'star', 'grid'];
topologies.forEach(topo => {
  const pos = calculatePositions(nodes8, 800, 600, topo);
  console.log(`${topo}: ${pos.length} nodos`);
  pos.forEach(p => console.log(`  ${p.node.label}: (${Math.round(p.x)}, ${Math.round(p.y)})`));
  console.log('');
});
