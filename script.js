const cardImages = [
    './img/card_1.png',
    './img/card_2.png',
    './img/card_3.png',
    './img/card_4.png',
    './img/card_5.png',
    './img/card_6.png'
];

const bonusImages = {
    '+3': './img/bonus_plus3.png',
    'finder': './img/bonus_finder.png',
    'lightning': './img/bonus_lightning.png'
};

const cardBackImg = './img/card back.png';
const bonusesList = ['+3', 'finder', 'lightning'];
const startingClicks = 16;

const FIREBASE_URL = 'https://memory-60375-default-rtdb.europe-west1.firebasedatabase.app';

let clicksLeft = 0;
let steps = 0;
let seconds = 0;
let timerInterval = null;
let gameStarted = false;
let gameEnded = false;
let flippedCards = [];
let instantFinderActive = false;
let lockBoard = false;
let lastRunData = null;

function ensureMusicPlays() {
    const audio = document.getElementById('bg-music');
    if (audio && audio.paused) {
        audio.play().catch(() => {});
    }
}

function showScreen(screenId) {
    ensureMusicPlays();
    document.getElementById('screen-menu').classList.add('d-none');
    document.getElementById('screen-leaderboard').classList.add('d-none');
    document.getElementById('screen-game').classList.add('d-none');
    document.getElementById(screenId).classList.remove('d-none');

    if (screenId === 'screen-leaderboard') {
        renderLeaderboard();
    }
}

function exitToMenu() {
    clearInterval(timerInterval);
    gameEnded = true;
    showScreen('screen-menu');
}

function startGame() {
    showScreen('screen-game');

    clicksLeft = startingClicks;
    steps = 0;
    seconds = 0;
    gameStarted = false;
    gameEnded = false;
    flippedCards = [];
    instantFinderActive = false;
    lockBoard = false;
    lastRunData = null;

    clearInterval(timerInterval);
    document.getElementById('timer').innerText = '00:00';
    updateUI();

    let deck = [];
    for (let i = 0; i < cardImages.length; i++) {
        deck.push({ type: 'pair', value: cardImages[i] });
        deck.push({ type: 'pair', value: cardImages[i] });
    }
    bonusesList.forEach(b => deck.push({ type: 'bonus', value: b }));

    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const board = document.getElementById('board');
    board.innerHTML = '';

    deck.forEach(item => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.dataset.type = item.type;
        card.dataset.value = item.value;
        card.onclick = () => handleCardClick(card);

        const inner = document.createElement('div');
        inner.className = 'card-inner';

        const back = document.createElement('div');
        back.className = 'card-face card-back';
        const backImg = document.createElement('img');
        backImg.src = cardBackImg;
        backImg.alt = 'Lefordított kártya';
        back.appendChild(backImg);

        const front = document.createElement('div');
        front.className = 'card-face card-front';
        const frontImg = document.createElement('img');
        frontImg.src = item.type === 'bonus' ? bonusImages[item.value] : item.value;
        frontImg.alt = 'Kártya';
        front.appendChild(frontImg);

        inner.appendChild(back);
        inner.appendChild(front);
        card.appendChild(inner);
        board.appendChild(card);
    });
}

function startTimer() {
    if (gameStarted) return;
    gameStarted = true;
    timerInterval = setInterval(() => {
        seconds++;
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        document.getElementById('timer').innerText = `${mins}:${secs}`;
    }, 1000);
}

function handleCardClick(card) {
    if (gameEnded || lockBoard || card.classList.contains('flipped') || card.classList.contains('matched') || clicksLeft <= 0) return;

    startTimer();
    clicksLeft--;
    steps++;
    card.classList.add('flipped');

    if (card.dataset.type === 'bonus') {
        card.classList.add('bonus', 'matched');
        if (card.dataset.value === '+3') {
            clicksLeft += 3;
            updateUI();
            checkGameOver();
        } else if (card.dataset.value === 'finder') {
            instantFinderActive = true;
            updateUI();
            checkGameOver();
        } else if (card.dataset.value === 'lightning') {
            updateUI();
            triggerLightning();
        }
        return;
    }

    if (instantFinderActive) {
        instantFinderActive = false;
        const allCards = document.querySelectorAll('.game-card');
        const match = Array.from(allCards).find(c => 
            c !== card && c.dataset.value === card.dataset.value && !c.classList.contains('matched')
        );
        if (match) {
            match.classList.add('flipped', 'matched');
            card.classList.add('matched');
        }
        if (flippedCards.length === 1) {
            flippedCards[0].classList.remove('flipped');
            flippedCards = [];
        }
        updateUI();
        checkGameOver();
        return;
    }

    flippedCards.push(card);

    if (flippedCards.length === 2) {
        lockBoard = true;
        const [c1, c2] = flippedCards;
        if (c1.dataset.value === c2.dataset.value) {
            c1.classList.add('matched');
            c2.classList.add('matched');
            flippedCards = [];
            lockBoard = false;
            updateUI();
            checkGameOver();
        } else {
            updateUI();
            setTimeout(() => {
                c1.classList.remove('flipped');
                c2.classList.remove('flipped');
                flippedCards = [];
                lockBoard = false;
                checkGameOver();
            }, 750);
        }
        return;
    }

    updateUI();
    checkGameOver();
}

function triggerLightning() {
    lockBoard = true;
    const hiddenCards = Array.from(document.querySelectorAll('.game-card')).filter(
        c => !c.classList.contains('flipped') && !c.classList.contains('matched')
    );

    hiddenCards.forEach(c => c.classList.add('peeked'));

    setTimeout(() => {
        hiddenCards.forEach(c => c.classList.remove('peeked'));
        lockBoard = false;
        checkGameOver();
    }, 700);
}

function updateUI() {
    document.getElementById('clicks-left').innerText = clicksLeft;
    document.getElementById('steps').innerText = steps;
    const buffEl = document.getElementById('buff-indicator');
    instantFinderActive ? buffEl.classList.remove('d-none') : buffEl.classList.add('d-none');
}

function checkGameOver() {
    if (gameEnded || lockBoard) return;

    const totalPairs = cardImages.length;
    const matchedCards = document.querySelectorAll('.game-card[data-type="pair"].matched').length;
    const pairsFound = Math.floor(matchedCards / 2);

    if (pairsFound === totalPairs) {
        gameEnded = true;
        clearInterval(timerInterval);
        const finalTime = document.getElementById('timer').innerText;
        lastRunData = { pairs: pairsFound, clicks: clicksLeft, timeStr: finalTime, seconds: seconds };
        showEndModal(
            'Nyertél!',
            `Idő: <b>${finalTime}</b> | Lépések: <b>${steps}</b> | Maradt kattintás: <b>${clicksLeft}</b>`
        );
    } else if (clicksLeft <= 0) {
        gameEnded = true;
        clearInterval(timerInterval);
        const finalTime = document.getElementById('timer').innerText;
        lastRunData = { pairs: pairsFound, clicks: 0, timeStr: finalTime, seconds: seconds };
        showEndModal(
            'Elfogytak a kattintások!',
            `Megtalált párok: <b>${pairsFound}/${totalPairs}</b> | Idő: <b>${finalTime}</b> | Lépések: <b>${steps}</b>`
        );
    }
}

function showEndModal(title, htmlText) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-text').innerHTML = htmlText;

    const saveBox = document.getElementById('save-score-box');
    const feedback = document.getElementById('save-feedback');
    const saveBtn = document.getElementById('btn-save-score');

    saveBox.classList.remove('d-none');
    feedback.classList.add('d-none');
    saveBtn.disabled = false;

    const modalEl = document.getElementById('endGameModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    setTimeout(() => modal.show(), 250);
}

async function saveCurrentScore() {
    if (!lastRunData) return;

    const nameInput = document.getElementById('player-name');
    const saveBtn = document.getElementById('btn-save-score');
    const feedback = document.getElementById('save-feedback');
    const name = nameInput.value.trim() || 'Ismeretlen';

    saveBtn.disabled = true;
    saveBtn.innerText = 'Mentés...';

    const newEntry = {
        name: name,
        pairs: lastRunData.pairs,
        clicks: lastRunData.clicks,
        timeStr: lastRunData.timeStr,
        seconds: lastRunData.seconds,
        createdAt: Date.now()
    };

    try {
        const res = await fetch(`${FIREBASE_URL}/scores.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEntry)
        });

        if (!res.ok) throw new Error('Hiba a mentésnél');

        feedback.classList.remove('d-none', 'text-danger');
        feedback.classList.add('text-success');
        feedback.innerText = 'Elmentve az online ranglistára!';
    } catch (err) {
        saveBtn.disabled = false;
        feedback.classList.remove('d-none', 'text-success');
        feedback.classList.add('text-danger');
        feedback.innerText = 'Hiba történt a mentéskor!';
    } finally {
        saveBtn.innerText = 'Mentés';
    }
}

async function renderLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;

    listEl.innerHTML = '<div class="text-center py-3" style="color: #a89078;">Betöltés...</div>';

    try {
        const res = await fetch(`${FIREBASE_URL}/scores.json`);
        const data = await res.json();

        if (!data) {
            listEl.innerHTML = '<div class="text-center py-3" style="color: #a89078;">Még nincs mentett eredmény.</div>';
            return;
        }

        const scores = Object.values(data).map(s => ({
            ...s,
            pairs: s.pairs !== undefined ? s.pairs : cardImages.length
        }));

        scores.sort((a, b) => b.pairs - a.pairs || b.clicks - a.clicks || a.seconds - b.seconds);
        const top15 = scores.slice(0, 15);

        listEl.innerHTML = top15.map((s, idx) => `
            <div class="leaderboard-row">
                <span><b class="me-2" style="color: #d97706;">${idx + 1}.</b> ${escapeHtml(s.name)}</span>
                <span><b class="text-info">${s.pairs}/6 pár</b> · <b class="text-warning">${s.clicks} katt</b> · ${s.timeStr}</span>
            </div>
        `).join('');
    } catch (err) {
        listEl.innerHTML = '<div class="text-center py-3 text-danger">Nem sikerült betölteni a ranglistát.</div>';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}