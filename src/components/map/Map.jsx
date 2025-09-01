import React, { Component } from 'react';
import PropTypes from 'prop-types';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import config from '../../config';
import MapContext from './MapContext';

const defaultCenter = { lat: 40.7831, lng: -73.9712 };
const defaultZoom = 14;
const minZoom = 11;
const geolocationTimeout = 5000;

function haversineMeters(a, b) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * y;
}

class Map extends Component {
  constructor(props) {
    super(props);
    this.mapNodeRef = React.createRef();
    this.state = {
      userPosition: null,
    };
    this.map = null;
    this.userMarker = null;
    this.mapReady = false;
  }

  componentDidMount() {
    this.map = new maplibregl.Map({
      container: this.mapNodeRef.current,
      style: config.mapStyleUrl || 'https://demotiles.maplibre.org/style.json',
      center: [
        (this.props.center && this.props.center.lng) || defaultCenter.lng,
        (this.props.center && this.props.center.lat) || defaultCenter.lat,
      ],
      zoom: defaultZoom,
    });

    this.map.on('load', () => {
      this.mapReady = true;
      this._emitBoundsChanged();
    });

    // Limit min zoom similar to previous config
    this.map.setMinZoom(minZoom);

    this.map.on('moveend', () => this._emitBoundsChanged());

    this.map.on('click', (e) => {
      if (this.props.onClick) {
        const latLng = {
          lat: () => e.lngLat.lat,
          lng: () => e.lngLat.lng,
        };
        this.props.onClick({ latLng });
      }
    });

    if (navigator && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const location = { lat: latitude, lng: longitude };
          this.setState({ userPosition: location }, () => this._ensureUserMarker());
        },
        // eslint-disable-next-line no-console
        (e) => console.log('Failed to get current position', e),
        { timeout: geolocationTimeout },
      );
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // Center prop change
    if (this.props.center &&
      (!prevProps.center || this.props.center.lat !== prevProps.center.lat || this.props.center.lng !== prevProps.center.lng)) {
      this.map && this.map.panTo([this.props.center.lng, this.props.center.lat]);
    }

    // Zoom/fit to locations when requested
    if (this.props.zoomedLocations !== prevProps.zoomedLocations && this.props.zoomedLocations && this.props.zoomedLocations.length) {
      const bounds = new maplibregl.LngLatBounds();
      this.props.zoomedLocations.forEach((loc) => {
        const [lng, lat] = loc.position.coordinates;
        bounds.extend([lng, lat]);
      });
      if (this.mapReady) {
        this.map.fitBounds(bounds, { padding: 0 });
      } else {
        this.map.once('load', () => this.map.fitBounds(bounds, { padding: 0 }));
      }
    }

    // Update user marker if position changed
    if (prevState.userPosition !== this.state.userPosition) {
      this._ensureUserMarker();
    }
  }

  componentWillUnmount() {
    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = null;
    }
    if (this.map) {
      this.map.remove();
    }
  }

  _ensureUserMarker() {
    if (!this.map || !this.state.userPosition) return;
    const { lat, lng } = this.state.userPosition;
    const el = document.createElement('div');
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#4A90E2';
    el.style.border = '4px solid #FFFFFF';
    el.style.boxSizing = 'border-box';

    if (!this.userMarker) {
      this.userMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(this.map);
    } else {
      this.userMarker.setLngLat([lng, lat]);
    }
  }

  _emitBoundsChanged() {
    if (!this.props.onBoundsChanged || !this.map) return;
    const b = this.map.getBounds();
    if (!b) return;
    const sw = { lng: b.getWest(), lat: b.getSouth() };
    const ne = { lng: b.getEast(), lat: b.getNorth() };
    const centerObj = { lng: (sw.lng + ne.lng) / 2, lat: (sw.lat + ne.lat) / 2 };
    const radius = haversineMeters(centerObj, sw);
    const center = { lat: () => centerObj.lat, lng: () => centerObj.lng };
    this.props.onBoundsChanged({ bounds: b, center, radius });
  }

  centerMap = () => {
    const { userPosition } = this.state;
    if (userPosition && this.map) {
      this.map.panTo([userPosition.lng, userPosition.lat]);
    }
  };

  render() {
    const { children } = this.props;
    return (
      <MapContext.Provider value={this.map}>
        <div ref={this.mapNodeRef} style={{ position: 'absolute', inset: 0 }} />
        {typeof children === 'function' ? children({ centerMap: this.centerMap }) : children}
      </MapContext.Provider>
    );
  }
}

Map.propTypes = {
  center: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
  zoomedLocations: PropTypes.arrayOf(PropTypes.object),
  onBoundsChanged: PropTypes.func,
  onClick: PropTypes.func,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

export default Map;
