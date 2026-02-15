const DEFAULT_TIMEOUT_MS = 12000;
function decodeHtml(text) {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}
function normalizePhrase(raw) {
    const cleaned = decodeHtml(raw)
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/[^a-zA-Z\s&]/g, " ")
        .toLowerCase()
        .trim();
    return cleaned;
}
function uniquePhrases(values) {
    return [...new Set(values.filter((value) => value.length > 0))];
}
async function fetchText(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; LiuziFridgeBot/1.0; +https://example.local)"
            },
            signal: controller.signal
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.text();
    }
    finally {
        clearTimeout(timeout);
    }
}
function parseXmlLocs(xml) {
    const locs = [];
    const regex = /<loc>([^<]+)<\/loc>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        locs.push(match[1]);
    }
    return locs;
}
function getSlugFromUrl(rawUrl) {
    try {
        const url = new URL(rawUrl);
        const fromName = url.searchParams.get("name") ?? url.searchParams.get("qs");
        if (fromName) {
            return normalizePhrase(fromName);
        }
        const segments = url.pathname.split("/").filter(Boolean);
        const tail = segments[segments.length - 1] ?? "";
        return normalizePhrase(tail);
    }
    catch {
        return normalizePhrase(rawUrl);
    }
}
function parseTaiPingDepartments(html) {
    const departments = [];
    const regex = /<h2>([^<]+)<\/h2>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const value = normalizePhrase(match[1]);
        if (value.length > 0) {
            departments.push(value);
        }
    }
    return uniquePhrases(departments);
}
async function collectPakNSaveSignals(maxProductSitemaps, maxProductsPerSitemap) {
    const items = [];
    try {
        const indexXml = await fetchText("https://www.paknsave.co.nz/ecomsitemap_index.xml");
        const sitemapLocs = parseXmlLocs(indexXml);
        const productSitemaps = sitemapLocs
            .filter((loc) => loc.includes("ecom_sitemap_products_"))
            .slice(0, maxProductSitemaps);
        for (const sitemapUrl of productSitemaps) {
            try {
                const xml = await fetchText(sitemapUrl);
                const productLocs = parseXmlLocs(xml).slice(0, maxProductsPerSitemap);
                const tokens = uniquePhrases(productLocs.map((loc) => getSlugFromUrl(loc)));
                items.push({
                    source: "paknsave_products",
                    url: sitemapUrl,
                    signalType: "product_slug",
                    tokens
                });
            }
            catch (error) {
                items.push({
                    source: "paknsave_products",
                    url: sitemapUrl,
                    signalType: "product_slug",
                    tokens: [],
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        }
        const categorySitemap = sitemapLocs.find((loc) => loc.includes("ecom_sitemap_categories"));
        if (categorySitemap) {
            try {
                const categoryXml = await fetchText(categorySitemap);
                const categoryLocs = parseXmlLocs(categoryXml);
                const tokens = uniquePhrases(categoryLocs.map((loc) => getSlugFromUrl(loc)));
                items.push({
                    source: "paknsave_categories",
                    url: categorySitemap,
                    signalType: "category_slug",
                    tokens
                });
            }
            catch (error) {
                items.push({
                    source: "paknsave_categories",
                    url: categorySitemap,
                    signalType: "category_slug",
                    tokens: [],
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        }
    }
    catch (error) {
        items.push({
            source: "paknsave_index",
            url: "https://www.paknsave.co.nz/ecomsitemap_index.xml",
            signalType: "category_slug",
            tokens: [],
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
    return items;
}
async function collectNewWorldSignals() {
    const url = "https://www.newworld.co.nz/brandssitemap_recipes.xml";
    try {
        const xml = await fetchText(url);
        const recipeLocs = parseXmlLocs(xml);
        const tokens = uniquePhrases(recipeLocs.map((loc) => getSlugFromUrl(loc)));
        return [
            {
                source: "newworld_recipes",
                url,
                signalType: "recipe_slug",
                tokens
            }
        ];
    }
    catch (error) {
        return [
            {
                source: "newworld_recipes",
                url,
                signalType: "recipe_slug",
                tokens: [],
                error: error instanceof Error ? error.message : "Unknown error"
            }
        ];
    }
}
async function collectTaiPingSignals() {
    const url = "https://www.taiping.co.nz/food-departments";
    try {
        const html = await fetchText(url);
        const tokens = parseTaiPingDepartments(html);
        return [
            {
                source: "taiping_departments",
                url,
                signalType: "department",
                tokens
            }
        ];
    }
    catch (error) {
        return [
            {
                source: "taiping_departments",
                url,
                signalType: "department",
                tokens: [],
                error: error instanceof Error ? error.message : "Unknown error"
            }
        ];
    }
}
export async function collectNZStoreSignals(options) {
    const maxProductSitemaps = options?.maxProductSitemaps ?? 2;
    const maxProductsPerSitemap = options?.maxProductsPerSitemap ?? 800;
    const [paknsave, newWorld, taiPing] = await Promise.all([
        collectPakNSaveSignals(maxProductSitemaps, maxProductsPerSitemap),
        collectNewWorldSignals(),
        collectTaiPingSignals()
    ]);
    const sources = [...paknsave, ...newWorld, ...taiPing];
    const mainstreamPhrases = uniquePhrases(sources
        .filter((item) => item.source.startsWith("paknsave") || item.source.startsWith("newworld"))
        .flatMap((item) => item.tokens));
    const asianPhrases = uniquePhrases(sources
        .filter((item) => item.source.startsWith("taiping"))
        .flatMap((item) => item.tokens));
    return {
        mainstreamPhrases,
        asianPhrases,
        snapshot: {
            generatedAt: new Date().toISOString(),
            sources
        }
    };
}
