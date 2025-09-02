export const haversineMiles = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const Rm = 3958.8; // Earth radius in miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return Rm * y;
};

export const DOWNTOWN_MANHATTAN = { lat: 40.7128, lng: -74.0060 };

