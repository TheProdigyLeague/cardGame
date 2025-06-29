// --- Game State Variables ---
const SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const RANKS = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
const RANK_VALUES = {
    'Ace': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'Jack': 10, 'Queen': 10, 'King': 10
};

let player1 = {
    life: 20,
    deck: [],
    hand: [],
    battlefield: [],
    selectedCards: []
};

let player2 = {
    life: 20,
    deck: [],
    hand: [],
    battlefield: [],
};

let turn = 0; // 0 for Player 1, 1 for Player 2
let gamePhase = 'start'; // 'start', 'draw', 'play', 'battle', 'end'
let gameStarted = false;

// --- DOM Elements ---
const player1LifeEl = document.getElementById('player1-life');
const player2LifeEl = document.getElementById('player2-life');
const player1DeckCountEl = document.getElementById('player1-deck-count');
const player2DeckCountEl = document.getElementById('player2-deck-count');
const player1HandDisplay = document.getElementById('player1-hand-display');
const player2HandDisplay = document.getElementById('player2-hand-display'); // This will be mostly hidden
const player1BattlefieldDisplay = document.getElementById('player1-battlefield-display');
const player2BattlefieldDisplay = document.getElementById('player2-battlefield-display');
const gameLogEl = document.getElementById('game-log');
const nextTurnButton = document.getElementById('next-turn-button');
const startGameButton = document.getElementById('start-game-button');
const playSelectedCardsButton = document.getElementById('play-selected-cards-button');

// --- Utility Functions ---

function log(message, type = 'system-log') {
    const p = document.createElement('p');
    p.classList.add(type);
    p.textContent = message;
    gameLogEl.prepend(p); // Add to top
    if (gameLogEl.children.length > 50) { // Keep log from getting too long
        gameLogEl.removeChild(gameLogEl.lastChild);
    }
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function createDeck() {
    let deck = [];
    for (let suit of SUITS) {
        for (let rank of RANKS) {
            deck.push({ rank: rank, suit: suit, value: RANK_VALUES[rank] });
        }
    }
    return deck;
}

function updateDisplay() {
    player1LifeEl.textContent = player1.life;
    player2LifeEl.textContent = player2.life;
    player1DeckCountEl.textContent = player1.deck.length;
    player2DeckCountEl.textContent = player2.deck.length;

    // Player 1 Hand
    player1HandDisplay.innerHTML = '';
    player1.hand.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.classList.add('card');
        cardEl.textContent = card.rank;
        cardEl.dataset.rank = card.rank; // Store rank for selection
        cardEl.addEventListener('click', () => toggleCardSelection(card, cardEl));
        player1HandDisplay.appendChild(cardEl);
    });

    // Player 2 Hand (mostly hidden, just show face-down cards if we want to represent size)
    player2HandDisplay.innerHTML = '';
    player2.hand.forEach(() => {
        const cardEl = document.createElement('div');
        cardEl.classList.add('card', 'face-down');
        player2HandDisplay.appendChild(cardEl);
    });

    // Player 1 Battlefield
    player1BattlefieldDisplay.innerHTML = '';
    player1.battlefield.forEach(champion => {
        const champEl = document.createElement('div');
        champEl.classList.add('champion-card');
        if (!champion.canAttack) {
            champEl.classList.add('summoning-sick'); // Add a class for visual cue
        }
        champEl.innerHTML = `<div>${champion.name}</div><div class="stats">${champion.attack}/${champion.defense}</div>${!champion.canAttack ? '<div class="sick-overlay">Sick</div>' : ''}`;
        player1BattlefieldDisplay.appendChild(champEl);
    });

    // Player 2 Battlefield
    player2BattlefieldDisplay.innerHTML = '';
    player2.battlefield.forEach(champion => {
        const champEl = document.createElement('div');
        champEl.classList.add('champion-card');
        if (!champion.canAttack) {
            champEl.classList.add('summoning-sick');
        }
        champEl.innerHTML = `<div>${champion.name}</div><div class="stats">${champion.attack}/${champion.defense}</div>${!champion.canAttack ? '<div class="sick-overlay">Sick</div>' : ''}`;
        player2BattlefieldDisplay.appendChild(champEl);
    });

    // Update button states
    playSelectedCardsButton.disabled = gamePhase !== 'play' || player1.selectedCards.length !== 2;
    nextTurnButton.disabled = !gameStarted || gamePhase === 'start';
}

function toggleCardSelection(card, cardEl) {
    if (gamePhase !== 'play') return;

    const index = player1.selectedCards.indexOf(card);
    if (index > -1) {
        // Deselect
        player1.selectedCards.splice(index, 1);
        cardEl.classList.remove('selected');
    } else if (player1.selectedCards.length < 2) {
        // Select, if less than 2 are already selected
        player1.selectedCards.push(card);
        cardEl.classList.add('selected');
    }
    updateDisplay();
}

function drawCards(player, numCards) {
    let drawn = [];
    for (let i = 0; i < numCards; i++) {
        if (player.deck.length > 0) {
            const card = player.deck.shift();
            player.hand.push(card);
            drawn.push(card);
        } else {
            log(`${player === player1 ? 'Player 1' : 'Player 2'} has no cards left in deck!`, 'system-log');
            // Implement fatigue damage or game end condition for running out of deck
        }
    }
    return drawn;
}

function calculateChampionStats(card1, card2) {
    // Example: Ace (1) + King (10) = 10/10
    // 7 + 6 = 7/6
    let attack = Math.max(card1.value, card2.value);
    let defense = Math.min(card1.value, card2.value);

    // Special combination example: Ace + King = 10/10, Ace + Queen = 9/9
    if ((card1.rank === 'Ace' && card2.rank === 'King') || (card2.rank === 'Ace' && card1.rank === 'King')) {
        attack = 10;
        defense = 10;
    } else if ((card1.rank === 'Ace' && card2.rank === 'Queen') || (card2.rank === 'Ace' && card1.rank === 'Queen')) {
        attack = 9;
        defense = 9;
    } else if ((card1.rank === 'Ace' && card2.rank === 'Jack') || (card2.rank === 'Ace' && card1.rank === 'Jack')) {
        attack = 8;
        defense = 8;
    } else if (card1.rank === 'Ace' || card2.rank === 'Ace') {
        // If one is Ace and other is not K,Q,J, add 1 to the other card's value for both A/D
        attack = (card1.value === 1 ? card2.value : card1.value) + 1;
        defense = (card1.value === 1 ? card2.value : card1.value) + 1;
    }

    // Ensure at least 1/1
    attack = Math.max(1, attack);
    defense = Math.max(1, defense);

    return { attack, defense };
}

function summonChampion(player, cardA, cardB) {
    // Remove cards from hand
    player.hand = player.hand.filter(card => card !== cardA && card !== cardB);

    const { attack, defense } = calculateChampionStats(cardA, cardB);
    const championName = `${cardA.rank} & ${cardB.rank} Combo`;
    const champion = { name: championName, attack: attack, defense: defense, canAttack: false }; // New champion is summoning sick
    player.battlefield.push(champion);
    log(`${player === player1 ? 'Player 1' : 'Player 2'} summoned a ${champion.attack}/${champion.defense} champion! It is summoning sick.`, player === player1 ? 'player-1-log' : 'player-2-log');

    if (player === player1) {
        player1.selectedCards = []; // Clear selection after summoning
    }
    updateDisplay();
}

function resolveCombat(attackerPlayer, defenderPlayer) {
    const availableAttackers = attackerPlayer.battlefield.filter(champ => champ.canAttack);

    if (availableAttackers.length === 0) {
        log(`${attackerPlayer === player1 ? 'Player 1' : 'Player 2'} has no champions ready to attack.`, attackerPlayer === player1 ? 'player-1-log' : 'player-2-log');
        return;
    }

    log(`${attackerPlayer === player1 ? 'Player 1' : 'Player 2'} attacks!`, attackerPlayer === player1 ? 'player-1-log' : 'player-2-log');

    // Sort available attackers by strength (descending attack)
    const attackingChampions = [...availableAttackers].sort((a, b) => b.attack - a.attack);

    let defendersLost = [];
    let attackersLost = [];

    for (const attacker of attackingChampions) {
        // Check if the attacker was destroyed by a previous combat in this phase
        if (!attackerPlayer.battlefield.includes(attacker)) continue;

        if (defenderPlayer.battlefield.length > 0) {
            // Find the strongest defender that is still on the battlefield
            const defender = [...defenderPlayer.battlefield]
                .filter(champ => !defendersLost.includes(champ)) // Ensure it hasn't been destroyed this phase
                .sort((a, b) => b.attack - a.attack)[0];

            if (!defender) { // No more defenders left
                // Attack player directly if defenders ran out mid-attack phase
                const damage = attacker.attack;
                defenderPlayer.life -= damage;
                log(`${attacker.name} (${attacker.attack}/${attacker.defense}) attacks ${defenderPlayer === player1 ? 'Player 1' : 'Player 2'} directly for ${damage} damage!`, 'system-log');
                log(`${defenderPlayer === player1 ? 'Player 1' : 'Player 2'} life: ${defenderPlayer.life}`, defenderPlayer === player1 ? 'player-1-log' : 'player-2-log');
                if (defenderPlayer.life <= 0) {
                    endGame(`${attackerPlayer === player1 ? 'Player 1' : 'Player 2'} wins!`);
                    return;
                }
                continue; // Move to next attacker
            }


            log(`${attacker.name} (${attacker.attack}/${attacker.defense}) attacks ${defender.name} (${defender.attack}/${defender.defense})!`, 'system-log');

            let attackerDamageTaken = defender.attack;
            let defenderDamageTaken = attacker.attack;

            attacker.defense -= attackerDamageTaken;
            defender.defense -= defenderDamageTaken;

            if (attacker.defense <= 0 && !attackersLost.includes(attacker)) {
                log(`${attacker.name} was destroyed!`, attackerPlayer === player1 ? 'player-1-log' : 'player-2-log');
                attackersLost.push(attacker);
            }
            if (defender.defense <= 0 && !defendersLost.includes(defender)) {
                log(`${defender.name} was destroyed!`, defenderPlayer === player1 ? 'player-1-log' : 'player-2-log');
                defendersLost.push(defender);
            }
        } else {
            // No defenders, attack player directly
            const damage = attacker.attack;
            defenderPlayer.life -= damage;
            log(`${attacker.name} (${attacker.attack}/${attacker.defense}) attacks ${defenderPlayer === player1 ? 'Player 1' : 'Player 2'} directly for ${damage} damage!`, 'system-log');
            log(`${defenderPlayer === player1 ? 'Player 1' : 'Player 2'} life: ${defenderPlayer.life}`, defenderPlayer === player1 ? 'player-1-log' : 'player-2-log');
            if (defenderPlayer.life <= 0) {
                endGame(`${attackerPlayer === player1 ? 'Player 1' : 'Player 2'} wins!`);
                return;
            }
        }
    }

    // Clean up battlefield based on destroyed champions (filter out those whose defense dropped to 0 or less)
    attackerPlayer.battlefield = attackerPlayer.battlefield.filter(champ => champ.defense > 0);
    defenderPlayer.battlefield = defenderPlayer.battlefield.filter(champ => champ.defense > 0);

    updateDisplay();
}

function endGame(message) {
    gameStarted = false;
    log(`GAME OVER: ${message}`, 'system-log');
    nextTurnButton.disabled = true;
    startGameButton.style.display = 'block'; // Show start button again
    playSelectedCardsButton.disabled = true;
}

// --- Game Flow Logic ---

async function handleTurn() {
    if (!gameStarted) return; // Game hasn't started yet

    nextTurnButton.disabled = true; // Disable button during turn processing
    playSelectedCardsButton.disabled = true;

    // Check for game end condition before starting turn
    if (player1.life <= 0) {
        endGame("Player 2 wins!");
        return;
    }
    if (player2.life <= 0) {
        endGame("Player 1 wins!");
        return;
    }

    // New: Untap/Summoning Sickness Removal Phase
    if (turn === 0) { // Player 1's Turn
        log("--- Player 1's Turn ---", 'player-1-log');
        log("Player 1: Readying champions...", 'player-1-log');
        player1.battlefield.forEach(champ => champ.canAttack = true);
    } else { // Player 2's Turn
        log("--- Player 2's Turn ---", 'player-2-log');
        log("Player 2: Readying champions...", 'player-2-log');
        player2.battlefield.forEach(champ => champ.canAttack = true);
    }
    updateDisplay();
    await new Promise(resolve => setTimeout(resolve, 1000));

    gamePhase = 'draw';
    log(`${turn === 0 ? 'Player 1' : 'Player 2'}: Draw Phase`, turn === 0 ? 'player-1-log' : 'player-2-log');
    drawCards(turn === 0 ? player1 : player2, 1); // Draw one card after initial 8
    updateDisplay();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pause for effect

    gamePhase = 'play';
    log(`${turn === 0 ? 'Player 1' : 'Player 2'}: Play Phase`, turn === 0 ? 'player-1-log' : 'player-2-log');
    if (turn === 0) { // Player 1
        log("Player 1: Select 2 cards to summon, then click 'Summon Champion'", 'player-1-log');
        playSelectedCardsButton.disabled = false; // Enable summon button
        // Player 1 will click "Summon Champion" and then "Next Turn"
        // The game flow pauses here until Player 1 makes a move or clicks Next Turn
        return; // Exit and wait for player action
    } else { // Player 2 (Automated AI)
        log("Player 2: AI attempting to summon champion...", 'player-2-log');
        await player2AILogic(); // Player 2 tries to summon
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Fall through to battle phase for AI
        gamePhase = 'battle';
        log("Battle Phase!", 'system-log');
        // Player 1 attacks first in their turn, Player 2 attacks first in their turn
        resolveCombat(player2, player1); // Player 2 attacks P1
        await new Promise(resolve => setTimeout(resolve, 2000));

        // After combat, check if game ended
        if (player1.life <= 0 || player2.life <= 0) {
            return; // Game already ended by combat resolution
        }

        gamePhase = 'end';
        log("End Phase.", 'system-log');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Switch turn
        turn = (turn + 1) % 2;
        nextTurnButton.disabled = false; // Re-enable for next turn
        handleTurn(); // Immediately start next turn for Player 1
    }
}

async function player2AILogic() {
    // Simple AI: always try to summon if 2 cards available
    if (player2.hand.length >= 2) {
        // Just pick the first two cards for simplicity
        const card1 = player2.hand[0];
        const card2 = player2.hand[1];
        if (card1 && card2) {
            summonChampion(player2, card1, card2);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Pause for effect
            return true; // Successfully summoned
        }
    }
    log("Player 2 could not summon a champion.", 'player-2-log');
    return false; // Could not summon
}

// --- Event Listeners ---
startGameButton.addEventListener('click', startGame);
nextTurnButton.addEventListener('click', () => {
    // If it's Player 1's turn and they click next during 'play' phase,
    // it signifies they are done playing cards and want to proceed to battle.
    if (turn === 0 && gamePhase === 'play') {
        gamePhase = 'battle';
        log("Battle Phase!", 'system-log');
        resolveCombat(player1, player2); // Player 1 attacks P2
        // After combat, check if game ended
        if (player1.life <= 0 || player2.life <= 0) {
            return; // Game already ended by combat resolution
        }
        gamePhase = 'end';
        log("End Phase.", 'system-log');
        turn = (turn + 1) % 2;
        nextTurnButton.disabled = false;
        // Proceed to next turn automatically after P1 ends their turn
        setTimeout(handleTurn, 1000);
    } else {
        handleTurn();
    }
});

playSelectedCardsButton.addEventListener('click', () => {
    if (gamePhase === 'play' && player1.selectedCards.length === 2) {
        const [card1, card2] = player1.selectedCards;
        summonChampion(player1, card1, card2);
        playSelectedCardsButton.disabled = true; // Disable until next play phase
        log("Player 1 has finished playing cards. Click 'Next Turn' to proceed to battle.", 'player-1-log');
        // Player 1's turn logic will now wait for them to click 'Next Turn'
    } else {
        log("Select exactly two cards to summon a champion.", 'system-log');
    }
});

// --- Game Initialization ---
function startGame() {
    log("Game Starting...", 'system-log');
    startGameButton.style.display = 'none'; // Hide start button
    nextTurnButton.disabled = false;
    playSelectedCardsButton.disabled = true;

    // Reset game state
    player1 = { life: 20, deck: [], hand: [], battlefield: [], selectedCards: [] };
    player2 = { life: 20, deck: [], hand: [], battlefield: [] };
    gameLogEl.innerHTML = ''; // Clear previous log
    turn = 0;
    gamePhase = 'start';
    gameStarted = true;

    // Create and shuffle decks
    player1.deck = createDeck();
    player2.deck = createDeck();
    shuffleDeck(player1.deck);
    shuffleDeck(player2.deck);

    updateDisplay(); // Initial display update

    // Initial draws
    log("Drawing initial hands...", 'system-log');
    drawCards(player1, 8);
    drawCards(player2, 8);
    updateDisplay();
    log("Initial hands drawn. Player 1's turn.", 'system-log');

    // Start the first turn
    handleTurn();
}

// Initial state setup
updateDisplay();
nextTurnButton.disabled = true; // Disabled until game starts
playSelectedCardsButton.disabled = true; // Disabled until play phase