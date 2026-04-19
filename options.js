document.addEventListener('DOMContentLoaded', () => {
    const persistentStorage = document.getElementById('persistent-storage');
    const aggressiveness = document.getElementById('aggressiveness');
    const aggValue = document.getElementById('agg-value');
    const saveBtn = document.getElementById('save-btn');
    const status = document.getElementById('status');

    function updateExplanation(val) {
        let text = "";
        let num = parseInt(val, 10);
        if (num <= 3) {
            text = "Exploration Mode (Low Lenience): You must spiral extremely deeply (20+ related links) without breaking the global sequence to trigger the stopper. Great for intense deep Wikipedia research sessions.";
        } else if (num <= 7) {
            text = "Standard Mode (Balanced Lenience): Will reliably catch you if you start mindlessly wiki-walking or tunneling across 10-15 highly related consecutive links anywhere in the browser.";
        } else {
            text = "High Alert Mode (Extreme Sensitivity): Minimum lenience. Detects rabbit holes almost immediately (5+ related links) off of any distinct topic cluster globally. Best for strict distraction blocking.";
        }
        document.getElementById('agg-explanation').textContent = text;
    }

    // Load current
    chrome.storage.local.get(['isPersistent', 'aggressiveness'], (result) => {
        persistentStorage.checked = !!result.isPersistent;
        if (result.aggressiveness) {
            aggressiveness.value = result.aggressiveness;
            aggValue.textContent = result.aggressiveness;
            updateExplanation(result.aggressiveness);
        } else {
            updateExplanation(5); // Default
        }
    });

    aggressiveness.addEventListener('input', (e) => {
        aggValue.textContent = e.target.value;
        updateExplanation(e.target.value);
    });

    saveBtn.addEventListener('click', () => {
        chrome.storage.local.set({
            isPersistent: persistentStorage.checked,
            aggressiveness: parseInt(aggressiveness.value, 10)
        }, () => {
            status.textContent = 'Settings saved.';
            setTimeout(() => {
                status.textContent = '';
            }, 2000);
        });
    });
});
