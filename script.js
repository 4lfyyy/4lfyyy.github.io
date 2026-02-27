document.addEventListener('DOMContentLoaded', () => {
  initPolaroids();
  initDrawCanvas();
  initScrollToTop();
});

const polaroidBasePositions = new Map();

function initPolaroids() {
  const polaroids = document.querySelectorAll('.polaroid');
  const isMobile = window.innerWidth <= 900;

  if (isMobile) {
    placePolaroidsMobile(polaroids);
  } else {
    placePolaroidsDesktop(polaroids);
    initParallax(polaroids);
  }

  polaroids.forEach(p => makeDraggable(p));

  let resizeTimer;
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    if (newWidth === lastWidth) return; 
    lastWidth = newWidth;

    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const nowMobile = newWidth <= 900;
      if (nowMobile) {
        placePolaroidsMobile(polaroids);
      } else {
        const unpinned = Array.from(polaroids).filter(p => !p.classList.contains('pinned'));
        if (unpinned.length > 0) {
          placePolaroidsDesktop(unpinned);
        }
        initParallax(polaroids);
      }
    }, 300);
  });
}

function placePolaroidsDesktop(polaroids) {
  const container = document.getElementById('polaroid-container');
  container.style.position = 'fixed';

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const notebookW = Math.min(720, vw * 0.85);
  const notebookLeft = (vw - notebookW) / 2;
  const notebookRight = notebookLeft + notebookW;

  const leftMargin = Math.max(20, notebookLeft - 210);
  const rightStart = Math.min(notebookRight + 20, vw - 210);

  const positions = [];

  const polArr = Array.from(polaroids);
  polArr.forEach((p, i) => {
    if (p.classList.contains('pinned')) return;

    const rotation = parseInt(p.dataset.rotation) || 0;
    const isLeft = i % 2 === 0;

    let x, y;
    let attempts = 0;
    const polaroidW = 180;
    const polaroidH = 220;

    do {
      if (isLeft) {
        x = randBetween(10, leftMargin);
      } else {
        x = randBetween(rightStart, vw - polaroidW - 10);
      }
      y = randBetween(60, vh - polaroidH - 40);
      attempts++;
    } while (attempts < 50 && positions.some(pos =>
      Math.abs(pos.x - x) < 140 && Math.abs(pos.y - y) < 180
    ));

    positions.push({ x, y });

    const jitterRot = rotation + randBetween(-3, 3);
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.transform = `rotate(${jitterRot}deg)`;
    p.style.position = 'absolute';
    p.style.display = 'block';
    p.style.margin = '0';

    polaroidBasePositions.set(p, { x, y, rotation: jitterRot, scrollAtSet: window.scrollY });
  });
}

function initParallax(polaroids) {
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const scrollY = window.scrollY;

      polaroids.forEach(p => {
        if (p.classList.contains('pinned')) return;

        const base = polaroidBasePositions.get(p);
        if (!base) return;

        const speed = parseFloat(p.dataset.parallaxSpeed) || 0.15;
        const deltaScroll = scrollY - (base.scrollAtSet || 0);
        const offsetY = deltaScroll * speed;

        p.style.transform = `rotate(${base.rotation}deg) translateY(${-offsetY}px)`;
      });

      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}

function placePolaroidsMobile(polaroids) {
  const notebook = document.getElementById('notebook');
  const container = document.getElementById('polaroid-container');
  const page = document.querySelector('.notebook-page');

  if (!container.dataset.movedMobile) {
    notebook.appendChild(container);
    container.dataset.movedMobile = 'true';
  }

  container.style.position = 'absolute';
  container.style.display = 'block';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = page.offsetHeight + 'px';

  const pageW = page.offsetWidth;
  const pageH = page.offsetHeight;
  const polW = 150;
  const polH = 190;
  const count = polaroids.length;

  const zoneHeight = Math.floor((pageH - polH) / count);

  const positions = [];

  polaroids.forEach((p, i) => {
    p.classList.remove('pinned');

    const rotation = parseInt(p.dataset.rotation) || 0;
    const jitter = rotation + randBetween(-5, 5);

    let x, y;
    let attempts = 0;
    const zoneStart = i * zoneHeight;
    const zoneEnd = zoneStart + zoneHeight;

    do {
      x = randBetween(5, Math.max(20, pageW - polW - 5));
      y = randBetween(zoneStart + 20, Math.max(zoneStart + 40, zoneEnd));
      attempts++;
    } while (attempts < 30 && positions.some(pos =>
      Math.abs(pos.x - x) < 100 && Math.abs(pos.y - y) < 140
    ));

    positions.push({ x, y });

    if (p.parentElement !== container) {
      container.appendChild(p);
    }

    p.style.position = 'absolute';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.transform = `rotate(${jitter}deg)`;
    p.style.display = 'block';
    p.style.margin = '0';
  });
}

let globalPolaroidZ = 100;

function makeDraggable(el) {
  let isDragging = false;
  let offsetX, offsetY;

  const onStart = (e) => {
    if (document.body.classList.contains('drawing-mode')) return;

    const touch = e.touches ? e.touches[0] : e;
    const isMobile = window.innerWidth <= 900;

    if (el.classList.contains('pinned')) {
      el.classList.remove('pinned');
    }

    const rect = el.getBoundingClientRect();

    const pageLeft = rect.left + window.scrollX;
    const pageTop = rect.top + window.scrollY;

    if (el.parentElement !== document.body) {
      document.body.appendChild(el);
    }

    isDragging = true;
    el.classList.add('dragging');
    globalPolaroidZ++;
    el.style.zIndex = globalPolaroidZ;
    el.style.margin = '0';
    el.style.transition = 'none';
    el.style.transform = el.style.transform.replace(/\s*translateY\([^)]*\)/, '');

    if (isMobile) {
      el.style.position = 'absolute';
      el.style.left = pageLeft + 'px';
      el.style.top = pageTop + 'px';

      offsetX = touch.pageX - pageLeft;
      offsetY = touch.pageY - pageTop;
    } else {
      el.style.position = 'fixed';
      el.style.left = rect.left + 'px';
      el.style.top = rect.top + 'px';

      offsetX = touch.clientX - rect.left;
      offsetY = touch.clientY - rect.top;
    }

    e.preventDefault();
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches ? e.touches[0] : e;
    const isMobile = window.innerWidth <= 900;

    if (isMobile) {
      el.style.left = (touch.pageX - offsetX) + 'px';
      el.style.top = (touch.pageY - offsetY) + 'px';
    } else {
      el.style.left = (touch.clientX - offsetX) + 'px';
      el.style.top = (touch.clientY - offsetY) + 'px';
    }

    e.preventDefault();
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    el.classList.remove('dragging');
    el.style.transition = '';

    const isMobile = window.innerWidth <= 900;

    if (!isMobile) {
      checkNotebookPin(el);
    }

    if (!el.classList.contains('pinned')) {
      const container = document.getElementById('polaroid-container');

      if (isMobile) {
        const elLeft = parseFloat(el.style.left);
        const elTop = parseFloat(el.style.top);

        const notebook = document.getElementById('notebook');
        const notebookRect = notebook.getBoundingClientRect();
        const notebookPageLeft = notebookRect.left + window.scrollX;
        const notebookPageTop = notebookRect.top + window.scrollY;

        const absLeft = elLeft - notebookPageLeft;
        const absTop = elTop - notebookPageTop;

        if (el.parentElement !== container) {
          container.appendChild(el);
        }
        el.style.position = 'absolute';
        el.style.left = absLeft + 'px';
        el.style.top = absTop + 'px';
      } else {
        const rect = el.getBoundingClientRect();
        if (el.parentElement !== container) {
          container.appendChild(el);
        }
        el.style.position = 'absolute';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';

        const currentTransform = el.style.transform || '';
        const rotMatch = currentTransform.match(/rotate\(([^)]+)\)/);
        const rot = rotMatch ? parseFloat(rotMatch[1]) : 0;
        polaroidBasePositions.set(el, {
          x: rect.left,
          y: rect.top,
          rotation: rot,
          scrollAtSet: window.scrollY
        });
      }
    }
  };

  el.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);

  el.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);
}

function checkNotebookPin(polaroid) {
  const notebook = document.getElementById('notebook');
  const page = document.querySelector('.notebook-page');
  const pageRect = page.getBoundingClientRect();
  const polRect = polaroid.getBoundingClientRect();

  const polCenterX = polRect.left + polRect.width / 2;
  const polCenterY = polRect.top + polRect.height / 2;

  const isOverNotebook =
    polCenterX >= pageRect.left &&
    polCenterX <= pageRect.right &&
    polCenterY >= pageRect.top &&
    polCenterY <= pageRect.bottom;

  if (isOverNotebook) {
    const notebookRect = notebook.getBoundingClientRect();

    const absLeft = polRect.left - notebookRect.left + 14; 
    const absTop = polRect.top - notebookRect.top;

    polaroid.classList.add('pinned');
    polaroid.style.position = 'absolute';
    polaroid.style.left = absLeft + 'px';
    polaroid.style.top = absTop + 'px';
    polaroid.style.zIndex = '12';

    notebook.appendChild(polaroid);

    polaroidBasePositions.delete(polaroid);
  }
}

function initDrawCanvas() {
  const canvas = document.getElementById('drawCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const toggleBtn = document.getElementById('toggleDraw');
  const clearBtn = document.getElementById('clearDraw');

  let isDrawing = false;
  let drawMode = false;
  let lastX = 0;
  let lastY = 0;

  function resizeCanvas() {
    const page = document.querySelector('.notebook-page');

    const imageData = canvas.width > 0 ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;

    canvas.width = page.offsetWidth;
    canvas.height = page.offsetHeight;

    if (imageData) {
      ctx.putImageData(imageData, 0, 0);
    }
  }

  resizeCanvas();
  window.addEventListener('resize', () => {
    setTimeout(resizeCanvas, 100);
  });

  const observer = new ResizeObserver(() => resizeCanvas());
  observer.observe(document.querySelector('.notebook-page'));

  toggleBtn.addEventListener('click', () => {
    drawMode = !drawMode;
    canvas.classList.toggle('active', drawMode);
    toggleBtn.classList.toggle('active', drawMode);
    document.body.classList.toggle('drawing-mode', drawMode);
  });

  clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function startDraw(e) {
    if (!drawMode) return;
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
    e.preventDefault();
  }

  function draw(e) {
    if (!isDrawing || !drawMode) return;
    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.85;
    ctx.stroke();

    lastX = pos.x;
    lastY = pos.y;
    e.preventDefault();
  }

  function stopDraw() {
    isDrawing = false;
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);

  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);
}

function initScrollToTop() {
  const btn = document.getElementById('scrollTop');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}