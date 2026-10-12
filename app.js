/**
 * CuacaNusantara - Weather Application Logic
 * Powered by Open-Meteo API (Free, No API Key Required)
 */

// Application State
const state = {
  currentCity: 'Jakarta',
  currentCountry: 'Indonesia',
  coords: { lat: -6.2146, lon: 106.8451 },
  unit: localStorage.getItem('cuaca_unit') || 'c', // 'c' or 'f'
  weatherData: null,
  searchDebounceTimer: null
};

// Indonesian Day and Month Names
const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// WMO Weather Interpretation Codes to Indonesian & Lucide Icon mappings
const WMO_MAP = {
  0: { label: 'Cerah', icon: 'sun', iconNight: 'moon', group: 'clear' },
  1: { label: 'Sebagian Besar Cerah', icon: 'sun', iconNight: 'moon', group: 'clear' },
  2: { label: 'Berawan Sebagian', icon: 'cloud-sun', iconNight: 'cloud-moon', group: 'clouds' },
  3: { label: 'Mendung', icon: 'cloud', iconNight: 'cloud', group: 'clouds' },
  45: { label: 'Berkabut', icon: 'cloud-fog', iconNight: 'cloud-fog', group: 'fog' },
  48: { label: 'Kabut Tebal Berembun', icon: 'cloud-fog', iconNight: 'cloud-fog', group: 'fog' },
  51: { label: 'Gerimis Ringan', icon: 'cloud-drizzle', iconNight: 'cloud-drizzle', group: 'drizzle' },
  53: { label: 'Gerimis Sedang', icon: 'cloud-drizzle', iconNight: 'cloud-drizzle', group: 'drizzle' },
  55: { label: 'Gerimis Lebat', icon: 'cloud-drizzle', iconNight: 'cloud-drizzle', group: 'drizzle' },
  56: { label: 'Gerimis Dingin', icon: 'cloud-hail', iconNight: 'cloud-hail', group: 'drizzle' },
  57: { label: 'Gerimis Dingin Lebat', icon: 'cloud-hail', iconNight: 'cloud-hail', group: 'drizzle' },
  61: { label: 'Hujan Ringan', icon: 'cloud-rain', iconNight: 'cloud-rain', group: 'rain' },
  63: { label: 'Hujan Sedang', icon: 'cloud-rain', iconNight: 'cloud-rain', group: 'rain' },
  65: { label: 'Hujan Lebat', icon: 'cloud-rain-wind', iconNight: 'cloud-rain-wind', group: 'rain' },
  66: { label: 'Hujan Membeku', icon: 'cloud-snow', iconNight: 'cloud-snow', group: 'rain' },
  67: { label: 'Hujan Membeku Lebat', icon: 'cloud-snow', iconNight: 'cloud-snow', group: 'rain' },
  71: { label: 'Salju Ringan', icon: 'snowflake', iconNight: 'snowflake', group: 'snow' },
  73: { label: 'Salju Sedang', icon: 'snowflake', iconNight: 'snowflake', group: 'snow' },
  75: { label: 'Salju Lebat', icon: 'snowflake', iconNight: 'snowflake', group: 'snow' },
  77: { label: 'Butiran Salju', icon: 'snowflake', iconNight: 'snowflake', group: 'snow' },
  80: { label: 'Hujan Rintik Sesaat', icon: 'cloud-rain', iconNight: 'cloud-rain', group: 'rain' },
  81: { label: 'Hujan Deras Sesaat', icon: 'cloud-rain', iconNight: 'cloud-rain', group: 'rain' },
  82: { label: 'Hujan Badai Sangat Deras', icon: 'cloud-rain-wind', iconNight: 'cloud-rain-wind', group: 'rain' },
  85: { label: 'Hujan Salju Ringan', icon: 'cloud-snow', iconNight: 'cloud-snow', group: 'snow' },
  86: { label: 'Hujan Salju Lebat', icon: 'cloud-snow', iconNight: 'cloud-snow', group: 'snow' },
  95: { label: 'Badai Petir', icon: 'cloud-lightning', iconNight: 'cloud-lightning', group: 'thunderstorm' },
  96: { label: 'Badai Petir dengan Es Ringan', icon: 'cloud-lightning', iconNight: 'cloud-lightning', group: 'thunderstorm' },
  99: { label: 'Badai Petir dengan Es Hebat', icon: 'cloud-lightning', iconNight: 'cloud-lightning', group: 'thunderstorm' }
};

// Fallback Offline Mock Data in case of complete internet disconnection
const FALLBACK_WEATHER = {
  current: {
    time: new Date().toISOString().slice(0, 16),
    temperature_2m: 29.5,
    relative_humidity_2m: 72,
    apparent_temperature: 34.0,
    is_day: 1,
    precipitation: 0.0,
    weather_code: 2,
    wind_speed_10m: 10.5,
    wind_direction_10m: 140,
    surface_pressure: 1012,
    uv_index: 4.5
  },
  daily: {
    time: Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    }),
    weather_code: [2, 1, 61, 3, 2, 80, 0],
    temperature_2m_max: [32, 33, 30, 31, 32, 30, 33],
    temperature_2m_min: [24, 25, 23, 24, 24, 23, 25],
    sunrise: [new Date().toISOString().slice(0, 10) + 'T05:42'],
    sunset: [new Date().toISOString().slice(0, 10) + 'T17:51'],
    uv_index_max: [6.5, 7.0, 4.0, 5.0, 6.0, 4.5, 7.5]
  },
  hourly: {
    time: Array.from({ length: 24 }, (_, i) => {
      const d = new Date();
      d.setHours(d.getHours() + i, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    }),
    temperature_2m: [29, 28, 27, 26, 26, 25, 27, 29, 31, 32, 33, 32, 31, 30, 29, 28, 28, 27, 27, 26, 26, 25, 25, 25],
    weather_code: [2, 2, 1, 1, 0, 0, 1, 2, 2, 3, 61, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1]
  }
};

/* ==========================================================================
   DOM Elements
   ========================================================================== */
const searchInput = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('searchClearBtn');
const searchSpinner = document.getElementById('searchSpinner');
const suggestionsDropdown = document.getElementById('suggestionsDropdown');
const quickChips = document.getElementById('quickChips');
const btnGeolocation = document.getElementById('btnGeolocation');
const btnRefresh = document.getElementById('btnRefresh');
const unitToggle = document.getElementById('unitToggle');
const toastContainer = document.getElementById('toastContainer');

const skeletonLayout = document.getElementById('skeletonLayout');
const dashboardContent = document.getElementById('dashboardContent');

// Dashboard elements
const locationNameEl = document.getElementById('locationName');
const currentDateTimeEl = document.getElementById('currentDateTime');
const conditionPillEl = document.getElementById('conditionPill');
const conditionTextEl = document.getElementById('conditionText');
const currentTempEl = document.getElementById('currentTemp');
const tempUnitDisplayEl = document.getElementById('tempUnitDisplay');
const heroWeatherIconEl = document.getElementById('heroWeatherIcon');
const feelsLikeTempEl = document.getElementById('feelsLikeTemp');
const tempRangeEl = document.getElementById('tempRange');
const precipitationAmtEl = document.getElementById('precipitationAmt');

// Highlight elements
const windSpeedEl = document.getElementById('windSpeed');
const windDirectionEl = document.getElementById('windDirection');
const humidityEl = document.getElementById('humidity');
const humidityBarEl = document.getElementById('humidityBar');
const humidityStatusEl = document.getElementById('humidityStatus');
const uvIndexEl = document.getElementById('uvIndex');
const uvBadgeEl = document.getElementById('uvBadge');
const uvBarEl = document.getElementById('uvBar');
const uvAdviceEl = document.getElementById('uvAdvice');
const airPressureEl = document.getElementById('airPressure');
const pressureStatusEl = document.getElementById('pressureStatus');
const sunriseTimeEl = document.getElementById('sunriseTime');
const sunsetTimeEl = document.getElementById('sunsetTime');
const weatherTipTextEl = document.getElementById('weatherTipText');

// Forecast containers
const hourlyContainer = document.getElementById('hourlyForecastContainer');
const dailyListContainer = document.getElementById('dailyForecastList');
const btnScrollLeft = document.getElementById('btnScrollLeft');
const btnScrollRight = document.getElementById('btnScrollRight');
const weatherParticlesContainer = document.getElementById('weatherParticles');

/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateUnitToggleUI();
  
  // Try retrieving cached location or default to Jakarta
  const savedCity = localStorage.getItem('cuaca_last_city');
  const savedLat = localStorage.getItem('cuaca_last_lat');
  const savedLon = localStorage.getItem('cuaca_last_lon');

  if (savedCity && savedLat && savedLon) {
    state.currentCity = savedCity;
    state.coords = { lat: parseFloat(savedLat), lon: parseFloat(savedLon) };
  }

  fetchWeatherData(state.coords.lat, state.coords.lon, state.currentCity);
});

/* ==========================================================================
   Event Listeners Setup
   ========================================================================== */
function setupEventListeners() {
  // Unit toggle button
  unitToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.unit-btn');
    if (!btn) return;
    const unit = btn.dataset.unit;
    if (unit !== state.unit) {
      state.unit = unit;
      localStorage.setItem('cuaca_unit', unit);
      updateUnitToggleUI();
      if (state.weatherData) {
        renderWeather(state.weatherData);
      }
    }
  });

  // Search input typing with debounce
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) {
      searchClearBtn.classList.add('visible');
    } else {
      searchClearBtn.classList.remove('visible');
      closeSuggestions();
      return;
    }

    clearTimeout(state.searchDebounceTimer);
    if (query.length < 2) {
      closeSuggestions();
      return;
    }

    state.searchDebounceTimer = setTimeout(() => {
      fetchCitySuggestions(query);
    }, 350);
  });

  // Clear search input
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.classList.remove('visible');
    closeSuggestions();
    searchInput.focus();
  });

  // Enter key in search input
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const firstSuggestion = suggestionsDropdown.querySelector('.suggestion-item');
      if (firstSuggestion) {
        firstSuggestion.click();
      } else if (searchInput.value.trim().length >= 2) {
        fetchCitySuggestions(searchInput.value.trim(), true);
      }
    }
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
      closeSuggestions();
    }
  });

  // Quick city chip clicks
  quickChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const cityName = chip.dataset.city;
    
    // Highlight active chip
    quickChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    searchCityByName(cityName);
  });

  // Geolocation button
  btnGeolocation.addEventListener('click', handleGeolocation);

  // Refresh button
  btnRefresh.addEventListener('click', () => {
    btnRefresh.classList.add('spinning');
    fetchWeatherData(state.coords.lat, state.coords.lon, state.currentCity).finally(() => {
      setTimeout(() => btnRefresh.classList.remove('spinning'), 600);
    });
  });

  // Hourly forecast horizontal scroll buttons
  btnScrollLeft.addEventListener('click', () => {
    hourlyContainer.scrollBy({ left: -260, behavior: 'smooth' });
  });

  btnScrollRight.addEventListener('click', () => {
    hourlyContainer.scrollBy({ left: 260, behavior: 'smooth' });
  });
}

function updateUnitToggleUI() {
  unitToggle.querySelectorAll('.unit-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === state.unit);
  });
}

/* ==========================================================================
   API Fetching
   ========================================================================== */

/**
 * Fetch weather forecast from Open-Meteo API
 */
async function fetchWeatherData(lat, lon, cityName) {
  setLoading(true);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,uv_index&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    state.weatherData = data;
    state.coords = { lat, lon };
    if (cityName) state.currentCity = cityName;

    // Cache last successful location
    localStorage.setItem('cuaca_last_city', state.currentCity);
    localStorage.setItem('cuaca_last_lat', lat.toString());
    localStorage.setItem('cuaca_last_lon', lon.toString());

    renderWeather(data);
    showToast(`Cuaca untuk ${state.currentCity} berhasil dimuat`, 'success');
  } catch (error) {
    console.warn('Gagal memuat cuaca dari API, beralih ke data fallback:', error);
    state.weatherData = FALLBACK_WEATHER;
    renderWeather(FALLBACK_WEATHER);
    showToast('Mode offline: Memuat data cuaca contoh lokal', 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Autocomplete city search using Open-Meteo Geocoding
 */
async function fetchCitySuggestions(query, autoSelectFirst = false) {
  searchSpinner.classList.add('active');
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=id&format=json`;
    const response = await fetch(url);
    const data = await response.json();

    if (autoSelectFirst && data.results && data.results.length > 0) {
      const first = data.results[0];
      selectCity(first);
      return;
    }

    renderSuggestions(data.results || []);
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    closeSuggestions();
  } finally {
    searchSpinner.classList.remove('active');
  }
}

/**
 * Render suggestion items in the dropdown
 */
function renderSuggestions(results) {
  suggestionsDropdown.innerHTML = '';
  
  if (results.length === 0) {
    suggestionsDropdown.innerHTML = `<div class="suggestion-empty">Kota tidak ditemukan. Coba nama lain.</div>`;
    suggestionsDropdown.classList.add('open');
    return;
  }

  results.forEach(item => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    
    const adminStr = [item.admin1, item.country].filter(Boolean).join(', ');
    div.innerHTML = `
      <div class="suggestion-info">
        <span class="suggestion-city">${item.name}</span>
        <span class="suggestion-country">${adminStr || 'Wilayah Internasional'}</span>
      </div>
      <span class="suggestion-tag">${item.country_code || 'GLOBAL'}</span>
    `;

    div.addEventListener('click', () => {
      selectCity(item);
    });

    suggestionsDropdown.appendChild(div);
  });

  suggestionsDropdown.classList.add('open');
}

function closeSuggestions() {
  suggestionsDropdown.classList.remove('open');
  suggestionsDropdown.innerHTML = '';
}

function selectCity(item) {
  const cityName = `${item.name}${item.country ? ', ' + item.country : ''}`;
  state.currentCity = cityName;
  searchInput.value = item.name;
  searchClearBtn.classList.add('visible');
  closeSuggestions();
  fetchWeatherData(item.latitude, item.longitude, cityName);
}

function searchCityByName(name) {
  searchInput.value = name;
  searchClearBtn.classList.add('visible');
  fetchCitySuggestions(name, true);
}

/**
 * Handle GPS Geolocation
 */
function handleGeolocation() {
  if (!navigator.geolocation) {
    showToast('Geolokasi tidak didukung oleh browser Anda', 'error');
    return;
  }

  showToast('Mendeteksi lokasi Anda...', 'success');
  btnGeolocation.classList.add('spinning');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      // Reverse geocoding to obtain human readable city name
      let detectedName = 'Lokasi Saya';
      try {
        const revUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`;
        const res = await fetch(revUrl);
        if (res.ok) {
          const revData = await res.json();
          detectedName = `${revData.city || revData.locality || revData.principalSubdivision || 'Lokasi Saya'}, ${revData.countryName || 'Indonesia'}`;
        }
      } catch (e) {
        console.warn('Reverse geocode gagal:', e);
      }

      state.currentCity = detectedName;
      btnGeolocation.classList.remove('spinning');
      fetchWeatherData(lat, lon, detectedName);
    },
    (err) => {
      btnGeolocation.classList.remove('spinning');
      let msg = 'Gagal mengakses GPS.';
      if (err.code === 1) msg = 'Izin lokasi ditolak oleh pengguna.';
      else if (err.code === 2) msg = 'Posisi tidak dapat ditentukan.';
      else if (err.code === 3) msg = 'Waktu permintaan lokasi habis.';
      showToast(msg, 'error');
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

/* ==========================================================================
   Weather UI Rendering
   ========================================================================== */
function renderWeather(data) {
  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;
  const isDay = current.is_day === 1;

  // Weather definition
  const wmo = WMO_MAP[current.weather_code] || { label: 'Cerah Berawan', icon: 'cloud-sun', iconNight: 'cloud-moon', group: 'clouds' };
  const iconName = isDay ? wmo.icon : wmo.iconNight;

  // Update Dynamic Body Theme
  updateTheme(wmo.group, isDay);

  // Update Location & Time
  locationNameEl.textContent = state.currentCity;
  currentDateTimeEl.textContent = formatDateTime(current.time, data.timezone_abbreviation);

  // Condition Badge
  conditionTextEl.textContent = wmo.label;

  // Temperature
  currentTempEl.textContent = formatTemp(current.temperature_2m, false);
  tempUnitDisplayEl.textContent = state.unit === 'c' ? '°C' : '°F';

  // Hero Icon
  heroWeatherIconEl.innerHTML = `<i data-lucide="${iconName}" class="animated-icon"></i>`;

  // Sub-stats (feels like, range, precipitation)
  feelsLikeTempEl.textContent = formatTemp(current.apparent_temperature);
  
  const todayMax = daily && daily.temperature_2m_max ? daily.temperature_2m_max[0] : current.temperature_2m;
  const todayMin = daily && daily.temperature_2m_min ? daily.temperature_2m_min[0] : current.temperature_2m - 5;
  tempRangeEl.textContent = `${formatTemp(todayMin)} / ${formatTemp(todayMax)}`;

  precipitationAmtEl.textContent = `${current.precipitation !== undefined ? current.precipitation.toFixed(1) : '0.0'} mm`;

  // Highlights Grid
  windSpeedEl.textContent = Math.round(current.wind_speed_10m || 0);
  windDirectionEl.textContent = `Arah: ${getWindDirectionLabel(current.wind_direction_10m)} (${Math.round(current.wind_direction_10m || 0)}°)`;

  humidityEl.textContent = Math.round(current.relative_humidity_2m || 0);
  humidityBarEl.style.width = `${Math.min(100, Math.max(0, current.relative_humidity_2m))}%`;
  humidityStatusEl.textContent = getHumidityDescription(current.relative_humidity_2m);

  const uvVal = current.uv_index !== undefined ? current.uv_index : (daily.uv_index_max ? daily.uv_index_max[0] : 0);
  renderUV(uvVal);

  airPressureEl.textContent = Math.round(current.surface_pressure || 1013);
  pressureStatusEl.textContent = getPressureStatus(current.surface_pressure);

  if (daily && daily.sunrise && daily.sunset) {
    sunriseTimeEl.textContent = formatTimeOnly(daily.sunrise[0]);
    sunsetTimeEl.textContent = formatTimeOnly(daily.sunset[0]);
  }

  // Dynamic Weather Tip
  weatherTipTextEl.textContent = generateWeatherTip(current, wmo.group);

  // Hourly & Daily Forecasts
  renderHourlyForecast(hourly, current.time);
  renderDailyForecast(daily);

  // Refresh Lucide Icons in newly inserted DOM elements
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Dynamic theme based on condition group and day/night
 */
function updateTheme(group, isDay) {
  document.body.className = '';
  let themeClass = 'theme-clouds-day';

  if (group === 'clear') {
    themeClass = isDay ? 'theme-clear-day' : 'theme-clear-night';
  } else if (group === 'clouds' || group === 'fog') {
    themeClass = isDay ? 'theme-clouds-day' : 'theme-clouds-night';
  } else if (group === 'rain' || group === 'drizzle') {
    themeClass = isDay ? 'theme-rain-day' : 'theme-rain-night';
  } else if (group === 'thunderstorm') {
    themeClass = 'theme-thunderstorm';
  } else if (group === 'snow') {
    themeClass = 'theme-snow';
  }

  document.body.classList.add(themeClass);
  renderParticles(group, isDay);
}

/**
 * Animated background particles: rain drops or night stars
 */
function renderParticles(group, isDay) {
  weatherParticlesContainer.innerHTML = '';

  if (group === 'rain' || group === 'drizzle' || group === 'thunderstorm') {
    const dropsCount = group === 'thunderstorm' ? 35 : 20;
    for (let i = 0; i < dropsCount; i++) {
      const drop = document.createElement('div');
      drop.className = 'raindrop';
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.top = `-${Math.random() * 20}%`;
      drop.style.animationDuration = `${0.6 + Math.random() * 0.7}s`;
      drop.style.animationDelay = `${Math.random() * 2}s`;
      drop.style.opacity = `${0.4 + Math.random() * 0.5}`;
      weatherParticlesContainer.appendChild(drop);
    }
  } else if (!isDay && (group === 'clear' || group === 'clouds')) {
    for (let i = 0; i < 25; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 60}%`;
      const size = 1.5 + Math.random() * 2.5;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.animationDuration = `${2 + Math.random() * 3}s`;
      star.style.animationDelay = `${Math.random() * 3}s`;
      weatherParticlesContainer.appendChild(star);
    }
  }
}

/**
 * UV index styling and description
 */
function renderUV(uv) {
  const num = typeof uv === 'number' ? uv : 0;
  uvIndexEl.textContent = num.toFixed(1);
  uvBarEl.style.width = `${Math.min(100, (num / 11) * 100)}%`;

  if (num <= 2) {
    uvBadgeEl.textContent = 'Rendah';
    uvAdviceEl.textContent = 'Aman untuk beraktivitas di luar.';
  } else if (num <= 5) {
    uvBadgeEl.textContent = 'Sedang';
    uvAdviceEl.textContent = 'Gunakan topi atau kacamata hitam bila terik.';
  } else if (num <= 7) {
    uvBadgeEl.textContent = 'Tinggi';
    uvAdviceEl.textContent = 'Gunakan tabir surya SPF 30+ di luar.';
  } else if (num <= 10) {
    uvBadgeEl.textContent = 'Sangat Tinggi';
    uvAdviceEl.textContent = 'Kurangi paparan matahari terik siang hari.';
  } else {
    uvBadgeEl.textContent = 'Ekstrem';
    uvAdviceEl.textContent = 'Wajib pelindung penuh saat berada di luar!';
  }
}

/**
 * Render 24-hour forecast cards
 */
function renderHourlyForecast(hourly, currentTimeStr) {
  hourlyContainer.innerHTML = '';
  if (!hourly || !hourly.time) return;

  const currentHourPrefix = currentTimeStr ? currentTimeStr.slice(0, 13) : '';
  let startIndex = hourly.time.findIndex(item => item.slice(0, 13) >= currentHourPrefix);
  if (startIndex === -1) startIndex = 0;

  const hoursToShow = 24;
  for (let i = startIndex; i < Math.min(hourly.time.length, startIndex + hoursToShow); i++) {
    const timeStr = hourly.time[i];
    const isCurrent = i === startIndex;
    const hourNumber = parseInt(timeStr.slice(11, 13), 10) || 0;
    const isDayHour = hourNumber >= 6 && hourNumber < 18;

    const weatherCode = hourly.weather_code[i];
    const wmo = WMO_MAP[weatherCode] || { icon: 'cloud-sun', iconNight: 'cloud-moon' };
    const iconName = isDayHour ? wmo.icon : wmo.iconNight;
    const tempVal = hourly.temperature_2m[i];

    const card = document.createElement('div');
    card.className = `hourly-card ${isCurrent ? 'active-hour' : ''}`;
    
    const timeLabel = isCurrent ? 'Sekarang' : `${String(hourNumber).padStart(2, '0')}:00`;

    card.innerHTML = `
      <span class="hourly-time">${timeLabel}</span>
      <div class="hourly-icon">
        <i data-lucide="${iconName}"></i>
      </div>
      <span class="hourly-temp">${formatTemp(tempVal)}</span>
      ${weatherCode >= 51 ? `<span class="hourly-pop"><i data-lucide="cloud-rain" style="width:12px;height:12px;"></i> Hujan</span>` : ''}
    `;

    hourlyContainer.appendChild(card);
  }
}

/**
 * Render 7-day daily forecast list
 */
function renderDailyForecast(daily) {
  dailyListContainer.innerHTML = '';
  if (!daily || !daily.time) return;

  // Calculate overall min/max for scale bar
  const allMins = daily.temperature_2m_min;
  const allMaxs = daily.temperature_2m_max;
  const absoluteMin = Math.min(...allMins);
  const absoluteMax = Math.max(...allMaxs);
  const range = (absoluteMax - absoluteMin) || 1;

  for (let i = 0; i < daily.time.length; i++) {
    const dateObj = new Date(daily.time[i]);
    const dayIndex = dateObj.getDay();
    const dateNum = dateObj.getDate();
    const monthShort = MONTHS_SHORT_ID[dateObj.getMonth()];

    let dayLabel = DAYS_ID[dayIndex];
    if (i === 0) dayLabel = 'Hari Ini';
    else if (i === 1) dayLabel = 'Besok';

    const code = daily.weather_code[i];
    const wmo = WMO_MAP[code] || { label: 'Berawan', icon: 'cloud-sun' };
    const minT = daily.temperature_2m_min[i];
    const maxT = daily.temperature_2m_max[i];

    // Bar percentage relative positioning
    const leftPercent = Math.max(0, ((minT - absoluteMin) / range) * 100);
    const widthPercent = Math.min(100 - leftPercent, ((maxT - minT) / range) * 100);

    const row = document.createElement('div');
    row.className = 'daily-row';
    row.innerHTML = `
      <div>
        <span class="daily-day">${dayLabel}</span>
        <span class="daily-date">${dateNum} ${monthShort}</span>
      </div>
      
      <div class="daily-condition">
        <div class="daily-icon">
          <i data-lucide="${wmo.icon}"></i>
        </div>
        <span class="daily-desc">${wmo.label}</span>
      </div>

      <div class="daily-temp-bar-container">
        <span class="daily-temp-min">${formatTemp(minT, false)}°</span>
        <div class="daily-bar-track">
          <div class="daily-bar-fill" style="left: ${leftPercent}%; width: ${Math.max(12, widthPercent)}%;"></div>
        </div>
        <span class="daily-temp-max">${formatTemp(maxT, false)}°</span>
      </div>

      <div class="daily-rain-prob">
        ${code >= 51 ? `<i data-lucide="cloud-rain" style="width:14px;height:14px;"></i> Hujan` : `<span style="color:var(--text-muted);">Cerah</span>`}
      </div>
    `;

    dailyListContainer.appendChild(row);
  }
}

/* ==========================================================================
   Utility Functions
   ========================================================================== */

/**
 * Format temperature to Celsius or Fahrenheit
 */
function formatTemp(celsiusVal, includeUnit = true) {
  if (celsiusVal === undefined || celsiusVal === null) return '--';
  let val = celsiusVal;
  if (state.unit === 'f') {
    val = (celsiusVal * 9) / 5 + 32;
  }
  const rounded = Math.round(val);
  return includeUnit ? `${rounded}°${state.unit.toUpperCase()}` : `${rounded}`;
}

/**
 * Format ISO datetime to Indonesian readable string
 */
function formatDateTime(isoString, tzAbbr) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const dayName = DAYS_ID[date.getDay()];
  const dateNum = date.getDate();
  const monthName = MONTHS_ID[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const tzLabel = tzAbbr || 'WIB';

  return `${dayName}, ${dateNum} ${monthName} ${year} • ${hours}:${minutes} ${tzLabel}`;
}

function formatTimeOnly(isoString) {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Wind compass conversion (Indonesian)
 */
function getWindDirectionLabel(deg) {
  if (deg === undefined || deg === null) return 'U';
  const directions = [
    'Utara', 'Timur Laut', 'Timur', 'Tenggara', 
    'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'
  ];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

function getHumidityDescription(humidity) {
  if (humidity < 40) return 'Udara relatif kering';
  if (humidity <= 70) return 'Tingkat kelembapan ideal';
  if (humidity <= 85) return 'Cukup lembap';
  return 'Sangat lembap & gerah';
}

function getPressureStatus(pressure) {
  if (!pressure) return 'Normal';
  if (pressure > 1015) return 'Tekanan tinggi (Stabil)';
  if (pressure < 1005) return 'Tekanan rendah (Potensi hujan)';
  return 'Normal dan stabil';
}

/**
 * Contextual Weather Tips in Indonesian
 */
function generateWeatherTip(current, group) {
  const temp = current.temperature_2m;
  const isDay = current.is_day === 1;

  if (group === 'thunderstorm') {
    return '⚡ Peringatan Cuaca: Ada potensi badai petir. Hindari area terbuka dan berteduh di tempat yang aman.';
  }
  if (group === 'rain' || group === 'drizzle') {
    return '🌧️ Jangan lupa bawa payung atau jas hujan saat bepergian. Jalanan berpotensi licin.';
  }
  if (temp >= 33) {
    return '☀️ Suhu cukup terik di luar ruangan. Perbanyak minum air putih dan gunakan tabir surya agar terhindar dari dehidrasi.';
  }
  if (temp <= 22) {
    return '🧥 Suhu terasa sejuk. Disarankan memakai jaket atau pakaian hangat saat berkendara malam hari.';
  }
  if (group === 'clear' && isDay) {
    return '🌤️ Langit cerah dan bersahabat. Waktu yang pas untuk beraktivitas di luar ruangan atau mencuci pakaian!';
  }
  return '✨ Kondisi cuaca secara umum cukup kondusif untuk rutinitas harian Anda.';
}

/**
 * Toast notifications
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconHtml = '<i data-lucide="info"></i>';
  if (type === 'success') iconHtml = '<i data-lucide="check-circle" style="color:#10b981;"></i>';
  if (type === 'error') iconHtml = '<i data-lucide="alert-triangle" style="color:#ef4444;"></i>';

  toast.innerHTML = `${iconHtml}<span>${message}</span>`;
  toastContainer.appendChild(toast);

  if (window.lucide) {
    window.lucide.createIcons();
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Loading state toggling
 */
function setLoading(isLoading) {
  if (isLoading) {
    skeletonLayout.classList.add('active');
    dashboardContent.classList.add('hidden');
  } else {
    skeletonLayout.classList.remove('active');
    dashboardContent.classList.remove('hidden');
  }
}
