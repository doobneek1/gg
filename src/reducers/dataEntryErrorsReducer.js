import * as Sentry from '@sentry/browser';

import {
  UPDATE_LOCATION_ERROR,
  UPDATE_SERVICE_ERROR,
  DISMISS_DATA_ENTRY_ERRORS,
} from '../actions';

const locationErrorsReducer = (state = [], action) => {
  switch (action.type) {
    case UPDATE_LOCATION_ERROR:
    case UPDATE_SERVICE_ERROR:
      if (!action.payload || !action.payload.error) {
        return state;
      }
      const extra = {
        response: {
          payload: action.payload.error.response.data,
          ...action.payload.error.response,
        },
      };
      Sentry.captureException(action.payload.error, {
        contexts: extra,
        extra,
      });
      return [action.payload.error, ...state];

    case DISMISS_DATA_ENTRY_ERRORS:
      return [];

    default:
      return state;
  }
};

export default locationErrorsReducer;
