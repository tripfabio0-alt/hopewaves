(async function() {
    console.log("🚀 Iniciando SEO Injector...");

    const apiUrl = '/api/seo';
    const currentPath = window.location.pathname;

    try {
        const response = await fetch(`${apiUrl}?path=${encodeURIComponent(currentPath)}`);
        
        if (!response.ok) {
            console.error("Falha ao buscar as regras de SEO.");
            return;
        }

        const json = await response.json();
        
        if (json.success && json.data) {
            applySeoRules(json.data);
            checkDebugMode(json);
        }

    } catch (error) {
        console.error("Erro no SEO Injector:", error);
    }

    function applySeoRules(data) {
        // 1. Atualizar <title>
        if (data.title) {
            document.title = data.title;
        }

        // 2. Atualizar ou Criar <meta name="description">
        if (data.description) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = "description";
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = data.description;
        }

        // 3. Injetar Schema.org (JSON-LD)
        if (data.schema) {
            // Remove o antigo se existir
            const oldSchema = document.querySelector('script[id="hw-seo-schema"]');
            if (oldSchema) {
                oldSchema.remove();
            }

            const schemaScript = document.createElement('script');
            schemaScript.type = "application/ld+json";
            schemaScript.id = "hw-seo-schema";
            schemaScript.text = JSON.stringify(data.schema, null, 2);
            document.head.appendChild(schemaScript);
        }
    }

    function checkDebugMode(json) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug_seo') === 'true') {
            const data = json.data;
            const debugBanner = document.createElement('div');
            debugBanner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                background-color: rgba(138, 43, 226, 0.95);
                color: #fff;
                z-index: 999999;
                padding: 15px;
                font-family: monospace;
                font-size: 14px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                backdrop-filter: blur(10px);
                border-bottom: 2px solid #00f2fe;
                overflow-wrap: break-word;
            `;
            
            const closeBtn = document.createElement('button');
            closeBtn.innerText = "X";
            closeBtn.style.cssText = `
                position: absolute;
                top: 15px;
                right: 20px;
                background: transparent;
                border: none;
                color: white;
                font-size: 16px;
                cursor: pointer;
                font-weight: bold;
            `;
            closeBtn.onclick = () => debugBanner.remove();

            let schemaHtml = data.schema ? `<pre style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 12px; overflow-x: auto;">${JSON.stringify(data.schema, null, 2)}</pre>` : 'Nenhum Schema Injetado';

            debugBanner.innerHTML = `
                <strong style="color: #00f2fe;">🔍 [DEBUG MODO ATIVO] Hopewaves SEO Engine</strong><br/>
                <hr style="border-color: rgba(255,255,255,0.2); margin: 10px 0;">
                <b>URL Path Mapeada:</b> ${window.location.pathname}<br/>
                <b>Título Injetado:</b> ${data.title || 'Nenhum'}<br/>
                <b>Description Injetada:</b> ${data.description || 'Nenhum'}<br/>
                <b>Schema.org (JSON-LD):</b><br/>
                ${schemaHtml}
                <div style="font-size: 10px; color: #ccc; margin-top: 10px;">Gerado em: ${json.meta.generated_at}</div>
            `;
            
            debugBanner.appendChild(closeBtn);
            document.body.appendChild(debugBanner);
        }
    }
})();
