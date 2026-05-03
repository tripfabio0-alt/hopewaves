export default function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { path = '/' } = req.query;

  // Regras de Otimização (Simulando o Banco de Dados/IA)
  const seoRules = {
    '/': {
      title: 'Hopewaves | Rede Premium de Afiliados (Otimizado)',
      description: 'A rede de afiliados que garante +150% de conversão. Plataforma premium com ferramentas avançadas para impulsionar seus resultados.',
      schema: {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Hopewaves",
        "url": "https://hopewaves.vercel.app/",
        "logo": "https://hopewaves.vercel.app/assets/hero_bg.png",
        "description": "Rede Premium de Afiliados focada em resultados e conversão."
      }
    },
    '/affiliate/exemplo/': {
      title: 'Oferta Exclusiva - Hopewaves Afiliado parceiro',
      description: 'Descubra a oportunidade única com o parceiro Exemplo da Hopewaves. Transforme seu networking em resultados concretos hoje.',
      schema: {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Acesso Hopewaves VIP",
        "description": "Acesso exclusivo à plataforma Hopewaves através do nosso parceiro.",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "BRL",
          "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "154"
        }
      }
    }
  };

  // Lógica de Match
  let rule = seoRules[path];
  
  // Trata rotas com e sem barra no final se necessário, mas o script enviará window.location.pathname.
  if (!rule && path.endsWith('/') && path.length > 1) {
      rule = seoRules[path.slice(0, -1)];
  } else if (!rule && !path.endsWith('/')) {
      rule = seoRules[path + '/'];
  }
  
  if (!rule) {
    // Default fallback
    rule = {
      title: 'Hopewaves | Parceria Oficial',
      description: 'Conheça nossos parceiros oficiais e comece a escalar seus resultados na internet com a nossa plataforma exclusiva.',
      schema: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Página Oficial de Parceiro - Hopewaves"
      }
    };
  }

  // Simula "Timestamp de Atualização" para o Log
  const timestamp = new Date().toISOString();

  res.status(200).json({
    success: true,
    data: rule,
    meta: {
      generated_at: timestamp,
      status: 'SEO Optimization Applied Active'
    }
  });
}
