/**
 * Cybersecurity News Hub - Main JavaScript
 * 
 * This script fetches cybersecurity news from various sources using RSS feeds
 * and displays them in different sections of the website.
 */

// Configuration for news sources
const NEWS_SOURCES = {
    // Main cybersecurity news sources with their RSS feeds
    main: [
        {
            name: "Krebs on Security",
            url: "https://krebsonsecurity.com/feed/",
            category: "featured"
        },
        {
            name: "The Hacker News",
            url: "https://feeds.feedburner.com/TheHackersNews",
            category: "featured"
        },
        {
            name: "Threatpost",
            url: "https://threatpost.com/feed/",
            category: "threats"
        },
        {
            name: "Dark Reading",
            url: "https://www.darkreading.com/rss/all.xml",
            category: "threats"
        },
        {
            name: "Bleeping Computer",
            url: "https://www.bleepingcomputer.com/feed/",
            category: "breaches"
        },
        {
            name: "Security Week",
            url: "https://feeds.feedburner.com/securityweek",
            category: "breaches"
        },
        {
            name: "Naked Security",
            url: "https://nakedsecurity.sophos.com/feed/",
            category: "research"
        },
        {
            name: "The Register - Security",
            url: "https://www.theregister.com/security/headlines.atom",
            category: "research"
        },
        {
            name: "Schneier on Security",
            url: "https://www.schneier.com/feed/atom/",
            category: "sidebar"
        },
        {
            name: "CISA",
            url: "https://www.cisa.gov/news.xml",
            category: "sidebar"
        }
    ],
    // Breaking news ticker sources
    ticker: [
        {
            name: "SANS Internet Storm Center",
            url: "https://isc.sans.edu/rssfeed.xml"
        },
        {
            name: "US-CERT",
            url: "https://www.us-cert.gov/ncas/current-activity.xml"
        }
    ]
};

// RSS to JSON API endpoint (using rss2json.com)
const RSS2JSON_API = "https://api.rss2json.com/v1/api.json";
const API_KEY = ""; // Free tier doesn't require API key for limited usage

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;

// DOM elements
const elements = {
    ticker: document.getElementById('ticker-content'),
    featured: document.getElementById('featured-news'),
    threats: document.getElementById('threats-news'),
    breaches: document.getElementById('breaches-news'),
    research: document.getElementById('research-news'),
    sidebar: document.getElementById('sidebar-news'),
    errorMessage: document.getElementById('error-message')
};

/**
 * Initialize the application
 */
function init() {
    loadNewsFromCache();
    fetchAllNews();
    
    // Set up automatic refresh every hour
    setInterval(fetchAllNews, CACHE_DURATION);
}

/**
 * Load news from localStorage cache if available and not expired
 */
function loadNewsFromCache() {
    try {
        const cachedData = localStorage.getItem('cybersecurityNewsCache');
        if (cachedData) {
            const { timestamp, data } = JSON.parse(cachedData);
            const now = new Date().getTime();
            
            // Check if cache is still valid
            if (now - timestamp < CACHE_DURATION) {
                displayAllNews(data);
                return true;
            }
        }
    } catch (error) {
        console.error('Error loading from cache:', error);
    }
    return false;
}

/**
 * Save news data to localStorage cache
 */
function saveNewsToCache(data) {
    try {
        const cacheData = {
            timestamp: new Date().getTime(),
            data: data
        };
        localStorage.setItem('cybersecurityNewsCache', JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error saving to cache:', error);
    }
}

/**
 * Fetch news from all configured sources
 */
function fetchAllNews() {
    showLoading(true);
    
    const allNews = {
        ticker: [],
        featured: [],
        threats: [],
        breaches: [],
        research: [],
        sidebar: []
    };
    
    const fetchPromises = [];
    
    // Fetch main news sources
    NEWS_SOURCES.main.forEach(source => {
        const promise = fetchRssFeed(source.url)
            .then(items => {
                // Add source name to each item
                const processedItems = items.map(item => ({
                    ...item,
                    sourceName: source.name
                }));
                
                // Add to appropriate category
                allNews[source.category] = [...allNews[source.category], ...processedItems];
            })
            .catch(error => {
                console.error(`Error fetching ${source.name}:`, error);
            });
        
        fetchPromises.push(promise);
    });
    
    // Fetch ticker news
    NEWS_SOURCES.ticker.forEach(source => {
        const promise = fetchRssFeed(source.url)
            .then(items => {
                // Add source name to each item
                const processedItems = items.map(item => ({
                    ...item,
                    sourceName: source.name
                }));
                
                // Add to ticker news
                allNews.ticker = [...allNews.ticker, ...processedItems];
            })
            .catch(error => {
                console.error(`Error fetching ${source.name}:`, error);
            });
        
        fetchPromises.push(promise);
    });
    
    // Process all fetched news
    Promise.allSettled(fetchPromises)
        .then(() => {
            // Sort all news categories by date
            Object.keys(allNews).forEach(category => {
                allNews[category].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
            });
            
            // Display news and save to cache
            displayAllNews(allNews);
            saveNewsToCache(allNews);
            showLoading(false);
        })
        .catch(error => {
            console.error('Error fetching news:', error);
            showError('Failed to fetch news. Please try again later.');
            showLoading(false);
        });
}

/**
 * Fetch RSS feed and convert to JSON
 */
async function fetchRssFeed(feedUrl) {
    try {
        // First try using rss2json.com API
        const response = await fetch(`${RSS2JSON_API}?rss_url=${encodeURIComponent(feedUrl)}`);
        const data = await response.json();
        
        if (data.status === 'ok') {
            return data.items || [];
        } else {
            throw new Error('Failed to fetch RSS feed');
        }
    } catch (error) {
        // Fallback to alternative approach using a CORS proxy
        try {
            const corsProxyUrl = 'https://api.allorigins.win/raw?url=';
            const response = await fetch(`${corsProxyUrl}${encodeURIComponent(feedUrl)}`);
            const xmlText = await response.text();
            
            // Parse XML manually
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Extract items from XML
            const items = [];
            const entries = xmlDoc.querySelectorAll('item, entry');
            
            entries.forEach(entry => {
                const title = entry.querySelector('title')?.textContent || '';
                const link = entry.querySelector('link')?.textContent || entry.querySelector('link')?.getAttribute('href') || '';
                const description = entry.querySelector('description, summary, content')?.textContent || '';
                const pubDate = entry.querySelector('pubDate, published, updated')?.textContent || '';
                
                items.push({
                    title,
                    link,
                    description,
                    pubDate,
                    content: description
                });
            });
            
            return items;
        } catch (fallbackError) {
            console.error('Fallback RSS fetch failed:', fallbackError);
            throw fallbackError;
        }
    }
}

/**
 * Display all news in their respective sections
 */
function displayAllNews(allNews) {
    // Display ticker news
    if (allNews.ticker.length > 0) {
        displayTickerNews(allNews.ticker);
    }
    
    // Display featured news
    if (allNews.featured.length > 0) {
        displayNewsGrid(elements.featured, allNews.featured.slice(0, 4));
    }
    
    // Display category news
    if (allNews.threats.length > 0) {
        displayNewsList(elements.threats, allNews.threats.slice(0, 5));
    }
    
    if (allNews.breaches.length > 0) {
        displayNewsList(elements.breaches, allNews.breaches.slice(0, 5));
    }
    
    if (allNews.research.length > 0) {
        displayNewsList(elements.research, allNews.research.slice(0, 5));
    }
    
    // Display sidebar news
    if (allNews.sidebar.length > 0) {
        displaySidebarNews(elements.sidebar, allNews.sidebar.slice(0, 8));
    }
}

/**
 * Display news in the ticker
 */
function displayTickerNews(news) {
    if (!elements.ticker) return;
    
    const tickerItems = news.slice(0, 10).map(item => {
        return `<span class="ticker-item">
            <strong>${item.sourceName}:</strong> 
            <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a>
            &nbsp;&nbsp;|&nbsp;&nbsp;
        </span>`;
    }).join('');
    
    elements.ticker.innerHTML = tickerItems;
}

/**
 * Display news in a grid format
 */
function displayNewsGrid(element, news) {
    if (!element) return;
    
    const newsItems = news.map(item => {
        // Clean and truncate description
        const cleanDescription = cleanHtml(item.description);
        const truncatedDescription = truncateText(cleanDescription, 150);
        
        return `<div class="news-item">
            <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3>
            <p>${truncatedDescription}</p>
            <p class="source">Source: ${item.sourceName} | ${formatDate(item.pubDate)}</p>
        </div>`;
    }).join('');
    
    element.innerHTML = newsItems;
}

/**
 * Display news in a list format
 */
function displayNewsList(element, news) {
    if (!element) return;
    
    const newsItems = news.map(item => {
        // Clean and truncate description
        const cleanDescription = cleanHtml(item.description);
        const truncatedDescription = truncateText(cleanDescription, 100);
        
        return `<div class="news-item">
            <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3>
            <p>${truncatedDescription}</p>
            <p class="source">Source: ${item.sourceName} | ${formatDate(item.pubDate)}</p>
        </div>`;
    }).join('');
    
    element.innerHTML = newsItems;
}

/**
 * Display news in the sidebar
 */
function displaySidebarNews(element, news) {
    if (!element) return;
    
    const sidebarItems = news.map(item => {
        return `<div class="sidebar-item">
            <h4><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></h4>
            <p class="source">Source: ${item.sourceName} | ${formatDate(item.pubDate)}</p>
        </div>`;
    }).join('');
    
    element.innerHTML = sidebarItems;
}

/**
 * Show or hide loading indicators
 */
function showLoading(isLoading) {
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(el => {
        el.style.display = isLoading ? 'block' : 'none';
    });
}

/**
 * Show error message
 */
function showError(message) {
    if (elements.errorMessage) {
        elements.errorMessage.textContent = message;
        elements.errorMessage.style.display = 'block';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            elements.errorMessage.style.display = 'none';
        }, 5000);
    }
}

/**
 * Clean HTML content from description
 */
function cleanHtml(html) {
    if (!html) return '';
    
    // Create a temporary div to hold the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Get text content
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength) + '...';
}

/**
 * Format date to readable format
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);