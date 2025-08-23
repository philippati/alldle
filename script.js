document.addEventListener('DOMContentLoaded', function() {
  // Keyboard input handling
  const kb = document.getElementById('keyboard');

  // Simple word list for demo purposes
  let WORDS = ['orange', 'plum', 'correct', 'present', 'absent', 'example', 'testing', 'letters', 'function', 'variable', 'constant', 'dynamic', 'keyboard', 'display', 'element', 'late'];
  let ANSWER = WORDS[Math.floor(Math.random() * WORDS.length)];
  const board = document.getElementById('board');
  const form = document.getElementById('guess-form');
  const input = document.getElementById('guess-input');
  const message = document.getElementById('message');
  let currentRow = 0;
  let finished = false;
  let current_guess = '';

  // Initialize board
  let guesses = Array(6).fill().map(() => Array(9).fill(''));

  // Renders the keyboard with color feedback
  function renderKeyboard() {
    // Collect letter statuses from guesses
    const letterStatus = {};
    for (let r = 0; r <= currentRow; r++) {
      for (let c = 0; c < 9; c++) {
        const letter = guesses[r][c];
        if (!letter) continue;
        if (ANSWER[c] === letter) {
          letterStatus[letter] = 'correct';
        } else if (ANSWER.includes(letter)) {
          // Only upgrade to present if not already correct
          if (letterStatus[letter] !== 'correct') {
            letterStatus[letter] = 'present';
          }
        } else {
          if (!letterStatus[letter]) {
            letterStatus[letter] = 'absent';
          }
        }
      }
    }
  }

  function renderBoard() {
    board.innerHTML = '';
    // If the game is not finished, show current_guess in the current row
    if (!finished && current_guess && currentRow < 6) {
      guesses[currentRow] = current_guess.padEnd(9).split('');
    }
    for (let r = 0; r < 6; r++) {
      const row = document.createElement('div');
      row.className = 'row';
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const letter = guesses[r][c];
        cell.textContent = letter;
        if (letter && r < currentRow) {
          if (ANSWER[c] === letter) {
            cell.classList.add('correct');
          } else if (ANSWER.includes(letter)) {
            cell.classList.add('present');
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
    if (!e.target.classList.contains('kb-key') || input.disabled) return;
    const key = e.target;
    if (key.dataset.action === 'enter') {
      form.requestSubmit();
    } else if (key.dataset.action === 'backspace') {
      input.value = input.value.slice(0, -1);
    } else {
      if (input.value.length < 9) {
        input.value += key.textContent.toLowerCase();
      }
    }
    input.focus();

    // Update keyboard keys
    document.querySelectorAll('.kb-key').forEach(btn => {
      const l = btn.textContent.toLowerCase();
      btn.classList.remove('correct', 'present', 'absent');
      if (letterStatus[l]) {
        btn.classList.add(letterStatus[l]);
      }
    });
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (finished) return;
    const guess = current_guess;
    if (!/^[a-z]{4,9}$/.test(guess)) {
      message.textContent = "Enter a valid 4-letter to 9-letter word.";
      return;
    }
    guesses[currentRow] = guess.split('');
    currentRow++;
    current_guess = '';
    renderBoard();
    renderKeyboard();
    if (guess === ANSWER) {
      message.textContent = "Congratulations! You guessed it!";
      finished = true;
      input.disabled = true;
    } else if (currentRow === 5) {
      message.textContent = `Game over! The word was "${ANSWER.toUpperCase()}".`;
      finished = true;
      input.disabled = true;
    } else {
      message.textContent = '';
    }
  });

  // Initialize Display
  renderBoard();
  renderKeyboard();
});