function injectWarning() {
    if (document.getElementById('internet-rabbithole-stopper-warning')) return;

    const overlay = document.createElement('div');
    overlay.id = 'internet-rabbithole-stopper-warning';
    
    overlay.innerHTML = `
        <div class="irhs-modal">
            <h1>It's Rabbit Season</h1>
            <p>I think you might be in a rabbit hole just wanted to pull you out before you got too deep.</p>
            <button id="irhs-dismiss" class="irhs-btn">Dismiss</button>
        </div>
    `;

    document.body.appendChild(overlay);
    
    // Stop scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.getElementById('irhs-dismiss').addEventListener('click', () => {
        overlay.remove();
        document.body.style.overflow = originalOverflow;
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showWarning') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectWarning);
        } else {
            injectWarning();
        }
    }
});
