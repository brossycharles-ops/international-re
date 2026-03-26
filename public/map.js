// ===== Interactive Travel Map =====
const mapContainer = document.getElementById('worldMap');
if (mapContainer) {
  const map = L.map('worldMap', {
    center: [20, -10],
    zoom: 2,
    minZoom: 2,
    maxZoom: 6,
    scrollWheelZoom: false,
    attributionControl: false
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: ''
  }).addTo(map);

  // Visited countries with coordinates
  const visited = [
    { name: 'USA', lat: 39.8, lng: -98.5 },
    { name: 'Canada', lat: 56.1, lng: -106.3 },
    { name: 'Mexico', lat: 23.6, lng: -102.5 },
    { name: 'Belize', lat: 17.2, lng: -88.5 },
    { name: 'Costa Rica', lat: 9.7, lng: -83.7 },
    { name: 'El Salvador', lat: 13.7, lng: -88.9 },
    { name: 'Nicaragua', lat: 12.9, lng: -85.2 },
    { name: 'Panama', lat: 8.5, lng: -80.8 },
    { name: 'Bahamas', lat: 25.0, lng: -77.4 },
    { name: 'Chile', lat: -35.7, lng: -71.5 },
    { name: 'Peru', lat: -9.2, lng: -75.0 },
    { name: 'Jordan', lat: 30.6, lng: 36.2 },
    { name: 'Albania', lat: 41.2, lng: 20.2 },
    { name: 'Austria', lat: 47.5, lng: 14.6 },
    { name: 'Belgium', lat: 50.8, lng: 4.5 },
    { name: 'Czech Republic', lat: 49.8, lng: 15.5 },
    { name: 'Denmark', lat: 56.3, lng: 9.5 },
    { name: 'France', lat: 46.6, lng: 2.2 },
    { name: 'Germany', lat: 51.2, lng: 10.4 },
    { name: 'Hungary', lat: 47.2, lng: 19.5 },
    { name: 'Iceland', lat: 64.9, lng: -19.0 },
    { name: 'Ireland', lat: 53.1, lng: -7.7 },
    { name: 'Italy', lat: 41.9, lng: 12.6 },
    { name: 'Luxembourg', lat: 49.8, lng: 6.1 },
    { name: 'Netherlands', lat: 52.1, lng: 5.3 },
    { name: 'Norway', lat: 60.5, lng: 8.5 },
    { name: 'Portugal', lat: 39.4, lng: -8.2 },
    { name: 'Spain', lat: 40.5, lng: -3.7 },
    { name: 'Sweden', lat: 60.1, lng: 18.6 },
    { name: 'Switzerland', lat: 46.8, lng: 8.2 },
    { name: 'United Kingdom', lat: 55.4, lng: -3.4 }
  ];

  // Planned countries
  const planned = [
    { name: 'Guatemala', lat: 15.8, lng: -90.2 },
    { name: 'Madagascar', lat: -18.8, lng: 46.9 },
    { name: 'Brazil', lat: -14.2, lng: -51.9 },
    { name: 'Colombia', lat: 4.6, lng: -74.3 },
    { name: 'Romania', lat: 45.9, lng: 24.9 },
    { name: 'Syria', lat: 34.8, lng: 38.9 }
  ];

  // Custom icons
  const visitedIcon = L.divIcon({
    className: 'map-marker visited-marker',
    html: '<div class="marker-dot visited-dot"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  const plannedIcon = L.divIcon({
    className: 'map-marker planned-marker',
    html: '<div class="marker-dot planned-dot"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  // Add visited markers
  visited.forEach(country => {
    L.marker([country.lat, country.lng], { icon: visitedIcon })
      .addTo(map)
      .bindPopup(`<strong>${country.name}</strong><br><span style="color:#c9a54e;">&#10003; Visited</span>`);
  });

  // Add planned markers
  planned.forEach(country => {
    L.marker([country.lat, country.lng], { icon: plannedIcon })
      .addTo(map)
      .bindPopup(`<strong>${country.name}</strong><br><span style="color:#e74c3c;">&#9733; Planned</span>`);
  });
}
