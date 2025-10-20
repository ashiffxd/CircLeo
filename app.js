const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');

const clearBtn = document.getElementById('clear-btn');
const colorSelect = document.getElementById('stroke-color');
const targetDot = document.getElementById('target-dot');
const scoreValue = document.getElementById('score-value');
const scoreMessage = document.getElementById('score-message');
const bestScoreValue = document.getElementById('best-score-value');
const challengeBtn = document.getElementById('challenge-btn');
const copyPopup = document.createElement('div'); // Popup element

// --- Popup styling ---
copyPopup.id = 'copy-popup';
copyPopup.textContent = 'Challenge copied!';
copyPopup.style.position = 'absolute';
copyPopup.style.opacity = '0';
copyPopup.style.pointerEvents = 'none';
copyPopup.style.transition = 'opacity 0.3s ease';
document.body.appendChild(copyPopup);

// --- Load best score ---
let bestScore = localStorage.getItem('bestScore') || 0;
bestScoreValue.textContent = bestScore + '%';

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
    targetDot.style.left = `${rect.width / 2 - dotSize / 2}px`;
    targetDot.style.top = `${rect.height / 2 - dotSize / 2}px`;
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
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const { x, y } = getCanvasCoords(e);
    ctx.moveTo(x, y);
    points.push({ x, y });
    updateLiveScore();
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
    scoreValue.textContent = '--%';
    scoreMessage.textContent = '';
});

// --- Show warning ---
function showWarning(msg) {
    ctx.save();
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "red";
    ctx.textAlign = "center";
    ctx.fillText(msg, canvas.width / 2, canvas.height / 2 + 50);
    ctx.restore();
}

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
    if (points.length < 3) return;
    const acc = calculateAccuracyCenter(points);
    scoreValue.textContent = acc.toFixed(2) + '%';
}

// --- Final score ---
function showFinalScore() {
    if (points.length < 3) return;

    const start = points[0];
    const end = points[points.length - 1];
    const avgR = points.reduce((sum, p) => sum + Math.hypot(p.x - canvas.width/2, p.y - canvas.height/2), 0) / points.length;
    const threshold = Math.max(20, avgR * 0.1);

    if (Math.hypot(end.x - start.x, end.y - start.y) > threshold) {
        showWarning("Make it a closed circle!");
        scoreValue.textContent = '--%';
        scoreMessage.textContent = '';
        return;
    }

    const acc = calculateAccuracyCenter(points);
    scoreValue.textContent = acc.toFixed(2) + '%';

    let newHighScore = false;
    if (acc > bestScore) {
        bestScore = acc.toFixed(2);
        bestScoreValue.textContent = bestScore + '%';
        localStorage.setItem('bestScore', bestScore);
        newHighScore = true;
    }

    if (newHighScore) {
        scoreMessage.textContent = "🎉 Congratulations! New High Score! 🎉";
        scoreMessage.style.color = "#00ff88";
        scoreMessage.style.fontWeight = "bold";
    } else {
        if (acc < 20) scoreMessage.textContent = 'Just give up, man.';
        else if (acc < 30) scoreMessage.textContent = 'What are you even doing?';
        else if (acc < 40) scoreMessage.textContent = 'Just pass.';
        else if (acc < 50) scoreMessage.textContent = 'Try again.';
        else if (acc < 60) scoreMessage.textContent = 'You can do better.';
        else if (acc < 70) scoreMessage.textContent = 'You are doing well.';
        else if (acc < 80) scoreMessage.textContent = 'Well done! Almost at the top.';
        else if (acc < 90) scoreMessage.textContent = 'So close to being a GOAT!';
        else scoreMessage.textContent = 'You are the GOAT!';
        scoreMessage.style.color = "#ccc";
        scoreMessage.style.fontWeight = "normal";
    }
}

// --- Challenge Copy ---
challengeBtn.addEventListener('click', () => {
    const bestScoreText = bestScoreValue.textContent.replace('%', '').trim();
    const text = `My circle is ${bestScoreText}% perfect, can you beat that? https://neal.fun/perfect-circle/`;

    navigator.clipboard.writeText(text).then(() => {
        const rect = challengeBtn.getBoundingClientRect();
        copyPopup.style.left = rect.left + rect.width / 2 + 'px';
        copyPopup.style.top = rect.top - 35 + 'px';
        copyPopup.style.transform = 'translateX(-50%)';
        copyPopup.style.background = '#d0ff00ff';
        copyPopup.style.color = '#000';
        copyPopup.style.padding = '6px 12px';
        copyPopup.style.borderRadius = '8px';
        copyPopup.style.fontSize = '14px';
        copyPopup.style.fontWeight = 'bold';
        copyPopup.style.whiteSpace = 'nowrap';
        copyPopup.style.opacity = '1';

        setTimeout(() => {
            copyPopup.style.opacity = '0';
        }, 1000);
    });
});
