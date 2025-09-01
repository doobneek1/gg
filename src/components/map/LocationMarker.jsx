import React from 'react';
import { InfoWindow } from 'react-google-maps';
import AdvancedMarker from './AdvancedMarker';
import Button from '../button';
import OverlayView from './OverlayView';

const MARKER_ICON_MAPPINGS = {
  /* eslint-disable max-len */
  blue: 'https://www.google.com/maps/vt/icon/name=assets/icons/spotlight/spotlight_pin_v2_shadow-1-small.png,assets/icons/spotlight/spotlight_pin_v2-1-small.png,assets/icons/spotlight/spotlight_pin_v2_dot-1-small.png,assets/icons/spotlight/spotlight_pin_v2_accent-1-small.png&highlight=000000,1400FF,FFFFFF,000000&color=1400FF?scale=1',
  gray: 'https://www.google.com/maps/vt/icon/name=assets/icons/spotlight/spotlight_pin_v2_shadow-1-small.png,assets/icons/spotlight/spotlight_pin_v2-1-small.png,assets/icons/spotlight/spotlight_pin_v2_dot-1-small.png,assets/icons/spotlight/spotlight_pin_v2_accent-1-small.png&highlight=000000,C0C0C0,FFFFFF,000000&color=C0C0C0?scale=1',
  /* eslint-enable max-len */
};

function LocationMarker(props) {
  const {
    id,
    mapLocation,
    isOpen,
    onClick,
    onClose,
    onSubmit,
    children,
    locationUrl,
    color = 'blue',
  } = props;
  const position = {
    lng: mapLocation.position.coordinates[0],
    lat: mapLocation.position.coordinates[1],
  };

  const marker = (
    <AdvancedMarker
      key={id}
      position={position}
      onClick={onClick}
    >
      <img src={MARKER_ICON_MAPPINGS[color]} alt="" style={{ width: 26, height: 40 }} />
    </AdvancedMarker>
  );

  return (
    <React.Fragment>
      <OverlayView key={id} position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
        {locationUrl ? <a href={locationUrl}>{marker}</a> : marker}
      </OverlayView>
      {isOpen && (
        <InfoWindow
          position={position}
          options={{
            maxWidth: window.innerWidth - 100,
          }}
          onCloseClick={onClose}
        >
          <div
            style={{
              textAlign: 'left',
              maxHeight: window.innerHeight - 200,
              overflowY: 'auto',
            }}
          >
            {children}
            <br />
            <Button primary fluid onClick={onSubmit}>
              <span>YES</span>
            </Button>
            <div style={{ margin: '.5em' }} />
            <Button primary basic fluid onClick={onClose}>
              <span>NO THANKS</span>
            </Button>
          </div>
        </InfoWindow>
      )}
    </React.Fragment>
  );
}

export default LocationMarker;
