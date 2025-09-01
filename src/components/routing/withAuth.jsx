// src/app/auth/withAuth.jsx
import React from 'react';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import '../../amplifyInit'; // make sure Amplify.configure(...) is called once

// Your custom screens (JSX versions using aws-amplify Auth API)
import StreetlivesSignIn from './SignIn.jsx';
import StreetlivesForgotPassword from './ForgotPassword.jsx';
import StreetlivesConfirmSignUp from './ConfirmSignUp.jsx';
// If you have a modern SignUp screen, import it too (optional)
// import StreetlivesSignUp from './SignUp.jsx';

const withAuth = (Component, { disableAuth = false } = {}) => {
  if (disableAuth) {
    return (props) => <Component {...props} />;
  }

  // Slot overrides that adapt Authenticator navigation to your components
  const CustomSignIn = () => {
    const { toResetPassword } = useAuthenticator();
    return <StreetlivesSignIn onForgotPassword={toResetPassword} />;
  };

  const CustomResetPassword = () => {
    const { toSignIn } = useAuthenticator();
    return <StreetlivesForgotPassword onBackToSignIn={toSignIn} />;
  };

  const CustomConfirmSignUp = () => {
    const { toSignIn } = useAuthenticator();
    return <StreetlivesConfirmSignUp onBackToSignIn={toSignIn} />;
  };

  // Optional: if you have a custom SignUp component
  // const CustomSignUp = () => {
  //   const { toSignIn } = useAuthenticator();
  //   return <StreetlivesSignUp onBackToSignIn={toSignIn} />;
  // };

  // Authenticator only renders children when authenticated
  return function Wrapped(props) {
    return (
      <Authenticator
        // Supply only the slots you’re overriding
        components={{
          SignIn: CustomSignIn,
          ResetPassword: CustomResetPassword,   // new name for ForgotPassword flow
          ConfirmSignUp: CustomConfirmSignUp,
          // SignUp: CustomSignUp,
        }}
      >
        <Component {...props} />
      </Authenticator>
    );
  };
};

export default withAuth;
