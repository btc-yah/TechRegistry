const STORAGE_KEY = globalThis.TechRegistryStorageKeys?.taskHandlerEvents || 'task-handler-events';
const DEFAULT_COLOR = '#0d6efd';
const storage = globalThis.TechRegistryStorage;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

let calendar = null;
const $monthText = $('#monthText');
const $yearText = $('#yearText');
const $totalTasks = $('#totalTasks');
const $monthTasks = $('#monthTasks');
const $todayTasks = $('#todayTasks');
const $upcomingCount = $('#upcomingCount');
const $upcomingEvents = $('#upcomingEvents');
const $eventForm = $('#eventForm');
const $eventIdInput = $('#eventId');
const $eventTitleInput = $('#eventTitle');
const $eventStartDateInput = $('#eventStartDate');
const $eventStartTimeInput = $('#eventStartTime');
const $eventEndDateInput = $('#eventEndDate');
const $eventEndTimeInput = $('#eventEndTime');
const $eventDetailsInput = $('#eventDetails');
const $eventColorInput = $('#eventColor');
const $saveEventLabel = $('#saveEventLabel');
const $deleteEventBtn = $('#deleteEventBtn');
const $resetEventBtn = $('#resetEventBtn');
const $newTaskBtn = $('#newTaskBtn');
const $taskEventModalElement = $('#taskEventModal');
const $taskEventModalLabel = $('#taskEventModalLabel');
const $taskModalHint = $('#taskModalHint');
const $colorChips = $('.task-color-chip');
const $prevBtn = $('#prevBtn');
const $nextBtn = $('#nextBtn');
const $todayBtn = $('#todayBtn');

const today = new Date();
const todayKey = toDateKey(today);

let currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = todayKey;
let editingEventId = '';

const taskModal = globalThis.bootstrap?.Modal && $taskEventModalElement.length
  ? new globalThis.bootstrap.Modal($taskEventModalElement[0])
  : null;

function toDateKey(value) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatTimeLabel(timeValue) {
  if (!timeValue) {
    return 'All day';
  }

  const [hours, minutes] = timeValue.split(':');
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatDateRangeLabel(eventItem) {
  const startDate = formatDisplayDate(eventItem.startDate);
  const endDate = formatDisplayDate(eventItem.endDate);
  const startTime = formatTimeLabel(eventItem.startTime);
  const endTime = formatTimeLabel(eventItem.endTime);

  if (eventItem.startDate === eventItem.endDate) {
    return `${startDate} | ${startTime} to ${endTime}`;
  }

  return `${startDate} ${startTime} to ${endDate} ${endTime}`;
}

function toDateTimeValue(dateValue, timeValue = '00:00') {
  return new Date(`${dateValue}T${timeValue || '00:00'}:00`).getTime();
}

function createEventId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeEvent(eventItem) {
  return {
    id: eventItem.id || createEventId(),
    title: eventItem.title || eventItem.text || 'Untitled task',
    startDate: eventItem.startDate || eventItem.date || todayKey,
    startTime: eventItem.startTime || eventItem.time || '',
    endDate: eventItem.endDate || eventItem.date || eventItem.startDate || todayKey,
    endTime: eventItem.endTime || eventItem.time || '',
    details: eventItem.details || '',
    color: eventItem.color || DEFAULT_COLOR
  };
}

function sortEvents(events) {
  return [...events].sort((left, right) => {
    const leftStamp = `${left.startDate}|${left.startTime || '00:00'}|${left.endDate}|${left.endTime || '23:59'}|${left.title.toLowerCase()}`;
    const rightStamp = `${right.startDate}|${right.startTime || '00:00'}|${right.endDate}|${right.endTime || '23:59'}|${right.title.toLowerCase()}`;
    return leftStamp.localeCompare(rightStamp);
  });
}

function getEvents() {
  const parsed = storage?.getJson(STORAGE_KEY, []);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return sortEvents(parsed.map(normalizeEvent));
}

function saveEvents(events) {
  storage?.setJson(STORAGE_KEY, sortEvents(events.map(normalizeEvent)));
}

function getSelectedDateInView() {
  const visibleMonth = currentDate.getMonth();
  const visibleYear = currentDate.getFullYear();
  const selected = new Date(`${selectedDate}T00:00:00`);
  if (selected.getMonth() === visibleMonth && selected.getFullYear() === visibleYear) {
    return selectedDate;
  }
  return toDateKey(new Date(visibleYear, visibleMonth, 1));
}

function setActiveColor(color) {
  $eventColorInput.val(color);
  $colorChips.each(function() {
    $(this).toggleClass('is-active', $(this).data('color') === color);
  });
}

function resetForm(dateKey = getSelectedDateInView()) {
  editingEventId = '';
  $eventIdInput.val('');
  $eventForm[0].reset(); // Use native DOM reset for form
  $eventStartDateInput.val(dateKey);
  $eventEndDateInput.val(dateKey);
  $eventStartTimeInput.val('');
  $eventEndTimeInput.val('');
  selectedDate = dateKey;
  $saveEventLabel.text('Add Task');
  $taskEventModalLabel.text('Add Task');
  $taskModalHint.text(`Schedule a task for ${formatDisplayDate(dateKey)}.`);
  $deleteEventBtn.addClass('d-none');
  setActiveColor(DEFAULT_COLOR);
}

function populateForm(eventItem) {
  editingEventId = eventItem.id;
  $eventIdInput.val(eventItem.id);
  $eventTitleInput.val(eventItem.title);
  $eventStartDateInput.val(eventItem.startDate);
  $eventStartTimeInput.val(eventItem.startTime || '');
  $eventEndDateInput.val(eventItem.endDate);
  $eventEndTimeInput.val(eventItem.endTime || '');
  $eventDetailsInput.val(eventItem.details || '');
  selectedDate = eventItem.startDate;
  $saveEventLabel.text('Update Task');
  $taskEventModalLabel.text('Edit Task');
  $taskModalHint.text(`Update or delete the task planned from ${formatDisplayDate(eventItem.startDate)} to ${formatDisplayDate(eventItem.endDate)}.`);
  $deleteEventBtn.removeClass('d-none');
  setActiveColor(eventItem.color || DEFAULT_COLOR);
}

function openEventModal() {
  if (taskModal) {
    taskModal.show();
  }
}

function closeEventModal() {
  if (taskModal) {
    taskModal.hide();
  }
}

function renderCalendar() {
  const events = getEvents();
  
  // Map your local storage format to FullCalendar format
  const fcEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.startTime ? `${e.startDate}T${e.startTime}` : e.startDate,
    // FullCalendar end dates are exclusive for all-day events
    end: e.endTime ? `${e.endDate}T${e.endTime}` : (e.startDate === e.endDate ? e.endDate : toDateKey(new Date(new Date(`${e.endDate}T00:00:00`).getTime() + 864e5))),
    backgroundColor: e.color,
    borderColor: e.color,
    allDay: !e.startTime,
    extendedProps: { ...e }
  }));

  if (!calendar) {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      themeSystem: 'bootstrap5',
      headerToolbar: false, // We use your custom header
      firstDay: 1, // Monday
      editable: true,
      droppable: true,
      height: 'auto',
      events: fcEvents,
      eventClick: (info) => {
        populateForm(info.event.extendedProps);
        openEventModal();
      },
      dateClick: (info) => {
        selectedDate = info.dateStr;
        resetForm(selectedDate);
        openEventModal();
      },
      datesSet: (info) => {
        currentDate = info.view.currentStart;
        $monthText.text(MONTH_NAMES[currentDate.getMonth()]);
        $yearText.text(currentDate.getFullYear());
        renderStats(getEvents());
      }
    });
    calendar.render();
  } else {
    calendar.removeAllEventSources();
    calendar.addEventSource(fcEvents);
  }

  renderStats(events);
  renderUpcoming(events);
}

function renderStats(events) {
  const visibleYear = currentDate.getFullYear();
  const visibleMonth = currentDate.getMonth();
  const monthStart = new Date(visibleYear, visibleMonth, 1);
  const monthEnd = new Date(visibleYear, visibleMonth + 1, 0);

  const currentMonthEvents = events.filter((eventItem) => {
    const eventStart = new Date(`${eventItem.startDate}T00:00:00`);
    const eventEnd = new Date(`${eventItem.endDate}T00:00:00`);
    return eventStart <= monthEnd && eventEnd >= monthStart;
  });

  $totalTasks.text(`${events.length}`);
  $monthTasks.text(`${currentMonthEvents.length}`);
  $todayTasks.text(`${events.filter((eventItem) => eventItem.startDate <= todayKey && eventItem.endDate >= todayKey).length}`);
}

function renderUpcoming(events) {
  const upcoming = events
    .filter((eventItem) => toDateTimeValue(eventItem.endDate, eventItem.endTime || '23:59') >= new Date(`${todayKey}T00:00:00`).getTime())
    .slice(0, 6);

  $upcomingCount.text(`${upcoming.length} item${upcoming.length === 1 ? '' : 's'}`);

  if (!upcoming.length) {
    $upcomingEvents.html('<div class="task-empty-state">No tasks yet. Create one from the form or click any date.</div>');
    return;
  }

  $upcomingEvents.html(upcoming
    .map(
      (eventItem) => `
        <button class="task-upcoming-item" type="button" data-event-id="${eventItem.id}">
          <div class="task-upcoming-top">
            <span class="task-upcoming-title">${escapeHtml(eventItem.title)}</span>
            <span class="task-upcoming-time">${escapeHtml(formatTimeLabel(eventItem.startTime))}</span>
          </div>
          <div class="task-upcoming-date">${escapeHtml(formatDateRangeLabel(eventItem))}</div>
          ${eventItem.details ? `<div class="task-upcoming-notes">${escapeHtml(eventItem.details)}</div>` : ''}
        </button>
      `
    ).join(''));
}

function handleCalendarClick(event) { // Keep native event for target.closest
  const eventButton = event.target.closest('[data-event-id]');
  if (eventButton) {
    const eventId = eventButton.dataset.eventId;
    const selectedEvent = getEvents().find((item) => item.id === eventId);
    if (selectedEvent) {
      populateForm(selectedEvent);
      if (calendar) {
        calendar.gotoDate(selectedEvent.startDate);
      }
      renderCalendar();
      openEventModal();
    }
    return;
  }

  const dateCell = event.target.closest('[data-date]');
  if (!dateCell) {
    return;
  }

  selectedDate = dateCell.dataset.date;
  resetForm(selectedDate);
  openEventModal();
}

function submitForm(event) {
  event.preventDefault();

  const title = $eventTitleInput.val().trim();
  const startDate = $eventStartDateInput.val();
  const startTime = $eventStartTimeInput.val();
  const endDate = $eventEndDateInput.val();
  const endTime = $eventEndTimeInput.val();
  
  if (!title || !startDate || !endDate) {
    return;
  }

  if (toDateTimeValue(endDate, endTime || '23:59') < toDateTimeValue(startDate, startTime || '00:00')) {
    globalThis.appToast?.('End date/time must be after the start date/time.', 'error');
    return;
  }

  const events = getEvents();
  const payload = normalizeEvent({
    id: editingEventId || createEventId(),
    title,
    startDate,
    startTime,
    endDate,
    endTime, 
    details: $eventDetailsInput.val().trim(),
    color: $eventColorInput.val() || DEFAULT_COLOR
  });

  const existingIndex = events.findIndex((item) => item.id === payload.id);
  if (existingIndex >= 0) {
    events[existingIndex] = payload;
  } else {
    events.push(payload);
  }

  saveEvents(events);
  selectedDate = payload.startDate;
  if (calendar) {
    calendar.gotoDate(payload.startDate);
  }
  resetForm(payload.startDate);
  renderCalendar();
  closeEventModal();
}

function deleteCurrentEvent() {
  if (!editingEventId) {
    return;
  }

  const events = getEvents().filter((item) => item.id !== editingEventId);
  saveEvents(events);
  resetForm(selectedDate);
  renderCalendar();
  closeEventModal();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

$(function() { // Wrap in jQuery ready function
  $colorChips.on('click', function() {
    setActiveColor($(this).data('color') || DEFAULT_COLOR);
  });

  $upcomingEvents.on('click', handleCalendarClick);
  $eventForm.on('submit', submitForm);
  $resetEventBtn.on('click', () => resetForm(selectedDate));
  $deleteEventBtn.on('click', deleteCurrentEvent);

  $newTaskBtn.on('click', () => {
    resetForm(getSelectedDateInView());
    openEventModal();
  });

  $prevBtn.on('click', () => {
    if (calendar) calendar.prev();
  });

  $nextBtn.on('click', () => {
    if (calendar) calendar.next();
  });

  $todayBtn.on('click', () => {
    if (calendar) {
      calendar.today();
      selectedDate = todayKey;
      resetForm(todayKey);
    }
  });

  resetForm(todayKey);
  renderCalendar();
});
