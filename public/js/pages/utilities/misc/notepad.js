const $notepad = $('#notepadArea');
const $fileName = $('#fileName');
const $charCount = $('#charCount');
const $lineCount = $('#lineCount');
const $fileStatus = $('#fileStatus');
const $saveBtn = $('#saveBtn');
const $copyBtn = $('#copyBtn');
const $downloadBtn = $('#downloadBtn');
const $newFileBtn = $('#newFileBtn');
const $deleteFileBtn = $('#deleteFileBtn');
const $filesList = $('#filesList');

let db;
let currentFileId = null;

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('NotepadDB', 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('files')) {
        const store = db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('modified', 'modified', { unique: false });
      }
    };
  });
};

const updateStats = () => {
  $charCount.text($notepad.val().length);
  $lineCount.text($notepad.val().split('\n').length);
  $fileStatus.text(currentFileId ? '✓ Saved' : '⚪ Unsaved');
  $fileStatus.attr('class', 'text-info');
};

const loadFiles = async () => {
  const tx = db.transaction('files', 'readonly');
  const store = tx.objectStore('files');
  const req = store.getAll();

  req.onsuccess = () => {
    const files = (req.result || []).slice().sort((a, b) => b.modified - a.modified);
    $filesList.empty();

    if (files.length === 0) {
      $filesList.html('<p class="text-muted text-center small">No files yet</p>');
      return;
    }

    files.forEach(file => {
      const date = new Date(file.modified).toLocaleDateString();
      const preview = (file.content || '').substring(0, 60).replace(/\n/g, ' ');

      const $btn = $(
        `<button class="btn btn-light text-start d-block w-100">
          <div style="font-weight: 500; font-size: 0.9rem;">${file.name || 'Untitled'}</div>
          <small class="text-muted d-block" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${preview}...</small>
          <small class="text-secondary d-block">${date}</small>
        </button>`
      );

      $btn.on('click', () => loadFile(file.id));
      $filesList.append($btn);
    });
  };
  req.onerror = () => {
    $filesList.html('<p class="text-danger small">Failed to load files</p>');
  };
};

const loadFile = (id) => {
  const tx = db.transaction('files', 'readonly');
  const store = tx.objectStore('files');
  const req = store.get(id);

  req.onsuccess = () => {
    const file = req.result;
    if (file) {
      currentFileId = file.id;
      $fileName.val(file.name || 'Untitled');
      $notepad.val(file.content || '');
      $deleteFileBtn.prop('disabled', false);
      $fileStatus.text('✓ Loaded').removeClass().addClass('text-success');
      updateStats();
    }
  };
  req.onerror = () => {
    $fileStatus.text('Failed to load file').removeClass().addClass('text-danger');
  };
};

$(function() {
$saveBtn.on('click', async () => {
  if (!$fileName.val().trim()) {
    $fileName.focus();
    return;
  }

  const file = {
    name: $fileName.val().trim(),
    content: $notepad.val(),
    modified: Date.now()
  };

  const tx = db.transaction('files', 'readwrite');
  const store = tx.objectStore('files');

  if (currentFileId) {
    file.id = currentFileId;
    store.put(file);
  } else {
    const req = store.add(file);
    req.onsuccess = () => {
      currentFileId = req.result;
    };
  }

  tx.oncomplete = () => {
    $fileStatus.text('✓ Saved').removeClass().addClass('text-success');
    $deleteFileBtn.prop('disabled', false);
    updateStats();
    loadFiles();
  };

  tx.onerror = () => {
    $fileStatus.text('Save failed').removeClass().addClass('text-danger');
  };
});

$newFileBtn.on('click', () => {
  currentFileId = null;
  $fileName.val('');
  $notepad.val('');
  $deleteFileBtn.prop('disabled', true);
  updateStats();
  $fileName.focus();
});

$deleteFileBtn.on('click', async () => {
  if (!currentFileId) return;
  if (!confirm(`Delete "${$fileName.val()}"? This cannot be undone.`)) return;

  const tx = db.transaction('files', 'readwrite');
  const store = tx.objectStore('files');
  store.delete(currentFileId);

  tx.oncomplete = () => {
    currentFileId = null;
    $fileName.val('');
    $notepad.val('');
    $deleteFileBtn.prop('disabled', true);
    updateStats();
    loadFiles();
    $fileStatus.text('✓ Deleted').removeClass().addClass('text-info');
  };

  tx.onerror = () => {
    $fileStatus.text('Delete failed').removeClass().addClass('text-danger');
  };
});

$copyBtn.on('click', () => {
  $notepad.select();
  document.execCommand('copy');
  const oldText = $copyBtn.text();
  $copyBtn.text('✓ Copied');
  setTimeout(() => { $copyBtn.text(oldText); }, 1500);
});

$downloadBtn.on('click', () => {
  const name = ($fileName.val().trim() || 'Untitled').replace(/[^a-z0-9-_\.]/gi, '_');
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${name}_${date}.txt`;
  const content = $notepad.val() || '';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
});

$notepad.on('input', () => {
  updateStats();
  $fileStatus.text('⚪ Unsaved');
  $fileStatus.attr('class', 'text-warning');
});

// Initialize
(async () => {
  try {
    await initDB();
    $deleteFileBtn.prop('disabled', true);
    loadFiles();
    updateStats();
  } catch (e) {
    $fileStatus.text('Database error: ' + (e.message || e)).removeClass().addClass('text-danger');
  }
})();
});
