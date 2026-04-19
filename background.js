// background.js

const STOP_WORDS = new Set([
    "the", "and", "a", "an", "of", "in", "to", "is", "for", "on", "with", "as", 
    "by", "this", "that", "it", "at", "from", "or", "be", "are", "wikipedia",
    "google", "search", "bing", "yahoo", "com", "www", "org", "net"
]);

function extractKeywords(text) {
    if (!text) return new Set();
    let words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    return new Set(words.filter(w => !STOP_WORDS.has(w)));
}

function jaccardSimilarity(setA, setB) {
    if (setA.size === 0 || setB.size === 0) return 0.0;
    let intersection = 0;
    for (let elem of setB) {
        if (setA.has(elem)) intersection++;
    }
    let union = setA.size + setB.size - intersection;
    return intersection / union;
}

// Persistent / Volatile Memory Map
let memoryPath = [];
let globalSequenceDepth = 0; // Tracks continuous click sequences universally across all tabs
let tabLineage = {}; // Tracks openerTabIds for Hub-and-Spoke detection

chrome.storage.local.get(['isPersistent', 'rabbitHolePath'], (res) => {
    if (res.isPersistent && res.rabbitHolePath) {
        memoryPath = res.rabbitHolePath;
    }
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(['isPersistent'], (res) => {
        if (!res.isPersistent) {
            chrome.storage.local.remove(['rabbitHolePath', 'currentScore']);
            memoryPath = [];
        }
    });
});

chrome.tabs.onCreated.addListener((tab) => {
    if (tab.openerTabId) {
        tabLineage[tab.id] = tab.openerTabId;
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabLineage[tabId];
});

async function addNodeToPath(url, title, tabId) {
    let rawText = title;
    try {
        let u = new URL(url);
        if (u.hostname.includes('google.com') || u.hostname.includes('bing.com')) {
            let q = u.searchParams.get('q');
            if (q) rawText += " " + q;
        } else if (u.hostname.includes('youtube.com')) {
            let q = u.searchParams.get('search_query');
            if (q) rawText += " " + q;
        }
    } catch(e) {}

    let currentKeywords = extractKeywords(rawText);
    if (currentKeywords.size === 0) return;

    let rabbitScoreAdd = 0;
    let behaviorReason = "";
    
    // Heuristic analysis variables
    let adjacentSimilarity = 0;
    let hubSimilarity = 0;
    let isHubSplinter = false;
    let avgSimilarity = 0;

    let recentNodes = memoryPath.slice(-7); // Last 7 clicks globally

    if (recentNodes.length > 0) {
        let lastNode = memoryPath[memoryPath.length - 1];
        adjacentSimilarity = jaccardSimilarity(new Set(lastNode.keywords), currentKeywords);

        let simSum = 0;
        for (let recent of recentNodes) {
            simSum += jaccardSimilarity(new Set(recent.keywords), currentKeywords);
        }
        avgSimilarity = simSum / recentNodes.length;

        // Hub and Spoke Detection
        let openerId = tabLineage[tabId];
        if (openerId) {
            // Traverse backwards completely to find the source node memory profile
            for (let i = memoryPath.length - 1; i >= 0; i--) {
                if (memoryPath[i].tabId === openerId) {
                    hubSimilarity = jaccardSimilarity(new Set(memoryPath[i].keywords), currentKeywords);
                    isHubSplinter = true;
                    break;
                }
            }
        }

        // Logic Branching based on Psychology Heuristics
        if (isHubSplinter && hubSimilarity > 0.05) {
            globalSequenceDepth += 2; // Jump significantly for parallel tab spawning
            rabbitScoreAdd = 3.0 + (globalSequenceDepth * 0.5);
            behaviorReason = `Tab Splintering: Spawning parallel topics off a hub! Depth: ${globalSequenceDepth}`;
        } 
        else if (adjacentSimilarity > 0.08) {
            globalSequenceDepth += 1;
            rabbitScoreAdd = 1.5 + (adjacentSimilarity * 2.0) + (globalSequenceDepth * 0.3);
            behaviorReason = `Semantic Drift: Clear logical link from last page! Depth: ${globalSequenceDepth}`;
        }
        else if (avgSimilarity > 0.03) {
            globalSequenceDepth += 1;
            rabbitScoreAdd = 0.5 + (globalSequenceDepth * 0.05);
            behaviorReason = `You're clicking around, but not heavily focused on one topic yet. (${globalSequenceDepth} links in a row)`;
        }
        else {
            globalSequenceDepth = Math.floor(globalSequenceDepth / 2);
            rabbitScoreAdd = 0.5;
            behaviorReason = `You clicked something completely unrelated. Tracking chain broken!`;
        }

    } else {
        globalSequenceDepth = 1;
        rabbitScoreAdd = 1.0; 
        behaviorReason = "Started tracking a new topic chain.";
    }

    let previousScore = recentNodes.length > 0 ? (recentNodes[recentNodes.length - 1].cumulativeScore || 0) : 0;
    let newScore = previousScore + rabbitScoreAdd;

    const node = {
        url: url,
        title: title || url,
        tabId: tabId, // Required for Hub tracing
        timestamp: Date.now(),
        keywords: Array.from(currentKeywords), 
        cumulativeScore: newScore
    };
    
    memoryPath.push(node);
    
    let res = await chrome.storage.local.get(['isPersistent', 'aggressiveness']);
    if (res.isPersistent) {
        await chrome.storage.local.set({rabbitHolePath: memoryPath});
    }

    let aggressiveness = res.aggressiveness || 5; 
    let threshold = 15 - aggressiveness;

    let baseScore = memoryPath.length > 10 ? memoryPath[memoryPath.length - 10].cumulativeScore : 0;
    let recentAccumulation = newScore - baseScore;

    await chrome.storage.local.set({
        currentScore: recentAccumulation,
        currentThreshold: threshold,
        currentReason: behaviorReason
    });

    if (recentAccumulation >= threshold) {
        try {
            await chrome.tabs.sendMessage(tabId, { action: 'showWarning' });
        } catch(e) {}
        
        // Reset sequence logic globally
        node.cumulativeScore = 0;
        globalSequenceDepth = 0; 
        
        if (res.isPersistent) {
            await chrome.storage.local.set({rabbitHolePath: memoryPath});
        }
        await chrome.storage.local.set({ currentScore: 0 });
    }
}

// Track full page reloads and cross-tab link traversal
chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;
    
    chrome.tabs.get(details.tabId, (tab) => {
        if (chrome.runtime.lastError) return;
        addNodeToPath(details.url, tab.title, details.tabId);
    });
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId !== 0) return;

    setTimeout(() => {
        chrome.tabs.get(details.tabId, (tab) => {
            if (chrome.runtime.lastError) return;
            addNodeToPath(details.url, tab.title, details.tabId);
        });
    }, 500);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPath') {
        sendResponse({path: memoryPath});
    }
});
