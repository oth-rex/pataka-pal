// If your Azure Functions runtime is Node 18+, global fetch exists.
// This shim only loads node-fetch if fetch is missing.
const fetchShim = global.fetch || (async (...args) => {
  const { default: f } = await import('node-fetch');
  return f(...args);
});

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

module.exports = async function (context, req) {
  context.log('MapsProxy function processed a request.');

  const action = (req.query.action || (req.body && req.body.action) || '').toLowerCase();

  if (action === 'locations') {
    // optional lat/lng from client for distance calc
    const userLat = parseFloat(req.query.lat);
    const userLng = parseFloat(req.query.lng);
    const hasUser = Number.isFinite(userLat) && Number.isFinite(userLng);

    const base = process.env.API_BASE_URL
      || 'https://oth-pataka-api-facpcna9c9hjc5dh.australiaeast-01.azurewebsites.net/api';

    const url = `${base.replace(/\/+$/,'')}/getCupboards`;

    try {
      const resp = await fetchShim(url, { method: 'GET' });
      if (!resp.ok) {
        throw new Error(`getCupboards HTTP ${resp.status}`);
      }
      const cupboards = await resp.json();

      // Normalize -> { id, name, lat, lng, address?, distanceKm? }
      const locations = (Array.isArray(cupboards) ? cupboards : []).map(p => {
        // Handle possible casing differences from DB
        const id = p.id ?? p.Id ?? p.cupboardId ?? p.CupboardId;
        const name = p.name ?? p.Name ?? 'Unnamed Pataka';
        const lat = parseFloat(p.latitude ?? p.Latitude ?? p.lat ?? p.Lat);
        const lng = parseFloat(p.longitude ?? p.Longitude ?? p.lng ?? p.Lng ?? p.lon ?? p.Lon);
        const address = p.address ?? p.Address ?? null;

        const ok = Number.isFinite(lat) && Number.isFinite(lng);
        const distanceKm = ok && hasUser ? haversineKm(userLat, userLng, lat, lng) : null;

        return ok ? { id, name, lat, lng, address, distanceKm } : null;
      }).filter(Boolean);

      // Sort by distance when we can
      locations.sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });

      // IMPORTANT: return a BARE ARRAY for the map code
      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: locations
      };
      return;

    } catch (err) {
      context.log.error('Error fetching cupboards:', err);
      context.res = {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Failed to fetch locations' }
      };
      return;
    }
  }

  // Default ping
  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { message: 'Maps proxy working' }
  };
};
