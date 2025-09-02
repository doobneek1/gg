import React from 'react';
import ReactDOM from 'react-dom';
import maplibregl from 'maplibre-gl';
import MapContext from './MapContext';
import Button from '../button';

const MARKER_ICON_MAPPINGS = {
  /* eslint-disable max-len */
  blue: 'https://www.google.com/maps/vt/icon/name=assets/icons/spotlight/spotlight_pin_v2_shadow-1-small.png,assets/icons/spotlight/spotlight_pin_v2-1-small.png,assets/icons/spotlight/spotlight_pin_v2_dot-1-small.png,assets/icons/spotlight/spotlight_pin_v2_accent-1-small.png&highlight=000000,1400FF,FFFFFF,000000&color=1400FF?scale=1',
  gray: 'https://www.google.com/maps/vt/icon/name=assets/icons/spotlight/spotlight_pin_v2_shadow-1-small.png,assets/icons/spotlight/spotlight_pin_v2-1-small.png,assets/icons/spotlight/spotlight_pin_v2_dot-1-small.png,assets/icons/spotlight/spotlight_pin_v2_accent-1-small.png&highlight=000000,C0C0C0,FFFFFF,000000&color=C0C0C0?scale=1',
  /* eslint-enable max-len */
};

class LocationMarker extends React.Component {
  static contextType = MapContext;

  constructor(props) {
    super(props);
    this.marker = null;
    this.markerEl = null;
    this.popup = null;
    this.popupContainer = document.createElement('div');
  }

  componentDidMount() {
    this._ensureMarker();
    this._syncPopup();
  }

  componentDidUpdate(prevProps) {
    this._ensureMarker();
    const [lng, lat] = this._lngLatFromProps(this.props);
    if (this.marker) {
      const [plng, plat] = this._lngLatFromProps(prevProps);
      if (lat !== plat || lng !== plng) {
        this.marker.setLngLat([lng, lat]);
      }
    }
    this._syncPopup();
  }

  componentWillUnmount() {
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
  }

  _lngLatFromProps(p) {
    return [p.mapLocation.position.coordinates[0], p.mapLocation.position.coordinates[1]];
  }

  _ensureMarker() {
    const map = this.context;
    if (!map || this.marker) return;
    const [lng, lat] = this._lngLatFromProps(this.props);

    // Build DOM element for marker
    const img = document.createElement('img');
    img.src = MARKER_ICON_MAPPINGS[this.props.color || 'blue'];
    img.alt = '';
    img.style.width = '26px';
    img.style.height = '40px';
    img.style.cursor = 'pointer';
    const container = document.createElement(this.props.locationUrl ? 'a' : 'div');
    if (this.props.locationUrl) {
      container.href = this.props.locationUrl;
    }
    container.appendChild(img);
    if (!this.props.locationUrl) {
      container.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.props.onClick) this.props.onClick();
      });
    }
    this.markerEl = container;
    this.marker = new maplibregl.Marker({ element: container, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(map);
  }

  _syncPopup() {
    const map = this.context;
    if (!map) return;
    const [lng, lat] = this._lngLatFromProps(this.props);

    if (this.props.isOpen) {
      if (!this.popup) {
        this.popup = new maplibregl.Popup({ maxWidth: `${Math.min(window.innerWidth - 100, 400)}px` })
          .setLngLat([lng, lat])
          .setDOMContent(this.popupContainer)
          .addTo(map);
        this.popup.on('close', () => { if (this.props.onClose) this.props.onClose(); });
      } else {
        this.popup.setLngLat([lng, lat]);
      }
    } else if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
  }

  render() {
    // Render popup content via portal when open
    if (!this.props.isOpen || !this.popupContainer) return null;

    return ReactDOM.createPortal(
      <div
        style={{
          textAlign: 'left',
          maxHeight: window.innerHeight - 200,
          overflowY: 'auto',
        }}
      >
        {this.props.children}
        <br />
        <Button primary fluid onClick={this.props.onSubmit}>
          <span>YES</span>
        </Button>
        <div style={{ margin: '.5em' }} />
        <Button primary basic fluid onClick={this.props.onClose}>
          <span>NO THANKS</span>
        </Button>
      </div>,
      this.popupContainer,
    );
  }
}

export default LocationMarker;
