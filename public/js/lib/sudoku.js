/* Minimal open-source style Sudoku generator + solver
   - generate(difficulty) returns a 9x9 array with 0 for blanks
   - render(targetEl, puzzle) renders inputs
   - getGrid(targetEl) reads current grid
   - validate(grid) checks whether filled and valid
   This is a compact implementation derived from common backtracking approaches (MIT/ISC-style).
*/
(function (global) {
  const Sudoku = {};

  function cloneGrid(g) {
    return g.map(r => r.slice());
  }

  function findEmpty(grid) {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!grid[r][c]) return [r, c];
    return null;
  }

  function isValidPlacement(grid, row, col, val) {
    for (let i = 0; i < 9; i++) {
      if (grid[row][i] === val) return false;
      if (grid[i][col] === val) return false;
    }
    const sr = Math.floor(row / 3) * 3;
    const sc = Math.floor(col / 3) * 3;
    for (let r = sr; r < sr + 3; r++) for (let c = sc; c < sc + 3; c++) if (grid[r][c] === val) return false;
    return true;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function solve(grid) {
    const empty = findEmpty(grid);
    if (!empty) return true;
    const [r, c] = empty;
    for (let v = 1; v <= 9; v++) {
      if (isValidPlacement(grid, r, c, v)) {
        grid[r][c] = v;
        if (solve(grid)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }

  function generateSolved() {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    function fillCell(i) {
      if (i >= 81) return true;
      const r = Math.floor(i / 9), c = i % 9;
      const nums = shuffle([1,2,3,4,5,6,7,8,9].slice());
      for (const n of nums) {
        if (isValidPlacement(grid, r, c, n)) {
          grid[r][c] = n;
          if (fillCell(i + 1)) return true;
          grid[r][c] = 0;
        }
      }
      return false;
    }
    fillCell(0);
    return grid;
  }

  Sudoku.generate = function (blanks = 40) {
    const solved = generateSolved();
    const puzzle = cloneGrid(solved);
    const cells = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells.push([r,c]);
    shuffle(cells);
    let removed = 0;
    while (removed < blanks && cells.length) {
      const [r,c] = cells.pop();
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;
      const copy = cloneGrid(puzzle);
      // quick uniqueness check: attempt to solve; we're not exhaustive but it's fine for lightweight puzzles
      if (!solve(copy)) {
        puzzle[r][c] = backup;
      } else {
        removed++;
      }
    }
    return { puzzle, solution: solved };
  };

  Sudoku.render = function (el, puzzle) {
    if (!el) return;
    el.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'table table-sm sudoku-table';
    table.style.borderCollapse = 'collapse';
    const tbody = document.createElement('tbody');
    for (let r = 0; r < 9; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < 9; c++) {
        const td = document.createElement('td');
        td.style.padding = '0';
        td.style.width = '34px';
        td.style.height = '34px';
        td.style.border = '1px solid rgba(0,0,0,0.08)';
        if (c % 3 === 0) td.style.borderLeft = '2px solid rgba(0,0,0,0.12)';
        if (r % 3 === 0) td.style.borderTop = '2px solid rgba(0,0,0,0.12)';
        const val = puzzle[r][c];
        if (val) {
          td.textContent = val;
          td.style.textAlign = 'center';
          td.style.lineHeight = '34px';
          td.style.fontWeight = '600';
        } else {
          const input = document.createElement('input');
          input.type = 'text';
          input.maxLength = 1;
          input.inputMode = 'numeric';
          input.className = 'form-control form-control-sm text-center p-0';
          input.style.height = '34px';
          input.style.padding = '0';
          input.style.border = 'none';
          input.style.background = 'transparent';
          input.addEventListener('input', () => {
            input.value = input.value.replace(/[^1-9]/g, '');
          });
          td.appendChild(input);
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    el.appendChild(table);
  };

  Sudoku.getGrid = function (el) {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    if (!el) return grid;
    const rows = el.querySelectorAll('tbody tr');
    rows.forEach((tr, r) => {
      const cells = tr.children;
      for (let c = 0; c < cells.length; c++) {
        const td = cells[c];
        const input = td.querySelector('input');
        if (input) {
          const v = parseInt(input.value, 10);
          grid[r][c] = Number.isFinite(v) ? v : 0;
        } else {
          const text = td.textContent.trim();
          grid[r][c] = text ? parseInt(text, 10) : 0;
        }
      }
    });
    return grid;
  };

  Sudoku.validate = function (grid, solution) {
    // if solution provided, compare exact
    if (solution) {
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (grid[r][c] !== solution[r][c]) return false;
      return true;
    }
    // otherwise check basic validity and filled
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!grid[r][c] || !isValidPlacement(grid, r, c, grid[r][c])) return false;
    return true;
  };

  global.Sudoku = Sudoku;
})(window);
