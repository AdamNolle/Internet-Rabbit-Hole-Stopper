document.addEventListener('DOMContentLoaded', () => {
    const timeline = document.getElementById('timeline');
    const printBtn = document.getElementById('print-btn');

    printBtn.addEventListener('click', () => {
        window.print();
    });

    chrome.runtime.sendMessage({ action: 'getPath' }, (response) => {
        if (response && response.path && response.path.length > 0) {
            timeline.innerHTML = '';
            response.path.forEach(node => {
                const date = new Date(node.timestamp);
                const timeStr = date.toLocaleTimeString();

                const item = document.createElement('div');
                item.className = 'timeline-item';
                
                // Escape simple HTML
                const safeTitle = node.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const safeUrl = node.url.replace(/</g, "&lt;").replace(/>/g, "&gt;");

                item.innerHTML = `
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div class="timeline-time">${timeStr}</div>
                        <h3 class="timeline-title">${safeTitle}</h3>
                        <a href="${safeUrl}" target="_blank" class="timeline-url">${safeUrl}</a>
                    </div>
                `;
                timeline.appendChild(item);
            });
        } else {
            timeline.innerHTML = `
                <div class="empty-state">
                    <h3>No path recorded yet!</h3>
                    <p>Start clicking on links to see your path form here.</p>
                </div>
            `;
            timeline.style.borderLeft = 'none';
        }
    });
});
