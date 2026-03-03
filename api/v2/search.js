// For compatibility with both Node.js versions and Netlify
const fetch = globalThis.fetch || require('node-fetch');
const path = require('path');
const Fuse = require('fuse.js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const API_KEY = process.env.OPENROUTER_API_KEY || process.env.NETLIFY_OPENROUTER_API_KEY;

// ============= CONTENT SAFETY FILTER =============

/**
 * Content-neutral safety filter using pattern detection
 * Detects: profanity, hate terms, sexual content, abusive language, extreme gibberish
 * WITHOUT storing or exposing actual word lists
 */
function isInappropriateContent(text) {
    if (!text || typeof text !== 'string') return false;

    const normalized = text.toLowerCase().trim();

    // Check for extreme gibberish (random character spam)
    const gibberishPattern = /(.)\1{4,}|[^a-z0-9\s]{5,}|^[bcdfghjklmnpqrstvwxyz]{8,}$/i;
    if (gibberishPattern.test(normalized)) {
        return true;
    }

    // Check character diversity for gibberish (too many consonants, no vowels)
    const words = normalized.split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
        if (word.length > 6) {
            const vowelCount = (word.match(/[aeiou]/g) || []).length;
            if (vowelCount === 0) return true; // No vowels in long word = gibberish
        }
    }

    // Pattern-based detection using character combinations (not actual words)
    // These patterns detect common letter sequences in inappropriate terms
    const suspiciousPatterns = [
        /\bf+[uo]+c*k+\b/i,         // Common profanity pattern
        /\bf+c+k+\b/i,              // Common profanity variant
        /\bs+[h!1]+[i!1]+t+\b/i,    // Common profanity pattern
        /\bb+[i!1]+t+c+h+\b/i,      // Common profanity pattern
        /\bd+[a@]+m+n+\b/i,         // Common profanity pattern
        /\bs+[e3]+x+[yu]/i,         // Sexual content pattern
        /\bp+[o0]+r+n+/i,           // Sexual content pattern
        /\bn+[i!1]+g+[a@e]+r+/i,   // Hate term pattern
        /\bf+[a@]+g+[go0]+t+/i,    // Hate term pattern
        /\br+[a@]+p+[e3]+\b/i,      // Violent/sexual pattern
        /\bk+[i!1]+l+l+\s*(you|yourself|me|him|her)/i, // Violent/threatening
        /\bd+[i!1]+e+\s*(you|yourself|bitch|motherfucker)/i, // Threatening
        /\bs+t+u+p+[i!1]+d+\s+(bitch|ass|fuck|person|people)/i, // Abusive term with target
        /\b[i!1]+d+[i!1]+[o0]+t+\s+(bitch|ass|fuck|person|people)/i, // Abusive term with target
        /\bm+[o0]+r+[o0]+n+\b/i,    // Abusive term
        /\bl+[o0]+s+[e3]+r+\s+(bitch|ass|fuck|you)/i, // Abusive term with target
        /\ba+s+s+h+[o0]+l+e+/i,     // Profanity
        /\bc+u+n+t+\b/i,            // Profanity
        /\bp+u+s+s+y+\b/i           // Sexual content
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(normalized)) {
            return true;
        }
    }

    // Check for excessive special character substitution (l33t speak abuse)
    const specialCharCount = (normalized.match(/[!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]/g) || []).length;
    if (specialCharCount > normalized.length * 0.3) {
        return true; // More than 30% special chars
    }

    return false;
}

/**
 * Validates and sanitizes search query
 * Returns: { valid: boolean, reason?: string }
 */
function validateSearchQuery(query) {
    if (!query || typeof query !== 'string') {
        return { valid: false, reason: 'invalid' };
    }

    const trimmed = query.trim();

    // Basic length checks
    if (trimmed.length < 1) {
        return { valid: false, reason: 'too_short' };
    }

    if (trimmed.length > 200) {
        return { valid: false, reason: 'too_long' };
    }

    // Check for inappropriate content
    if (isInappropriateContent(trimmed)) {
        return { valid: false, reason: 'inappropriate' };
    }

    return { valid: true };
}

// Import models from chat.js
const chatModule = require('./chat.js');
// Extract MODELS if it's exported, otherwise fallback to hardcoded list
const GENERAL_MODELS = [
    'openai/gpt-oss-20b:free',
    'google/gemma-3-27b-it:free',
    'meta-llama/llama-4-maverick:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemini-2.0-flash-exp:free',
    'z-ai/glm-4.5-air:free',
    'moonshotai/kimi-k2:free',
    'mistralai/mistral-small-3.1-24b-instruct:free',
    'deepseek/deepseek-chat-v3-0324:free',
    'minimax/minimax-m2:free'
];

// CDN URLs for resource library
const RESOURCE_LIB_URLS = {
    production: `https://cdn-materioa.vercel.app/databases/beta/resource.lib.json`,
    local: 'http://localhost:8080/databases/beta/resource.lib.json'
};

// Cache for resource library
let resourceLibCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch resource library from CDN
 */
async function fetchResourceLibrary() {
    // Return cached version if available and fresh
    if (resourceLibCache && (Date.now() - lastFetchTime) < CACHE_DURATION) {
        return resourceLibCache;
    }

    // Check if local resources mode is explicitly enabled (via local-cdn.js)
    const useLocalResources = process.env.USE_LOCAL_RESOURCES === 'true' ||
        (typeof window !== 'undefined' && window.localStorage?.getItem('useLocalResources') === 'true');

    const url = useLocalResources ? RESOURCE_LIB_URLS.local : RESOURCE_LIB_URLS.production;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch resource library: ${response.status}`);
        }

        resourceLibCache = await response.json();
        lastFetchTime = Date.now();
        return resourceLibCache;
    } catch (error) {
        console.error('Error fetching resource library:', error);

        // Return cached version if available, even if stale
        if (resourceLibCache) {
            console.warn('Using stale cache due to fetch failure');
            return resourceLibCache;
        }

        throw new Error('Unable to load resource library from any source');
    }
}

// ============= SEARCH ALGORITHMS =============

/**
 * Generate common abbreviations for a text
 */
function generateAbbreviations(text) {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const abbreviations = [];

    // Full acronym (e.g., "Operating System" -> "os")
    if (words.length > 1) {
        abbreviations.push(words.map(w => w[0]).join(''));
    }

    // Partial acronyms
    if (words.length >= 2) {
        abbreviations.push(words.slice(0, 2).map(w => w[0]).join(''));
    }
    if (words.length >= 3) {
        abbreviations.push(words.slice(0, 3).map(w => w[0]).join(''));
    }
    if (words.length >= 4) {
        abbreviations.push(words.slice(0, 4).map(w => w[0]).join(''));
    }

    return abbreviations;
}

/**
 * Jaro-Winkler distance implementation for better fuzzy matching
 * Returns similarity score between 0 and 1 (1 = identical)
 */
function jaroWinkler(s1, s2) {
    if (s1 === s2) return 1.0;

    const len1 = s1.length;
    const len2 = s2.length;

    if (len1 === 0 || len2 === 0) return 0.0;

    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Find matches
    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - matchWindow);
        const end = Math.min(i + matchWindow + 1, len2);

        for (let j = start; j < end; j++) {
            if (s2Matches[j] || s1[i] !== s2[j]) continue;
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }

    if (matches === 0) return 0.0;

    // Find transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
    }

    // Calculate Jaro similarity
    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

    // Calculate common prefix for Winkler bonus
    let prefix = 0;
    for (let i = 0; i < Math.min(len1, len2, 4); i++) {
        if (s1[i] === s2[i]) prefix++;
        else break;
    }

    // Winkler modification
    return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Calculate match score between query and target text
 */
function calculateMatchScore(query, target, targetAbbreviations = []) {
    const queryLower = query.toLowerCase().trim();
    const targetLower = target.toLowerCase().trim();

    // Exact match
    if (queryLower === targetLower) return 100;

    // Exact abbreviation match
    if (targetAbbreviations.includes(queryLower)) return 95;

    // Contains match
    if (targetLower.includes(queryLower)) return 85;

    // Jaro-Winkler similarity
    const similarity = jaroWinkler(queryLower, targetLower);
    const similarityScore = Math.round(similarity * 70);

    // Word-based matching
    const queryWords = queryLower.split(/\s+/);
    const targetWords = targetLower.split(/\s+/);

    const matchingWords = queryWords.filter(qw =>
        targetWords.some(tw => tw.includes(qw) || qw.includes(tw))
    );
    const wordScore = (matchingWords.length / queryWords.length) * 60;

    return Math.max(similarityScore, wordScore);
}

/**
 * Generate short forms and variations of text
 */
function generateVariations(text) {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const variations = [text.toLowerCase()];

    // Add individual words
    variations.push(...words);

    // Add abbreviations
    variations.push(...generateAbbreviations(text));

    return variations.join(' ');
}

/**
 * Build searchable index from resource library
 */
function buildSearchIndex(resourceLib) {
    const index = [];

    if (!resourceLib || typeof resourceLib !== 'object') {
        console.error('Invalid resource library:', resourceLib);
        return index;
    }

    Object.entries(resourceLib).forEach(([semester, subjects]) => {
        if (!subjects || typeof subjects !== 'object') {
            console.warn(`Invalid subjects for semester ${semester}`);
            return;
        }

        Object.entries(subjects).forEach(([subjectName, categories]) => {
            // Ensure categories is an array
            if (!Array.isArray(categories)) {
                console.warn(`Categories for ${subjectName} is not an array:`, typeof categories);
                return;
            }

            const subjectAbbr = generateAbbreviations(subjectName);

            categories.forEach(category => {
                if (!category || !category.type || !Array.isArray(category.content)) {
                    console.warn(`Invalid category structure in ${subjectName}:`, category);
                    return;
                }

                const categoryType = category.type;
                const categoryAbbr = generateAbbreviations(categoryType);

                category.content.forEach(contentItem => {
                    if (!contentItem) return;

                    const itemAbbr = generateAbbreviations(contentItem);

                    index.push({
                        semester,
                        subject: subjectName,
                        subjectLower: subjectName.toLowerCase(),
                        subjectAbbr: subjectAbbr.join(' '),
                        subjectVariations: generateVariations(subjectName),
                        category: categoryType,
                        categoryLower: categoryType.toLowerCase(),
                        categoryAbbr: categoryAbbr.join(' '),
                        item: contentItem,
                        itemLower: contentItem.toLowerCase(),
                        itemAbbr: itemAbbr.join(' '),
                        itemVariations: generateVariations(contentItem),
                        // Combined search field with all variations
                        searchText: `${subjectName} ${generateVariations(subjectName)} ${categoryType} ${generateVariations(categoryType)} ${contentItem} ${generateVariations(contentItem)}`
                    });
                });
            });
        });
    });

    return index;
}

/**
 * Handle direct chapter/unit navigation queries (e.g., "ml ch3", "os unit 1")
 * Returns a high-priority result object if a match is found
 */
function handleDirectNavigation(query, resourceLib) {
    if (!query || typeof query !== 'string') return null;

    const normalized = query.toLowerCase().trim();
    // Match patterns like: "ml ch3", "chapter 3 os", "unit 4 cnip", "qp 2023"
    // Captures regex: look for ch/chapter/unit/qp/pyq/qb followed by number
    const navMatch = normalized.match(/\b(?:ch|chapter|unit|module|lab|qp|pyq|qb|question|paper)\s*(\d+)\b/i);

    if (!navMatch) return null;

    const targetNum = parseInt(navMatch[1]);
    if (isNaN(targetNum) || targetNum < 1) return null;

    // Extract subject part by removing the nav match pattern
    const subjectPart = normalized.replace(navMatch[0], '').trim();
    if (subjectPart.length < 1) return null;

    let bestMatch = null;

    // Iterate through library to find matching subject
    Object.entries(resourceLib).forEach(([semester, subjects]) => {
        if (!subjects) return;

        Object.entries(subjects).forEach(([subjectName, categories]) => {
            if (!Array.isArray(categories)) return;

            // Check for subject match
            const subjectLower = subjectName.toLowerCase();
            const abbrs = generateAbbreviations(subjectName);

            const isAbbrMatch = abbrs.includes(subjectPart);
            const isExactMatch = subjectLower === subjectPart;
            const isPartialMatch = subjectLower.includes(subjectPart);

            if (isAbbrMatch || isExactMatch || isPartialMatch) {
                // Determine category type to look for based on query keyword, defaults to Chapters
                let targetCategoryType = 'chapter';
                const lowerNav = navMatch[0].toLowerCase();

                if (lowerNav.includes('unit')) targetCategoryType = 'unit';
                else if (lowerNav.includes('module')) targetCategoryType = 'module';
                else if (lowerNav.includes('lab')) targetCategoryType = 'lab';
                else if (['qp', 'pyq', 'qb', 'question', 'paper'].some(s => lowerNav.includes(s))) targetCategoryType = 'question';

                // Find matching category in subject

                // Find matching category in subject
                const category = categories.find(c => {
                    const type = c.type.toLowerCase();
                    // If target is chapter (default), look for chapter or unit
                    if (targetCategoryType === 'chapter') {
                        return type.includes('chapter') || type.includes('unit');
                    }
                    return type.includes(targetCategoryType);
                });

                if (category && Array.isArray(category.content)) {
                    // Check if index exists (1-based -> 0-based)
                    const itemIndex = targetNum - 1;
                    if (itemIndex >= 0 && itemIndex < category.content.length) {
                        const topic = category.content[itemIndex];

                        // Priority: Abbr > Exact > Partial
                        const priority = isAbbrMatch ? 3 : isExactMatch ? 2 : 1;

                        if (!bestMatch || priority > bestMatch.priority) {
                            bestMatch = {
                                priority, // internal use only
                                semester,
                                subject: subjectName,
                                category: category.type,
                                topic: topic,
                                score: 100,
                                matchType: 'direct_nav',
                                directMatch: true
                            };
                        }
                    }
                }
            }
        });
    });

    if (bestMatch) {
        const { priority, ...result } = bestMatch;
        return result;
    }
    return null;
}

/**
 * Search through the resource library using Fuse.js
 */
async function searchResources(query, threshold = 0.4, limit = 20) {
    try {
        const resourceLib = await fetchResourceLibrary();

        if (!resourceLib || Object.keys(resourceLib).length === 0) {
            console.error('Resource library is empty or invalid');
            return [];
        }

        // Check for direct navigation pattern (e.g., "ml ch3")
        const directResult = handleDirectNavigation(query, resourceLib);

        const searchIndex = buildSearchIndex(resourceLib);

        if (searchIndex.length === 0) {
            console.error('Search index is empty - no resources indexed');
            return [];
        }

        console.log(`Search index built with ${searchIndex.length} items`);

        // Fuse.js configuration - optimized for subject+item matching
        const fuseOptions = {
            keys: [
                // Subject matching (high priority)
                { name: 'subjectLower', weight: 0.25 },
                { name: 'subjectAbbr', weight: 0.35 },       // Boost abbreviation matching
                { name: 'subjectVariations', weight: 0.2 },

                // Item matching (high priority)
                { name: 'itemLower', weight: 0.25 },
                { name: 'itemAbbr', weight: 0.2 },
                { name: 'itemVariations', weight: 0.15 },

                // Category matching (lower priority)
                { name: 'categoryLower', weight: 0.1 },
                { name: 'categoryAbbr', weight: 0.05 },

                // Full text search (fallback)
                { name: 'searchText', weight: 0.1 }
            ],
            threshold: threshold || 0.5, // More lenient matching
            distance: 100,
            minMatchCharLength: 2,
            ignoreLocation: true,
            includeScore: true,
            useExtendedSearch: true,
            shouldSort: true,
            findAllMatches: true
        };

        const fuse = new Fuse(searchIndex, fuseOptions);
        const fuseResults = fuse.search(query);

        // Normalize query for intelligent matching
        const queryLower = query.toLowerCase().trim();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

        // Transform Fuse.js results with SMART context-aware boosting
        const results = fuseResults.map(result => {
            const item = result.item;
            let score = Math.round((1 - result.score) * 100); // Base Fuse.js score (0-100)

            // Generate context data
            const subjectAbbrs = generateAbbreviations(item.subject);
            const itemAbbrs = generateAbbreviations(item.item);
            const categoryAbbrs = generateAbbreviations(item.category);

            // Calculate individual match scores using Jaro-Winkler + abbreviation lookup
            const subjectMatchScore = calculateMatchScore(queryLower, item.subject, subjectAbbrs);
            const itemMatchScore = calculateMatchScore(queryLower, item.item, itemAbbrs);
            const categoryMatchScore = calculateMatchScore(queryLower, item.category, categoryAbbrs);

            // CONTEXT BOOSTING LOGIC - Multi-word query analysis
            if (queryWords.length === 1) {
                // Single word query - prioritize abbreviation matches
                const word = queryWords[0];

                if (subjectAbbrs.includes(word)) {
                    // Strong boost for subject abbreviation match
                    score = Math.max(score, 75);
                    if (itemAbbrs.includes(word)) {
                        score = Math.min(100, score + 15); // Extra boost if item also matches
                    }
                } else if (itemAbbrs.includes(word)) {
                    // Item abbreviation match but not subject - moderate boost
                    score = Math.min(100, score + 10);
                } else if (!subjectAbbrs.includes(word) && !itemAbbrs.includes(word)) {
                    // No abbreviation match at all - penalize to prioritize exact abbreviations
                    score = Math.round(score * 0.7); // 30% penalty
                }
            } else if (queryWords.length === 2) {
                // Two-word query (most common: "se intro", "dadv qb", etc.)
                const [word1, word2] = queryWords;

                // Check if word1 is subject abbreviation
                const isSubjectAbbr = subjectAbbrs.includes(word1);

                // Check if word2 matches item or category
                const word2MatchesItem = itemAbbrs.includes(word2) ||
                    item.itemLower.includes(word2) ||
                    jaroWinkler(word2, item.itemLower) > 0.8;

                const word2MatchesCategory = categoryAbbrs.includes(word2) ||
                    item.categoryLower.includes(word2) ||
                    ((word2 === 'qb' || word2 === 'qp' || word2 === 'pyq') && (item.categoryLower.includes('question') || item.categoryLower.includes('paper')));

                // STRONG BOOST: Subject abbreviation + item/category keyword
                if (isSubjectAbbr && word2MatchesItem) {
                    score = Math.max(score, 85); // Very high priority
                    score = Math.min(100, score + 15); // Extra boost
                } else if (isSubjectAbbr && word2MatchesCategory) {
                    score = Math.max(score, 75); // High priority
                    score = Math.min(100, score + 15);
                } else if (isSubjectAbbr) {
                    score = Math.max(score, 60); // Moderate priority
                    score = Math.min(100, score + 10);
                }

                // Penalize if subject doesn't match abbreviation but item does
                if (!isSubjectAbbr && word2MatchesItem) {
                    // Only give small boost if subject isn't the abbreviation target
                    score = Math.min(score + 5, 50); // Cap at 50 to keep below true matches
                }
            } else {
                // Multi-word query (3+ words) - use combined scoring
                const combinedScore = (subjectMatchScore * 0.5) + (itemMatchScore * 0.3) + (categoryMatchScore * 0.2);
                score = Math.max(score, Math.round(combinedScore));
            }

            return {
                semester: item.semester,
                subject: item.subject,
                category: item.category,
                topic: item.item, // Changed from 'item' to 'topic' to match form field
                score: Math.min(100, score), // Ensure max 100
                matchType: score >= 90 ? 'exact' :
                    score >= 75 ? 'high' :
                        score >= 60 ? 'medium' : 'low'
            };
        });

        // Re-sort after intelligent boosting
        results.sort((a, b) => b.score - a.score);

        // Add direct result to the top if found
        if (directResult) {
            // Remove any lower-scored duplicate of the same item
            const dedupedResults = results.filter(r =>
                !(r.subject === directResult.subject &&
                    r.topic === directResult.topic &&
                    r.category === directResult.category)
            );

            // Add direct match at the beginning
            dedupedResults.unshift(directResult);
            return dedupedResults.slice(0, limit);
        }

        return results.slice(0, limit);
    } catch (error) {
        console.error('Error in searchResources:', error);
        throw error;
    }
}

/**
 * AI-powered search using OpenRouter with automatic model switching on 429 errors
 */
async function aiSearch(query, searchResults, resourceLib) {
    if (!API_KEY) {
        throw new Error('OpenRouter API key not configured');
    }

    const allSubjects = Object.values(resourceLib)
        .flatMap(sem => Object.keys(sem))
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ');

    const systemPrompt = `You are an intelligent, conversational search assistant for an educational resource library. You understand natural language queries, vague descriptions, and can suggest topics.

**Library Structure:**
- Semesters: 1-7
- Subjects: ${allSubjects}
- Categories: Chapters, Question Banks, Assignments, Lab Manual, Presentations, Other
- Each subject has multiple content items (chapters, topics, assignments)

**Your Capabilities:**
1. **Understand conversational queries:**
   - "that one topic that has things about turing machine" → Find Turing Machine content
   - "what should i start with?" → Suggest introductory/Chapter 1 topics
   - "i need help with java" → Find Java/EPJ resources
   - "show me assignments" → Filter Assignment category

2. **Interpret vague descriptions:**
   - Match partial keywords to full subject names
   - Understand context (e.g., "automata stuff" → Theory of Computation)
   - Recognize abbreviations (OS, DADV, EPJ, TOC, DAA, SE, CNIP)

3. **Provide smart suggestions:**
   - If query is too vague: Suggest related subjects/topics
   - If asking "where to start": Prioritize introductory chapters
   - If no good matches: Suggest similar topics from available subjects

4. **Analyze algorithmic results and:**
   - Rank by true relevance (not just keyword match)
   - Explain WHY each result matches the user's intent
   - Filter out irrelevant results
   - Add context to help users understand the content

**Response Format (JSON):**
{
    "intent": "Conversational description of what user wants",
    "rankings": [
        {
            "semester": "semester number",
            "subject": "full subject name",
            "category": "category type",
            "topic": "exact content item name",
            "relevance": "high|medium|low",
            "explanation": "Natural, helpful explanation of why this matches"
        }
    ],
    "suggestions": ["helpful suggestions if results are poor or query is vague"]
}

**Important:** 
- Rankings should ONLY include items from the algorithmic search results provided
- Use exact semester/subject/category/topic values from the search results
- Relevance: "high" = perfect match, "medium" = related/helpful, "low" = tangentially relevant
- If query is vague (e.g., "what to start with"), suggest introductory topics from multiple subjects
- Empty rankings array is OK if no results match the intent`;

    const userMessage = `User Query: "${query}"

${searchResults.length > 0
            ? `Algorithmic Search Results (${searchResults.length} found):
${searchResults.slice(0, 10).map((r, i) => `${i + 1}. Semester ${r.semester} | ${r.subject} | ${r.category} | ${r.topic}`).join('\n')}`
            : `Algorithmic Search Results: No matches found

Available subjects to suggest from:
${allSubjects}`}

**Query Analysis Hints:**
- Vague queries like "what to start with", "where do i begin": Suggest Chapter 1 / Introduction topics from multiple subjects
- Phrases like "that one topic about X": Find all content containing X
- Just subject names: Show all available categories/chapters for that subject
- Category requests ("show assignments", "need question banks"): Filter by category

**Task:**
1. Understand what the user is really asking for (handle vague/conversational language)
2. Rank the most relevant results from the list above
3. Provide helpful explanations for each ranking
4. If query is vague or results are poor, provide suggestions

Remember: Only rank items from the search results above. Use exact values for semester/subject/category/topic.`;

    // Try each model in sequence until one succeeds
    const triedModels = [];
    let lastError = null;
    const MAX_RETRIES = 1; // Only try 1 model to stay within 30s Netlify timeout
    let retryCount = 0;

    for (const model of GENERAL_MODELS) {
        if (triedModels.includes(model)) continue; // Skip already tried models
        if (retryCount >= MAX_RETRIES) {
            console.warn(`Reached maximum retry limit (${MAX_RETRIES}), stopping AI search`);
            break;
        }

        triedModels.push(model);
        retryCount++;

        try {
            console.log(`Attempting AI search with model: ${model} (attempt ${retryCount}/${MAX_RETRIES})`);

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout to stay within Netlify's 30s limit

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://materioa.vercel.app',
                    'X-Title': 'Materio Search'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                    ],
                    response_format: { type: 'json_object' }
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId); // Clear timeout on successful response

            if (response.status === 429) {
                console.warn(`Model ${model} returned 429 (rate limit), trying next model...`);
                lastError = new Error(`Rate limit exceeded for ${model}`);
                continue; // Try next model
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = `OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`;
                console.error(errorMsg);
                lastError = new Error(errorMsg);

                // For 404 "No endpoints found" errors (model unavailable/deprecated), try next model
                if (response.status === 404 && errorData.error?.message?.includes('No endpoints found')) {
                    console.warn(`Model ${model} is unavailable (404 - No endpoints found), trying next model...`);
                    continue;
                }

                // For 5xx errors, try next model
                if (response.status >= 500) {
                    console.warn(`Server error ${response.status}, trying next model...`);
                    continue;
                }

                throw new Error(errorMsg);
            }

            const data = await response.json();

            // Validate response structure
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response structure from OpenRouter');
            }

            let aiResponse;
            try {
                aiResponse = JSON.parse(data.choices[0].message.content);
            } catch (parseError) {
                console.error('Failed to parse AI response as JSON:', data.choices[0].message.content);
                throw new Error('AI returned invalid JSON response');
            }

            // Validate AI response has required fields
            if (!aiResponse.rankings || !Array.isArray(aiResponse.rankings)) {
                console.error('AI response missing rankings array:', aiResponse);
                throw new Error('AI response missing valid rankings array');
            }

            // Validate at least one ranking exists
            if (aiResponse.rankings.length === 0) {
                console.warn('AI returned empty rankings array');
                throw new Error('AI returned no rankings');
            }

            console.log(`Successfully used model: ${model} with ${aiResponse.rankings.length} rankings`);
            return aiResponse;

        } catch (error) {
            console.error(`Error with model ${model}:`, error.message);
            lastError = error;

            // Handle timeout/abort errors
            if (error.name === 'AbortError') {
                console.warn(`Request to ${model} timed out, trying next model...`);
                continue;
            }

            // If it's not a retryable error, stop trying
            if (!error.message.includes('429') &&
                !error.message.includes('rate limit') &&
                !error.message.includes('timed out') &&
                !error.message.includes('Server error') &&
                !error.message.includes('No endpoints found')) {
                throw error;
            }
            // Continue to next model for retryable errors
        }
    }

    // If all models failed, throw the last error
    console.error('All models failed or rate limited');
    throw lastError || new Error('All models exhausted without success');
}

/**
 * Merge AI rankings with algorithmic results
 * Applies AI relevance scores to boost/reorder algorithmic results
 */
function mergeAIRankings(algorithmicResults, aiRankings) {
    if (!aiRankings || !Array.isArray(aiRankings)) {
        return algorithmicResults;
    }

    // Create a map of AI rankings for quick lookup
    const aiRankingMap = new Map();
    aiRankings.forEach((ranking, index) => {
        const key = `${ranking.semester}|${ranking.subject}|${ranking.category}|${ranking.topic}`;
        aiRankingMap.set(key, {
            relevance: ranking.relevance,
            explanation: ranking.explanation,
            aiRank: index + 1 // Position in AI ranking (1-based)
        });
    });

    // Apply AI scores to algorithmic results
    const mergedResults = algorithmicResults.map(result => {
        const key = `${result.semester}|${result.subject}|${result.category}|${result.topic}`;
        const aiData = aiRankingMap.get(key);

        if (aiData) {
            // AI found this result relevant - boost score based on relevance
            let aiBoost = 0;
            if (aiData.relevance === 'high') {
                aiBoost = 40; // Strong boost
            } else if (aiData.relevance === 'medium') {
                aiBoost = 20; // Moderate boost
            } else if (aiData.relevance === 'low') {
                aiBoost = 5; // Small boost
            }

            // Also boost based on AI ranking position (earlier = better)
            const positionBoost = Math.max(0, 15 - (aiData.aiRank * 2)); // Top result gets +15, decreases by 2 per position

            const newScore = Math.min(100, result.score + aiBoost + positionBoost);

            return {
                ...result,
                score: newScore,
                matchType: newScore >= 90 ? 'exact' :
                    newScore >= 75 ? 'high' :
                        newScore >= 60 ? 'medium' : 'low',
                aiRelevance: aiData.relevance,
                aiExplanation: aiData.explanation,
                aiRanked: true
            };
        }

        // Not in AI rankings - slightly penalize to prioritize AI-ranked results
        return {
            ...result,
            score: Math.round(result.score * 0.9), // 10% penalty
            aiRanked: false
        };
    });

    // Re-sort by new scores
    mergedResults.sort((a, b) => {
        // Prioritize AI-ranked results first
        if (a.aiRanked && !b.aiRanked) return -1;
        if (!a.aiRanked && b.aiRanked) return 1;
        // Then by score
        return b.score - a.score;
    });

    return mergedResults;
}

// ============= API HANDLERS =============

function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
}

module.exports = async (req, res) => {
    const headers = getCorsHeaders();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Handle GET /search?q=query&useAI=true&aiMode=pure
        if (req.method === 'GET') {
            const query = req.query.q || req.query.query;
            const useAI = req.query.useAI === 'true';
            const aiMode = req.query.aiMode || 'hybrid'; // 'hybrid' or 'pure'
            const threshold = parseFloat(req.query.threshold) || 0.4;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    error: 'Query parameter "q" or "query" is required'
                });
            }

            // Validate query for inappropriate content
            const validation = validateSearchQuery(query);
            if (!validation.valid) {
                if (validation.reason === 'inappropriate') {
                    // Return empty results for inappropriate content (no details exposed)
                    return res.status(200).json({
                        success: true,
                        query,
                        results: [],
                        count: 0,
                        method: useAI ? 'blocked_ai' : 'blocked_algo',
                        blocked: true,
                        message: useAI
                            ? 'Your search query contains inappropriate content and cannot be processed.'
                            : undefined
                    });
                } else if (validation.reason === 'too_long') {
                    return res.status(400).json({
                        success: false,
                        error: 'Query is too long (max 200 characters)'
                    });
                }
            }

            // Run algorithmic search
            // For AI mode, use more lenient threshold and higher limit to give AI more options to filter
            const searchThreshold = useAI ? 0.6 : threshold; // More lenient for AI
            const searchLimit = useAI ? 30 : 20; // More results for AI to filter
            let algorithmicResults = await searchResources(query, searchThreshold, searchLimit);

            // If AI mode and no results found, try fallback searches for vague queries
            if (useAI && algorithmicResults.length === 0) {
                const vaguePhrases = ['what', 'start', 'begin', 'first', 'intro', 'help', 'need', 'show'];
                const isVagueQuery = vaguePhrases.some(phrase => query.toLowerCase().includes(phrase));

                if (isVagueQuery) {
                    console.log('Vague query with no results, searching for introduction topics');
                    algorithmicResults = await searchResources('introduction chapter', 0.6, 30);
                }
            }

            // If AI is requested and API key is available
            if (useAI && API_KEY) {
                try {
                    const resourceLib = await fetchResourceLibrary();
                    const aiResults = await aiSearch(query, algorithmicResults, resourceLib);

                    // Validate AI results
                    if (!aiResults || !aiResults.rankings || !Array.isArray(aiResults.rankings)) {
                        console.warn('AI returned invalid results structure, falling back to algorithmic');
                        throw new Error('Invalid AI response structure');
                    }

                    // Pure AI mode - return only AI-ranked results
                    if (aiMode === 'pure' && aiResults.rankings.length > 0) {
                        const pureAIResults = aiResults.rankings.map((ranking, index) => ({
                            semester: ranking.semester,
                            subject: ranking.subject,
                            category: ranking.category,
                            topic: ranking.topic,
                            score: ranking.relevance === 'high' ? 95 :
                                ranking.relevance === 'medium' ? 75 : 50,
                            matchType: ranking.relevance,
                            aiExplanation: ranking.explanation,
                            aiRank: index + 1
                        }));

                        return res.status(200).json({
                            success: true,
                            query,
                            results: pureAIResults,
                            count: pureAIResults.length,
                            ai: aiResults,
                            method: 'ai',
                            aiUsed: true
                        });
                    }

                    // Pure AI mode but no rankings - fallback to algorithmic
                    if (aiMode === 'pure' && aiResults.rankings.length === 0) {
                        console.warn('AI returned no rankings, falling back to algorithmic');
                        throw new Error('AI returned empty rankings');
                    }

                    // Hybrid mode (default) - merge AI rankings with algorithmic results
                    const mergedResults = mergeAIRankings(algorithmicResults, aiResults.rankings);

                    return res.status(200).json({
                        success: true,
                        query,
                        results: mergedResults,
                        count: mergedResults.length,
                        algorithmic: {
                            results: algorithmicResults,
                            count: algorithmicResults.length
                        },
                        ai: aiResults,
                        method: 'hybrid',
                        aiUsed: true
                    });
                } catch (aiError) {
                    console.error('AI search failed in GET request:', aiError);
                    // Fallback to algorithmic if AI fails
                    return res.status(200).json({
                        success: true,
                        query,
                        results: algorithmicResults,
                        count: algorithmicResults.length,
                        method: 'algorithmic',
                        aiUsed: false,
                        aiError: aiError.message
                    });
                }
            }

            // Return algorithmic-only results
            return res.status(200).json({
                success: true,
                query,
                results: algorithmicResults,
                count: algorithmicResults.length,
                method: 'algorithmic',
                aiUsed: false
            });
        }

        // Handle POST /search (with AI fallback option)
        if (req.method === 'POST') {
            const { query, useAI = false, aiMode = 'hybrid', threshold = 0.4 } = req.body || {};

            if (!query) {
                return res.status(400).json({
                    success: false,
                    error: 'Query is required'
                });
            }

            // Validate query for inappropriate content
            const validation = validateSearchQuery(query);
            if (!validation.valid) {
                if (validation.reason === 'inappropriate') {
                    // Return empty results for inappropriate content (no details exposed)
                    return res.status(200).json({
                        success: true,
                        query,
                        results: [],
                        count: 0,
                        method: useAI ? 'blocked_ai' : 'blocked_algo',
                        blocked: true,
                        message: useAI
                            ? 'Your search query contains inappropriate content and cannot be processed.'
                            : undefined
                    });
                } else if (validation.reason === 'too_long') {
                    return res.status(400).json({
                        success: false,
                        error: 'Query is too long (max 200 characters)'
                    });
                }
            }

            // First, run algorithmic search
            // For AI mode, use more lenient threshold and higher limit to give AI more options to filter
            const searchThreshold = useAI ? 0.6 : threshold; // More lenient for AI
            const searchLimit = useAI ? 30 : 20; // More results for AI to filter
            let algorithmicResults = await searchResources(query, searchThreshold, searchLimit);

            // If AI mode and no results found, try fallback searches for vague queries
            if (useAI && algorithmicResults.length === 0) {
                const vaguePhrases = ['what', 'start', 'begin', 'first', 'intro', 'help', 'need', 'show'];
                const isVagueQuery = vaguePhrases.some(phrase => query.toLowerCase().includes(phrase));

                if (isVagueQuery) {
                    console.log('Vague query with no results, searching for introduction topics');
                    algorithmicResults = await searchResources('introduction chapter', 0.6, 30);
                }
            }

            // If AI is requested and we have poor results (or user explicitly wants AI)
            if (useAI && API_KEY) {
                try {
                    const resourceLib = await fetchResourceLibrary();
                    const aiResults = await aiSearch(query, algorithmicResults, resourceLib);

                    // Validate AI results
                    if (!aiResults || !aiResults.rankings || !Array.isArray(aiResults.rankings)) {
                        console.warn('AI returned invalid results structure, falling back to algorithmic');
                        throw new Error('Invalid AI response structure');
                    }

                    // Pure AI mode - return only AI-ranked results
                    if (aiMode === 'pure' && aiResults.rankings.length > 0) {
                        const pureAIResults = aiResults.rankings.map((ranking, index) => ({
                            semester: ranking.semester,
                            subject: ranking.subject,
                            category: ranking.category,
                            topic: ranking.topic,
                            score: ranking.relevance === 'high' ? 95 :
                                ranking.relevance === 'medium' ? 75 : 50,
                            matchType: ranking.relevance,
                            aiExplanation: ranking.explanation,
                            aiRank: index + 1
                        }));

                        return res.status(200).json({
                            success: true,
                            query,
                            results: pureAIResults,
                            count: pureAIResults.length,
                            ai: aiResults,
                            method: 'ai',
                            aiUsed: true
                        });
                    }

                    // Pure AI mode but no rankings - fallback to algorithmic
                    if (aiMode === 'pure' && aiResults.rankings.length === 0) {
                        console.warn('AI returned no rankings, falling back to algorithmic');
                        throw new Error('AI returned empty rankings');
                    }

                    // Hybrid mode (default) - merge AI rankings with algorithmic results
                    const mergedResults = mergeAIRankings(algorithmicResults, aiResults.rankings);

                    return res.status(200).json({
                        success: true,
                        query,
                        results: mergedResults,
                        count: mergedResults.length,
                        algorithmic: {
                            results: algorithmicResults,
                            count: algorithmicResults.length
                        },
                        ai: aiResults,
                        method: 'hybrid',
                        aiUsed: true
                    });
                } catch (aiError) {
                    // Fallback to algorithmic if AI fails
                    return res.status(200).json({
                        success: true,
                        query,
                        results: algorithmicResults,
                        count: algorithmicResults.length,
                        method: 'algorithmic',
                        aiUsed: false,
                        aiError: aiError.message
                    });
                }
            }

            // Return algorithmic results only
            return res.status(200).json({
                success: true,
                query,
                results: algorithmicResults,
                count: algorithmicResults.length,
                method: 'algorithmic',
                aiUsed: false
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('Search Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============= STANDALONE TESTING =============
// For local testing
if (require.main === module) {
    const testQueries = [
        'os introduction',
        'intro os',
        'dadv qb',
        'EPJ servlets',
        'data analytics question bank',
        'operating system chapter 1',
        'java enterprise programming',
        'cnip week 5',
        'python flask'
    ];

    console.log('Testing Search Algorithm:\n');

    (async () => {
        for (const query of testQueries) {
            console.log(`\nQuery: "${query}"`);
            console.log('Results:');
            try {
                const results = await searchResources(query);
                results.slice(0, 5).forEach((r, i) => {
                    console.log(`  ${i + 1}. [${r.score}%] Sem ${r.semester} - ${r.subject} > ${r.category} > ${r.topic}`);
                });
            } catch (error) {
                console.error(`  Error: ${error.message}`);
            }
        }
    })();
}
