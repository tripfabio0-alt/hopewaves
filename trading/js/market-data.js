/**
 * Hopewaves Market Data Engine v3.0
 * ----------------------------------
 * Crypto:  Binance REST API         → free, no key, real-time
 * Forex:   Frankfurter.app          → free, no key, fim do dia
 * Ações:   /api/quotes (proxy brapi.dev) → free, B3 real + índices
 *
 * Fallback: simulação com valores base atualizados (Mai/2026)
 */

const MarketData = (() => {

    // ─── CONFIGURAÇÃO ───────────────────────────────────────────────────────
    const CRYPTO_REFRESH = 30000;  // 30s
    const FOREX_REFRESH  = 60000;  // 60s
    const STOCK_REFRESH  = 60000;  // 60s
    const SIM_TICK       = 3000;   // 3s — animação do ticker

    const BINANCE_BASE = 'https://api.binance.com/api/v3';
    const FOREX_BASE   = 'https://api.frankfurter.app';

    // Cache de preços anteriores (para sinal up/down)
    const prev = {};

    // Mapeamento: símbolo Binance → label do ticker
    const CRYPTO_MAP = {
        'BTCUSDT':  'BTC/USD',
        'ETHUSDT':  'ETH/USD',
        'SOLUSDT':  'SOL/USD',
        'BNBUSDT':  'BNB/USD',
        'XRPUSDT':  'XRP/USD',
        'DOGEUSDT': 'DOGE/USD',
    };

    // Valores base atualizados Mai/2026 (usados como seed do fallback)
    const STOCK_BASES = {
        'IBOV':    186753,
        'WIN$':    186680,
        'WDO$':    5785,
        'PETR4':   36.80,
        'VALE3':   55.40,
        'ITUB4':   36.20,
        'BBDC4':   13.90,
        'WEGE3':   47.20,
        'MGLU3':   1.92,
        'S&P 500': 5600,
        'NDX':     19800,
        'US30':    42100,
        'VIX':     16.40,
        'OURO':    3300,
        'PETRÓLEO': 82.50,
    };

    const FOREX_BASES = {
        'EUR/USD': 1.1320,
        'GBP/USD': 1.3280,
        'USD/JPY': 144.50,
        'AUD/USD': 0.6480,
        'USD/CHF': 0.8850,
        'EUR/JPY': 163.50,
        'GBP/JPY': 191.90,
    };

    const CRYPTO_BASES = {
        'BTC/USD':  97500,
        'ETH/USD':  1840,
        'SOL/USD':  148,
        'BNB/USD':  600,
        'XRP/USD':  2.24,
        'DOGE/USD': 0.192,
    };

    // ─── UTILITÁRIOS ────────────────────────────────────────────────────────
    function fmt(price) {
        if (price >= 100000) return price.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
        if (price >= 1000)   return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (price >= 10)     return price.toFixed(2);
        if (price >= 1)      return price.toFixed(3);
        return price.toFixed(4);
    }

    function push(label, price, display) {
        // 1. Ticker bar
        document.querySelectorAll('.ticker-item').forEach(item => {
            const strong = item.querySelector('strong');
            if (!strong || strong.textContent.trim() !== label) return;
            const span = item.querySelector('.live-value');
            if (!span) return;
            const wasUp = prev[label] === undefined || price >= prev[label];
            span.textContent = display;
            span.classList.toggle('up', wasUp);
            span.classList.toggle('down', !wasUp);
            // flash
            span.style.opacity = '0.4';
            requestAnimationFrame(() => { span.style.transition = 'opacity 0.4s'; span.style.opacity = '1'; });
        });

        // 2. Elementos com data-live="LABEL"
        document.querySelectorAll(`[data-live="${label}"]`).forEach(el => {
            el.textContent = display;
        });

        prev[label] = price;
    }

    function tick(price, base, factor = 0.001) {
        const p = prev[base] !== undefined ? prev[base] : (STOCK_BASES[base] || CRYPTO_BASES[base] || FOREX_BASES[base] || price);
        return p + (Math.random() - 0.495) * factor * p;
    }

    // ─── FETCH CRIPTO (BINANCE) ─────────────────────────────────────────────
    async function fetchCrypto() {
        try {
            const keys  = Object.keys(CRYPTO_MAP);
            const url   = `${BINANCE_BASE}/ticker/price?symbols=[${keys.map(s => `"${s}"`).join(',')}]`;
            const r     = await fetch(url, { signal: AbortSignal.timeout(7000) });
            const data  = await r.json();
            data.forEach(({ symbol, price }) => {
                const label = CRYPTO_MAP[symbol];
                if (!label) return;
                const p = parseFloat(price);
                push(label, p, fmt(p));
            });
            console.log('[Market] Crypto ✓', new Date().toLocaleTimeString('pt-BR'));
        } catch {
            Object.entries(CRYPTO_BASES).forEach(([label]) => {
                const p = Math.abs(tick(null, label, 0.002));
                push(label, p, fmt(p));
            });
        }
    }

    // ─── FETCH FOREX (FRANKFURTER) ──────────────────────────────────────────
    async function fetchForex() {
        try {
            const r    = await fetch(`${FOREX_BASE}/latest?from=USD&to=EUR,GBP,JPY,AUD,CHF`, { signal: AbortSignal.timeout(7000) });
            const data = await r.json();
            const rt   = data.rates;

            const pairs = {
                'EUR/USD': 1 / rt.EUR,
                'GBP/USD': 1 / rt.GBP,
                'USD/JPY': rt.JPY,
                'AUD/USD': 1 / rt.AUD,
                'USD/CHF': rt.CHF,
                'EUR/JPY': (1 / rt.EUR) * rt.JPY,
                'GBP/JPY': (1 / rt.GBP) * rt.JPY,
            };
            Object.entries(pairs).forEach(([label, p]) => push(label, p, fmt(p)));
            console.log('[Market] Forex ✓', new Date().toLocaleTimeString('pt-BR'));
        } catch {
            simulateForex();
        }
    }

    // ─── FETCH AÇÕES/ÍNDICES (PROXY /api/quotes) ───────────────────────────
    async function fetchStocks() {
        try {
            const r    = await fetch('/api/quotes', { signal: AbortSignal.timeout(10000) });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const data = await r.json();
            if (!data.ok || !data.quotes?.length) throw new Error('sem dados');

            data.quotes.forEach(({ label, price }) => {
                if (label && price != null) push(label, price, fmt(price));
            });
            console.log('[Market] Ações ✓', new Date().toLocaleTimeString('pt-BR'));
        } catch (e) {
            console.warn('[Market] Ações falhou, simulando:', e.message);
            simulateStocks();
        }
    }

    // ─── SIMULAÇÕES FALLBACK ─────────────────────────────────────────────────
    function simulateForex() {
        Object.keys(FOREX_BASES).forEach(label => {
            const p = tick(null, label, 0.0003);
            push(label, p, fmt(p));
        });
    }

    function simulateStocks() {
        Object.keys(STOCK_BASES).forEach(label => {
            const p = Math.abs(tick(null, label, 0.001));
            push(label, p, fmt(p));
        });
    }

    // Tick rápido só para WIN$/WDO$ (parecer vivo durante sessão)
    function liveIndexTick() {
        ['WIN$', 'WDO$'].forEach(label => {
            const p = Math.abs(tick(null, label, 0.0008));
            push(label, p, fmt(p));
        });
    }

    // ─── TIMESTAMP ──────────────────────────────────────────────────────────
    function stamp() {
        const el = document.getElementById('market-timestamp');
        if (el) el.textContent = 'Atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    // ─── INIT ────────────────────────────────────────────────────────────────
    function init() {
        // Seed imediato com simulação (antes das APIs responderem)
        simulateStocks();
        simulateForex();

        // Busca dados reais
        fetchCrypto();
        fetchForex();
        fetchStocks();

        // Ciclos de atualização
        setInterval(fetchCrypto,    CRYPTO_REFRESH);
        setInterval(fetchForex,     FOREX_REFRESH);
        setInterval(fetchStocks,    STOCK_REFRESH);
        setInterval(liveIndexTick,  SIM_TICK);
        setInterval(stamp,          10000);
        stamp();
    }

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', MarketData.init);
} else {
    MarketData.init();
}
