const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let lastTime = 0;
const LEVEL_COMPLETE_BONUS = 1000;

/**
 * Sound Manager - Handles all audio using Web Audio API
 */
class SoundManager {
  constructor() {
    this.audioContext = null;
    this.muted = false;
    this.masterGain = null;
    this.drillLoopNode = null;
    this.drillLoopGain = null;
    this.initAudio();
  }

  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3; // Master volume at 30%
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.3;
    }
    return this.muted;
  }

  // Drill extending sound (mechanical whirring)
  playDrillExtend() {
    if (!this.audioContext || this.muted) return;

    // Start looping drill sound if not already playing
    if (!this.drillLoopNode) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.value = 80;
      filter.type = "lowpass";
      filter.frequency.value = 400;
      filter.Q.value = 5;

      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.08, this.audioContext.currentTime + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      this.drillLoopNode = osc;
      this.drillLoopGain = gain;
    }
  }

  // Stop drill sound
  stopDrillExtend() {
    if (this.drillLoopNode) {
      const now = this.audioContext.currentTime;
      this.drillLoopGain.gain.linearRampToValueAtTime(0, now + 0.1);
      setTimeout(() => {
        if (this.drillLoopNode) {
          this.drillLoopNode.stop();
          this.drillLoopNode = null;
          this.drillLoopGain = null;
        }
      }, 150);
    }
  }

  // Drill retracting (fast whoosh)
  playDrillRetract() {
    if (!this.audioContext || this.muted) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Collecting sats (coin pickup)
  playCoinCollect() {
    if (!this.audioContext || this.muted) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Level complete (triumphant)
  playLevelComplete() {
    if (!this.audioContext || this.muted) return;

    const now = this.audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const startTime = now + i * 0.15;

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  // Enemy destroyed (crunch)
  playEnemyDestroyed() {
    if (!this.audioContext || this.muted) return;

    const noise = this.audioContext.createBufferSource();
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  // Enemy hits pipe (metallic crack)
  playPipeHit() {
    if (!this.audioContext || this.muted) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Lose a life (dramatic descending)
  playLifeLost() {
    if (!this.audioContext || this.muted) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Game over (somber)
  playGameOver() {
    if (!this.audioContext || this.muted) return;

    const now = this.audioContext.currentTime;
    const notes = [392, 349.23, 293.66, 261.63]; // G, F, D, C (descending)

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const startTime = now + i * 0.2;

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  // Menu select (click)
  playMenuSelect() {
    if (!this.audioContext || this.muted) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;

    osc.type = "sine";
    osc.frequency.value = 600;

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Time warning (tense pulse)
  playTimeWarning() {
    if (!this.audioContext || this.muted) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;

    osc.type = "sine";
    osc.frequency.value = 440;

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }
}

// Global sound manager instance
const soundManager = new SoundManager();

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
      "##############################",
      "..O....E....O....E....O.......",
      "###.#######.#########.########",
      "..O..E....O...E....O..E.......",
      "######.#########.#######.#####",
      "..E....O....E....O....E.......",
      "#####.########.#######.#######",
      "....O....E....O....E....O.....",
      "########.#########.###########",
      "..O...E....O...E....O...E.....",
      "####.########.#####.#####.####",
      "....E....O....E....O....E.....",
      "#######.#######.#######.######",
      "..E....O....E....O....E.......",
      "#####.######.#######.#########",
      "....O....E....O....E....O.....",
      "##############################",
    ];

    this.tiles = rawMap.map((row) => row.split(""));
    this.height = this.tiles.length;
    this.width = this.tiles[0].length;
    this.coinSpin = 0;

    const gridWidth = this.width * this.tileSize;
    const gridHeight = this.height * this.tileSize;
    this.offsetX = Math.max(0, Math.floor((canvasWidth - gridWidth) / 2));
    const verticalExtra = Math.max(0, canvasHeight - gridHeight);
    this.offsetY = verticalExtra;

    this.pelletCount = 0;
    this.enemyLaneData = new Map();
    for (let y = 0; y < this.height; y += 1) {
      let rowOpenCount = 0;
      let minX = this.width;
      let maxX = -1;
      for (let x = 0; x < this.width; x += 1) {
        const tile = this.tiles[y][x];
        if (tile === "O") {
          this.pelletCount += 1;
        }
        if (tile !== "#") {
          rowOpenCount += 1;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
        if (tile === "E") {
          this.tiles[y][x] = ".";
        }
      }
      if (rowOpenCount > this.width * 0.6) {
        this.enemyLaneData.set(y, { yTile: y, minX, maxX });
      }
    }

    this.entryTile = this.findEntryTile();
    const entryCenter = this.tileToPixelCenter(this.entryTile.x, this.entryTile.y);
    this.wellPosition = {
      x: entryCenter.x,
      y: entryCenter.y - this.tileSize * 1.5,
    };
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

  getEnemyLanes() {
    if (!this.enemyLaneInfo) {
      this.enemyLaneInfo = Array.from(this.enemyLaneData.values()).map(
        ({ yTile, minX, maxX }) => ({
          y: this.tileToPixelCenter(0, yTile).y,
          leftX: this.tileToPixelCenter(minX, yTile).x,
          rightX: this.tileToPixelCenter(maxX, yTile).x,
        })
      );
    }
    return this.enemyLaneInfo;
  }

  getEntryTile() {
    return { ...this.entryTile };
  }

  getWellPosition() {
    return { ...this.wellPosition };
  }

  render(ctx) {
    const { width, height } = ctx.canvas;
    const horizonHeight = Math.max(120, this.offsetY * 0.6);

    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonHeight);
    skyGradient.addColorStop(0, "#0f192f");
    skyGradient.addColorStop(0.4, "#203a6b");
    skyGradient.addColorStop(0.75, "#c4a06c");
    skyGradient.addColorStop(1, "#f6c066");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, horizonHeight);

    // Stylized sun
    const sunX = width * 0.5;
    const sunY = horizonHeight * 0.35;
    const sunRadius = horizonHeight * 0.25;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.2, sunX, sunY, sunRadius);
    sunGrad.addColorStop(0, "#fff7d2");
    sunGrad.addColorStop(0.5, "#ffd38a");
    sunGrad.addColorStop(1, "rgba(255,211,138,0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Above-ground silhouettes
    ctx.fillStyle = "#41291e";
    const terrainHeight = horizonHeight * 0.25;
    ctx.beginPath();
    ctx.moveTo(0, horizonHeight - terrainHeight);
    for (let x = 0; x <= width; x += width / 6) {
      const randomBump = Math.sin((x / width) * Math.PI * 2) * terrainHeight * 0.3;
      ctx.lineTo(x, horizonHeight - terrainHeight + randomBump);
    }
    ctx.lineTo(width, horizonHeight);
    ctx.lineTo(0, horizonHeight);
    ctx.closePath();
    ctx.fill();

    const soilBandGrad = ctx.createLinearGradient(0, horizonHeight - terrainHeight * 0.1, 0, this.offsetY);
    soilBandGrad.addColorStop(0, "rgba(92,59,43,0)");
    soilBandGrad.addColorStop(0.5, "rgba(74,46,33,0.35)");
    soilBandGrad.addColorStop(1, "#241710");
    ctx.fillStyle = soilBandGrad;
    ctx.fillRect(0, horizonHeight, width, this.offsetY - horizonHeight);

    // Rolling hill accents
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    const hillBaseY = horizonHeight - terrainHeight * 0.2;
    ctx.moveTo(0, hillBaseY);
    ctx.quadraticCurveTo(width * 0.2, hillBaseY - terrainHeight * 0.35, width * 0.4, hillBaseY - terrainHeight * 0.1);
    ctx.quadraticCurveTo(width * 0.6, hillBaseY + terrainHeight * 0.15, width * 0.8, hillBaseY - terrainHeight * 0.05);
    ctx.lineTo(width, hillBaseY + terrainHeight * 0.2);
    ctx.lineTo(width, hillBaseY);
    ctx.closePath();
    ctx.fill();

    this.renderTree(ctx, width, horizonHeight, terrainHeight);

    // Underground rock
    const rockGrad = ctx.createLinearGradient(0, this.offsetY, 0, height);
    rockGrad.addColorStop(0, "#1a1412");
    rockGrad.addColorStop(0.5, "#201a18");
    rockGrad.addColorStop(1, "#120d0c");
    ctx.fillStyle = rockGrad;
    ctx.fillRect(0, this.offsetY, width, height - this.offsetY);

    ctx.save();
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
        const radius = Math.min(12, this.tileSize * 0.35);
        const neighbors = {
          left: x > 0 && this.tiles[y][x - 1] !== "#",
          right: x < this.width - 1 && this.tiles[y][x + 1] !== "#",
          up: y > 0 && this.tiles[y - 1][x] !== "#",
          down: y < this.height - 1 && this.tiles[y + 1][x] !== "#",
        };

        const isVerticalOnly =
          (neighbors.up || neighbors.down) && !neighbors.left && !neighbors.right;

        const radii = {
          tl: neighbors.up || neighbors.left ? 0 : radius,
          tr: neighbors.up || neighbors.right ? 0 : radius,
          br: neighbors.down || neighbors.right ? 0 : radius,
          bl: neighbors.down || neighbors.left ? 0 : radius,
        };

        if (isVerticalOnly) {
          radii.tl = radii.tr = radii.br = radii.bl = 0;
        }

        const path = new Path2D();
        addRoundedRectPath(path, rx, ry, tunnelWidth, tunnelHeight, radii);
        const tunnelGrad = ctx.createLinearGradient(rx, ry, rx, ry + tunnelHeight);
        tunnelGrad.addColorStop(0, "#4a3d33");
        tunnelGrad.addColorStop(1, "#2e241e");
        ctx.fillStyle = tunnelGrad;
        ctx.fill(path);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(rx + 2, ry + 1, tunnelWidth - 4, 2);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(rx + 2, ry + tunnelHeight - 3, tunnelWidth - 4, 2);

        if (tile === "O") {
          this.renderCoin(ctx, px, py, x, y);
        }
      }
    }
    ctx.restore();
  }

  renderCoin(ctx, px, py, tileX, tileY) {
    const cx = px + this.tileSize / 2;
    const cy = py + this.tileSize / 2;
    const baseRadius = this.tileSize * 0.32;
    const wobble = Math.abs(
      Math.sin(this.coinSpin + (tileX + tileY) * 0.4)
    );
    const scaleX = 0.45 + wobble * 0.35;
    const scaleY = 0.55 - wobble * 0.25;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleX, scaleY);

    const coinGrad = ctx.createRadialGradient(0, -baseRadius * 0.2, baseRadius * 0.2, 0, 0, baseRadius);
    coinGrad.addColorStop(0, "#ffe7a2");
    coinGrad.addColorStop(0.6, "#f1b34d");
    coinGrad.addColorStop(1, "#c4792c");
    ctx.fillStyle = coinGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, baseRadius, baseRadius, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 0, baseRadius * 0.85, baseRadius * 0.85, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#8c4d1c";
    ctx.beginPath();
    ctx.ellipse(0, 0, baseRadius * 0.95, baseRadius * 0.95, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = `bold ${baseRadius * 1.5}px 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.scale(1 / scaleX, 1 / scaleY); // revert scale for text width consistency
    ctx.fillText("₿", 0, 0);

    ctx.restore();

    const glow = ctx.createRadialGradient(
      cx,
      cy,
      2,
      cx,
      cy,
      this.tileSize * 0.5
    );
    glow.addColorStop(0, "rgba(255,214,120,0.8)");
    glow.addColorStop(1, "rgba(255,207,92,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, this.tileSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  update(dt) {
    this.coinSpin = (this.coinSpin + dt * 4) % (Math.PI * 2);
  }

  renderTree(ctx, width, horizonHeight, terrainHeight) {
    const treeBaseY = horizonHeight - terrainHeight * 0.25;
    const treeHeight = terrainHeight * 0.9;
    const treeWidth = treeHeight * 0.6;
    const randomSeed = Math.sin(this.offsetX + this.offsetY * 0.5);
    const treeX = width * 0.2 + width * 0.6 * (randomSeed * 0.5 + 0.5);

    ctx.save();
    ctx.translate(treeX, treeBaseY);

    ctx.fillStyle = "#5c3a2a";
    ctx.fillRect(-treeWidth * 0.05, 0, treeWidth * 0.1, treeHeight * 0.25);

    const layers = 4;
    for (let i = 0; i < layers; i += 1) {
      const layerHeight = treeHeight * 0.25;
      const topY = -treeHeight * 0.15 - i * layerHeight * 0.7;
      const span = treeWidth - i * (treeWidth * 0.18);
      const grad = ctx.createLinearGradient(-span / 2, topY, span / 2, topY + layerHeight);
      grad.addColorStop(0, "#244c2c");
      grad.addColorStop(1, "#3a7a45");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, topY - layerHeight * 0.8);
      ctx.lineTo(span / 2, topY + layerHeight);
      ctx.lineTo(-span / 2, topY + layerHeight);
      ctx.closePath();
      ctx.fill();
    }

    const starRadius = treeWidth * 0.1;
    ctx.fillStyle = "#ffd85b";
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const outerX = Math.cos(angle) * starRadius;
      const outerY = -treeHeight * 0.8 + Math.sin(angle) * starRadius;
      const innerAngle = angle + Math.PI / 5;
      const innerX = Math.cos(innerAngle) * starRadius * 0.5;
      const innerY = -treeHeight * 0.8 + Math.sin(innerAngle) * starRadius * 0.5;
      if (i === 0) {
        ctx.moveTo(outerX, outerY);
      } else {
        ctx.lineTo(outerX, outerY);
      }
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();

    const ornamentColors = ["#ff4d4d", "#ffd85b", "#4dc6ff", "#f6c1ff"];
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2;
      const radius = treeWidth * 0.2 + (i % 3) * treeWidth * 0.05;
      const ox = Math.cos(angle) * radius;
      const oy = -treeHeight * 0.2 - Math.abs(Math.sin(angle)) * treeHeight * 0.4;
      ctx.fillStyle = ornamentColors[i % ornamentColors.length];
      ctx.beginPath();
      ctx.arc(ox, oy, treeWidth * 0.03, 0, Math.PI * 2);
      ctx.fill();
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
    this.radius = level.tileSize * 0.45;
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
    this.animTime = 0;
    this.isDocked = true;
    this.retractHoldTime = 0;

    // Precompute geometry used for rendering and collisions.
    this.bodyWidth = Math.min(level.tileSize * 0.9, this.radius * 1.8);
    this.bodyLength = this.bodyWidth * 1.8;
    this.tipLength = this.bodyWidth * 0.8;
    this.bodyStartOffset = -this.bodyLength * 0.35;
    this.bodyEndOffset = this.bodyStartOffset + this.bodyLength;
    this.tipEndOffset = this.bodyEndOffset + this.tipLength;
    this.headCollisionStartOffset = this.bodyEndOffset - this.bodyWidth * 0.4;
    this.headCollisionRadius = this.bodyWidth * 0.45;
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
    this.retractHoldTime = 0;
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
    soundManager.stopDrillExtend();
    soundManager.playDrillRetract();
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
    this.animTime += dt;
    if (this.isRetracting) {
      this.retractHoldTime += dt;
      this.retractAlongPipe(dt);
      this.refreshDockedState();
      return;
    }
    this.retractHoldTime = 0;
    this.refreshDockedState();
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
      this.retractHoldTime = 0;
      return;
    }

    const targetIndex = this.pipePoints.length - 2;
    const target = this.pipePoints[targetIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const rapidBoost = Math.min(1, this.retractHoldTime);
    const accelerationMultiplier = 1 + rapidBoost * rapidBoost * 15;
    const maxStep = this.retractSpeed * accelerationMultiplier * dt;

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
        this.retractHoldTime = 0;
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
    if (this.pipePoints.length === 1) {
      const anchor = this.pipePoints[0];
      if (anchor.x === headPoint.x && anchor.y === headPoint.y) {
        return;
      }
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
      if (
        !this.tileTrail.length ||
        this.tileTrail[this.tileTrail.length - 1].x !== this.currentTileX ||
        this.tileTrail[this.tileTrail.length - 1].y !== this.currentTileY
      ) {
        this.tileTrail.push({ x: this.currentTileX, y: this.currentTileY });
      }
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
    soundManager.playDrillExtend();
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
      const continuing = this.tryApplyPendingDirection() || this.tryContinueForward();
      if (!continuing) {
        soundManager.stopDrillExtend();
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

  collidesWithHead(enemyX, enemyY, enemyRadius) {
    this.refreshDockedState();
    if (this.isDocked) {
      return false;
    }
    const enemyTile = this.level.pixelToTile(enemyX, enemyY);
    if (!enemyTile || enemyTile.y !== this.currentTileY) {
      return false;
    }
    const centerDist = Math.hypot(enemyX - this.x, enemyY - this.y);
    if (centerDist <= enemyRadius + this.radius) {
      return true;
    }

    const ux = Math.cos(this.facingAngle);
    const uy = Math.sin(this.facingAngle);
    const startX = this.x + ux * this.headCollisionStartOffset;
    const startY = this.y + uy * this.headCollisionStartOffset;
    const endX = this.x + ux * this.tipEndOffset;
    const endY = this.y + uy * this.tipEndOffset;
    const dist = distancePointToSegment(enemyX, enemyY, startX, startY, endX, endY);
    return dist <= enemyRadius + this.headCollisionRadius;
  }

  refreshDockedState() {
    const atEntry =
      this.currentTileX === this.entryTile.x &&
      this.currentTileY === this.entryTile.y;
    const noPipeLaid = this.tileTrail.length === 0 && this.pipePoints.length <= 1;
    this.isDocked =
      !this.isRetracting &&
      !this.destinationTile &&
      atEntry &&
      noPipeLaid;
  }

  renderPipe(ctx) {
    if (this.pipePoints.length < 1) {
      return;
    }

    const drawSegment = (from, to) => {
      if (!from || !to) return;
      if (from.x === to.x || from.y === to.y) {
        ctx.lineTo(to.x, to.y);
        return;
      }
      ctx.lineTo(to.x, from.y);
      ctx.lineTo(to.x, to.y);
    };

    ctx.beginPath();
    const first = this.pipePoints[0];
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < this.pipePoints.length; i += 1) {
      const prev = this.pipePoints[i - 1];
      const point = this.pipePoints[i];
      drawSegment(prev, point);
    }
    const lastPoint = this.pipePoints[this.pipePoints.length - 1];
    if (lastPoint.x !== this.x || lastPoint.y !== this.y) {
      drawSegment(lastPoint, { x: this.x, y: this.y });
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
    const bodyLength = this.bodyLength;
    const bodyWidth = this.bodyWidth;
    const startX = this.bodyStartOffset;

    // Main chassis
    const bodyPath = new Path2D();
    bodyPath.roundRect(startX, -bodyWidth / 2, bodyLength, bodyWidth, bodyWidth * 0.55);
    const bodyGrad = ctx.createLinearGradient(startX, -bodyWidth / 2, startX + bodyLength, bodyWidth / 2);
    bodyGrad.addColorStop(0, "#191b26");
    bodyGrad.addColorStop(0.35, "#353a47");
    bodyGrad.addColorStop(0.65, "#5d6574");
    bodyGrad.addColorStop(1, "#1c1f29");
    ctx.fillStyle = bodyGrad;
    ctx.fill(bodyPath);
    ctx.strokeStyle = "#0d0f15";
    ctx.lineWidth = 2;
    ctx.stroke(bodyPath);

    // Reinforced girders for width
    const girderThickness = bodyWidth * 0.2;
    const girderLength = bodyLength * 0.6;
    const girderX = startX + bodyLength * 0.12;
    ctx.fillStyle = "#272c35";
    ctx.fillRect(girderX, -bodyWidth / 2 - girderThickness, girderLength, girderThickness);
    ctx.fillRect(girderX, bodyWidth / 2, girderLength, girderThickness);

    // Panel seams
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX + bodyLength * 0.08, -bodyWidth * 0.3);
    ctx.lineTo(startX + bodyLength * 0.92, -bodyWidth * 0.3);
    ctx.moveTo(startX + bodyLength * 0.08, bodyWidth * 0.3);
    ctx.lineTo(startX + bodyLength * 0.75, bodyWidth * 0.3);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.moveTo(startX + bodyLength * 0.05, 0);
    ctx.lineTo(startX + bodyLength * 0.95, 0);
    ctx.stroke();

    // Rivets
    ctx.fillStyle = "#c4cbd8";
    const rivetRows = [-bodyWidth * 0.38, bodyWidth * 0.35];
    for (const ry of rivetRows) {
      for (let i = 0; i < 4; i += 1) {
        const rx = startX + bodyLength * (0.2 + i * 0.18);
        ctx.beginPath();
        ctx.arc(rx, ry, bodyWidth * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Front collar giving bulk
    const tipLength = this.tipLength;
    const tipStart = startX + bodyLength;
    ctx.fillStyle = "#323843";
    ctx.beginPath();
    ctx.ellipse(tipStart - bodyWidth * 0.15, 0, bodyWidth * 0.6, bodyWidth * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#151920";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hollow excavation mouth
    const chewPulse = 1 + Math.sin(this.animTime * 7) * 0.08;
    const mouthOuter = bodyWidth * 0.65 * chewPulse;
    const mouthInner = bodyWidth * 0.35 * chewPulse;
    const mouthDepth = tipLength * 0.6;
    const mouthX = tipStart + mouthDepth * 0.4;
    ctx.fillStyle = "#120a0d";
    ctx.beginPath();
    ctx.ellipse(mouthX, 0, mouthOuter, mouthOuter * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    const cavityGrad = ctx.createRadialGradient(
      mouthX - mouthOuter * 0.3,
      -mouthOuter * 0.2,
      mouthInner * 0.3,
      mouthX,
      0,
      mouthOuter
    );
    cavityGrad.addColorStop(0, "#3a1d14");
    cavityGrad.addColorStop(0.6, "#1c0d0f");
    cavityGrad.addColorStop(1, "#060003");
    ctx.fillStyle = cavityGrad;
    ctx.beginPath();
    ctx.ellipse(mouthX, 0, mouthOuter * 0.9, mouthOuter * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Teeth
    const toothCount = 10;
    ctx.fillStyle = "#f9d2a4";
    ctx.strokeStyle = "#62311c";
    ctx.lineWidth = 1;
    for (let i = 0; i < toothCount; i += 1) {
      const angle = (i / toothCount) * Math.PI * 1.3 - Math.PI * 0.65;
      const pulseOffset = Math.sin(this.animTime * 9 + angle * 2) * bodyWidth * 0.02;
      const px = mouthX + Math.cos(angle) * mouthOuter * 0.8;
      const py = Math.sin(angle) * mouthOuter * 0.6 + pulseOffset;
      const toothWidth = bodyWidth * 0.1;
      const toothHeight = bodyWidth * 0.2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(angle) * toothHeight, py + Math.sin(angle) * toothHeight);
      ctx.lineTo(
        px + Math.cos(angle + Math.PI / 2) * toothWidth,
        py + Math.sin(angle + Math.PI / 2) * toothWidth
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Inner grinder paddles
    ctx.strokeStyle = "#c78856";
    ctx.lineWidth = 2;
    const spin = this.animTime * 6;
    for (let i = 0; i < 4; i += 1) {
      const angle = spin + (i / 4) * Math.PI * 2;
      const innerX = mouthX + Math.cos(angle) * mouthInner * 0.4;
      const innerY = Math.sin(angle) * mouthInner * 0.4;
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(
        mouthX + Math.cos(angle) * mouthInner,
        Math.sin(angle) * mouthInner
      );
      ctx.stroke();
    }

    // Headlamp mounted lower to emphasize bulk
    const lightY = -bodyWidth * 0.5;
    ctx.beginPath();
    ctx.arc(startX + bodyLength * 0.3, lightY, bodyWidth * 0.16, 0, Math.PI * 2);
    const glowGrad = ctx.createRadialGradient(
      startX + bodyLength * 0.3,
      lightY,
      0,
      startX + bodyLength * 0.3,
      lightY,
      bodyWidth * 0.16
    );
    glowGrad.addColorStop(0, "#fff5c0");
    glowGrad.addColorStop(1, "#ffc85b");
    ctx.fillStyle = glowGrad;
    ctx.shadowColor = "rgba(255,210,120,0.65)";
    ctx.shadowBlur = 5;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

class Enemy {
  constructor(
    level,
    spawnPoint,
    direction,
    speed,
    canvasWidth,
    type = "01",
    spawnDelay = 0
  ) {
    this.level = level;
    this.spawnPoint = spawnPoint;
    this.initialDirection = direction;
    this.direction = direction;
    this.baseSpeed = speed;
    this.speed = speed;
    this.canvasWidth = canvasWidth;
    this.spawnMargin = 100;
    this.radius = Math.max(8, level.tileSize * 0.25);
    this.type = type;
    this.active = false;
    this.respawnTimer = spawnDelay;
    this.animTime = Math.random() * Math.PI * 2;
    this.activateIfReady();
  }

  startPosition() {
    return this.direction > 0
      ? Math.max(-this.spawnMargin, this.spawnPoint.x - this.spawnMargin)
      : Math.min(this.canvasWidth + this.spawnMargin, this.spawnPoint.x + this.spawnMargin);
  }

  activateIfReady() {
    if (this.respawnTimer <= 0) {
      this.active = true;
      this.direction = this.initialDirection;
      this.speed = this.baseSpeed + Math.random() * 20;
      this.x = this.startPosition();
      this.y = this.spawnPoint.y;
      this.respawnTimer = 0;
    }
  }

  reset(initialDelay = 0) {
    this.respawnTimer = Math.max(0, initialDelay);
    this.active = false;
    this.activateIfReady();
  }

  randomRespawnDelay() {
    return 4 + Math.random() * 2;
  }

  scheduleRespawn(delay = this.randomRespawnDelay()) {
    this.active = false;
    this.respawnTimer = delay;
  }

  update(dt) {
    if (!this.active) {
      this.respawnTimer -= dt;
      this.activateIfReady();
      this.animTime += dt * 4;
      return;
    }

    this.x += this.direction * this.speed * dt;
    this.y = this.spawnPoint.y;
    this.animTime += dt * (this.type === "01" ? 10 : 3);

    if (this.direction > 0 && this.x > this.canvasWidth + this.spawnMargin) {
      this.scheduleRespawn();
    } else if (this.direction < 0 && this.x < -this.spawnMargin) {
      this.scheduleRespawn();
    }
  }

  handleDestroyed() {
    this.scheduleRespawn(5 + Math.random() * 2);
  }

  render(ctx) {
    if (!this.active) {
      return;
    }
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.type === "01") {
      const lean = Math.sin(this.animTime * 1.5) * 0.05;
      ctx.translate(0, Math.sin(this.animTime * 4) * this.radius * 0.15);
      ctx.rotate(lean);
    }
    const bodyWidth = this.radius * 1.6;
    const bodyHeight = this.radius * 1.1;

    if (this.type === "02") {
      const length = bodyWidth * 2.4;
      const thickness = this.radius * 1.1;
      const undulate = Math.sin(this.animTime * 2) * this.radius * 0.2;
      const segmentCount = 7;
      const segmentSpacing = length / segmentCount;

      // Body path with subtle undulation
      ctx.save();
      ctx.translate(-length * 0.3, 0);
      const bodyPath = new Path2D();
      bodyPath.moveTo(0, 0);
      for (let i = 1; i <= segmentCount; i += 1) {
        const t = i / segmentCount;
        const sway = Math.sin(this.animTime * 2 + t * Math.PI * 1.5) * this.radius * 0.2;
        const x = i * segmentSpacing;
        const y = sway;
        bodyPath.lineTo(x, y);
      }
      const grad = ctx.createLinearGradient(0, -thickness, segmentCount * segmentSpacing, thickness);
      grad.addColorStop(0, "#2d1011");
      grad.addColorStop(0.4, "#5f2024");
      grad.addColorStop(0.7, "#8c332c");
      grad.addColorStop(1, "#21090a");
      ctx.strokeStyle = grad;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = thickness * 1.6;
      ctx.stroke(bodyPath);

      const topHighlight = ctx.createLinearGradient(0, -thickness, 0, thickness);
      topHighlight.addColorStop(0, "rgba(255,220,200,0.45)");
      topHighlight.addColorStop(0.5, "rgba(255,255,255,0)");
      ctx.strokeStyle = topHighlight;
      ctx.lineWidth = thickness * 0.5;
      ctx.stroke(bodyPath);

      // Segment ridges
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      for (let i = 0; i <= segmentCount; i += 1) {
        const t = i / segmentCount;
        const x = i * segmentSpacing;
        const sway = Math.sin(this.animTime * 2 + t * Math.PI * 1.5) * this.radius * 0.2;
        ctx.beginPath();
        ctx.moveTo(x, sway - thickness * 0.9);
        ctx.lineTo(x, sway + thickness * 0.9);
        ctx.stroke();
      }

      // Head with mandibles
      const headX = segmentSpacing * 0.6;
      const headY = Math.sin(this.animTime * 2 + 0.1) * this.radius * 0.2;
      const headRadius = thickness * 0.9;
      const headGrad = ctx.createRadialGradient(
        headX - headRadius * 0.2,
        headY - headRadius * 0.2,
        headRadius * 0.2,
        headX,
        headY,
        headRadius
      );
      headGrad.addColorStop(0, "#ffd89f");
      headGrad.addColorStop(0.4, "#f7a24c");
      headGrad.addColorStop(1, "#5e1f19");
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.ellipse(headX, headY, headRadius * 1.1, headRadius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1b0806";
      ctx.beginPath();
      ctx.arc(headX + headRadius * 0.2, headY - headRadius * 0.2, headRadius * 0.25, 0, Math.PI * 2);
      ctx.arc(headX + headRadius * 0.5, headY + headRadius * 0.1, headRadius * 0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ffdba6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(headX + headRadius * 0.6, headY + headRadius * 0.3);
      ctx.quadraticCurveTo(headX + headRadius * 1.1, headY + headRadius * 0.6, headX + headRadius * 1.3, headY + headRadius * 0.2);
      ctx.moveTo(headX + headRadius * 0.6, headY - headRadius * 0.3);
      ctx.quadraticCurveTo(headX + headRadius * 1.1, headY - headRadius * 0.6, headX + headRadius * 1.3, headY - headRadius * 0.2);
      ctx.stroke();

      ctx.restore();
    } else {
      const abdomenRadius = bodyWidth * 0.85;
      const abdomenHeight = bodyHeight * 1.25;
      const thoraxRadius = bodyWidth * 0.55;
      const thoraxHeight = bodyHeight * 0.85;
      const headRadius = bodyWidth * 0.35;
      const headHeight = bodyHeight * 0.55;

      // Spidery articulated legs (four pairs)
      const legGradient = ctx.createLinearGradient(-abdomenRadius, 0, abdomenRadius, 0);
      legGradient.addColorStop(0, "#0e0506");
      legGradient.addColorStop(0.5, "#1d0c0f");
      legGradient.addColorStop(1, "#0b0405");
      ctx.strokeStyle = legGradient;
      ctx.lineCap = "round";
      const legPairs = 4;
      for (let pair = 0; pair < legPairs; pair += 1) {
        const normalized = pair / (legPairs - 1);
        const spread = (normalized - 0.5) * abdomenHeight * 0.9;
        const thickness = 4 - normalized * 1.5;
        const phase = Math.sin(this.animTime * 8 + normalized * Math.PI * 0.9);
        const lift = phase * this.radius * 0.3;
        ctx.lineWidth = thickness;

        const leftAnchors = [
          { x: -thoraxRadius * 0.2, y: spread - lift * 0.1 },
          {
            x: -thoraxRadius - bodyWidth * (0.2 + normalized * 0.2),
            y: spread - bodyHeight * (0.25 + normalized * 0.15) - lift,
          },
          {
            x: -thoraxRadius - bodyWidth * (0.65 + normalized * 0.4),
            y: spread - bodyHeight * (0.05 + normalized * 0.15) - lift * 0.6,
          },
        ];

        ctx.beginPath();
        ctx.moveTo(leftAnchors[0].x, leftAnchors[0].y);
        ctx.quadraticCurveTo(leftAnchors[1].x, leftAnchors[1].y, leftAnchors[2].x, leftAnchors[2].y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-leftAnchors[0].x, leftAnchors[0].y);
        ctx.quadraticCurveTo(-leftAnchors[1].x, leftAnchors[1].y, -leftAnchors[2].x, leftAnchors[2].y);
        ctx.stroke();
      }

      // Abdomen
      const abdomenGrad = ctx.createRadialGradient(
        -abdomenRadius * 0.2,
        -abdomenHeight * 0.2,
        abdomenRadius * 0.3,
        0,
        0,
        abdomenRadius * 1.1
      );
      abdomenGrad.addColorStop(0, "#2c1517");
      abdomenGrad.addColorStop(0.4, "#18090c");
      abdomenGrad.addColorStop(1, "#090304");
      ctx.fillStyle = abdomenGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, abdomenRadius, abdomenHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cephalothorax
      const thoraxGrad = ctx.createLinearGradient(-thoraxRadius, -thoraxHeight, thoraxRadius, thoraxHeight);
      thoraxGrad.addColorStop(0, "#422024");
      thoraxGrad.addColorStop(0.5, "#6b2d2d");
      thoraxGrad.addColorStop(1, "#1e0c0f");
      ctx.fillStyle = thoraxGrad;
      ctx.beginPath();
      ctx.ellipse(-abdomenRadius * 0.55, -bodyHeight * 0.1, thoraxRadius, thoraxHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      const headGrad = ctx.createLinearGradient(-headRadius, -headHeight, headRadius, headHeight);
      headGrad.addColorStop(0, "#6f362d");
      headGrad.addColorStop(1, "#1b0a0c");
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.ellipse(-abdomenRadius * 0.95, -bodyHeight * 0.05, headRadius, headHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye cluster (8 eyes)
      const eyePositions = [];
      const smallRingRadius = this.radius * 0.1;
      for (let i = 0; i < 4; i += 1) {
        const offsetY = -headHeight * 0.35 + i * headHeight * 0.25;
        eyePositions.push([-abdomenRadius * 1.05, offsetY]);
        eyePositions.push([-abdomenRadius * 0.85, offsetY]);
      }
      for (const [ex, ey] of eyePositions) {
        const eyeGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, smallRingRadius * 1.2);
        eyeGrad.addColorStop(0, "#ffffff");
        eyeGrad.addColorStop(1, "#f6bb46");
        ctx.fillStyle = eyeGrad;
        ctx.beginPath();
        ctx.arc(ex, ey, smallRingRadius * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#120405";
        ctx.beginPath();
        ctx.arc(ex - smallRingRadius * 0.2, ey - smallRingRadius * 0.1, smallRingRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fangs / pedipalps (mirrored pairs)
      ctx.strokeStyle = "#f1b05d";
      ctx.lineWidth = 2;
      const fangOffsets = [
        { start: { x: -abdomenRadius * 0.65, y: bodyHeight * 0.2 }, ctrl: { x: -abdomenRadius * 0.9, y: bodyHeight * 0.55 }, end: { x: -abdomenRadius * 0.35, y: bodyHeight * 0.65 } },
        { start: { x: -abdomenRadius * 0.45, y: bodyHeight * 0.15 }, ctrl: { x: -abdomenRadius * 0.75, y: bodyHeight * 0.5 }, end: { x: -abdomenRadius * 0.15, y: bodyHeight * 0.58 } },
        { start: { x: -abdomenRadius * 0.65, y: bodyHeight * 0.05 }, ctrl: { x: -abdomenRadius * 0.9, y: bodyHeight * 0.35 }, end: { x: -abdomenRadius * 0.35, y: bodyHeight * 0.45 } },
        { start: { x: -abdomenRadius * 0.45, y: 0 }, ctrl: { x: -abdomenRadius * 0.75, y: bodyHeight * 0.3 }, end: { x: -abdomenRadius * 0.15, y: bodyHeight * 0.38 } },
      ];
      for (const fang of fangOffsets) {
        ctx.beginPath();
        ctx.moveTo(fang.start.x, fang.start.y);
        ctx.quadraticCurveTo(fang.ctrl.x, fang.ctrl.y, fang.end.x, fang.end.y);
        ctx.moveTo(-fang.start.x, fang.start.y);
        ctx.quadraticCurveTo(-fang.ctrl.x, fang.ctrl.y, -fang.end.x, fang.end.y);
        ctx.stroke();
      }

      // Abdomen highlight and pattern
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-abdomenRadius * 0.2, -abdomenHeight * 0.55);
      ctx.quadraticCurveTo(abdomenRadius * 0.15, -abdomenHeight * 0.85, abdomenRadius * 0.35, -abdomenHeight * 0.25);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,90,70,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-abdomenRadius * 0.1, -abdomenHeight * 0.25);
      ctx.quadraticCurveTo(0, abdomenHeight * 0.05, -abdomenRadius * 0.05, abdomenHeight * 0.35);
      ctx.stroke();
    }
    ctx.restore();
  }
}

class MenuState {
  constructor(game) {
    this.game = game;
    this.animTime = 0;
    this.sunPulse = 0;
    this.cableOffset = 0;

    // Particle system for atmospheric depth
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random() * game.canvas.width,
        y: Math.random() * game.canvas.height * 0.5,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 15 + 5,
        opacity: Math.random() * 0.4 + 0.1,
        twinkleSpeed: Math.random() * 2 + 1,
      });
    }

    // Stars
    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * game.canvas.width,
        y: Math.random() * game.canvas.height * 0.35,
        size: Math.random() * 1.5 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 3 + 1,
      });
    }
  }

  update(dt) {
    this.animTime += dt;
    this.sunPulse = Math.sin(this.animTime * 0.8) * 0.1 + 1;
    this.cableOffset = (this.cableOffset + dt * 30) % 50;

    // Update particles (dust motes floating upward)
    for (const particle of this.particles) {
      particle.y -= particle.speed * dt;
      if (particle.y < 0) {
        particle.y = this.game.canvas.height * 0.5;
        particle.x = Math.random() * this.game.canvas.width;
      }
    }
  }

  render(ctx) {
    const { width, height } = this.game.canvas;
    const skyHeight = height * 0.5;

    // Enhanced sky gradient with deeper colors
    const skyGradient = ctx.createLinearGradient(0, 0, 0, skyHeight);
    skyGradient.addColorStop(0, "#020408");
    skyGradient.addColorStop(0.3, "#0a1525");
    skyGradient.addColorStop(0.6, "#1a2f4a");
    skyGradient.addColorStop(0.85, "#c89550");
    skyGradient.addColorStop(1, "#e6a55d");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, skyHeight);

    // Stars in the dark sky
    ctx.save();
    for (const star of this.stars) {
      const twinkle = Math.sin(this.animTime * star.twinkleSpeed + star.brightness * Math.PI) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * twinkle * 0.8})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Enhanced pulsing sun with multiple glow layers
    const sunX = width * 0.5;
    const sunY = skyHeight * 0.3;
    const sunRadius = skyHeight * 0.22;

    // Outer glow (pulsing)
    const outerGlowRadius = sunRadius * this.sunPulse * 1.6;
    const outerGlow = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.3, sunX, sunY, outerGlowRadius);
    outerGlow.addColorStop(0, "rgba(255, 250, 210, 0.3)");
    outerGlow.addColorStop(0.5, "rgba(255, 220, 150, 0.15)");
    outerGlow.addColorStop(1, "rgba(255, 200, 120, 0)");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, outerGlowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Middle glow
    const midGlowRadius = sunRadius * 1.3;
    const midGlow = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.2, sunX, sunY, midGlowRadius);
    midGlow.addColorStop(0, "rgba(255, 245, 200, 0.6)");
    midGlow.addColorStop(0.7, "rgba(255, 210, 130, 0.3)");
    midGlow.addColorStop(1, "rgba(255, 200, 120, 0)");
    ctx.fillStyle = midGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, midGlowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Core sun
    const sunGrad = ctx.createRadialGradient(
      sunX - sunRadius * 0.2,
      sunY - sunRadius * 0.2,
      sunRadius * 0.1,
      sunX,
      sunY,
      sunRadius
    );
    sunGrad.addColorStop(0, "#fffef5");
    sunGrad.addColorStop(0.4, "#fff7d2");
    sunGrad.addColorStop(0.8, "#ffd89f");
    sunGrad.addColorStop(1, "rgba(255, 200, 100, 0.8)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Layered terrain with atmospheric perspective
    // Distant hills (lighter)
    ctx.fillStyle = "rgba(100, 70, 50, 0.4)";
    ctx.beginPath();
    ctx.moveTo(0, skyHeight * 0.75);
    ctx.quadraticCurveTo(width * 0.15, skyHeight * 0.68, width * 0.3, skyHeight * 0.72);
    ctx.quadraticCurveTo(width * 0.5, skyHeight * 0.78, width * 0.7, skyHeight * 0.7);
    ctx.quadraticCurveTo(width * 0.85, skyHeight * 0.65, width, skyHeight * 0.72);
    ctx.lineTo(width, skyHeight);
    ctx.lineTo(0, skyHeight);
    ctx.closePath();
    ctx.fill();

    // Middle hills
    ctx.fillStyle = "#6b4830";
    ctx.beginPath();
    ctx.moveTo(0, skyHeight * 0.82);
    ctx.quadraticCurveTo(width * 0.25, skyHeight * 0.72, width * 0.4, skyHeight * 0.78);
    ctx.quadraticCurveTo(width * 0.6, skyHeight * 0.88, width * 0.8, skyHeight * 0.75);
    ctx.lineTo(width, skyHeight * 0.8);
    ctx.lineTo(width, skyHeight);
    ctx.lineTo(0, skyHeight);
    ctx.closePath();
    ctx.fill();

    // Foreground hills with rim lighting
    ctx.fillStyle = "#513320";
    ctx.beginPath();
    ctx.moveTo(0, skyHeight * 0.85);
    ctx.quadraticCurveTo(width * 0.2, skyHeight * 0.65, width * 0.45, skyHeight * 0.8);
    ctx.quadraticCurveTo(width * 0.7, skyHeight * 0.92, width, skyHeight * 0.75);
    ctx.lineTo(width, skyHeight);
    ctx.lineTo(0, skyHeight);
    ctx.closePath();
    ctx.fill();

    // Rim lighting on hills from sun
    const rimGrad = ctx.createLinearGradient(0, skyHeight * 0.65, 0, skyHeight * 0.75);
    rimGrad.addColorStop(0, "rgba(255, 200, 120, 0.3)");
    rimGrad.addColorStop(1, "rgba(255, 200, 120, 0)");
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.moveTo(0, skyHeight * 0.85);
    ctx.quadraticCurveTo(width * 0.2, skyHeight * 0.65, width * 0.45, skyHeight * 0.8);
    ctx.quadraticCurveTo(width * 0.7, skyHeight * 0.92, width, skyHeight * 0.75);
    ctx.lineTo(width, skyHeight * 0.85);
    ctx.lineTo(0, skyHeight * 0.95);
    ctx.closePath();
    ctx.fill();

    // Transition band to underground
    const transitionGrad = ctx.createLinearGradient(0, skyHeight * 0.95, 0, skyHeight * 1.1);
    transitionGrad.addColorStop(0, "rgba(81, 51, 32, 0.8)");
    transitionGrad.addColorStop(0.5, "rgba(60, 40, 28, 0.9)");
    transitionGrad.addColorStop(1, "#2a1a12");
    ctx.fillStyle = transitionGrad;
    ctx.fillRect(0, skyHeight * 0.95, width, skyHeight * 0.2);

    // Underground soil with richer gradient
    const soilGrad = ctx.createLinearGradient(0, skyHeight, 0, height);
    soilGrad.addColorStop(0, "#2a1a12");
    soilGrad.addColorStop(0.3, "#1f1410");
    soilGrad.addColorStop(0.7, "#120d0a");
    soilGrad.addColorStop(1, "#0a0605");
    ctx.fillStyle = soilGrad;
    ctx.fillRect(0, skyHeight, width, height - skyHeight);

    // Subtle radiating rings in soil (more visible)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = width * 0.35;
      ctx.beginPath();
      ctx.arc(width * 0.5, height, radius + i * 50, angle - 0.15, angle + 0.15);
      ctx.stroke();
    }

    // Render Christmas tree on the terrain
    this.renderChristmasTree(ctx, width, height, skyHeight);

    // Render enhanced well structure
    this.renderEnhancedWell(ctx, width, height, skyHeight);

    // Floating dust particles for atmosphere
    ctx.save();
    for (const particle of this.particles) {
      const twinkle = Math.sin(this.animTime * particle.twinkleSpeed) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 220, 180, ${particle.opacity * twinkle})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Enhanced typography
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Title with multiple shadow layers for depth - aligned with Christmas tree
    const titleY = skyHeight * 0.82;
    ctx.font = "bold 82px 'Segoe UI', Arial, sans-serif";

    // Deep shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "#000";
    ctx.fillText("Sats Miner", width / 2, titleY);

    // Gold glow
    ctx.shadowColor = "rgba(255, 200, 80, 0.6)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "#f4d67c";
    ctx.fillText("Sats Miner", width / 2, titleY);

    // Main title
    ctx.shadowBlur = 0;
    const titleGrad = ctx.createLinearGradient(0, titleY - 40, 0, titleY + 40);
    titleGrad.addColorStop(0, "#ffe9b3");
    titleGrad.addColorStop(0.5, "#f4d67c");
    titleGrad.addColorStop(1, "#d4a959");
    ctx.fillStyle = titleGrad;
    ctx.fillText("Sats Miner", width / 2, titleY);

    // Instruction text with pulsing animation - in darker section
    const pulseOpacity = Math.sin(this.animTime * 2) * 0.2 + 0.8;
    ctx.font = "28px 'Segoe UI', Arial, sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = `rgba(240, 242, 246, ${pulseOpacity})`;
    ctx.fillText("Press Enter to descend", width / 2, skyHeight + height * 0.25);

    // Down arrow indicator (animated)
    const arrowY = skyHeight + height * 0.3 + Math.sin(this.animTime * 3) * 5;
    ctx.strokeStyle = `rgba(240, 242, 246, ${pulseOpacity * 0.8})`;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(width / 2 - 12, arrowY);
    ctx.lineTo(width / 2, arrowY + 12);
    ctx.lineTo(width / 2 + 12, arrowY);
    ctx.stroke();

    ctx.restore();

    // Vignette effect for focus
    const vignetteGrad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.3,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.8
    );
    vignetteGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignetteGrad.addColorStop(1, "rgba(0, 0, 0, 0.5)");
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, width, height);
  }

  renderChristmasTree(ctx, width, height, skyHeight) {
    // Australian summer Christmas tree on the hill
    const treeX = width * 0.75;
    const treeBaseY = skyHeight * 0.88;
    const treeHeight = skyHeight * 0.22;
    const treeWidth = treeHeight * 0.65;

    ctx.save();
    ctx.translate(treeX, treeBaseY);

    // Tree trunk
    ctx.fillStyle = "#5c3a2a";
    ctx.fillRect(-treeWidth * 0.08, 0, treeWidth * 0.16, treeHeight * 0.3);

    // Foliage layers
    const layers = 4;
    for (let i = 0; i < layers; i += 1) {
      const layerHeight = treeHeight * 0.28;
      const topY = -treeHeight * 0.2 - i * layerHeight * 0.65;
      const span = treeWidth - i * (treeWidth * 0.2);
      const grad = ctx.createLinearGradient(-span / 2, topY, span / 2, topY + layerHeight);
      grad.addColorStop(0, "#1e5a2e");
      grad.addColorStop(0.5, "#2d7a3f");
      grad.addColorStop(1, "#1a4a28");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, topY - layerHeight * 0.7);
      ctx.lineTo(span / 2, topY + layerHeight);
      ctx.lineTo(-span / 2, topY + layerHeight);
      ctx.closePath();
      ctx.fill();
    }

    // Star on top
    const starRadius = treeWidth * 0.12;
    ctx.fillStyle = "#ffd85b";
    ctx.shadowColor = "rgba(255, 216, 91, 0.8)";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const outerX = Math.cos(angle) * starRadius;
      const outerY = -treeHeight * 0.85 + Math.sin(angle) * starRadius;
      const innerAngle = angle + Math.PI / 5;
      const innerX = Math.cos(innerAngle) * starRadius * 0.45;
      const innerY = -treeHeight * 0.85 + Math.sin(innerAngle) * starRadius * 0.45;
      if (i === 0) {
        ctx.moveTo(outerX, outerY);
      } else {
        ctx.lineTo(outerX, outerY);
      }
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ornaments (colorful decorations)
    const ornamentColors = ["#ff4d4d", "#ffd85b", "#4dc6ff", "#ff69b4"];
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      const layer = Math.floor(i / 3);
      const radius = treeWidth * (0.25 + layer * 0.08);
      const ox = Math.cos(angle) * radius;
      const oy = -treeHeight * 0.25 - layer * treeHeight * 0.15 - Math.abs(Math.sin(angle)) * treeHeight * 0.1;

      // Ornament with shine
      const ornamentGrad = ctx.createRadialGradient(
        ox - treeWidth * 0.015,
        oy - treeWidth * 0.015,
        0,
        ox,
        oy,
        treeWidth * 0.045
      );
      ornamentGrad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      ornamentGrad.addColorStop(0.4, ornamentColors[i % ornamentColors.length]);
      ornamentGrad.addColorStop(1, "#000");
      ctx.fillStyle = ornamentGrad;
      ctx.beginPath();
      ctx.arc(ox, oy, treeWidth * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderEnhancedWell(ctx, width, height, skyHeight) {
    const wellX = width * 0.5;
    const wellY = skyHeight + height * 0.18;

    ctx.save();
    ctx.translate(wellX, wellY);

    // Animated cable descending into the mine
    const cableTopY = -120;
    const cableBottomY = 60;
    const cableGrad = ctx.createLinearGradient(0, cableTopY, 0, cableBottomY);
    cableGrad.addColorStop(0, "#9fa5af");
    cableGrad.addColorStop(1, "#6a7080");
    ctx.strokeStyle = cableGrad;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -this.cableOffset;
    ctx.beginPath();
    ctx.moveTo(0, cableTopY);
    ctx.lineTo(0, cableBottomY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // Platform with enhanced detail
    const platformWidth = 70;
    const platformHeight = 22;
    const platformGrad = ctx.createLinearGradient(-platformWidth / 2, 0, platformWidth / 2, 0);
    platformGrad.addColorStop(0, "#35353d");
    platformGrad.addColorStop(0.25, "#505560");
    platformGrad.addColorStop(0.5, "#6a7080");
    platformGrad.addColorStop(0.75, "#8d949f");
    platformGrad.addColorStop(1, "#454550");
    ctx.fillStyle = platformGrad;
    ctx.fillRect(-platformWidth / 2, -platformHeight / 2, platformWidth, platformHeight);

    // Platform outline and rivets
    ctx.strokeStyle = "#1a1c24";
    ctx.lineWidth = 3;
    ctx.strokeRect(-platformWidth / 2, -platformHeight / 2, platformWidth, platformHeight);

    // Rivets on platform
    ctx.fillStyle = "#b0b8c5";
    const rivetSize = 2.5;
    for (let i = 0; i < 5; i++) {
      const rx = -platformWidth / 2 + 10 + i * 12;
      ctx.beginPath();
      ctx.arc(rx, -platformHeight / 4, rivetSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rx, platformHeight / 4, rivetSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Main mast with gradient
    const mastHeight = 110;
    const mastGrad = ctx.createLinearGradient(-8, -mastHeight, 8, 0);
    mastGrad.addColorStop(0, "#3a4250");
    mastGrad.addColorStop(0.5, "#4c5563");
    mastGrad.addColorStop(1, "#35404d");
    ctx.fillStyle = mastGrad;
    ctx.fillRect(-8, -mastHeight, 16, mastHeight);

    // Mast highlights
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(-7, -mastHeight + 5, 3, mastHeight - 10);

    // Secondary mast extension
    ctx.fillStyle = "#3d4654";
    ctx.fillRect(-3, -mastHeight * 1.25, 6, mastHeight * 0.3);

    // Cable supports (structural triangles)
    ctx.strokeStyle = "#252c36";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-platformWidth / 2, -platformHeight / 2);
    ctx.lineTo(-platformWidth / 2 + 10, -platformHeight / 2 - 18);
    ctx.lineTo(-platformWidth / 2 + 20, -platformHeight / 2);
    ctx.moveTo(platformWidth / 2, -platformHeight / 2);
    ctx.lineTo(platformWidth / 2 - 10, -platformHeight / 2 - 18);
    ctx.lineTo(platformWidth / 2 - 20, -platformHeight / 2);
    ctx.stroke();

    ctx.restore();
  }

  onKeyDown(event) {
    if (event.key === "Enter") {
      soundManager.playMenuSelect();
      this.game.setState(new PlayState(this.game));
    } else if (event.key === "m" || event.key === "M") {
      soundManager.toggleMute();
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
    this.levelTimeLimit = 150;
    this.remainingTime = this.levelTimeLimit;
    this.timeExpired = false;
    this.lastWarningTime = 0;
    this.startTile = this.level.getEntryTile();
    this.wellPosition = this.level.getWellPosition();
    this.drill = this.createDrill();
    const laneInfos = this.level.getEnemyLanes();
    const sortedLanes = [...laneInfos].sort((a, b) => a.y - b.y);
    const hazardLaneCount = Math.max(1, Math.round(sortedLanes.length * 0.2));
    const hazardLaneKeys = new Set(
      sortedLanes
        .slice(sortedLanes.length - hazardLaneCount)
        .map((lane) => lane.y)
    );

    const enemyConfigs = [];
    sortedLanes.forEach((lane, index) => {
      const laneType = hazardLaneKeys.has(lane.y) ? "02" : "01";
      enemyConfigs.push({
        spawn: { x: lane.leftX, y: lane.y },
        direction: 1,
        delay: (index % 4) * 1.5 + Math.random(),
        type: laneType,
      });
      enemyConfigs.push({
        spawn: { x: lane.rightX, y: lane.y },
        direction: -1,
        delay: 3 + (index % 3) * 1.2 + Math.random(),
        type: laneType,
      });
    });

    this.enemies = enemyConfigs.map((config) => {
      return new Enemy(
        this.level,
        config.spawn,
        config.direction,
        60 + Math.random() * 40,
        this.game.canvas.width,
        config.type,
        config.delay
      );
    });
  }

  update(dt) {
    if (!this.levelComplete) {
      this.remainingTime = Math.max(0, this.remainingTime - dt);

      // Play warning sound when time < 30 seconds (every second)
      if (this.remainingTime < 30 && this.remainingTime > 0) {
        const currentSecond = Math.floor(this.remainingTime);
        if (currentSecond !== this.lastWarningTime) {
          this.lastWarningTime = currentSecond;
          soundManager.playTimeWarning();
        }
      }

      if (this.remainingTime <= 0 && !this.timeExpired) {
        this.timeExpired = true;
        this.handleLifeLost();
        return;
      }
    }
    this.level.update(dt);
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

    this.renderHud(ctx);
  }

  onKeyDown(event) {
    let handled = false;

    // M key to toggle mute (global across all states)
    if (event.key === "m" || event.key === "M") {
      soundManager.toggleMute();
      handled = true;
    }

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
    this.score += 50;
    soundManager.playCoinCollect();
    if (!this.levelComplete && this.level.pelletCount === 0) {
      this.levelComplete = true;
      this.score += LEVEL_COMPLETE_BONUS;
      soundManager.playLevelComplete();
    }
  }

  renderHud(ctx) {
    ctx.save();
    const hudCenterY = 28;
    ctx.fillStyle = "#f4f6f8";
    ctx.font = "14px 'Segoe UI', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 20, hudCenterY);

    const time = Math.max(0, this.remainingTime);
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    ctx.textAlign = "center";
    const timeColor = time < 30 ? "#ff6868" : "#111";
    ctx.fillStyle = timeColor;
    ctx.font = "bold 16px 'Segoe UI', sans-serif";
    ctx.fillText(`Time: ${minutes}:${seconds}`, this.game.canvas.width / 2, hudCenterY);
    ctx.font = "14px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#f4f6f8";

    ctx.font = "12px 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#f4f6f8aa";
    ctx.fillText("Arrows: move  |  Space: retract  |  M: mute", 20, hudCenterY + 18);
    ctx.font = "14px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#f4f6f8";

    ctx.textAlign = "right";
    ctx.fillText(`Lives: ${this.lives}`, this.game.canvas.width - 20, hudCenterY);

    // Mute indicator
    if (soundManager.muted) {
      ctx.fillStyle = "#ff6868";
      ctx.fillText("🔇 MUTED", this.game.canvas.width - 20, hudCenterY + 18);
    }

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
    if (!this.enemies) {
      return;
    }
    this.enemies.forEach((enemy) => enemy.reset());
  }

  handleEnemyInteractions() {
    for (const enemy of this.enemies) {
      if (!enemy.active) {
        continue;
      }
      if (this.drill.collidesWithHead(enemy.x, enemy.y, enemy.radius)) {
        if (enemy.type === "02") {
          soundManager.playPipeHit();
          this.handleLifeLost();
          return true;
        }
        this.score += 10;
        soundManager.playEnemyDestroyed();
        enemy.handleDestroyed();
        continue;
      }

      if (this.enemyHitsPipe(enemy)) {
        soundManager.playPipeHit();
        this.handleLifeLost();
        return true;
      }
    }
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
    soundManager.playLifeLost();
    soundManager.stopDrillExtend();
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
    const platformWidth = 60;
    const platformHeight = 18;
    const platformGrad = ctx.createLinearGradient(-platformWidth / 2, 0, platformWidth / 2, 0);
    platformGrad.addColorStop(0, "#403f46");
    platformGrad.addColorStop(1, "#9f9fab");
    ctx.fillStyle = platformGrad;
    ctx.fillRect(-platformWidth / 2, -platformHeight / 2, platformWidth, platformHeight);

    ctx.strokeStyle = "#1e1f29";
    ctx.lineWidth = 3;
    ctx.strokeRect(-platformWidth / 2, -platformHeight / 2, platformWidth, platformHeight);

    const mastHeight = this.level.tileSize * 0.9;
    ctx.fillStyle = "#4c5563";
    ctx.fillRect(-6, -mastHeight, 12, mastHeight);
    ctx.fillRect(-2, -mastHeight * 1.2, 4, mastHeight * 0.3);

    ctx.strokeStyle = "#1f2a33";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-platformWidth / 2, -platformHeight / 2);
    ctx.lineTo(-platformWidth / 2 + 8, -platformHeight / 2 - 16);
    ctx.lineTo(-platformWidth / 2 + 16, -platformHeight / 2);
    ctx.moveTo(platformWidth / 2, -platformHeight / 2);
    ctx.lineTo(platformWidth / 2 - 8, -platformHeight / 2 - 16);
    ctx.lineTo(platformWidth / 2 - 16, -platformHeight / 2);
    ctx.stroke();

    ctx.fillStyle = "#f0c169";
    ctx.fillRect(-platformWidth / 2 - 6, -platformHeight / 2 - 10, platformWidth + 12, 8);
    ctx.restore();
  }
}

class GameOverState {
  constructor(game, finalScore) {
    this.game = game;
    this.finalScore = finalScore;
    soundManager.playGameOver();
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
      soundManager.playMenuSelect();
      this.game.setState(new MenuState(this.game));
    } else if (event.key === "m" || event.key === "M") {
      soundManager.toggleMute();
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

function addRoundedRectPath(path, x, y, width, height, radii) {
  const { tl = 0, tr = 0, br = 0, bl = 0 } = radii;
  path.moveTo(x + tl, y);
  path.lineTo(x + width - tr, y);
  tr
    ? path.quadraticCurveTo(x + width, y, x + width, y + tr)
    : path.lineTo(x + width, y);
  path.lineTo(x + width, y + height - br);
  br
    ? path.quadraticCurveTo(x + width, y + height, x + width - br, y + height)
    : path.lineTo(x + width, y + height);
  path.lineTo(x + bl, y + height);
  bl
    ? path.quadraticCurveTo(x, y + height, x, y + height - bl)
    : path.lineTo(x, y + height);
  path.lineTo(x, y + tl);
  tl
    ? path.quadraticCurveTo(x, y, x + tl, y)
    : path.lineTo(x, y);
  path.closePath();
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
