// ===== Interactive Travel Map =====
// Countries are drawn from a world outline served by this site
// (/data/world-110m.geojson, Natural Earth via world-atlas), so the map needs no
// third-party tile service. CARTO's free basemaps started requiring an API key
// and covered the old map in watermarks.
const mapContainer = document.getElementById('worldMap');
if (mapContainer && window.L) {
  // Names must match the "name" property in world-110m.geojson.
  const visited = {
    'United States of America': ['USA', 'Americas'], 'Canada': ['Canada', 'Americas'], 'Mexico': ['Mexico', 'Americas'],
    'Belize': ['Belize', 'Americas'], 'Costa Rica': ['Costa Rica', 'Americas'], 'El Salvador': ['El Salvador', 'Americas'],
    'Nicaragua': ['Nicaragua', 'Americas'], 'Panama': ['Panama', 'Americas'], 'Bahamas': ['Bahamas', 'Americas'],
    'Chile': ['Chile', 'Americas'], 'Peru': ['Peru', 'Americas'], 'Jordan': ['Jordan', 'Middle East'],
    'Albania': ['Albania', 'Europe'], 'Austria': ['Austria', 'Europe'], 'Belgium': ['Belgium', 'Europe'],
    'Czechia': ['Czech Republic', 'Europe'], 'Denmark': ['Denmark', 'Europe'], 'France': ['France', 'Europe'],
    'Germany': ['Germany', 'Europe'], 'Hungary': ['Hungary', 'Europe'], 'Iceland': ['Iceland', 'Europe'],
    'Ireland': ['Ireland', 'Europe'], 'Italy': ['Italy', 'Europe'], 'Luxembourg': ['Luxembourg', 'Europe'],
    'Netherlands': ['Netherlands', 'Europe'], 'Norway': ['Norway', 'Europe'], 'Portugal': ['Portugal', 'Europe'],
    'Spain': ['Spain', 'Europe'], 'Sweden': ['Sweden', 'Europe'], 'Switzerland': ['Switzerland', 'Europe'],
    'United Kingdom': ['United Kingdom', 'Europe']
  };
  const planned = {
    'Guatemala': ['Guatemala', 'Americas'], 'Madagascar': ['Madagascar', 'Africa'], 'Brazil': ['Brazil', 'Americas'],
    'Colombia': ['Colombia', 'Americas'], 'Romania': ['Romania', 'Europe'], 'Syria': ['Syria', 'Middle East']
  };

  const narrow = window.matchMedia('(max-width: 768px)').matches;
  const map = L.map('worldMap', {
    center: narrow ? [25, -40] : [28, -30],
    zoom: narrow ? 1 : 2,
    minZoom: narrow ? 1 : 2,
    maxZoom: 6,
    zoomSnap: 0.5,
    scrollWheelZoom: false,
    worldCopyJump: false,
    maxBounds: [[-75, -200], [88, 200]],
    attributionControl: true
  });
  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution('Map data: <a href="https://www.naturalearthdata.com/">Natural Earth</a>');

  const GOLD = '#c9a54e', RED = '#e74c3c';
  const styleFor = name => visited[name]
    ? { fillColor: GOLD, fillOpacity: 0.85, color: '#f0d58a', weight: 0.8 }
    : planned[name]
      ? { fillColor: RED, fillOpacity: 0.7, color: '#f19a90', weight: 0.8 }
      : { fillColor: '#2c3550', fillOpacity: 1, color: '#3d4766', weight: 0.5 };

  const popupFor = (label, region, isVisited) => `
    <div style="text-align:center;padding:4px 8px;">
      <strong style="font-size:14px;">${label}</strong><br>
      <span style="color:${isVisited ? GOLD : RED};font-size:12px;">${isVisited ? '&#10003; Visited' : '&#9733; On the list'}</span><br>
      <span style="color:#888;font-size:11px;">${region}</span>
    </div>`;

  fetch('/data/world-110m.geojson')
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('map data ' + r.status))))
    .then(world => {
      L.geoJSON(world, {
        style: f => styleFor(f.properties.name),
        onEachFeature: (f, layer) => {
          const name = f.properties.name;
          const entry = visited[name] || planned[name];
          if (!entry) return;
          const [label, region] = entry;
          layer.bindTooltip(label, { sticky: true, direction: 'top', className: 'map-tooltip' });
          layer.bindPopup(popupFor(label, region, !!visited[name]));
          layer.on('mouseover', () => layer.setStyle({ fillOpacity: 1, weight: 1.5 }));
          layer.on('mouseout', () => layer.setStyle(styleFor(name)));
          // Countries too small to see at world zoom also get a dot.
          const b = layer.getBounds();
          if (Math.abs(b.getEast() - b.getWest()) < 3 && Math.abs(b.getNorth() - b.getSouth()) < 3) {
            L.circleMarker(b.getCenter(), {
              radius: 4, color: '#fff', weight: 1, fillColor: visited[name] ? GOLD : RED, fillOpacity: 1
            }).bindTooltip(label, { direction: 'top', className: 'map-tooltip' })
              .bindPopup(popupFor(label, region, !!visited[name]))
              .addTo(map);
          }
        }
      }).addTo(map);
    })
    .catch(() => {
      mapContainer.innerHTML = '<p style="color:#aaa;text-align:center;padding:40px 16px;">The map could not load. Visited: '
        + Object.values(visited).map(v => v[0]).join(', ') + '.</p>';
    });

  // Keep the stats under the map in step with the lists above.
  const continents = new Set(Object.values(visited).map(v => v[1] === 'Americas' ? null : v[1]));
  continents.delete(null);
  const americas = Object.values(visited).filter(v => v[1] === 'Americas').map(v => v[0]);
  const hasNorth = americas.some(c => ['USA', 'Canada', 'Mexico', 'Belize', 'Costa Rica', 'El Salvador', 'Nicaragua', 'Panama', 'Bahamas'].includes(c));
  const hasSouth = americas.some(c => ['Chile', 'Peru'].includes(c));
  const continentCount = continents.size + (hasNorth ? 1 : 0) + (hasSouth ? 1 : 0);
  const stats = document.querySelectorAll('#travel-map .map-stat-num');
  if (stats.length >= 3) {
    stats[0].textContent = Object.keys(visited).length;
    stats[1].textContent = Object.keys(planned).length;
    stats[2].textContent = continentCount;
  }

  // Enable scroll zoom on click
  map.on('click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());
}
