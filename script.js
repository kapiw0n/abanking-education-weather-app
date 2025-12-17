const APP_CONFIG = {
    weatherApiBaseUrl: 'https://api.open-meteo.com/v1/forecast',
    defaultCoordinates: { latitude: 55.7558, longitude: 37.6173 },
    maxWidgets: 10,
    mapZoom: 0.01
};

const APP_STATE = {
    weatherWidgets: [],
    currentMapCenter: null
};

const DOM_ELEMENTS = {
    latitudeInput: document.getElementById('latitudeInput'),
    longitudeInput: document.getElementById('longitudeInput'),
    addWeatherWidgetBtn: document.getElementById('addWeatherWidgetBtn'),
    widgetsContainer: document.getElementById('widgetsContainer'),
    mapSection: document.getElementById('mapSection'),
    mapContainer: document.getElementById('map'),
    validationError: document.getElementById('validationError')
};

function validateCoordinates(latitude, longitude) {
    const errors = [];

    if (latitude.trim() === '' || longitude.trim() === '') {
        errors.push('Введите координаты');
        return { isValid: false, errors, coordinates: null };
    }

    const processedLatitude = latitude.trim().replace(/,/g, '.');
    const processedLongitude = longitude.trim().replace(/,/g, '.');

    const numberRegex = /^-?\d+(\.\d+)?$/;

    if (!numberRegex.test(processedLatitude)) {
        errors.push('Широта должна быть числом');
    }

    if (!numberRegex.test(processedLongitude)) {
        errors.push('Долгота должна быть числом');
    }

    if (errors.length > 0) {
        return { isValid: false, errors, coordinates: null };
    }

    const lat = parseFloat(processedLatitude);
    const lon = parseFloat(processedLongitude);

    if (lat < -90 || lat > 90) {
        errors.push('Широта должна быть в диапазоне от -90 до 90');
    }

    if (lon < -180 || lon > 180) {
        errors.push('Долгота должна быть в диапазоне от -180 до 180');
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
        coordinates: { latitude: lat, longitude: lon }
    };
}

function showValidationError(message) {
    DOM_ELEMENTS.validationError.textContent = message;
    DOM_ELEMENTS.validationError.style.display = 'block';
    setTimeout(() => {
        DOM_ELEMENTS.validationError.style.display = 'none';
    }, 5000);
}

async function fetchWeatherData(latitude, longitude) {
    try {
        const apiUrl = `${APP_CONFIG.weatherApiBaseUrl}?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка при получении данных о погоде:', error);
        throw new Error('Не удалось получить данные о погоде. Проверьте координаты и попробуйте снова.');
    }
}

function processWeatherData(weatherData, coordinates) {
    const currentWeather = weatherData.current_weather;
    
    return {
        coordinates: coordinates,
        temperature: currentWeather.temperature,
        windSpeed: currentWeather.windspeed,
        windDirection: getWindDirection(currentWeather.winddirection),
        weatherCode: currentWeather.weathercode,
        weatherDescription: getWeatherDescription(currentWeather.weathercode),
        time: new Date(currentWeather.time).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        }),
        timezone: weatherData.timezone,
        timestamp: Date.now()
    };
}

function getWindDirection(degrees) {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

function getWeatherDescription(weatherCode) {
    const weatherCodes = {
        0: 'Ясно', 1: 'Преимущественно ясно', 2: 'Переменная облачность', 3: 'Пасмурно',
        45: 'Туман', 48: 'Туман с изморозью', 51: 'Легкая морось', 53: 'Умеренная морось',
        55: 'Сильная морось', 56: 'Легкая ледяная морось', 57: 'Сильная ледяная морось',
        61: 'Небольшой дождь', 63: 'Умеренный дождь', 65: 'Сильный дождь',
        66: 'Ледяной дождь', 67: 'Сильный ледяной дождь', 71: 'Небольшой снег',
        73: 'Умеренный снег', 75: 'Сильный снег', 77: 'Снежные зерна',
        80: 'Небольшие ливни', 81: 'Умеренные ливни', 82: 'Сильные ливни',
        85: 'Небольшой снегопад', 86: 'Сильный снегопад', 95: 'Гроза',
        96: 'Гроза с небольшим градом', 99: 'Гроза с сильным градом'
    };
    
    return weatherCodes[weatherCode] || 'Неизвестно';
}

function getWeatherIcon(weatherCode) {
    const iconMap = {
        0: '☀️', 1: '⛅', 2: '🌤️', 3: '☁️', 45: '🌫️', 48: '🌫️',
        51: '🌧️', 53: '🌧️', 55: '🌧️', 56: '🌧️❄️', 57: '🌧️❄️',
        61: '🌦️', 63: '🌧️', 65: '🌧️', 66: '🌧️❄️', 67: '🌧️❄️',
        71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️', 80: '🌦️',
        81: '🌧️', 82: '🌧️', 85: '🌨️', 86: '🌨️', 95: '⛈️',
        96: '⛈️🌨️', 99: '⛈️🌨️'
    };
    
    return iconMap[weatherCode] || '🌡️';
}

function createWeatherWidgetHTML(weatherData) {
    const widgetId = `widget-${Date.now()}`;
    const icon = getWeatherIcon(weatherData.weatherCode);
    
    return `
        <div class="weather-widget" id="${widgetId}" data-lat="${weatherData.coordinates.latitude}" data-lon="${weatherData.coordinates.longitude}">
            <div class="widget-header">
                <h3>${icon} Погода</h3>
                <button class="close-btn" onclick="removeWeatherWidget('${widgetId}')">×</button>
            </div>
            
            <div class="widget-content">
                <div class="coordinates-info">
                    <div class="coordinate-display">
                        <span class="coord-label">Широта:</span>
                        <span class="coord-value">${weatherData.coordinates.latitude.toFixed(4)}°</span>
                    </div>
                    <div class="coordinate-display">
                        <span class="coord-label">Долгота:</span>
                        <span class="coord-value">${weatherData.coordinates.longitude.toFixed(4)}°</span>
                    </div>
                </div>
                
                <div class="weather-main">
                    <div class="temperature-display">
                        <span class="temp-value">${weatherData.temperature}°C</span>
                    </div>
                    
                    <div class="weather-description">
                        ${weatherData.weatherDescription}
                    </div>
                </div>
                
                <div class="weather-details">
                    <div class="detail-row">
                        <span class="detail-label">Ветер:</span>
                        <span class="detail-value">${weatherData.windSpeed} км/ч, ${weatherData.windDirection}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Местное время:</span>
                        <span class="detail-value">${weatherData.time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Часовой пояс:</span>
                        <span class="detail-value">${weatherData.timezone}</span>
                    </div>
                </div>
                
                <div class="widget-actions">
                    <button class="action-btn" onclick="centerMapOnWidget('${widgetId}')">
                        Показать на карте
                    </button>
                    <button class="action-btn" onclick="refreshWeatherWidget('${widgetId}')">
                        Обновить
                    </button>
                </div>
            </div>
        </div>
    `;
}

function updateMapDisplay() {
    if (APP_STATE.weatherWidgets.length === 0) {
        DOM_ELEMENTS.mapContainer.innerHTML = `
            <div class="map-placeholder">
                <p>Добавьте виджеты погоды для отображения на карте</p>
            </div>
        `;
        return;
    }

    let centerLat = APP_CONFIG.defaultCoordinates.latitude;
    let centerLon = APP_CONFIG.defaultCoordinates.longitude;

    if (APP_STATE.currentMapCenter) {
        centerLat = APP_STATE.currentMapCenter.latitude;
        centerLon = APP_STATE.currentMapCenter.longitude;
    } else if (APP_STATE.weatherWidgets.length > 0) {
        const lastWidget = APP_STATE.weatherWidgets[APP_STATE.weatherWidgets.length - 1];
        centerLat = lastWidget.data.coordinates.latitude;
        centerLon = lastWidget.data.coordinates.longitude;
    }
    
    const bboxLonMin = centerLon - APP_CONFIG.mapZoom;
    const bboxLatMin = centerLat - APP_CONFIG.mapZoom;
    const bboxLonMax = centerLon + APP_CONFIG.mapZoom;
    const bboxLatMax = centerLat + APP_CONFIG.mapZoom;
    
    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bboxLonMin}%2C${bboxLatMin}%2C${bboxLonMax}%2C${bboxLatMax}&layer=mapnik&marker=${centerLat}%2C${centerLon}`;
    
    DOM_ELEMENTS.mapContainer.innerHTML = `
        <iframe 
            id="osmMapFrame"
            class="osm-map-frame"
            src="${mapUrl}"
            frameborder="0"
            scrolling="no"
            style="width: 100%; height: 400px; border: none;"
            title="OpenStreetMap карта"
        ></iframe>
    `;
}

function updateMapMarkers() {
    updateMapDisplay();
}

async function addWeatherWidget(latitude, longitude) {
    try {
        if (APP_STATE.weatherWidgets.length >= APP_CONFIG.maxWidgets) {
            showValidationError(`Максимальное количество виджетов: ${APP_CONFIG.maxWidgets}`);
            return;
        }
        
        const weatherData = await fetchWeatherData(latitude, longitude);
        const processedData = processWeatherData(weatherData, { latitude, longitude });
        
        const widgetId = `widget-${Date.now()}`;
        const widgetHTML = createWeatherWidgetHTML(processedData);
        
        APP_STATE.weatherWidgets.push({
            id: widgetId,
            data: processedData,
            element: null
        });
        
        DOM_ELEMENTS.widgetsContainer.insertAdjacentHTML('afterbegin', widgetHTML);
        const widgetElement = document.getElementById(widgetId);
        APP_STATE.weatherWidgets[APP_STATE.weatherWidgets.length - 1].element = widgetElement;
        
        updateMapMarkers();
        saveWidgetsToStorage();
        
        DOM_ELEMENTS.mapSection.style.display = 'block';
        
        DOM_ELEMENTS.latitudeInput.value = '';
        DOM_ELEMENTS.longitudeInput.value = '';
        
        return widgetId;
    } catch (error) {
        showValidationError(error.message);
        throw error;
    }
}

function removeWeatherWidget(widgetId) {
    const widgetElement = document.getElementById(widgetId);
    if (widgetElement) {
        widgetElement.remove();
    }
    
    APP_STATE.weatherWidgets = APP_STATE.weatherWidgets.filter(widget => widget.id !== widgetId);
    
    updateMapMarkers();
    saveWidgetsToStorage();
    
    if (APP_STATE.weatherWidgets.length === 0) {
        DOM_ELEMENTS.mapSection.style.display = 'none';
    }
}

async function refreshWeatherWidget(widgetId) {
    const widgetIndex = APP_STATE.weatherWidgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return;
    
    const widget = APP_STATE.weatherWidgets[widgetIndex];
    const { latitude, longitude } = widget.data.coordinates;
    
    try {
        const weatherData = await fetchWeatherData(latitude, longitude);
        const processedData = processWeatherData(weatherData, { latitude, longitude });
        
        APP_STATE.weatherWidgets[widgetIndex].data = processedData;
        
        const newWidgetHTML = createWeatherWidgetHTML(processedData);
        widget.element.outerHTML = newWidgetHTML;
        
        APP_STATE.weatherWidgets[widgetIndex].element = document.getElementById(widgetId);
        
        saveWidgetsToStorage();
    } catch (error) {
        showValidationError(`Ошибка обновления: ${error.message}`);
    }
}

function centerMapOnWidget(widgetId) {
    const widget = APP_STATE.weatherWidgets.find(w => w.id === widgetId);
    if (!widget) return;
    
    const { latitude, longitude } = widget.data.coordinates;
    APP_STATE.currentMapCenter = { latitude, longitude };
    updateMapDisplay();
}

function saveWidgetsToStorage() {
    const widgetsData = APP_STATE.weatherWidgets.map(widget => ({
        coordinates: widget.data.coordinates,
        timestamp: widget.data.timestamp
    }));
    
    localStorage.setItem('weatherWidgets', JSON.stringify(widgetsData));
}

function loadWidgetsFromStorage() {
    try {
        const savedWidgets = localStorage.getItem('weatherWidgets');
        if (savedWidgets) {
            const widgetsData = JSON.parse(savedWidgets);
            
            widgetsData.slice(0, APP_CONFIG.maxWidgets).forEach(async widgetData => {
                try {
                    await addWeatherWidget(
                        widgetData.coordinates.latitude,
                        widgetData.coordinates.longitude
                    );
                } catch (error) {
                    console.error('Ошибка загрузки виджета:', error);
                }
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки из localStorage:', error);
    }
}

function setupEventListeners() {
    DOM_ELEMENTS.addWeatherWidgetBtn.addEventListener('click', handleAddWidget);
    
    DOM_ELEMENTS.latitudeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddWidget();
    });
    
    DOM_ELEMENTS.longitudeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddWidget();
    });
}

async function handleAddWidget() {
    const latitude = DOM_ELEMENTS.latitudeInput.value.trim();
    const longitude = DOM_ELEMENTS.longitudeInput.value.trim();
    
    const validation = validateCoordinates(latitude, longitude);
    if (!validation.isValid) {
        showValidationError(validation.errors.join(', '));
        return;
    }
    
    try {
        await addWeatherWidget(
            validation.coordinates.latitude,
            validation.coordinates.longitude
        );
    } catch (error) {
    }
}

window.removeWeatherWidget = removeWeatherWidget;
window.refreshWeatherWidget = refreshWeatherWidget;
window.centerMapOnWidget = centerMapOnWidget;

function initApp() {
    setupEventListeners();
    loadWidgetsFromStorage();
    
    DOM_ELEMENTS.latitudeInput.placeholder = APP_CONFIG.defaultCoordinates.latitude.toString();
    DOM_ELEMENTS.longitudeInput.placeholder = APP_CONFIG.defaultCoordinates.longitude.toString();
    
    if (APP_STATE.weatherWidgets.length === 0) {
        DOM_ELEMENTS.mapSection.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', initApp);