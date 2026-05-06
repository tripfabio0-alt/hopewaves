/**
 * Hopewaves Market Proxy — /api/quotes
 * ------------------------------------
 * Vercel Serverless Function que busca cotações do Yahoo Finance
 * no lado do servidor (sem CORS) e repassa ao cliente.
 *
 * Uso: GET /api/quotes?symbols=PETR4.SA,VALE3.SA,^BVSP
 * Cache: 5 minutos (bolsas têm delay de 15min por padrão)
 *
 * Símbolos Yahoo Finance:
 *   Ações BR:  PETR4.SA, VALE3.SA, ITUB4.SA, BBDC4.SA, WEGE3.SA, MGLU3.SA
 *   IBOV:      ^BVSP
 *   S&P 500:   ^GSPC   |  Dow Jones: ^DJI   |  Nasdaq: ^NDX
 *   VIX:       ^VIX    |  Ouro:      GC=F   |  Petróleo: CL=F
 */
export default async function handler(req, res) {

    // ─── CORS Headers ──────────────────────────────────────────────────────
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // ─── Parâmetros ────────────────────────────────────────────────────────
    const { symbols } = req.query;

    if (!symbols) {
        return res.status(400).json({ error: 'Parâmetro ?symbols= obrigatório.' });
    }

    // ─── Busca Yahoo Finance ───────────────────────────────────────────────
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&lang=pt-BR&region=BR&corsDomain=finance.yahoo.com`;

    try {
        const response = await fetch(yahooUrl, {
            headers: {
                'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept':          'application/json',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Referer':         'https://finance.yahoo.com/',
                'Origin':          'https://finance.yahoo.com',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            throw new Error(`Yahoo Finance retornou HTTP ${response.status}`);
        }

        const data = await response.json();
        const quotes = data?.quoteResponse?.result ?? [];

        // ─── Normaliza os dados para o cliente ─────────────────────────────
        const simplified = quotes.map(q => ({
            symbol:         q.symbol,
            shortName:      q.shortName   || q.symbol,
            price:          q.regularMarketPrice          ?? null,
            change:         q.regularMarketChange         ?? null,
            changePct:      q.regularMarketChangePercent  ?? null,
            open:           q.regularMarketOpen           ?? null,
            high:           q.regularMarketDayHigh        ?? null,
            low:            q.regularMarketDayLow         ?? null,
            volume:         q.regularMarketVolume         ?? null,
            marketState:    q.marketState                 ?? 'CLOSED',
            currency:       q.currency                    ?? 'USD',
            exchange:       q.exchange                    ?? '',
            timestamp:      q.regularMarketTime           ?? null,
        }));

        // Cache de 5 minutos (dados têm delay de 15min por natureza das bolsas)
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({ ok: true, quotes: simplified, fetchedAt: new Date().toISOString() });

    } catch (err) {
        console.error('[/api/quotes] Erro:', err.message);
        return res.status(502).json({ ok: false, error: err.message, quotes: [] });
    }
}
