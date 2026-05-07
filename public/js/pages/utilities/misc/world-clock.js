const timezones = [
  { name: 'New York', tz: 'America/New_York' },
  { name: 'London', tz: 'Europe/London' },
  { name: 'Tokyo', tz: 'Asia/Tokyo' },
  { name: 'Sydney', tz: 'Australia/Sydney' },
  { name: 'Dubai', tz: 'Asia/Dubai' },
  { name: 'Singapore', tz: 'Asia/Singapore' }
];

const $container = $('#clocksContainer');

$(function() {
  timezones.forEach(({ name, tz }) => {
    const $col = $('<div>');
    $col.addClass('col-md-6 col-lg-4');
    $col.html(`
    <div class="card text-center">
      <div class="card-body">
        <h5 class="card-title">${name}</h5>
        <div class="display-6 font-monospace" style="font-size: 2rem; font-weight: bold;" id="clock-${tz}">--:--:--</div>
        <small class="text-muted">${tz}</small>
      </div>
    </div>
  `;
    $container.append($col);
  });

  const updateClocks = () => {
    timezones.forEach(({ tz }) => {
      const time = new Date().toLocaleTimeString('en-US', { timeZone: tz, hour12: false });
      $(`#clock-${tz}`).text(time);
    });
  };

  updateClocks();
  setInterval(updateClocks, 1000);
});
  });
};

updateClocks();
setInterval(updateClocks, 1000);
