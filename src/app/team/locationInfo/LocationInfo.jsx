import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';

import {
  selectLocationError,
  selectLocationData,
} from '../../../selectors/location';
import Header from '../../../components/header';
import Button from '../../../components/button';
import { getLocation } from '../../../actions';
import ProgressBar from '../../../components/progressBar';
import LoadingLabel from '../../../components/form/LoadingLabel';
import ErrorLabel from '../../../components/form/ErrorLabel';
import NavBar from '../../../components/navBar';
import FieldItem from './FieldItem';
import routes from '../locationForm/routes';

function LocationHeader() {
  return (
    <div className="container px-4 py-4 text-left">
      <div className="row">
        <Header className="m-0">Check all these details on this location:</Header>
      </div>
    </div>
  );
}

function LoadingView({ locationId }) {
  return (
    <div className="d-flex flex-column">
      <NavBar backButtonTarget={`/team/location/${locationId}/isClosed`} title="Location Info" />
      <LoadingLabel />
    </div>
  );
}

function getUpdatedAt(location, metaDataSection, fieldName) {
  const subFields = location.metadata[metaDataSection];
  const field = subFields.find(el => el.field_name === fieldName);
  return field ? field.last_action_date : null;
}

function ListItem({
  route,
  linkTo,
  location,
  value,
}) {
  const { label, metaDataSection, fieldName } = route;
  const updatedAt = getUpdatedAt(location, metaDataSection, fieldName);
  return <FieldItem title={label} linkTo={linkTo} updatedAt={updatedAt} value={value} />;
}

class LocationInfo extends Component {
  componentDidMount() {
    if (!this.props.locationData) {
      this.props.getLocation(this.props.match.params.locationId);
    }
  }

  onGoToServices = () => {
    const { locationId } = this.props.match.params;
    this.props.history.push(`/team/location/${locationId}/services`);
  };

  render() {
    const { locationData, locationError } = this.props;

    if (locationError) {
      return <ErrorLabel errorMessage={this.props.locationError} />;
    }

    if (!locationData) {
      return <LoadingView locationId={this.props.match.params.locationId} />;
    }

    return (
      <div className="d-flex flex-column">
        <NavBar
          backButtonTarget={`${this.props.location.pathname}/isClosed`}
          title="Location Info"
        />
        <ProgressBar step={0} steps={routes.length} />
        <LocationHeader />
        {routes.map(field => (
          <ListItem
            key={field.label}
            route={field}
            linkTo={`${this.props.location.pathname}/${field.urlFragment}`}
            location={locationData}
            value={field.selectValue(locationData)}
          />
        ))}
        <Button fluid primary onClick={this.onGoToServices}>
          Done
        </Button>
      </div>
    );
  }
}

export function mapStateToProps(state, ownProps) {
  const locationData = selectLocationData(state, ownProps);
  const locationError = selectLocationError(state, ownProps);

  return {
    locationError,
    locationData,
  };
}

export function mapDispatchToProps(dispatch, ownProps) {
  return {
    getLocation: (locationId) => {
      dispatch(getLocation(locationId));
    },
  };
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(LocationInfo));
