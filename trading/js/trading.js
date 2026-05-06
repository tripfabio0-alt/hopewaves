// ========================================
// HOPEWAVES TRADING — INTERACTIVE ENGINE
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initCounters();
    initMiniChart('miniChart');
    initCalculators();
    initLiveTicker();
    initCountdown();
    initScrollReveal();
});

// Animated Counters
function initCounters() {
    document.querySelectorAll('.counter').forEach(counter => {
        const target = parseInt(counter.dataset.target, 10);
        const suffix = counter.dataset.suffix || '';
        const duration = 2000;
        const start = performance.now();
        function tick(now) {
            const p = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            counter.textContent = Math.floor(ease * target).toLocaleString('pt-BR') + suffix;
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    });
}

// Mini Candle Chart (Canvas)
function initMiniChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    const candles = [];
    const total = 40;
    let price = 12450;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        w = rect.width - 32;
        h = 180;
        canvas.width = w; canvas.height = h;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < total; i++) {
        const open = price;
        const change = (Math.random() - 0.48) * 80;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * 30;
        const low = Math.min(open, close) - Math.random() * 30;
        candles.push({ open, close, high, low });
        price = close;
    }

    let offset = 0;
    function draw() {
        ctx.clearRect(0, 0, w, h);
        const range = 180;
        const mid = candles.reduce((s, c) => s + c.close, 0) / candles.length;
        const y = v => h/2 + (mid - v) * (h * 0.7 / range);
        const step = w / (total + 2);

        // grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        [0.25,0.5,0.75].forEach(r => {
            ctx.beginPath(); ctx.moveTo(0, h*r); ctx.lineTo(w, h*r); ctx.stroke();
        });

        candles.forEach((c, i) => {
            const x = i * step + step + offset;
            const isUp = c.close >= c.open;
            ctx.strokeStyle = isUp ? '#00f2a0' : '#ff4d6d';
            ctx.fillStyle = ctx.strokeStyle;
            ctx.lineWidth = 2;

            // wick
            ctx.beginPath(); ctx.moveTo(x + step*0.35, y(c.high)); ctx.lineTo(x + step*0.35, y(c.low)); ctx.stroke();
            // body
            const yo = y(c.open), yc = y(c.close);
            ctx.fillRect(x + step*0.15, Math.min(yo, yc), step*0.4, Math.max(2, Math.abs(yo - yc)));
        });

        // last price label
        const last = candles[candles.length-1];
        document.querySelector('.mini-chart-header .price').textContent = last.close.toFixed(2);
    }
    draw();

    // animate new candles
    setInterval(() => {
        const last = candles[candles.length-1];
        price = last.close + (Math.random() - 0.48) * 40;
        const open = last.close;
        const close = price;
        const high = Math.max(open, close) + Math.random() * 20;
        const low = Math.min(open, close) - Math.random() * 20;
        candles.shift();
        candles.push({ open, close, high, low });
        draw();
    }, 3000);
}

// Live Ticker random fluctuation
function initLiveTicker() {
    const items = document.querySelectorAll('.live-value');
    items.forEach(el => {
        const base = parseFloat(el.dataset.base);
        const isPct = el.dataset.pct === 'true';
        setInterval(() => {
            const change = (Math.random() - 0.5) * (isPct ? 0.8 : base * 0.002);
            let v = base + change;
            if (isPct) v = parseFloat((v).toFixed(2));
            else v = parseFloat(v.toFixed(2));
            el.textContent = isPct ? (v > base ? '+' : '') + v + '%' : v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 5});
            el.classList.remove('up','down');
            el.classList.add(v >= base ? 'up' : 'down');
        }, 2500 + Math.random() * 2000);
    });
}

// Calculators
function initCalculators() {
    const form = document.getElementById('calcForm');
    if (!form) return;
    const update = () => {
        const saldo = parseFloat(form.saldo.value) || 0;
        const risco = parseFloat(form.risco.value) || 1;
        const entry = parseFloat(form.entry.value) || 0;
        const sl = parseFloat(form.sl.value) || 0;
        const tp = parseFloat(form.tp.value) || 0;
        if (!saldo || !entry || !sl) return;

        const riscoReais = saldo * (risco / 100);
        const pontosRisco = Math.abs(entry - sl);
        const pontosGain = Math.abs(tp - entry);
        const lote = pontosRisco > 0 ? (riscoReais / pontosRisco) : 0;
        const gain = pontosGain * lote;
        const rr = pontosRisco > 0 ? (pontosGain / pontosRisco).toFixed(2) : '0';

        document.getElementById('resLote').textContent = lote.toFixed(2) + (form.tipo.value === 'forex' ? ' lots' : ' contratos');
        document.getElementById('resRisco').textContent = 'R$ ' + riscoReais.toFixed(2);
        document.getElementById('resGain').textContent = 'R$ ' + gain.toFixed(2);
        document.getElementById('resRR').textContent = rr + ':1';
    };
    form.querySelectorAll('input, select').forEach(i => i.addEventListener('input', update));
    update();
}

// Countdown
function initCountdown() {
    const el = document.getElementById('countdown');
    if (!el) return;
    // target: next monday 00:00
    const now = new Date();
    const target = new Date(now);
    target.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    target.setHours(0,0,0,0);
    if (target - now < 0) target.setDate(target.getDate() + 7);

    function tick() {
        const diff = target - new Date();
        const d = Math.floor(diff / 864e5);
        const h = Math.floor((diff % 864e5) / 36e5);
        const m = Math.floor((diff % 36e5) / 6e4);
        const s = Math.floor((diff % 6e4) / 1000);
        el.textContent = `${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    tick();
    setInterval(tick, 1000);
}

// Scroll reveal
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(40px)';
        el.style.transition = 'opacity 0.8s cubic-bezier(0.2,0.8,0.2,1), transform 0.8s cubic-bezier(0.2,0.8,0.2,1)';
        observer.observe(el);
    });
}
