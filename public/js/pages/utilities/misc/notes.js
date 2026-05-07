$(function () {
	const NOTES_STORAGE_KEY = globalThis.TechRegistryStorageKeys?.notes || 'notes';
	const storage = globalThis.TechRegistryStorage;
	const $notesList = $('#notesList');
	const $saveBtn = $('#saveBtn');
	const $deleteBtn = $('#deleteBtn');
	const $searchInput = $('#searchNotes');
	const $modalEl = $('#noteModal');
	const $modalTitleTag = $('#modalTitle');
	const $noteTitleInput = $('#noteTitleInput');

	// Guard for Quill library load errors
	if (typeof Quill === 'undefined') {
		console.error('Quill is not loaded.');
		$notesList.html('<div class="col-12 text-center text-danger py-5">Error: Editor library failed to load.</div>');
		return;
	}

	// Initialize Quill Editor
	const quill = new Quill('#noteEditor', {
		theme: 'snow',
		placeholder: 'Note details...',
		modules: {
			toolbar: [
				['bold', 'italic', 'underline'],
				[{ list: 'ordered' }, { list: 'bullet' }],
				['clean']
			]
		}
	});

	let currentNoteId = null;

	const getNotes = () => storage?.getJson(NOTES_STORAGE_KEY, {}) || {};
	const saveNotes = (notes) => storage?.setJson(NOTES_STORAGE_KEY, notes);

	const loadNotes = (query = '') => {
		const notes = getNotes();
		$notesList.empty();

		// Sort notes by date (newest first)
		let sortedNotes = Object.entries(notes).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));

		if (query) {
			const q = query.toLowerCase();
			sortedNotes = sortedNotes.filter(
				([_, note]) =>
					(note.title || '').toLowerCase().includes(q) ||
					(note.content || '').toLowerCase().includes(q)
			);
		}

		if (sortedNotes.length === 0) {
			const emptyMsg = query ? 'No notes match your search.' : 'Notes you add appear here.';
			$notesList.html(`<div class="text-center text-muted py-5" style="grid-column: 1 / -1">${emptyMsg}</div>`);
			return;
		}

		sortedNotes.forEach(([id, note]) => {
			const timestamp = note.updatedAt
				? new Intl.DateTimeFormat('en-GB', {
						day: '2-digit',
						month: 'short',
						hour: '2-digit',
						minute: '2-digit'
				  }).format(new Date(note.updatedAt))
				: '';

			const $card = $(`
        <div class="note-card">
          <h6 class="fw-bold mb-2">${note.title || 'Untitled'}</h6>
          <div class="note-preview-content mb-0 flex-grow-1 small">
            ${note.content || ''}
          </div>
          <div class="note-footer d-flex justify-content-between align-items-center mt-2">
            <span class="note-time">${timestamp}</span>
            <div class="d-flex align-items-center gap-3">
              <i class="fas fa-trash note-delete text-danger" title="Delete"></i>
              <i class="fas fa-expand note-open text-primary" title="Open"></i>
            </div>
          </div>
        </div>
      `);

			$card.on('click', () => {
				currentNoteId = id;
				$modalTitleTag.text('Edit Note');
				$noteTitleInput.val(note.title);
				quill.root.innerHTML = note.content || '';
				$deleteBtn.show();
				bootstrap.Modal.getOrCreateInstance($modalEl[0]).show();
			});

			$card.find('.note-delete').on('click', (e) => {
				e.stopPropagation();
				if (confirm('Delete this note?')) {
					const notes = getNotes();
					delete notes[id];
					saveNotes(notes);
					loadNotes($searchInput.val());
				}
			});

			$notesList.append($card);
		});
	};

	// Handle Create Trigger
	$('.create-trigger').on('click', () => {
		currentNoteId = null;
		$modalTitleTag.text('New Note');
		$noteTitleInput.val('');
		quill.setText('');
		$deleteBtn.hide();
	});

	$saveBtn.on('click', () => {
		const notes = getNotes();
		const id = currentNoteId || Date.now().toString();
		const title = $noteTitleInput.val();
		const content = quill.root.innerHTML;

		if (title || quill.getText().trim()) {
			notes[id] = { title: title || 'Untitled', content: content, updatedAt: Date.now() };
			saveNotes(notes);
			bootstrap.Modal.getInstance($modalEl[0]).hide();
			loadNotes($searchInput.val());
		}
	});

	$deleteBtn.on('click', () => {
		if (currentNoteId) {
			const notes = getNotes();
			delete notes[currentNoteId];
			saveNotes(notes);
			bootstrap.Modal.getInstance($modalEl[0]).hide();
			loadNotes($searchInput.val());
		}
	});

	$searchInput.on('input', function () {
		loadNotes($(this).val());
	});

	loadNotes();
});
