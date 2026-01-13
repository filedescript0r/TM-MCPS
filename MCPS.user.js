// ==UserScript==
// @author       1114.dev 
// @name         Mines Collector + Plumber Send
// @namespace    https://stake1082.com/
// @version      2.2
// @description  Safe auto Mines collector (multi-channel, plumber-ready)
// @match        *://*stake1082.com/*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @connect      localhost
// ==/UserScript==

(function () {
    'use strict';

    /* ================= CONFIG ================= */

    const PLUMBER_BASE = 'http://127.0.0.1:8000/';
    const CHANNELS = Array.from({ length: 20 }, (_, i) => `test_${i + 1}`);

    const CHECK_INTERVAL = 300;
    const SEND_INTERVAL = 15000;

    const ACTIVE_CHANNEL_KEY = 'stake_mines_active_channel';

    let lastSignature = null;

    /* ================= CHANNEL ================= */

    function getActiveChannel() {
        return localStorage.getItem(ACTIVE_CHANNEL_KEY) || 'test_1';
    }

    function setActiveChannel(ch) {
        localStorage.setItem(ACTIVE_CHANNEL_KEY, ch);
    }

    function storageKey(ch) {
        return `stake_mines_results_${ch}`;
    }

    function loadData(ch) {
        return JSON.parse(localStorage.getItem(storageKey(ch)) || '[]');
    }

    function saveData(ch, data) {
        localStorage.setItem(storageKey(ch), JSON.stringify(data));
    }

    /* ================= GAME PARSING ================= */

    function getTiles() {
        const tiles = document.querySelectorAll('[data-testid^="game-tile-"]');
        if (!tiles.length) return null;

        return [...tiles].map((t, i) => ({
            index: i + 1,
            revealed: t.getAttribute('data-revealed') === 'true',
            status: t.getAttribute('data-game-tile-status') || 'unknown'
        }));
    }

    function isRoundFinished(tiles) {
        if (!tiles) return false;
        const hasRevealed = tiles.some(t => t.revealed);
        const hasIdle = tiles.some(t => t.status === 'idle');
        return hasRevealed && !hasIdle;
    }

    function makeSignature(tiles) {
        return tiles
            .map(t => `${t.revealed ? 1 : 0}${t.status}`)
            .join('|');
    }

    /* ================= COLLECT ================= */

    function collectResult() {
        const tiles = getTiles();
        if (!isRoundFinished(tiles)) return;

        const signature = makeSignature(tiles);
        if (signature === lastSignature) return;
        lastSignature = signature;

        const betInput = document.querySelector('[data-testid="input-game-amount"]');
        const minesInput = document.querySelector('[data-testid="mines-count"]');

        const betAmount = betInput ? Number(betInput.value) : null;
        const minesCount = minesInput ? Number(minesInput.value) : null;

        const revealedTiles = tiles.filter(t => t.revealed).length;
        const loss = tiles.some(t => t.status === 'loss');

        const result = {
            timestamp: new Date().toISOString(),
            betAmount,
            minesCount,
            revealedTiles,
            status: loss ? 'loss' : 'win',
            tiles
        };

        const channel = getActiveChannel();
        const data = loadData(channel);

        data.push(result);
        saveData(channel, data);

        console.log(`[Mines saved → ${channel}]`, result);
    }

    /* ================= SEND ================= */

    function sendBatchToPlumber() {
        const channel = getActiveChannel();
        const data = loadData(channel);
        if (!data.length) return;

        GM_xmlhttpRequest({
            method: 'POST',
            url: PLUMBER_BASE + 'test',
            headers: { 'Content-Type': 'application/json' },

            data: JSON.stringify({
                source: 'stake',
                game: 'mines',
                channel: channel,
                sent_at: new Date().toISOString(),
                count: data.length,
                results: data
            }),

            onload(resp) {
                if (resp.status >= 200 && resp.status < 300) {
                    saveData(channel, []);
                    console.log(`[Mines → ${channel}] sent`);
                } else {
                    console.warn(`[Mines → ${channel}] HTTP ${resp.status}`);
                }
            },

            onerror(err) {
                console.warn(`[Mines → ${channel}] failed`, err);
            }
        });
    }

    setInterval(collectResult, CHECK_INTERVAL);
    setInterval(sendBatchToPlumber, SEND_INTERVAL);

    /* ================= UI ================= */

const PANEL_CSS = `
#tm-mines-panel {
    background: linear-gradient(180deg,#1a1a1a,#0f0f0f);
    border: 1px solid #2f2f2f;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,.6);
}

#tm-mines-panel select,
#tm-mines-panel button {
    width: 100%;
    background: #1f1f1f;
    color: #ddd;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 6px;
    margin-top: 6px;
    cursor: pointer;
}

#tm-mines-panel button:hover {
    background: #272727;
}

.tm-row {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
}

.tm-label {
    color: #888;
}

.tm-value {
    font-weight: bold;
}

.tm-header {
    cursor: move;
    font-weight: bold;
    margin-bottom: 8px;
    user-select: none;
}
`;


    function buildPanel() {
const style = document.createElement('style');
style.textContent = PANEL_CSS;
document.head.appendChild(style);

        if (document.getElementById('tm-mines-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'tm-mines-panel';
        panel.style.cssText = `
            position: fixed;
            right: 16px;
            bottom: 160px;
            width: 240px;
            background: #121212;
            color: #eee;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 12px;
            z-index: 9999;
            font-family: monospace;
            font-size: 12px;
        `;

       panel.innerHTML = `
    <div class="tm-header">⛏ Mines Collector</div>

    <div class="tm-row">
        <span class="tm-label">Channel (Means Mine Count)</span>
    </div>
    <select id="tm-channel"></select>

    <div class="tm-row">
        <span class="tm-label">Saved</span>
        <span class="tm-value" id="tm-count">0</span>
    </div>

    <div class="tm-row">
        <span class="tm-label">Last</span>
        <span class="tm-value" id="tm-last">—</span>
    </div>

    <hr style="border-color:#333;margin:8px 0">

    <button id="tm-clear">Clear channel</button>
`;


        document.body.appendChild(panel);

        const select = panel.querySelector('#tm-channel');
        CHANNELS.forEach(ch => {
            const o = document.createElement('option');
            o.value = ch;
            o.textContent = ch;
            select.appendChild(o);
        });

        select.value = getActiveChannel();
        select.onchange = () => {
            setActiveChannel(select.value);
            updateInfo();
        };

        panel.querySelector('#tm-clear').onclick = () => {
            if (confirm('Clear current channel data?')) {
                saveData(getActiveChannel(), []);
                updateInfo();
            }
        };

        updateInfo();
        setInterval(updateInfo, 2000);
makeDraggable(panel);

    }

function makeDraggable(el) {
    const header = el.querySelector('.tm-header');

    const POS_KEY = 'tm_mines_panel_pos';
    const saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (saved) {
        el.style.left = saved.x + 'px';
        el.style.top = saved.y + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
    }

    let offsetX = 0, offsetY = 0, dragging = false;

    header.addEventListener('mousedown', e => {
        dragging = true;
        offsetX = e.clientX - el.getBoundingClientRect().left;
        offsetY = e.clientY - el.getBoundingClientRect().top;
        document.body.style.userSelect = 'none';
    });

    window.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.userSelect = '';
        localStorage.setItem(POS_KEY, JSON.stringify({
            x: el.getBoundingClientRect().left,
            y: el.getBoundingClientRect().top
        }));
    });

    window.addEventListener('mousemove', e => {
        if (!dragging) return;
        el.style.left = (e.clientX - offsetX) + 'px';
        el.style.top = (e.clientY - offsetY) + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
    });
}


    function updateInfo() {
        const data = loadData(getActiveChannel());
        document.getElementById('tm-count').textContent = data.length;
        document.getElementById('tm-last').textContent =
            data.length ? data[data.length - 1].status : '—';
    }

    const waitUI = setInterval(() => {
        if (document.body) {
            buildPanel();
            clearInterval(waitUI);
        }
    }, 1000);

    console.log('[TM] Mines Collector v2.2 ready');
})();



