document.addEventListener('DOMContentLoaded', () => {
    const depthCount = document.getElementById('depth-count');
    const thresholdCount = document.getElementById('threshold-count');
    const progressBar = document.getElementById('score-progress');
    const viewPathBtn = document.getElementById('view-path-btn');
    const optionsLink = document.getElementById('options-link');

    // Get current score and threshold
    chrome.storage.local.get(['currentScore', 'currentThreshold', 'currentReason'], (result) => {
        let score = result.currentScore || 0;
        let threshold = result.currentThreshold || 10; // Default threshold
        let reason = result.currentReason || "Awaiting first active tab click sequence...";
        
        depthCount.textContent = score.toFixed(1);
        thresholdCount.textContent = threshold;
        document.getElementById('reason-text').textContent = reason;
        
        // Update bar
        let pct = (score / threshold) * 100;
        if (pct > 100) pct = 100;
        progressBar.style.width = pct + '%';
        
        // Color transition
        if (pct > 80) {
            progressBar.style.backgroundColor = '#ef4444'; // Red
        } else if (pct > 50) {
            progressBar.style.backgroundColor = '#f59e0b'; // Orange
        }
    });

    viewPathBtn.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('path.html'));
    });

    optionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });
});
