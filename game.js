const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let lastTime = 0;

/**
 * A GameState should implement:
 * - update(dt)
 * - render(ctx)
 * - onKeyDown(event) // optional, for handling input
 */
class Level {
  constructor(canvasWidth, canvasHeight) {
    this.tileSize = 32;
    const rawMap = [
      "########################",
      "#..........O....O.....##",
      "#.####################.#",
      "#..O......E....O....O..#",
      "##.##################..#",
      "#..O..O.......E....O..##",
      "#.####################.#",
      "#..O......O....O....O..#",
      "##.##################..#",
      "#..O..O.......O....O..##",
      "########################",
      "#......................#",
      "#......................#",
      "########################",
      "#......................#",
      "########################",
    ];

    this.tiles = rawMap.map((row) => row.split(""));
    this.height = this.tiles.length;
    this.width = this.tiles[0].length;
    this.carveVerticalShafts([3, 10, 15, 20], [2, 4, 6, 8, 10, 13]);

    const gridWidth = this.width * this.tileSize;
    const gridHeight = this.height * this.tileSize;
    this.offsetX = Math.max(0, Math.floor((canvasWidth - gridWidth) / 2));
    this.offsetY = Math.max(0, Math.floor((canvasHeight - gridHeight) / 2));

    this.pelletCount = 0;
    this.enemySpawns = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const tile = this.tiles[y][x];
        if (tile === "O") {
          this.pelletCount += 1;
        } else if (tile === "E") {
          this.enemySpawns.push({ x, y });
          this.tiles[y][x] = ".";
        }
      }
    }

    this.entryTile = this.findEntryTile();
    const entryCenter = this.tileToPixelCenter(this.entryTile.x, this.entryTile.y);
    this.wellPosition = {
      x: entryCenter.x,
      y: entryCenter.y - this.tileSize * 1.5,
    };
  }

  carveVerticalShafts(columns, rows) {
    for (const row of rows) {
      if (row <= 0 || row >= this.height - 1) {
        continue;
      }
      for (const col of columns) {
        if (col <= 0 || col >= this.width - 1) {
          continue;
        }
        this.tiles[row][col] = ".";
      }
    }
  }

  findEntryTile() {
    const topRow = 1;
    const centerCol = Math.floor(this.width / 2);
    for (let offset = 0; offset < this.width; offset += 1) {
      const left = centerCol - offset;
      if (left >= 0 && this.tiles[topRow][left] !== "#") {
        return { x: left, y: topRow };
      }
      const right = centerCol + offset;
      if (right < this.width && this.tiles[topRow][right] !== "#") {
        return { x: right, y: topRow };
      }
    }
    return { x: 1, y: topRow };
  }

  tileToPixelCenter(tileX, tileY) {
    const x = this.offsetX + tileX * this.tileSize + this.tileSize / 2;
    const y = this.offsetY + tileY * this.tileSize + this.tileSize / 2;
    return { x, y };
  }

  getTile(tx, ty) {
    if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) {
      return null;
    }
    return this.tiles[ty][tx];
  }

  getTileAtPixel(x, y) {
    const tx = Math.floor((x - this.offsetX) / this.tileSize);
    const ty = Math.floor((y - this.offsetY) / this.tileSize);
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) {
      return null;
    }
    return this.tiles[ty][tx];
  }

  pixelToTile(x, y) {
    const tx = Math.floor((x - this.offsetX) / this.tileSize);
    const ty = Math.floor((y - this.offsetY) / this.tileSize);
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) {
      return null;
    }
    return { x: tx, y: ty };
  }

  isTunnelTile(tile) {
    return tile === "." || tile === "O";
  }

  isTunnelAtPixel(x, y) {
    const tile = this.getTileAtPixel(x, y);
    return tile ? this.isTunnelTile(tile) : false;
  }

  removePelletAtTile(tx, ty) {
    if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) {
      return false;
    }
    if (this.tiles[ty][tx] === "O") {
      this.tiles[ty][tx] = ".";
      this.pelletCount = Math.max(0, this.pelletCount - 1);
      return true;
    }
    return false;
  }

  hasPelletsRemaining() {
    return this.pelletCount > 0;
  }

  getEnemySpawnPositions() {
    return this.enemySpawns.map(({ x, y }) => this.tileToPixelCenter(x, y));
  }

  getEntryTile() {
    return { ...this.entryTile };
  }

  getWellPosition() {
    return { ...this.wellPosition };
  }

  render(ctx) {
    const { width, height } = ctx.canvas;
    const surfaceBand = Math.max(40, this.offsetY * 0.5);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, surfaceBand);
    skyGrad.addColorStop(0, "#4f7ecf");
    skyGrad.addColorStop(0.5, "#f4d879");
    skyGrad.addColorStop(1, "#c97938");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, surfaceBand);

    ctx.fillStyle = "#2f1f16";
    ctx.fillRect(0, surfaceBand, width, this.offsetY);

    const rockGrad = ctx.createLinearGradient(0, this.offsetY, 0, height);
    rockGrad.addColorStop(0, "#1a1412");
    rockGrad.addColorStop(0.5, "#201a18");
    rockGrad.addColorStop(1, "#120d0c");
    ctx.fillStyle = rockGrad;
    ctx.fillRect(0, this.offsetY, width, height - this.offsetY);

    ctx.save();
    ctx.lineJoin = "round";
    const tunnelInset = -Math.max(2, this.tileSize * 0.08);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const tile = this.tiles[y][x];
        const px = this.offsetX + x * this.tileSize;
        const py = this.offsetY + y * this.tileSize;

        if (tile === "#") {
          ctx.fillStyle = "#1a120f";
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
          continue;
        }

        const tunnelWidth = this.tileSize - tunnelInset * 2;
        const tunnelHeight = this.tileSize - tunnelInset * 2;
        const rx = px + tunnelInset;
        const ry = py + tunnelInset;
        const path = new Path2D();
        const radius = Math.min(10, this.tileSize * 0.35);
        path.roundRect(rx, ry, tunnelWidth, tunnelHeight, radius);
        const tunnelGrad = ctx.createLinearGradient(rx, ry, rx, ry + tunnelHeight);
        tunnelGrad.addColorStop(0, "#4a3d33");
        tunnelGrad.addColorStop(1, "#2e241e");
        ctx.fillStyle = tunnelGrad;
        ctx.fill(path);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(rx, ry, tunnelWidth, 2);

        if (tile === "O") {
          const cx = px + this.tileSize / 2;
          const cy = py + this.tileSize / 2;
          const glow = ctx.createRadialGradient(
            cx,
            cy,
            2,
            cx,
            cy,
            this.tileSize * 0.4
          );
          glow.addColorStop(0, "#ffe69f");
          glow.addColorStop(0.4, "#f5a623");
          glow.addColorStop(1, "rgba(245,166,35,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(cx, cy, this.tileSize * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }
}

class Drill {
  constructor(level, wellPosition, entryTile, onPelletCollected) {
    this.level = level;
    this.wellPosition = { ...wellPosition };
    this.entryTile = { ...entryTile };
    this.x = wellPosition.x;
    this.y = wellPosition.y;
    this.onPelletCollected = onPelletCollected;
    this.speed = 200;
    this.radius = level.tileSize * 0.3;
    this.color = "#ff914d";
    this.outline = "#351a0f";
    this.pipePoints = [{ x: this.x, y: this.y }];
    this.currentTileX = entryTile.x;
    this.currentTileY = entryTile.y;
    this.dirX = 0;
    this.dirY = 0;
    this.intentDirX = 0;
    this.intentDirY = 0;
    this.pendingDirX = 0;
    this.pendingDirY = 0;
    this.destinationTile = null;
    this.isRetracting = false;
    this.retractSpeed = this.speed * 2;
    this.facingAngle = Math.PI / 2;
    this.lastForwardX = 0;
    this.lastForwardY = 0;
    this.tileTrail = [];
  }

  setDirection(dx, dy) {
    if (this.isRetracting) {
      return;
    }
    this.intentDirX = dx;
    this.intentDirY = dy;
    this.pendingDirX = dx;
    this.pendingDirY = dy;
  }

  startRetract() {
    if (this.pipePoints.length <= 1) {
      return;
    }
    this.isRetracting = true;
    this.dirX = 0;
    this.dirY = 0;
    this.pendingDirX = 0;
    this.pendingDirY = 0;
    this.intentDirX = 0;
    this.intentDirY = 0;
    this.destinationTile = null;
    this.lastForwardX = 0;
    this.lastForwardY = 0;
    this.updateHeadPipePoint();
  }

  stopRetract() {
    if (!this.isRetracting) {
      return;
    }
    this.isRetracting = false;
    this.updateHeadPipePoint();
    this.syncCurrentTile();
  }

  update(dt) {
    if (this.isRetracting) {
      this.retractAlongPipe(dt);
      return;
    }
    const center = this.getCurrentTileCenter();
    if (center) {
      this.snapToCenterIfClose(center);
      this.handleInitialDrop(center);
      this.lockPerpendicularAxis(center);
    }

    if (!this.destinationTile && center) {
      if (!this.tryApplyPendingDirection()) {
        this.tryContinueForward();
      }
    }

    if (!this.destinationTile) {
      return;
    }

    this.advanceTowardDestination(dt);
    this.trackPipeProgress();
    this.checkPelletCollection();
  }

  retractAlongPipe(dt) {
    if (this.pipePoints.length <= 1) {
      const anchor = this.pipePoints[0] || { x: this.x, y: this.y };
      this.x = anchor.x;
      this.y = anchor.y;
      this.updateHeadPipePoint();
      this.syncCurrentTile();
      this.currentTileX = this.entryTile.x;
      this.currentTileY = this.entryTile.y;
      this.lastForwardX = 0;
      this.lastForwardY = 0;
      this.tileTrail = [];
      this.isRetracting = false;
      return;
    }

    const targetIndex = this.pipePoints.length - 2;
    const target = this.pipePoints[targetIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxStep = this.retractSpeed * dt;
    this.updateFacingFromVector(dx, dy);

    if (dist <= maxStep) {
      this.x = target.x;
      this.y = target.y;
      this.pipePoints.pop();
      if (this.tileTrail.length > 0) {
        this.tileTrail.pop();
      }
      this.updateHeadPipePoint();
      this.syncCurrentTile();
      if (this.pipePoints.length === 1) {
        this.isRetracting = false;
        this.currentTileX = this.entryTile.x;
        this.currentTileY = this.entryTile.y;
        this.lastForwardX = 0;
        this.lastForwardY = 0;
        this.tileTrail = [];
      }
      return;
    }

    this.x += (dx / dist) * maxStep;
    this.y += (dy / dist) * maxStep;
    this.updateHeadPipePoint();
    this.syncCurrentTile();
  }

  checkPelletCollection() {
    const tileCoords = this.level.pixelToTile(this.x, this.y);
    if (!tileCoords) {
      return;
    }
    const { x: tileX, y: tileY } = tileCoords;
    if (this.level.removePelletAtTile(tileX, tileY) && this.onPelletCollected) {
      this.onPelletCollected(tileX, tileY);
    }
  }

  trackPipeProgress() {
    const tileCoords = this.level.pixelToTile(this.x, this.y);
    if (!tileCoords) {
      this.updateHeadPipePoint();
      return;
    }

    const { x: tileX, y: tileY } = tileCoords;
    if (tileX === this.currentTileX && tileY === this.currentTileY) {
      this.updateHeadPipePoint();
      return;
    }

    this.currentTileX = tileX;
    this.currentTileY = tileY;
    const center = this.level.tileToPixelCenter(tileX, tileY);
    if (
      !this.tileTrail.length ||
      this.tileTrail[this.tileTrail.length - 1].x !== tileX ||
      this.tileTrail[this.tileTrail.length - 1].y !== tileY
    ) {
      this.tileTrail.push({ x: tileX, y: tileY });
    }
    if (this.pipePoints.length === 0) {
      this.pipePoints.push(center);
      this.pipePoints.push({ x: this.x, y: this.y });
      return;
    }

    if (this.pipePoints.length === 1) {
      this.pipePoints.push(center);
      this.pipePoints.push({ x: this.x, y: this.y });
      return;
    }

    this.pipePoints[this.pipePoints.length - 1] = center;
    this.pipePoints.push({ x: this.x, y: this.y });
  }

  updateHeadPipePoint() {
    const headPoint = { x: this.x, y: this.y };
    if (this.pipePoints.length === 0) {
      this.pipePoints.push(headPoint);
      return;
    }
    this.pipePoints[this.pipePoints.length - 1] = headPoint;
  }

  syncCurrentTile() {
    const tileCoords = this.level.pixelToTile(this.x, this.y);
    if (tileCoords) {
      this.currentTileX = tileCoords.x;
      this.currentTileY = tileCoords.y;
    }
  }

  getCurrentTileCenter() {
    if (
      typeof this.currentTileX !== "number" ||
      typeof this.currentTileY !== "number"
    ) {
      return this.level.tileToPixelCenter(this.entryTile.x, this.entryTile.y);
    }
    return this.level.tileToPixelCenter(this.currentTileX, this.currentTileY);
  }

  snapToCenterIfClose(center) {
    const dx = center.x - this.x;
    const dy = center.y - this.y;
    if (Math.hypot(dx, dy) <= 1) {
      this.x = center.x;
      this.y = center.y;
      if (!this.destinationTile) {
        this.dirX = 0;
        this.dirY = 0;
      }
    }
  }

  handleInitialDrop(center) {
    if (this.destinationTile || this.dirX !== 0 || this.dirY !== 0) {
      return;
    }
    const wantsDown = this.pendingDirY === 1 || this.intentDirY === 1;
    if (!wantsDown) {
      return;
    }
    if (center.y - this.y > 1) {
      this.dirX = 0;
      this.dirY = 1;
      this.destinationTile = { x: this.currentTileX, y: this.currentTileY };
      this.pendingDirX = 0;
      this.pendingDirY = 0;
      this.updateFacingFromVector(0, 1);
      this.lastForwardX = 0;
      this.lastForwardY = 1;
    }
  }

  lockPerpendicularAxis(center) {
    if (!center) {
      return;
    }
    if (this.dirX !== 0) {
      this.y = center.y;
    } else if (this.dirY !== 0) {
      this.x = center.x;
    }
  }

  tryApplyPendingDirection() {
    if (this.pendingDirX === 0 && this.pendingDirY === 0) {
      return false;
    }
    const applied = this.trySetDirection(this.pendingDirX, this.pendingDirY);
    if (applied) {
      this.pendingDirX = 0;
      this.pendingDirY = 0;
    }
    return applied;
  }

  tryContinueForward() {
    if (this.intentDirX === 0 && this.intentDirY === 0) {
      return false;
    }
    return this.trySetDirection(this.intentDirX, this.intentDirY);
  }

  trySetDirection(dx, dy) {
    if (dx === 0 && dy === 0) {
      return false;
    }
    if (this.destinationTile) {
      return false;
    }
    if (
      this.lastForwardX === -dx &&
      this.lastForwardY === -dy &&
      (this.lastForwardX !== 0 || this.lastForwardY !== 0)
    ) {
      return false;
    }
    const targetTileX = this.currentTileX + dx;
    const targetTileY = this.currentTileY + dy;
    const tile = this.level.getTile(targetTileX, targetTileY);
    if (!tile || !this.level.isTunnelTile(tile)) {
      return false;
    }
    if (
      this.tileTrail.some(
        (node) => node.x === targetTileX && node.y === targetTileY
      )
    ) {
      return false;
    }
    this.dirX = dx;
    this.dirY = dy;
    this.destinationTile = { x: targetTileX, y: targetTileY };
    this.updateFacingFromVector(dx, dy);
    this.lastForwardX = dx;
    this.lastForwardY = dy;
    return true;
  }

  advanceTowardDestination(dt) {
    if (!this.destinationTile) {
      return;
    }
    const destCenter = this.level.tileToPixelCenter(
      this.destinationTile.x,
      this.destinationTile.y
    );
    const moveDist = this.speed * dt;
    const dx = destCenter.x - this.x;
    const dy = destCenter.y - this.y;
    const distanceToDest = Math.hypot(dx, dy);

    if (distanceToDest <= moveDist) {
      this.x = destCenter.x;
      this.y = destCenter.y;
      this.currentTileX = this.destinationTile.x;
      this.currentTileY = this.destinationTile.y;
      this.destinationTile = null;
      this.dirX = 0;
      this.dirY = 0;
      if (!this.tryApplyPendingDirection()) {
        this.tryContinueForward();
      }
      return;
    }

    if (this.dirX !== 0) {
      this.x += this.dirX * moveDist;
      const rowCenter = this.level.tileToPixelCenter(
        this.currentTileX,
        this.currentTileY
      ).y;
      this.y = rowCenter;
    } else if (this.dirY !== 0) {
      this.y += this.dirY * moveDist;
      const colCenter = this.level.tileToPixelCenter(
        this.currentTileX,
        this.currentTileY
      ).x;
      this.x = colCenter;
    }
  }

  updateFacingFromVector(dx, dy) {
    if (dx === 0 && dy === 0) {
      return;
    }
    this.facingAngle = Math.atan2(dy, dx);
  }

  renderPipe(ctx) {
    if (this.pipePoints.length < 1) {
      return;
    }

    ctx.beginPath();
    const first = this.pipePoints[0];
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < this.pipePoints.length; i += 1) {
      const point = this.pipePoints[i];
      ctx.lineTo(point.x, point.y);
    }
    const lastPoint = this.pipePoints[this.pipePoints.length - 1];
    if (lastPoint.x !== this.x || lastPoint.y !== this.y) {
      ctx.lineTo(this.x, this.y);
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.save();
    const bounds = this.pipePoints.reduce(
      (acc, p) => {
        acc.minY = Math.min(acc.minY, p.y);
        acc.maxY = Math.max(acc.maxY, p.y);
        return acc;
      },
      { minY: this.pipePoints[0].y, maxY: this.pipePoints[0].y }
    );
    const grad = ctx.createLinearGradient(0, bounds.minY, 0, bounds.maxY + 1);
    grad.addColorStop(0, "#bfc5ce");
    grad.addColorStop(1, "#8d949f");
    ctx.lineWidth = 12;
    ctx.strokeStyle = grad;
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.stroke();
    ctx.restore();
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facingAngle);
    const bodyLength = this.radius * 3.6;
    const bodyWidth = this.radius * 1.4;
    const startX = -bodyLength * 0.3;
    const bodyPath = new Path2D();
    bodyPath.roundRect(startX, -bodyWidth / 2, bodyLength, bodyWidth, bodyWidth / 2);
    const bodyGrad = ctx.createLinearGradient(startX, 0, startX + bodyLength, 0);
    bodyGrad.addColorStop(0, "#4b4f5c");
    bodyGrad.addColorStop(0.5, "#858b97");
    bodyGrad.addColorStop(1, "#353943");
    ctx.fillStyle = bodyGrad;
    ctx.fill(bodyPath);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#21242b";
    ctx.stroke(bodyPath);

    const tipLength = bodyWidth * 0.9;
    const tipPath = new Path2D();
    tipPath.moveTo(startX + bodyLength, 0);
    tipPath.lineTo(startX + bodyLength + tipLength, -bodyWidth * 0.4);
    tipPath.lineTo(startX + bodyLength + tipLength, bodyWidth * 0.4);
    tipPath.closePath();
    const tipGrad = ctx.createLinearGradient(
      startX + bodyLength,
      0,
      startX + bodyLength + tipLength,
      0
    );
    tipGrad.addColorStop(0, "#c96d32");
    tipGrad.addColorStop(1, "#a44e1a");
    ctx.fillStyle = tipGrad;
    ctx.fill(tipPath);
    ctx.stroke(tipPath);

    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX + bodyLength * 0.1, -bodyWidth * 0.3);
    ctx.lineTo(startX + bodyLength * 0.8, -bodyWidth * 0.3);
    ctx.stroke();

    const lightY = -bodyWidth * 0.8;
    ctx.beginPath();
    ctx.arc(startX + bodyLength * 0.2, lightY, bodyWidth * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe29a";
    ctx.shadowColor = "#ffd986";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }
}

class Enemy {
  constructor(level, x, y, dirX = 1, dirY = 0, speed = 90) {
    this.level = level;
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.speed = speed;
    this.radius = Math.max(8, level.tileSize * 0.25);
    this.spawn = { x, y, dirX, dirY, speed };
    this.color = "#ff4d6d";
  }

  update(dt) {
    const nextX = this.x + this.dirX * this.speed * dt;
    const nextY = this.y + this.dirY * this.speed * dt;
    if (this.level.isTunnelAtPixel(nextX, nextY)) {
      this.x = nextX;
      this.y = nextY;
    } else {
      this.dirX = -this.dirX;
      this.dirY = -this.dirY;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const bodyWidth = this.radius * 1.6;
    const bodyHeight = this.radius * 1.1;
    const bodyGrad = ctx.createLinearGradient(0, -bodyHeight, 0, bodyHeight);
    bodyGrad.addColorStop(0, "#ff8f8f");
    bodyGrad.addColorStop(1, "#c73d4d");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#7b2434";
    ctx.beginPath();
    ctx.ellipse(0, bodyHeight * 0.7, bodyWidth * 0.7, bodyHeight * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(-bodyWidth * 0.6, -bodyHeight, bodyWidth * 0.18, bodyWidth * 0.25, 0, 0, Math.PI, true);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bodyWidth * 0.6, -bodyHeight, bodyWidth * 0.18, bodyWidth * 0.25, 0, 0, Math.PI, true);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-bodyWidth * 0.25, -bodyHeight * 0.2, this.radius * 0.25, 0, Math.PI * 2);
    ctx.arc(bodyWidth * 0.25, -bodyHeight * 0.2, this.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(-bodyWidth * 0.25, -bodyHeight * 0.2, this.radius * 0.12, 0, Math.PI * 2);
    ctx.arc(bodyWidth * 0.25, -bodyHeight * 0.2, this.radius * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#762032";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-bodyWidth * 0.2, bodyHeight * 0.5);
    ctx.lineTo(-bodyWidth * 0.5, bodyHeight * 0.9);
    ctx.moveTo(bodyWidth * 0.2, bodyHeight * 0.5);
    ctx.lineTo(bodyWidth * 0.5, bodyHeight * 0.9);
    ctx.stroke();

    ctx.restore();
  }

  reset() {
    this.x = this.spawn.x;
    this.y = this.spawn.y;
    this.dirX = this.spawn.dirX;
    this.dirY = this.spawn.dirY;
    this.speed = this.spawn.speed;
  }
}

class MenuState {
  constructor(game) {
    this.game = game;
  }

  update(dt) {
    // No menu updates yet, but keep the method for consistency.
  }

  render(ctx) {
    const { width, height } = this.game.canvas;
    ctx.fillStyle = "#f5f5f5";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "36px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Oil's Well Remake", width / 2, height / 2 - 30);

    ctx.font = "22px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Press Enter to Start", width / 2, height / 2 + 20);
  }

  onKeyDown(event) {
    if (event.key === "Enter") {
      this.game.setState(new PlayState(this.game));
    }
  }
}

class PlayState {
  constructor(game) {
    this.game = game;
    this.level = new Level(game.canvas.width, game.canvas.height);
    this.score = 0;
    this.levelComplete = false;
    this.lives = 3;
    this.startTile = this.level.getEntryTile();
    this.wellPosition = this.level.getWellPosition();
    this.drill = this.createDrill();
    this.enemyBlueprints = this.level.getEnemySpawnPositions().map((spawn) => ({
      x: spawn.x,
      y: spawn.y,
      dirX: Math.random() < 0.5 ? -1 : 1,
      dirY: 0,
      speed: 70 + Math.random() * 60,
    }));
    this.resetEnemies();
  }

  update(dt) {
    this.drill.update(dt);
    for (const enemy of this.enemies) {
      enemy.update(dt);
    }
    if (this.handleEnemyInteractions()) {
      return;
    }
  }

  render(ctx) {
    this.level.render(ctx);
    this.renderWell(ctx);
    this.drill.renderPipe(ctx);
    for (const enemy of this.enemies) {
      enemy.render(ctx);
    }
    this.drill.render(ctx);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = "#ffffff88";
    ctx.fillText("DEBUG: PLAY STATE", 12, 12);

    this.renderHud(ctx);
  }

  onKeyDown(event) {
    let handled = false;
    switch (event.key) {
      case "ArrowUp":
        this.drill.setDirection(0, -1);
        handled = true;
        break;
      case "ArrowDown":
        this.drill.setDirection(0, 1);
        handled = true;
        break;
      case "ArrowLeft":
        this.drill.setDirection(-1, 0);
        handled = true;
        break;
      case "ArrowRight":
        this.drill.setDirection(1, 0);
        handled = true;
        break;
      default:
        break;
    }

    if (event.code === "Space") {
      this.drill.startRetract();
      handled = true;
    }

    if (handled) {
      event.preventDefault();
    }
  }

  onKeyUp(event) {
    if (event.code === "Space") {
      this.drill.stopRetract();
      event.preventDefault();
    }
  }

  handlePelletCollected() {
    this.score += 10;
    if (this.level.pelletCount === 0) {
      this.levelComplete = true;
    }
  }

  renderHud(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(10,10,10,0.6)";
    ctx.fillRect(0, 0, this.game.canvas.width, 42);

    ctx.fillStyle = "#f4f6f8";
    ctx.font = "14px 'Segoe UI', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 20, 21);

    ctx.textAlign = "center";
    ctx.fillText(`Pellets: ${this.level.pelletCount}`, this.game.canvas.width / 2, 21);

    ctx.textAlign = "right";
    ctx.fillText(`Lives: ${this.lives}`, this.game.canvas.width - 20, 21);

    if (this.levelComplete) {
      ctx.textAlign = "center";
      ctx.font = "40px 'Segoe UI', sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 12;
      ctx.fillText(
        "LEVEL COMPLETE!",
        this.game.canvas.width / 2,
        this.game.canvas.height * 0.15
      );
    }

    ctx.restore();
  }

  createDrill() {
    return new Drill(this.level, this.wellPosition, this.startTile, (tx, ty) => {
      this.handlePelletCollected(tx, ty);
    });
  }

  resetDrillAndPipe() {
    this.drill = this.createDrill();
  }

  resetEnemies() {
    this.enemies = this.enemyBlueprints.map((data) =>
      new Enemy(this.level, data.x, data.y, data.dirX, data.dirY, data.speed)
    );
  }

  handleEnemyInteractions() {
    const survivors = [];
    for (const enemy of this.enemies) {
      const dx = enemy.x - this.drill.x;
      const dy = enemy.y - this.drill.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= enemy.radius + this.drill.radius) {
        this.score += 50;
        continue;
      }

      if (this.enemyHitsPipe(enemy)) {
        this.handleLifeLost();
        return true;
      }

      survivors.push(enemy);
    }

    this.enemies = survivors;
    return false;
  }

  enemyHitsPipe(enemy) {
    const points = this.drill.pipePoints;
    if (points.length < 2) {
      return false;
    }

    const pipeRadius = 4;
    const threshold = enemy.radius + pipeRadius;
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const dist = distancePointToSegment(enemy.x, enemy.y, a.x, a.y, b.x, b.y);
      if (dist <= threshold) {
        return true;
      }
    }
    return false;
  }

  handleLifeLost() {
    if (this.lives <= 0) {
      return;
    }
    this.lives -= 1;
    if (this.lives <= 0) {
      this.game.setState(new GameOverState(this.game, this.score));
      return;
    }
    this.resetDrillAndPipe();
    this.resetEnemies();
  }

  renderWell(ctx) {
    const well = this.wellPosition;
    ctx.save();
    ctx.translate(well.x, well.y);
    ctx.fillStyle = "#d8d4d0";
    ctx.fillRect(-18, -10, 36, 12);

    ctx.fillStyle = "#5b5e68";
    ctx.fillRect(-6, -this.level.tileSize * 0.7, 12, this.level.tileSize * 0.7);
    ctx.fillRect(-2, -this.level.tileSize * 1.1, 4, this.level.tileSize * 0.4);

    ctx.strokeStyle = "#262832";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.lineTo(-18, -28);
    ctx.lineTo(-10, -32);
    ctx.lineTo(-10, -14);
    ctx.moveTo(18, -10);
    ctx.lineTo(18, -30);
    ctx.lineTo(10, -32);
    ctx.lineTo(10, -14);
    ctx.stroke();

    ctx.fillStyle = "#d5a742";
    ctx.fillRect(-22, -14, 44, 6);
    ctx.restore();
  }
}

class GameOverState {
  constructor(game, finalScore) {
    this.game = game;
    this.finalScore = finalScore;
  }

  update(dt) {}

  render(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "54px 'Segoe UI', sans-serif";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 14;
    ctx.fillText("GAME OVER", this.game.canvas.width / 2, this.game.canvas.height / 2 - 40);
    ctx.font = "26px 'Segoe UI', sans-serif";
    ctx.fillText(`Final Score: ${this.finalScore}`, this.game.canvas.width / 2, this.game.canvas.height / 2 + 10);
    ctx.font = "20px 'Segoe UI', sans-serif";
    ctx.fillText(
      "Press Enter to return to menu",
      this.game.canvas.width / 2,
      this.game.canvas.height / 2 + 50
    );
    ctx.restore();
  }

  onKeyDown(event) {
    if (event.key === "Enter") {
      this.game.setState(new MenuState(this.game));
    }
  }
}

function distancePointToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLengthSq = abx * abx + aby * aby;
  let t = 0;
  if (abLengthSq > 0) {
    t = (apx * abx + apy * aby) / abLengthSq;
    t = Math.max(0, Math.min(1, t));
  }
  const closestX = ax + abx * t;
  const closestY = ay + aby * t;
  const dx = px - closestX;
  const dy = py - closestY;
  return Math.hypot(dx, dy);
}

class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.currentState = new MenuState(this);
  }

  setState(state) {
    this.currentState = state;
  }

  update(dt) {
    if (this.currentState && typeof this.currentState.update === "function") {
      this.currentState.update(dt);
    }
  }

  render() {
    // Clear to a consistent background before drawing the active state.
    this.ctx.fillStyle = "#151515";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.currentState && typeof this.currentState.render === "function") {
      this.currentState.render(this.ctx);
    }
  }

  handleKeyDown(event) {
    if (this.currentState && typeof this.currentState.onKeyDown === "function") {
      this.currentState.onKeyDown(event);
    }
  }

  handleKeyUp(event) {
    if (this.currentState && typeof this.currentState.onKeyUp === "function") {
      this.currentState.onKeyUp(event);
    }
  }
}

const game = new Game(canvas, ctx);

window.addEventListener("keydown", (event) => {
  game.handleKeyDown(event);
});

window.addEventListener("keyup", (event) => {
  game.handleKeyUp(event);
});

function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  game.update(dt);
  game.render();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
