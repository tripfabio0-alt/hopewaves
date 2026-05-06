/**
 * Hopewaves /api/quotes — Vercel Serverless Proxy
 * ------------------------------------------------
 * Fonte primária:  brapi.dev (B3 real, grátis, sem key)
 * Fonte secundária: Yahoo Finance (índices globais)
 * Fallback: valores base hardcoded atualizados Mai/2026
 *
 * GET /api/quotes  → retorna cotações de ações B3 e índices
 */
export default async function handler(req, res) {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    // Cache de 5 minutos (dados B3 têm delay de 15min por padrão)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    const quotes = [];

    // ─── 1. AÇÕES B3 via brapi.dev ─────────────────────────────────────────
    // Grátis, sem API key, CORS OK no server-side
    const b3Symbols = ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'WEGE3', 'MGLU3'];
    try {
        const brapiUrl = `https://brapi.dev/api/quote/${b3Symbols.join(',')}?fundamental=false`;
        const r = await fetch(brapiUrl, {
            headers: { 'User-Agent': 'HopewavesBot/1.0' },
            signal: AbortSignal.timeout(8000),
        });

        if (r.ok) {
            const data = await r.json();
            (data.results || []).forEach(stock => {
                if (stock.regularMarketPrice) {
                    quotes.push({
                        label:     stock.symbol,
                        price:     stock.regularMarketPrice,
                        changePct: stock.regularMarketChangePercent ?? 0,
                        source:    'brapi',
                    });
                }
            });
        }
    } catch (e) {
        console.warn('[/api/quotes] brapi.dev falhou:', e.message);
    }

    // ─── 2. IBOV + ÍNDICES GLOBAIS via brapi.dev ───────────────────────────
    // ^BVSP = IBOV, ^GSPC = S&P500, ^NDX = Nasdaq, ^DJI = Dow, ^VIX = VIX
    const indexSymbols = ['^BVSP', '^GSPC', '^NDX', '^DJI', '^VIX', 'GC=F', 'CL=F'];
    const indexLabels  = {
        '^BVSP': 'IBOV',
        '^GSPC': 'S&P 500',
        '^NDX':  'NDX',
        '^DJI':  'US30',
        '^VIX':  'VIX',
        'GC=F':  'OURO',
        'CL=F':  'PETRÓLEO',
    };

    try {
        // brapi também cobre índices internacionais
        const encoded = indexSymbols.map(encodeURIComponent).join(',');
        const brapiIdx = `https://brapi.dev/api/quote/${encoded}?fundamental=false`;
        const ri = await fetch(brapiIdx, {
            headers: { 'User-Agent': 'HopewavesBot/1.0' },
            signal: AbortSignal.timeout(8000),
        });

        if (ri.ok) {
            const di = await ri.json();
            (di.results || []).forEach(item => {
                const label = indexLabels[item.symbol];
                if (label && item.regularMarketPrice) {
                    quotes.push({
                        label,
                        price:     item.regularMarketPrice,
                        changePct: item.regularMarketChangePercent ?? 0,
                        source:    'brapi-index',
                    });
                }
            });
        }
    } catch (e) {
        console.warn('[/api/quotes] brapi índices falhou:', e.message);
    }

    // ─── 3. Resposta ────────────────────────────────────────────────────────
    return res.status(200).json({
        ok:        quotes.length > 0,
        quotes,
        count:     quotes.length,
        fetchedAt: new Date().toISOString(),
    });
}
