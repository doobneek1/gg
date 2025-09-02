/* eslint-disable max-len */

const parseBoolean = (value, defaultValue = false) =>
  (value == null ? defaultValue : String(value).toLowerCase() === 'true');

// Build Google Maps JS URL if only a key is provided
const buildGmapsUrl = () => {
  // If a full URL is provided, use it verbatim
  if (process.env.REACT_APP_GMAPS_URL) return process.env.REACT_APP_GMAPS_URL;

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // Fallback to legacy default key + params (may be rate/host restricted)
    return 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCFMDqEgQ6VWWJbROzZhHu-f6sktAmTEGU&v=weekly&libraries=geometry,drawing,places,marker';
  }

  const parts = [
    'https://maps.googleapis.com/maps/api/js',
    `key=${encodeURIComponent(apiKey)}`,
    'v=weekly',
    'libraries=geometry,drawing,places,marker',
  ];

  const mapId = process.env.REACT_APP_GOOGLE_MAP_ID;
  if (mapId) parts.push(`map_ids=${encodeURIComponent(mapId)}`);

  return `${parts.shift()}?${parts.join('&')}`;
};

const baseApiDefault = process.env.REACT_APP_API_URL
  // default to the env var when provided
  || 'https://w6pkliozjh.execute-api.us-east-1.amazonaws.com/Stage';

// Minimal raster style using OSM tiles (good offline-ish fallback for dev)
const DEFAULT_RASTER_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'osm', type: 'raster', source: 'osm' },
  ],
};

export default {
  gaTrackingId: process.env.REACT_APP_GA_TRACKING_ID || 'G-8YQSKLWB8R',
  baseApi: baseApiDefault,
  mapStyleUrl: process.env.REACT_APP_MAP_STYLE_URL || null,
  mapStyle: DEFAULT_RASTER_STYLE,
  privacyUrl: process.env.PRIVACY_URL || 'https://docs.google.com/document/d/e/2PACX-1vQ8djXWiASXKkcKJ2LSHNXMgrQ1PhQPskSs_Thk5oLTZMnKvMy7Nqz1t4Xs18mGGKuORXOj8yNNhJUq/pub',
  termsOfUseUrl: process.env.TOU_URL || 'https://docs.google.com/document/d/e/2PACX-1vTBNI2Sv5QC8DSBwBL7WHNBdMI-9kPLuN2ev_Y2VDSo-bLeh8qssi7iBv-w0EEQurX9fgFQF4_2lItn/pub',
  commentGuidelinesUrl: process.env.COMMENT_GUIDELINES_URL || 'https://docs.google.com/document/d/e/2PACX-1vTi6AR2Q-PpTNMLTimvdVg8yDuLJ5DURswQ-heCToXj3OwuqNXyt-LIBs-By9znC2A_0HxqlO8vQ_DJ/pub',
  feedbackEmail: process.env.FEEDBACK_EMAIL || 'gogetta@streetlives.nyc',
  googleMaps: buildGmapsUrl(),
  googleMapId: process.env.REACT_APP_GOOGLE_MAP_ID || null,
  adminGroupName: process.env.REACT_APP_ADMIN_GROUP_NAME || 'StreetlivesAdmins',
  disableAuth: parseBoolean(process.env.REACT_APP_DISABLE_AUTH),
  mixpanelToken: process.env.REACT_APP_MIXPANEL_TOKEN || '8dd3b51f7a1de357a05e954495ae616f',
  sentryDsn: 'https://f7a71e0f6282e1a79ba6f604080ec88e@o4507232810631168.ingest.us.sentry.io/4507235352313856',
};
