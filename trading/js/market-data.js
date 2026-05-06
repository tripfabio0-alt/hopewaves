/**
 * Hopewaves Market Data Engine v2.0
 * ----------------------------------
 * Crypto:  Binance REST API    → free, no key, CORS-friendly
 * Forex:   Frankfurter.app     → free, no key, CORS-friendly
 * Ações:   Simulado com base real (sem API gratuita confiável para B3)
 *
 * Atualiza a cada 30 segundos automaticamente.
 */

const MarketData = (() => {

    // ─── CONFIGURAÇÃO ───────────────────────────────────────────────────────
    const REFRESH_INTERVAL = 30000; // 30 segundos
    const BINANCE_BASE = 'https://api.binance.com/api/v3';
    const FOREX_BASE   = 'https://api.frankfurter.app';

    // Mapeamento símbolo → elemento no DOM  [data-symbol="BTC"]
    const CRYPTO_SYMBOLS = {
        'BTCUSDT':  'BTC/USD',
        'ETHUSDT':  'ETH/USD',
        'SOLUSDT':  'SOL/USD',
        'BNBUSDT':  'BNB/USD',
        'XRPUSDT':  'XRP/USD',
        'DOGEUSDT': 'DOGE/USD',
        'LINKUSDT': 'LINK/USD',
    };

    // Pares forex que queremos (base USD)
    const FOREX_PAIRS = {
        'EUR': 'EUR/USD', // precisa inverter (EUR/USD = 1/USD per EUR)
        'GBP': 'GBP/USD',
        'JPY': 'USD/JPY', // USD/JPY = direto
        'AUD': 'AUD/USD',
        'CHF': 'USD/CHF', // inverso
    };

    // Cache para exibir variação percentual
    const prevPrices = {};

    // ─── UTILITÁRIOS ────────────────────────────────────────────────────────
    function formatPrice(symbol, price) {
        if (['BTCUSDT'].includes(symbol)) return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (['ETHUSDT', 'SOLUSDT', 'BNBUSDT'].includes(symbol)) return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (price >= 100) return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (price < 1) return price.toFixed(4);
        return price.toFixed(4);
    }

    function updateTicker(label, price, displayValue) {
        // Atualiza elementos .live-value no ticker bar e em cards
        document.querySelectorAll('.live-value').forEach(el => {
            const parentText = el.closest('.ticker-item')?.querySelector('strong')?.textContent?.trim();
            if (parentText === label) {
                const prev = prevPrices[label];
                const isUp = prev === undefined || price >= prev;
                el.textContent = displayValue;
                el.className = 'live-value ' + (isUp ? 'up' : 'down');
                // Efeito flash ao atualizar
                el.style.transition = 'color 0.3s';
                el.style.color = isUp ? 'var(--profit)' : 'var(--loss)';
                setTimeout(() => { el.style.color = ''; }, 800);
                prevPrices[label] = price;
            }
        });

        // Atualiza também signal cards e stat-numbers com data-symbol
        document.querySelectorAll(`[data-live="${label}"]`).forEach(el => {
            el.textContent = displayValue;
        });
    }

    function updateStatus(ok) {
        const badge = document.querySelector('.hero-live-badge');
        if (!badge) return;
        if (ok) {
            badge.style.background = '';
            const dot = badge.querySelector('.pulse-dot');
            if (dot) dot.style.background = 'var(--profit)';
        }
    }

    // ─── FETCH CRIPTO (BINANCE) ─────────────────────────────────────────────
    async function fetchCrypto() {
        try {
            const symbols = Object.keys(CRYPTO_SYMBOLS);
            const query   = symbols.map(s => `"${s}"`).join(',');
            const url     = `${BINANCE_BASE}/ticker/price?symbols=[${query}]`;
            const res     = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) throw new Error('Binance ' + res.status);
            const data = await res.json();

            data.forEach(item => {
                const label = CRYPTO_SYMBOLS[item.symbol];
                if (!label) return;
                const price = parseFloat(item.price);
                const display = formatPrice(item.symbol, price);
                updateTicker(label, price, display);
            });

            updateStatus(true);
            console.log('[MarketData] Crypto atualizado ✓', new Date().toLocaleTimeString('pt-BR'));
        } catch (err) {
            console.warn('[MarketData] Crypto falhou, usando dados simulados:', err.message);
            simulateCrypto();
        }
    }

    // ─── FETCH FOREX (FRANKFURTER) ──────────────────────────────────────────
    async function fetchForex() {
        try {
            // Frankfurter retorna taxas em relação ao EUR por padrão
            // Buscamos USD como base, convertemos para os pares que precisamos
            const url = `${FOREX_BASE}/latest?from=USD&to=EUR,GBP,JPY,AUD,CHF`;
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) throw new Error('Frankfurter ' + res.status);
            const data = await res.json();
            const rates = data.rates; // taxas de 1 USD → outras moedas

            // EUR/USD = 1 / (USD por EUR) = rates.EUR invertido
            const eurUsd = parseFloat((1 / rates.EUR).toFixed(5));
            updateTicker('EUR/USD', eurUsd, eurUsd.toFixed(4));

            // GBP/USD = 1 / rates.GBP
            const gbpUsd = parseFloat((1 / rates.GBP).toFixed(5));
            updateTicker('GBP/USD', gbpUsd, gbpUsd.toFixed(4));

            // USD/JPY = rates.JPY (USD compra x JPY)
            const usdJpy = parseFloat(rates.JPY.toFixed(3));
            updateTicker('USD/JPY', usdJpy, usdJpy.toFixed(2));

            // AUD/USD = 1 / rates.AUD
            const audUsd = parseFloat((1 / rates.AUD).toFixed(5));
            updateTicker('AUD/USD', audUsd, audUsd.toFixed(4));

            // USD/CHF = rates.CHF
            const usdChf = parseFloat(rates.CHF.toFixed(5));
            updateTicker('USD/CHF', usdChf, usdChf.toFixed(4));

            // EUR/JPY = EUR/USD * USD/JPY
            const eurJpy = parseFloat((eurUsd * usdJpy).toFixed(3));
            updateTicker('EUR/JPY', eurJpy, eurJpy.toFixed(2));

            // GBP/JPY = GBP/USD * USD/JPY
            const gbpJpy = parseFloat((gbpUsd * usdJpy).toFixed(3));
            updateTicker('GBP/JPY', gbpJpy, gbpJpy.toFixed(2));

            console.log('[MarketData] Forex atualizado ✓', new Date().toLocaleTimeString('pt-BR'));
        } catch (err) {
            console.warn('[MarketData] Forex falhou, usando simulação:', err.message);
            simulateForex();
        }
    }

    // ─── SIMULAÇÃO (FALLBACK) ────────────────────────────────────────────────
    // Usado quando as APIs falham. Aplica variância aleatória sobre último valor conhecido.
    function simulateCrypto() {
        const bases = { 'BTC/USD': 64230, 'ETH/USD': 3120, 'SOL/USD': 148, 'BNB/USD': 590, 'XRP/USD': 0.52, 'DOGE/USD': 0.16, 'LINK/USD': 14.3 };
        Object.entries(bases).forEach(([label, base]) => {
            const prev   = prevPrices[label] || base;
            const change = (Math.random() - 0.49) * 0.002 * prev; // ±0.2%
            const price  = Math.max(prev + change, base * 0.95);
            const display = price >= 100
                ? price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : price.toFixed(4);
            updateTicker(label, price, display);
        });
    }

    function simulateForex() {
        const bases = { 'EUR/USD': 1.0850, 'GBP/USD': 1.2642, 'USD/JPY': 151.30, 'AUD/USD': 0.6570, 'USD/CHF': 0.9050, 'EUR/JPY': 164.10, 'GBP/JPY': 191.30 };
        Object.entries(bases).forEach(([label, base]) => {
            const prev   = prevPrices[label] || base;
            const change = (Math.random() - 0.49) * 0.0003 * prev; // ±0.03%
            const price  = prev + change;
            updateTicker(label, price, price.toFixed(4));
        });
    }

    function simulateStocks() {
        // Ações B3 e índices: sem API gratuita, mantém simulação realista
        const bases = {
            'IBOV':   127450, 'PETR4': 38.42, 'VALE3': 62.30,
            'ITUB4':  33.80,  'BBDC4': 14.50, 'WEGE3': 41.90,
            'MGLU3':  2.18,   'WIN$':  124680,'WDO$':  5148,
            'US30':   39120,  'VIX':   13.20, 'OURO':  2320,
            'S&P 500': 5120,  'NDX':   18150,
        };
        Object.entries(bases).forEach(([label, base]) => {
            const prev   = prevPrices[label] || base;
            const change = (Math.random() - 0.495) * 0.001 * prev; // ±0.1%
            const price  = Math.abs(prev + change);
            let display;
            if (price >= 1000)  display = price.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            else if (price >= 10) display = price.toFixed(2);
            else display = price.toFixed(4);
            updateTicker(label, price, display);
        });
    }

    // ─── ATUALIZAÇÃO DO TIMESTAMP ────────────────────────────────────────────
    function updateTimestamp() {
        const el = document.getElementById('market-timestamp');
        if (el) el.textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    // ─── CICLO PRINCIPAL ─────────────────────────────────────────────────────
    async function refresh() {
        await Promise.allSettled([fetchCrypto(), fetchForex()]);
        simulateStocks(); // B3 sempre simulado
        updateTimestamp();
    }

    function init() {
        // Executa imediatamente ao carregar
        refresh();
        // Repete a cada 30s
        setInterval(refresh, REFRESH_INTERVAL);

        // Atualiza ações simuladas mais frequentemente (a cada 3s para parecer vivo)
        setInterval(simulateStocks, 3000);
        // Atualiza forex simulado a cada 5s (enquanto API não retorna)
        setInterval(simulateForex, 5000);
    }

    return { init, refresh };
})();

// Auto-inicia quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', MarketData.init);
} else {
    MarketData.init();
}
