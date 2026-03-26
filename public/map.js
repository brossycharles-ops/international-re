// ===== Interactive Travel Map =====
const mapContainer = document.getElementById('worldMap');
if (mapContainer) {
  const map = L.map('worldMap', {
    center: [30, -20],
    zoom: 2,
    minZoom: 2,
    maxZoom: 6,
    scrollWheelZoom: false,
    attributionControl: false,
    zoomControl: true
  });

  // Clean, dark tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: ''
  }).addTo(map);

  // Add labels on top
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
    attribution: '',
    pane: 'overlayPane'
  }).addTo(map);

  // Country data with coordinates and regions
  const visited = [
    { name: 'USA', lat: 39.8, lng: -98.5, region: 'Americas' },
    { name: 'Canada', lat: 56.1, lng: -106.3, region: 'Americas' },
    { name: 'Mexico', lat: 23.6, lng: -102.5, region: 'Americas' },
    { name: 'Belize', lat: 17.2, lng: -88.5, region: 'Americas' },
    { name: 'Costa Rica', lat: 9.7, lng: -83.7, region: 'Americas' },
    { name: 'El Salvador', lat: 13.7, lng: -88.9, region: 'Americas' },
    { name: 'Nicaragua', lat: 12.9, lng: -85.2, region: 'Americas' },
    { name: 'Panama', lat: 8.5, lng: -80.8, region: 'Americas' },
    { name: 'Bahamas', lat: 25.0, lng: -77.4, region: 'Americas' },
    { name: 'Chile', lat: -35.7, lng: -71.5, region: 'Americas' },
    { name: 'Peru', lat: -9.2, lng: -75.0, region: 'Americas' },
    { name: 'Jordan', lat: 30.6, lng: 36.2, region: 'Middle East' },
    { name: 'Albania', lat: 41.2, lng: 20.2, region: 'Europe' },
    { name: 'Austria', lat: 47.5, lng: 14.6, region: 'Europe' },
    { name: 'Belgium', lat: 50.8, lng: 4.5, region: 'Europe' },
    { name: 'Czech Republic', lat: 49.8, lng: 15.5, region: 'Europe' },
    { name: 'Denmark', lat: 56.3, lng: 9.5, region: 'Europe' },
    { name: 'France', lat: 46.6, lng: 2.2, region: 'Europe' },
    { name: 'Germany', lat: 51.2, lng: 10.4, region: 'Europe' },
    { name: 'Hungary', lat: 47.2, lng: 19.5, region: 'Europe' },
    { name: 'Iceland', lat: 64.9, lng: -19.0, region: 'Europe' },
    { name: 'Ireland', lat: 53.1, lng: -7.7, region: 'Europe' },
    { name: 'Italy', lat: 41.9, lng: 12.6, region: 'Europe' },
    { name: 'Luxembourg', lat: 49.8, lng: 6.1, region: 'Europe' },
    { name: 'Netherlands', lat: 52.1, lng: 5.3, region: 'Europe' },
    { name: 'Norway', lat: 60.5, lng: 8.5, region: 'Europe' },
    { name: 'Portugal', lat: 39.4, lng: -8.2, region: 'Europe' },
    { name: 'Spain', lat: 40.5, lng: -3.7, region: 'Europe' },
    { name: 'Sweden', lat: 60.1, lng: 18.6, region: 'Europe' },
    { name: 'Switzerland', lat: 46.8, lng: 8.2, region: 'Europe' },
    { name: 'United Kingdom', lat: 55.4, lng: -3.4, region: 'Europe' }
  ];

  const planned = [
    { name: 'Guatemala', lat: 15.8, lng: -90.2, region: 'Americas' },
    { name: 'Madagascar', lat: -18.8, lng: 46.9, region: 'Africa' },
    { name: 'Brazil', lat: -14.2, lng: -51.9, region: 'Americas' },
    { name: 'Colombia', lat: 4.6, lng: -74.3, region: 'Americas' },
    { name: 'Romania', lat: 45.9, lng: 24.9, region: 'Europe' },
    { name: 'Syria', lat: 34.8, lng: 38.9, region: 'Middle East' }
  ];

  // Larger, more visible custom markers
  function createVisitedIcon(name) {
    return L.divIcon({
      className: 'map-marker-wrapper',
      html: `<div class="map-pin visited-pin">
               <div class="pin-inner"></div>
             </div>
             <div class="map-label">${name}</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }

  function createPlannedIcon(name) {
    return L.divIcon({
      className: 'map-marker-wrapper',
      html: `<div class="map-pin planned-pin">
               <div class="pin-inner"></div>
             </div>
             <div class="map-label planned-label">${name}</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }

  // Add visited markers
  visited.forEach(country => {
    L.marker([country.lat, country.lng], { icon: createVisitedIcon(country.name) })
      .addTo(map)
      .bindPopup(`
        <div style="text-align:center;padding:4px 8px;">
          <strong style="font-size:14px;">${country.name}</strong><br>
          <span style="color:#c9a54e;font-size:12px;">&#10003; Visited</span><br>
          <span style="color:#888;font-size:11px;">${country.region}</span>
        </div>
      `);
  });

  // Add planned markers
  planned.forEach(country => {
    L.marker([country.lat, country.lng], { icon: createPlannedIcon(country.name) })
      .addTo(map)
      .bindPopup(`
        <div style="text-align:center;padding:4px 8px;">
          <strong style="font-size:14px;">${country.name}</strong><br>
          <span style="color:#e74c3c;font-size:12px;">&#9733; On the List</span><br>
          <span style="color:#888;font-size:11px;">${country.region}</span>
        </div>
      `);
  });

  // Draw connection lines between visited countries (subtle)
  const americasVisited = visited.filter(c => c.region === 'Americas');
  const europeVisited = visited.filter(c => c.region === 'Europe');

  // Draw a line from Americas to Europe to Middle East to show travel reach
  const keyPoints = [
    [39.8, -98.5],   // USA
    [53.1, -7.7],    // Ireland
    [46.6, 2.2],     // France
    [41.9, 12.6],    // Italy
    [47.2, 19.5],    // Hungary
    [30.6, 36.2],    // Jordan
  ];

  L.polyline(keyPoints, {
    color: 'rgba(201, 165, 78, 0.15)',
    weight: 1.5,
    dashArray: '8, 8',
    smoothFactor: 3
  }).addTo(map);

  // Another line through Americas
  const americaRoute = [
    [56.1, -106.3],  // Canada
    [39.8, -98.5],   // USA
    [23.6, -102.5],  // Mexico
    [13.7, -88.9],   // El Salvador
    [12.9, -85.2],   // Nicaragua
    [9.7, -83.7],    // Costa Rica
    [8.5, -80.8],    // Panama
    [-9.2, -75.0],   // Peru
    [-35.7, -71.5],  // Chile
  ];

  L.polyline(americaRoute, {
    color: 'rgba(201, 165, 78, 0.15)',
    weight: 1.5,
    dashArray: '8, 8',
    smoothFactor: 3
  }).addTo(map);

  // Enable scroll zoom on click
  map.on('click', () => {
    map.scrollWheelZoom.enable();
  });

  map.on('mouseout', () => {
    map.scrollWheelZoom.disable();
  });
}
