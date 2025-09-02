let geocoder = null;

const googleReverseGeocode = (location) => new Promise((resolve, reject) => {
  if (!geocoder) {
    geocoder = new window.google.maps.Geocoder();
  }

  const locArg = typeof location.lat === 'function' && typeof location.lng === 'function'
    ? { lat: location.lat(), lng: location.lng() }
    : location;

  geocoder.geocode({ location: locArg }, (results, status) => {
    try {
      if (status !== 'OK') {
        throw new Error('No address found at clicked position');
      }

      const addresses = results.filter(result => result.types.indexOf('street_address') !== -1);

      if (!addresses.length) {
        throw new Error('No street address at clicked position');
      }

      const address = addresses[0];

      const getAddressComponent = (type) => {
        const matchingComponents =
          address.address_components.filter(component => component.types.indexOf(type) !== -1);

        if (!matchingComponents.length) {
          throw new Error(`No "${type}" address component`);
        }

        return matchingComponents[0].short_name;
      };

      const formattedAddress = address.formatted_address;
      const [street, city] = formattedAddress.split(',');

      resolve({
        street: street.trim(),
        city: city.trim(),
        state: getAddressComponent('administrative_area_level_1'),
        postalCode: getAddressComponent('postal_code'),
        country: getAddressComponent('country'),
        formattedAddress,
      });
    } catch (err) { reject(err); }
  });
});

const nominatimReverseGeocode = async (location) => {
  const loc = typeof location.lat === 'function' && typeof location.lng === 'function'
    ? { lat: location.lat(), lng: location.lng() }
    : location;

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(loc.lat)}&lon=${encodeURIComponent(loc.lng)}`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' },
  });
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();

  const addr = data.address || {};
  const streetParts = [addr.house_number, addr.road].filter(Boolean).join(' ');
  const city = addr.city || addr.town || addr.village || '';
  const state = addr.state || '';
  const postalCode = addr.postcode || '';
  const country = addr.country_code ? addr.country_code.toUpperCase() : (addr.country || '');

  return {
    street: streetParts,
    city: city,
    state: state,
    postalCode: postalCode,
    country: country,
    formattedAddress: data.display_name,
  };
};

export const getAddressForLocation = (location) => {
  if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.Geocoder) {
    return googleReverseGeocode(location);
  }
  return nominatimReverseGeocode(location);
};

export default { getAddressForLocation };

