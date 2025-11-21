const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');

const clearBtn = document.getElementById('clear-btn');
const colorSelect = document.getElementById('stroke-color');
const targetDot = document.getElementById('target-dot');
const scoreValue = document.getElementById('score-value');
const scoreMessage = document.getElementById('score-message');
const bestScoreValue = document.getElementById('best-score-value');
const challengeBtn = document.getElementById('challenge-btn');
const copyPopup = document.getElementById('copy-popup');
const resultPanel = document.getElementById('result-panel');
const instructionOverlay = document.getElementById('instruction-overlay');

// --- Load best score ---
let bestScore = localStorage.getItem('bestScore') || 0;
bestScoreValue.textContent = bestScore;

// --- Canvas setup ---
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    positionTargetDot();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function positionTargetDot() {
    const rect = canvas.getBoundingClientRect();
    const dotSize = targetDot.offsetWidth;
    targetDot.style.left = `${rect.width / 2}px`;
    targetDot.style.top = `${rect.height / 2}px`;
}

// --- Drawing variables ---
let drawing = false;
let points = [];
let currentColor = '#00ff88';

colorSelect.addEventListener('change', (e) => {
    currentColor = e.target.value;
});

// --- Helpers ---
function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

// --- Drawing functions ---
function startDrawing(e) {
    e.preventDefault();
    drawing = true;
    points = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Removed shadow/glow for clearer line
    
    const { x, y } = getCanvasCoords(e);
    ctx.moveTo(x, y);
    points.push({ x, y });
    
    instructionOverlay.style.opacity = '0';
    
    // Show result panel immediately for live score
    resultPanel.classList.remove('hidden');
    scoreMessage.textContent = "Drawing...";
    scoreMessage.style.color = "#8892b0";
    scoreValue.textContent = "0";
}

function draw(e) {
    if (!drawing) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    points.push({ x, y });
    updateLiveScore();
}

function endDrawing() {
    if (!drawing) return;
    drawing = false;
    ctx.closePath();
    showFinalScore();
}

// --- Pointer and Touch Events ---
canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', endDrawing);
canvas.addEventListener('pointerleave', endDrawing);

// Touch fallback for mobile
canvas.addEventListener('touchstart', (e) => startDrawing(e.touches[0]));
canvas.addEventListener('touchmove', (e) => draw(e.touches[0]));
canvas.addEventListener('touchend', endDrawing);

// Prevent scrolling while drawing on mobile
canvas.style.touchAction = 'none';

// --- Clear canvas ---
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points = [];
    resultPanel.classList.add('hidden');
    instructionOverlay.style.opacity = '1';
    scoreValue.textContent = "0";
});

// --- Accuracy calculation ---
function calculateAccuracyCenter(points) {
    if (points.length < 3) return 0;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const radii = points.map(p => Math.hypot(p.x - cx, p.y - cy));
    const avgR = radii.reduce((sum, r) => sum + r, 0) / radii.length;
    if (avgR < 1e-3) return 0;

    const radialDev = radii.map(r => Math.abs(r - avgR));
    const meanDev = radialDev.reduce((s, v) => s + v, 0) / radialDev.length;
    const radialScore = Math.max(0, 1 - meanDev / (avgR * 0.3));

    const angles = points.map(p => Math.atan2(p.y - cy, p.x - cx));
    let unwrapped = [angles[0]];
    for (let i = 1; i < angles.length; i++) {
        let d = angles[i] - angles[i - 1];
        if (d > Math.PI) d -= 2 * Math.PI;
        else if (d < -Math.PI) d += 2 * Math.PI;
        unwrapped.push(unwrapped[i - 1] + d);
    }
    const totalAngle = Math.abs(unwrapped[unwrapped.length - 1] - unwrapped[0]);
    const coverage = Math.min(totalAngle / (2 * Math.PI), 1);

    const combined = 0.7 * radialScore + 0.3 * coverage;
    return Math.max(0, Math.min(combined * 100, 100));
}

// --- Live score ---
function updateLiveScore() {
    if (points.length < 5) return; // Wait for a few points
    const acc = calculateAccuracyCenter(points);
    const current = Math.floor(acc);
    scoreValue.textContent = current;
}

// --- Score Animation ---
function animateScore(target) {
    // Simple text update for now, or we could animate the number
    scoreValue.textContent = Math.floor(target);
}

// --- Particles ---
function createParticles() {
    const container = document.getElementById('particles-container');
    const colors = ['#00ff88', '#00ccff', '#ff0055', '#ffcc00'];
    
    for (let i = 0; i < 50; i++) {
        const p = document.createElement('div');
        p.style.position = 'absolute';
        p.style.left = '50%';
        p.style.top = '50%';
        p.style.width = Math.random() * 6 + 2 + 'px';
        p.style.height = p.style.width;
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.borderRadius = '50%';
        p.style.pointerEvents = 'none';
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 100 + 50;
        
        p.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(angle) * velocity}px), calc(-50% + ${Math.sin(angle) * velocity}px)) scale(0)`, opacity: 0 }
        ], {
            duration: 1000 + Math.random() * 500,
            easing: 'cubic-bezier(0, .9, .57, 1)',
        }).onfinish = () => p.remove();
        
        container.appendChild(p);
    }
}

// --- Final score ---
function showFinalScore() {
    if (points.length < 3) {
        resultPanel.classList.add('hidden');
        instructionOverlay.style.opacity = '1';
        return;
    }

    const start = points[0];
    const end = points[points.length - 1];
    const avgR = points.reduce((sum, p) => sum + Math.hypot(p.x - canvas.width/2, p.y - canvas.height/2), 0) / points.length;
    const threshold = Math.max(20, avgR * 0.1);

    if (Math.hypot(end.x - start.x, end.y - start.y) > threshold) {
        scoreMessage.textContent = "Close the circle!";
        scoreMessage.style.color = "#ff0055";
        scoreValue.textContent = "0";
        // Keep result panel visible
        return;
    }

    const acc = calculateAccuracyCenter(points);
    // resultPanel is already visible
    animateScore(acc);

    let newHighScore = false;
    if (acc > bestScore) {
        bestScore = acc.toFixed(2);
        bestScoreValue.textContent = bestScore;
        localStorage.setItem('bestScore', bestScore);
        newHighScore = true;
    }

    if (newHighScore) {
        scoreMessage.textContent = "New High Score! 🎉";
        scoreMessage.style.color = "#00ff88";
        createParticles();
    } else {
        if (acc < 50) scoreMessage.textContent = 'Keep practicing!';
        else if (acc < 80) scoreMessage.textContent = 'Not bad!';
        else if (acc < 90) scoreMessage.textContent = 'Impressive!';
        else scoreMessage.textContent = 'Perfection!';
        scoreMessage.style.color = "#fff";
    }
}

// --- Challenge Copy ---
challengeBtn.addEventListener('click', () => {
    const bestScoreText = bestScoreValue.textContent.trim();
    const text = `I drew a ${bestScoreText}% perfect circle! Can you beat me? https://circleo.vercel.app/`;

    navigator.clipboard.writeText(text).then(() => {
        copyPopup.classList.add('show');
        setTimeout(() => {
            copyPopup.classList.remove('show');
        }, 2000);
    });
});
