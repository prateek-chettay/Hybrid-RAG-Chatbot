/**
 * Retrieves the top organic search results from Google Search using SerpAPI.
 */
export async function fetchLiveSearchContext(query: string): Promise<string> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
        throw new Error("SERPAPI_API_KEY is missing.");
    }

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.append("q", query);
    url.searchParams.append("engine", "google");
    url.searchParams.append("api_key", apiKey);
    url.searchParams.append("num", "3");

    const response = await fetch(url.toString(), {
        method: "GET",
    });

    if (!response.ok) {
        throw new Error(`SerpAPI error: ${response.statusText}`);
    }

    const data = await response.json();
    const organicResults = data.organic_results || [];

    if (organicResults.length === 0) {
        return "No live search results found.";
    }

    // Combine top 3 snippets into a cohesive text context
    const contextText = organicResults
        .slice(0, 3)
        .map((res: any, index: number) => `[Source ${index + 1}: ${res.title}] ${res.snippet}`)
        .join("\n\n");

    return contextText;
}

/**
 * Heuristic to determine if a query requires live web context.
 */
export function requiresLiveSearch(query: string): boolean {
    const normalizedQuery = query.toLowerCase();
    const liveKeywords = [
        "latest",
        "today",
        "current",
        "recent",
        "news",
        "update",
        "2024",
        "2025",
        "now"
    ];

    return liveKeywords.some((keyword) => normalizedQuery.includes(keyword));
}
