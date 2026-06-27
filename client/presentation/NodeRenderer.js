function isDark() {
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

function drawNode(ctx, node, x, y, radius, colors, scale = 1) {
  const { nodeActive, nodeActiveBr, nodeOff, nodeOffBr, nodeMe, nodeMeBr, lblOn, lblOff } = colors;
  const isMe = colors.myNodeId !== undefined && node.id === colors.myNodeId;

  let fill, border;
  if (!node.on) {
    fill = nodeOff;
    border = nodeOffBr;
  } else if (isMe) {
    fill = nodeMe;
    border = nodeMeBr;
  } else {
    fill = nodeActive;
    border = nodeActiveBr;
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 2 / scale;
  ctx.stroke();

  if (!node.on) {
    ctx.save();
    ctx.strokeStyle = isDark() ? '#666' : '#ccc';
    ctx.lineWidth = 2 / scale;
    ctx.lineCap = 'round';
    const s = Math.round(radius * 0.38);
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x + s, y + s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s, y - s);
    ctx.lineTo(x - s, y + s);
    ctx.stroke();
    ctx.restore();
  }

  const fs = Math.max(12, Math.round(radius * 0.6));
  ctx.fillStyle = node.on ? lblOn : lblOff;
  ctx.font = `bold ${fs}px -apple-system,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.label, x, y);

  const nameFs = Math.max(9, Math.round(radius * 0.35));
  ctx.font = `${nameFs}px -apple-system,sans-serif`;
  ctx.fillStyle = isMe ? nodeMeBr : (isDark() ? '#aaa' : '#666');
  ctx.fillText(node.name, x, y + radius + nameFs + 4);
}

function drawPacket(ctx, x, y, radius, scale = 1) {
  const pr = Math.max(7, Math.round(radius * 0.012 * 60));
  ctx.beginPath();
  ctx.arc(x, y, pr, 0, Math.PI * 2);
  ctx.fillStyle = '#f5a623';
  ctx.fill();
  ctx.strokeStyle = '#b87a10';
  ctx.lineWidth = 2 / scale;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, pr + 5, 0, Math.PI * 2);
  ctx.strokeStyle = '#f5a62355';
  ctx.lineWidth = 1 / scale;
  ctx.stroke();
}

export { drawNode, drawPacket, isDark };
