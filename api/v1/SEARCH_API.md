# Search API Documentation

## Overview

The Search API provides intelligent resource discovery across the Materio educational library using a hybrid approach:

1. **Algorithmic Search** (using Fuse.js) - Fast, efficient fuzzy matching
2. **AI-Powered Search** (using OpenRouter) - Deep semantic understanding when algorithmic search isn't satisfactory

The resource library is fetched from CDN:
- **Production**: `https://cdn-materioa.netlify.app/databases/beta/resource.lib.json`
- **Development**: `http://localhost:8080/databases/beta/resource.lib.json`

**Caching**: Resource library is cached for 5 minutes to minimize CDN requests.

## Features

✅ **Fuzzy Matching** - Handles typos and partial matches  
✅ **Abbreviation Support** - Recognizes common abbreviations (e.g., "OS" → "Operating System", "DADV" → "Data Analytics and Data Visualization")  
✅ **Smart Scoring** - Weighs subject names higher than categories or items  
✅ **AI Fallback** - Uses AI when results are insufficient (50 queries/day limit)  
✅ **Fast & Scalable** - Works with expanding datasets across all branches
✅ **CDN-Based** - Always fetches latest resource data from CDN
✅ **Automatic Caching** - Reduces CDN load with intelligent caching

## Endpoints

### 1. GET `/api/v1/search`

Simple GET request for quick searches.

**Query Parameters:**
- `q` or `query` (required) - The search query

**Example:**
```bash
GET /api/v1/search?q=os introduction
```

**Response:**
```json
{
  "success": true,
  "query": "os introduction",
  "results": [
    {
      "semester": "4",
      "subject": "Operating System",
      "category": "Chapters",
      "item": "Introduction",
      "score": 95,
      "matchType": "high"
    }
  ],
  "count": 1,
  "method": "algorithmic"
}
```

### 2. POST `/api/v1/search`

Advanced search with AI fallback option.

**Request Body:**
```json
{
  "query": "dadv qb",
  "useAI": false,
  "threshold": 0.4
}
```

**Parameters:**
- `query` (required) - Search query
- `useAI` (optional, default: `false`) - Enable AI-powered search
- `threshold` (optional, default: `0.4`) - Fuse.js threshold (0.0 = perfect match, 1.0 = match anything)

**Response (Algorithmic only):**
```json
{
  "success": true,
  "query": "dadv qb",
  "results": [
    {
      "semester": "5",
      "subject": "Data Analytics and Data Visualization",
      "category": "Question Banks",
      "item": "Question Bank",
      "score": 92,
      "matchType": "high"
    }
  ],
  "count": 1,
  "method": "algorithmic",
  "aiUsed": false
}
```

**Response (With AI):**
```json
{
  "success": true,
  "query": "EPJ servlets",
  "algorithmic": {
    "results": [...],
    "count": 5
  },
  "ai": {
    "intent": "User is looking for Servlet-related content in Enterprise Programming with Java",
    "rankings": [
      {
        "semester": "5",
        "subject": "Enterprise Programming with Java",
        "category": "Chapters",
        "item": "Servlets",
        "relevance": "high",
        "explanation": "Direct match to user's query"
      }
    ],
    "suggestions": ["java servlets", "epj web components"]
  },
  "method": "hybrid",
  "aiUsed": true
}
```

## Search Examples

### Example 1: Subject Abbreviation
**Query:** `"os introduction"`  
**Matches:** Operating System → Chapters → Introduction

### Example 2: Multiple Abbreviations
**Query:** `"dadv qb"`  
**Matches:** Data Analytics and Data Visualization → Question Banks → Question Bank

### Example 3: Subject + Topic
**Query:** `"EPJ servlets"`  
**Matches:** Enterprise Programming with Java → Chapters → Servlets

### Example 4: Partial Match
**Query:** `"intro os"`  
**Matches:** Operating System → Chapters → Introduction

### Example 5: Full Text
**Query:** `"python flask"`  
**Matches:** Programming in Python with Full Stack → Chapters → Flask Framework

## How It Works

### Algorithmic Search (Fuse.js)

1. **Index Building**: Creates searchable index with:
   - Subject names + abbreviations
   - Category types + abbreviations
   - Content items + abbreviations

2. **Weighted Scoring**:
   - Subject: 40% weight
   - Subject Abbreviations: 30% weight
   - Item: 30% weight
   - Item Abbreviations: 20% weight
   - Category: 15% weight
   - Category Abbreviations: 10% weight

3. **Fuzzy Matching**: Handles typos, partial matches, and variations

### AI Search (Optional)

When `useAI: true`:
1. Runs algorithmic search first
2. Sends top 10 results to AI (Gemini 2.0 Flash)
3. AI analyzes user intent
4. Returns ranked results with explanations
5. Suggests alternative search terms if needed

**Note:** AI search uses OpenRouter API (50 free queries/day)

## Configuration

### Fuse.js Options
```javascript
{
  threshold: 0.4,        // Lower = more strict matching
  distance: 100,         // Maximum search distance
  minMatchCharLength: 2, // Minimum characters to match
  ignoreLocation: true,  // Don't consider position in text
  includeScore: true,    // Return match scores
  useExtendedSearch: true
}
```

### AI System Prompt
The AI is instructed to:
- Understand user intent
- Rank results by relevance
- Explain why each result matches
- Suggest alternative search terms

## Usage in Frontend

### Simple Search (Algorithmic Only)
```javascript
async function search(query) {
  const response = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.results;
}
```

### Advanced Search (With AI Fallback)
```javascript
async function searchWithAI(query, useAI = false) {
  const response = await fetch('/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, useAI })
  });
  const data = await response.json();
  
  if (data.aiUsed) {
    // Use AI rankings
    return data.ai.rankings;
  } else {
    // Use algorithmic results
    return data.results;
  }
}
```

### Smart Search Strategy
```javascript
async function smartSearch(query) {
  // Try algorithmic first
  const algoResults = await search(query);
  
  // If poor results, use AI
  if (algoResults.length === 0 || algoResults[0].score < 60) {
    return await searchWithAI(query, true);
  }
  
  return algoResults;
}
```

## Performance

- **Algorithmic Search**: ~10-50ms (depends on dataset size)
- **AI Search**: ~1-3s (network latency + AI processing)
- **Recommended**: Use algorithmic first, AI as fallback

## Error Handling

```javascript
try {
  const response = await fetch('/api/v1/search?q=example');
  const data = await response.json();
  
  if (!data.success) {
    console.error('Search failed:', data.error);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## Rate Limits

- **Algorithmic Search**: No limit
- **AI Search**: 50 queries/day (OpenRouter free tier)

## Testing

Run local tests:
```bash
node api/v1/search.js
```

This will test common queries:
- "os introduction"
- "intro os"
- "dadv qb"
- "EPJ servlets"
- etc.

## Deployment

The API is deployed as a Netlify Function and will be available at:
- Production: `https://materio.pro/api/v1/search`
- Dev: `http://localhost:8888/api/v1/search`

## Future Enhancements

- [ ] Add caching for common queries
- [ ] Implement search history/analytics
- [ ] Add filters (by semester, subject, category)
- [ ] Support for multi-language searches
- [ ] Auto-complete/suggestions as user types
