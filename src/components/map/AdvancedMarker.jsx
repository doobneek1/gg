import React from 'react';
import ReactDOM from 'react-dom';

class AdvancedMarker extends React.Component {
  constructor(props) {
    super(props);
    this.markerRef = React.createRef();
    this.container = document.createElement('div');
  }

  componentDidMount() {
    if (window.google && window.google.maps.marker) {
      this.markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
        position: this.props.position,
        map: this.context.__SECRET_MAP_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
        content: this.container,
      });

      this.markerRef.current.addListener('click', () => {
        if (this.props.onClick) {
          this.props.onClick();
        }
      });
    }
  }

  componentDidUpdate(prevProps) {
    if (this.markerRef.current) {
      this.markerRef.current.position = this.props.position;
    }
  }

  componentWillUnmount() {
    if (this.markerRef.current) {
      this.markerRef.current.map = null;
    }
  }

  render() {
    return ReactDOM.createPortal(this.props.children, this.container);
  }
}

AdvancedMarker.contextTypes = {
  __SECRET_MAP_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: () => {},
};

export default AdvancedMarker;
