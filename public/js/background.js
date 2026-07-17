(function () {
  'use strict';

  var container = document.getElementById('bg-container');
  if (!container) return;

  var mouseX = 0;
  var mouseY = 0;
  var orbs = [];

  // --- GD-style block/diamond random shapes ---
  function createBlock(w, h, x, y, rotation, speed) {
    var el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.style.border = '1px solid rgba(255,255,255,0.04)';
    el.style.background = 'rgba(255,255,255,0.01)';
    el.style.borderRadius = w > 100 ? '50%' : '2px';
    el.style.transform = 'rotate(' + rotation + 'deg)';
    el.style.opacity = '0.3';
    if (w === h && w < 30) {
      el.style.border = 'none';
      el.style.background = 'rgba(255,255,255,0.03)';
      el.style.borderRadius = '50%';
    }
    container.appendChild(el);
    return el;
  }

  function createTriangle(size, x, y, rotation) {
    var el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.width = '0';
    el.style.height = '0';
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.style.borderLeft = (size / 2) + 'px solid transparent';
    el.style.borderRight = (size / 2) + 'px solid transparent';
    el.style.borderBottom = size + 'px solid rgba(255,255,255,0.03)';
    el.style.transform = 'rotate(' + rotation + 'deg)';
    el.style.opacity = '0.3';
    container.appendChild(el);
    return el;
  }

  function createDiamond(size, x, y) {
    var el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.style.border = '1px solid rgba(255,255,255,0.05)';
    el.style.background = 'rgba(255,255,255,0.01)';
    el.style.transform = 'rotate(45deg)';
    el.style.opacity = '0.25';
    container.appendChild(el);
    return el;
  }

  // Large soft orbs (existing)
  function createOrb(size, x, y) {
    var el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.style.background = 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)';
    el.style.borderRadius = '50%';
    el.style.filter = 'blur(80px)';
    el.style.opacity = '0.5';
    container.appendChild(el);
    return el;
  }

  // Register all elements with their animation parameters
  var elements = [];

  // Soft orbs
  elements.push({ el: createOrb(600, 10, -10), xRange: 20, yRange: 15, freq: 0.04, phase: 0 });
  elements.push({ el: createOrb(500, 70, 60), xRange: 15, yRange: 20, freq: 0.03, phase: 1.5 });
  elements.push({ el: createOrb(400, 40, 30), xRange: 18, yRange: 12, freq: 0.035, phase: 3 });
  elements.push({ el: createOrb(350, 80, -5), xRange: 12, yRange: 18, freq: 0.025, phase: 4.2 });
  elements.push({ el: createOrb(450, -5, 50), xRange: 16, yRange: 14, freq: 0.03, phase: 2.1 });

  // GD-style blocks (squares and rectangles)
  elements.push({ el: createBlock(80, 80, 15, 40, 15, 0.5), xRange: 10, yRange: 8, freq: 0.02, phase: 0, rotateSpeed: 0.3 });
  elements.push({ el: createBlock(50, 50, 60, 20, -20, 0.3), xRange: 8, yRange: 10, freq: 0.025, phase: 2, rotateSpeed: 0.2 });
  elements.push({ el: createBlock(40, 40, 85, 70, 45, 0.4), xRange: 6, yRange: 7, freq: 0.03, phase: 1, rotateSpeed: 0.4 });
  elements.push({ el: createBlock(60, 60, 30, 75, -10, 0.2), xRange: 9, yRange: 6, freq: 0.02, phase: 3, rotateSpeed: 0.15 });
  elements.push({ el: createBlock(35, 35, 50, 10, 30, 0.6), xRange: 7, yRange: 9, freq: 0.028, phase: 4, rotateSpeed: 0.35 });

  // Thin bars (GD-style long blocks)
  elements.push({ el: createBlock(120, 4, 5, 55, 25, 0.3), xRange: 12, yRange: 5, freq: 0.015, phase: 1.2, rotateSpeed: 0.1 });
  elements.push({ el: createBlock(4, 90, 55, 15, -15, 0.4), xRange: 5, yRange: 10, freq: 0.02, phase: 3.5, rotateSpeed: 0.15 });
  elements.push({ el: createBlock(80, 3, 75, 45, 60, 0.2), xRange: 8, yRange: 4, freq: 0.018, phase: 0.8, rotateSpeed: 0.08 });

  // Triangles (GD spikes)
  elements.push({ el: createTriangle(30, 20, 25, 0), xRange: 8, yRange: 6, freq: 0.03, phase: 2.5, rotateSpeed: 0.5 });
  elements.push({ el: createTriangle(25, 65, 80, 180), xRange: 6, yRange: 8, freq: 0.025, phase: 4.8, rotateSpeed: 0.3 });
  elements.push({ el: createTriangle(20, 45, 50, 90), xRange: 5, yRange: 5, freq: 0.035, phase: 1.7, rotateSpeed: 0.4 });
  elements.push({ el: createTriangle(35, 90, 30, -45), xRange: 7, yRange: 9, freq: 0.02, phase: 3.2, rotateSpeed: 0.2 });

  // Diamonds (GD collectible-style)
  elements.push({ el: createDiamond(20, 25, 15), xRange: 5, yRange: 5, freq: 0.04, phase: 0.5, rotateSpeed: 1 });
  elements.push({ el: createDiamond(15, 70, 40), xRange: 4, yRange: 6, freq: 0.03, phase: 2.3, rotateSpeed: 0.8 });
  elements.push({ el: createDiamond(25, 10, 75), xRange: 6, yRange: 4, freq: 0.025, phase: 4.1, rotateSpeed: 0.6 });
  elements.push({ el: createDiamond(12, 50, 65), xRange: 3, yRange: 3, freq: 0.05, phase: 0.9, rotateSpeed: 1.2 });

  // Small particle squares
  for (var p = 0; p < 20; p++) {
    var s = 2 + Math.random() * 4;
    elements.push({
      el: createBlock(s, s, Math.random() * 100, Math.random() * 100, Math.random() * 360, 0.2 + Math.random() * 0.3),
      xRange: 3 + Math.random() * 5,
      yRange: 3 + Math.random() * 5,
      freq: 0.02 + Math.random() * 0.03,
      phase: Math.random() * 6,
      rotateSpeed: (Math.random() - 0.5) * 2,
    });
  }

  // --- Grid pattern ---
  var grid = document.createElement('div');
  grid.style.position = 'absolute';
  grid.style.inset = '0';
  grid.style.backgroundImage =
    'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)';
  grid.style.backgroundSize = '60px 60px';
  grid.style.backgroundPosition = 'center center';
  grid.style.opacity = '0.6';
  container.appendChild(grid);

  // --- Vignette ---
  var vignette = document.createElement('div');
  vignette.style.position = 'absolute';
  vignette.style.inset = '0';
  vignette.style.background = 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(5,5,5,0.5) 100%)';
  container.appendChild(vignette);

  // --- Mouse parallax ---
  document.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // --- Animation loop ---
  var time = 0;

  function tick() {
    time += 0.005;

    var gx = mouseX * 6;
    var gy = mouseY * 6;
    grid.style.transform = 'translate(' + gx + 'px, ' + gy + 'px)';

    for (var i = 0; i < elements.length; i++) {
      var e = elements[i];
      var t = time + e.phase;
      var tx = Math.sin(t * e.freq * 2) * e.xRange;
      var ty = Math.cos(t * e.freq * 1.7) * e.yRange;

      var px = mouseX * 6 * ((i % 5) + 1) * 0.15;
      var py = mouseY * 6 * ((i % 5) + 1) * 0.15;

      var rot = e.rotateSpeed ? e.rotateSpeed * time * 20 : 0;
      e.el.style.transform =
        'translate(' + (tx + px) + 'px, ' + (ty + py) + 'px) rotate(' + rot + 'deg)';
    }

    requestAnimationFrame(tick);
  }

  tick();
})();
