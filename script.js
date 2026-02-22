document.addEventListener('DOMContentLoaded', async function() {
  const kb = document.getElementById('keyboard');
  const board = document.getElementById('board');
  const form = document.getElementById('guess-form');
  const input = document.getElementById('guess-input');
  const message = document.getElementById('message');

  const DATAMUSE_API = 'https://api.datamuse.com/words';

  /** Picks a random common English word of length 4–9 via Datamuse (score = frequency). */
  async function fetchRandomAnswer() {
    const length = 4 + Math.floor(Math.random() * 6); // 4..9
    const pattern = '?'.repeat(length);
    try {
      const res = await fetch(`${DATAMUSE_API}?sp=${pattern}&max=500`);
      if (!res.ok) throw new Error('Datamuse request failed');
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error('No words');
      data.sort((a, b) => (b.score || 0) - (a.score || 0));
      const common = data.slice(0, Math.min(150, data.length));
      const word = common[Math.floor(Math.random() * common.length)].word;
      if (!word || word.length < 4 || word.length > 9) throw new Error('Invalid word');
      return word.toLowerCase();
    } catch (e) {
      console.warn('fetchRandomAnswer fallback:', e);
      const fallback = ['about', 'after', 'again', 'apple', 'bread', 'chair', 'clock', 'dream', 'early', 'earth', 'first', 'great', 'green', 'house', 'light', 'might', 'night', 'other', 'place', 'plant', 'right', 'small', 'sound', 'spell', 'still', 'study', 'their', 'there', 'thing', 'think', 'three', 'water', 'where', 'which', 'world', 'would'];
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
  }

  if (message) message.textContent = 'Loading...';
  let ANSWER = await fetchRandomAnswer();
  if (message) message.textContent = '';
  let currentRow = 0;
  let finished = false;
  let current_guess = '';

  // Initialize board (each row stores the guess string length 4-9, we pad for display)
  let guesses = Array(9).fill().map(() => Array(9).fill(''));

  const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

  /** Returns true if the word exists in the English dictionary (API). */
  async function isValidEnglishWord(word) {
    if (!word || word.length < 4 || word.length > 9) return false;
    try {
      const res = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word.toLowerCase())}`);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Wordle-style feedback: 'correct' | 'present' | 'absent' for each position.
   * Green = exact match. Yellow = letter in answer but wrong position (respects duplicate counts).
   * Blanks are not passed in; caller treats them as absent when rendering.
   */
  function getFeedback(answer, guess) {
    const ans = answer.split('');
    const g = guess.split('');
    const result = Array(g.length).fill('absent');
    const used = ans.map(() => false); // which answer positions are "used" by a green

    // First pass: mark correct (green) and mark those answer positions as used
    for (let i = 0; i < g.length && i < ans.length; i++) {
      if (g[i] === ans[i]) {
        result[i] = 'correct';
        used[i] = true;
      }
    }
    // Second pass: mark present (yellow) for letters in answer that aren't used, by occurrence
    for (let i = 0; i < g.length; i++) {
      if (result[i] === 'correct') continue;
      const letter = g[i];
      const idx = ans.findIndex((a, j) => a === letter && !used[j]);
      if (idx !== -1) {
        result[i] = 'present';
        used[idx] = true;
      }
    }
    return result;
  }

  /** Best result per letter: correct > present > absent. Used to color the on-screen keyboard. */
  function getKeyboardState() {
    const best = {}; // letter -> 'correct' | 'present' | 'absent'
    for (let r = 0; r < currentRow; r++) {
      const guessWord = guesses[r].join('').replace(/\s/g, '');
      if (!guessWord.length) continue;
      const feedback = getFeedback(ANSWER, guessWord);
      const letters = guessWord.split('');
      for (let i = 0; i < letters.length; i++) {
        const letter = letters[i];
        const result = feedback[i];
        if (!best[letter] || (result === 'correct') || (result === 'present' && best[letter] === 'absent')) {
          best[letter] = result;
        }
      }
    }
    return best;
  }

  function renderKeyboard() {
    const state = getKeyboardState();
    const keys = kb.querySelectorAll('.kb-key');
    keys.forEach((btn) => {
      if (btn.dataset.action) return; // Enter / Backspace stay default
      const letter = (btn.textContent.trim() || '').toLowerCase();
      if (!/^[a-z]$/.test(letter)) return;
      btn.classList.remove('correct', 'present', 'absent');
      if (state[letter]) btn.classList.add(state[letter]);
    });
  }

  function renderBoard() {
    board.innerHTML = '';
    if (!finished && current_guess && currentRow < 9) {
      guesses[currentRow] = current_guess.padEnd(9).split('');
    }
    for (let r = 0; r < 9; r++) {
      const row = document.createElement('div');
      row.className = 'row';
      const rowLetters = r < currentRow
        ? guesses[r]
        : (r === currentRow ? [...current_guess.split(''), ...Array(Math.max(0, 9 - current_guess.length)).fill('')] : Array(9).fill(''));
      const guessWord = r < currentRow ? guesses[r].join('').replace(/\s/g, '') : '';
      const feedback = r < currentRow && guessWord.length > 0 ? getFeedback(ANSWER, guessWord) : [];
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const letter = (rowLetters[c] || '').trim();
        cell.textContent = letter ? letter.toUpperCase() : '';
        if (r < currentRow) {
          if (!letter) {
            cell.classList.add('absent');
          } else if (c < feedback.length) {
            cell.classList.add(feedback[c]);
          } else {
            cell.classList.add('absent');
          }
        }
        row.appendChild(cell);
      }
      board.appendChild(row);
    }
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      form.requestSubmit();
    } else if (e.key === 'Backspace') {
      if (current_guess.length === 1) {
        current_guess = '';
      } else {
        current_guess = current_guess.slice(0, -1);
      }
    } else if (/^[a-zA-Z]$/.test(e.key) && current_guess.length < 9) {
      current_guess += e.key.toLowerCase();
    }
    renderBoard();
  });
  
  kb.addEventListener('click', function(e) {
    const key = e.target.textContent.toLowerCase();
    if (e.target.dataset.action === 'enter') {
      form.requestSubmit();
    } else if (e.target.dataset.action === 'backspace') {
      if (current_guess.length === 1) {
        current_guess = '';
      } else {
        current_guess = current_guess.slice(0, -1);
      }
    } else {
      if (current_guess.length < 9) {
        current_guess += key;
      }
    }
    renderBoard();
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (finished) return;
    const guess = current_guess;
    if (!/^[a-z]{4,9}$/.test(guess)) {
      message.textContent = "Enter a valid 4-letter to 9-letter word.";
      return;
    }
    message.textContent = "Checking...";
    const valid = await isValidEnglishWord(guess);
    if (!valid) {
      message.textContent = "Not in the word list.";
      return;
    }
    message.textContent = '';
    guesses[currentRow] = guess.split('');
    currentRow++;
    current_guess = '';
    renderBoard();
    renderKeyboard();
    if (guess === ANSWER) {
      message.textContent = "Congratulations! You guessed it!";
      finished = true;
      if (input) input.disabled = true;
    } else if (currentRow === 9) {
      message.textContent = `Game over! The word was "${ANSWER.toUpperCase()}".`;
      finished = true;
      if (input) input.disabled = true;
    }
  });

  // Initialize Display
  renderBoard();
  renderKeyboard();
});