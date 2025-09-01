// src/auth/StreetlivesSignIn.jsx
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import Input from '../../components/input';
import './SignIn.css';
import { Row, Col } from '../../components/layout/bootstrap';

export default function StreetlivesSignIn({ onSignedIn, onForgotPassword }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const doSignIn = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return;

    setBusy(true);
    setErr(null);
    try {
      const user = await Auth.signIn(form.username.trim(), form.password);

      // Handle common challenges (optional, customize as needed)
      // if (user.challengeName === 'SMS_MFA' || user.challengeName === 'SOFTWARE_TOKEN_MFA') { ... }
      // if (user.challengeName === 'NEW_PASSWORD_REQUIRED') { ... }

      if (onSignedIn) onSignedIn(user);
      // Otherwise navigate:
      // window.location.assign('/');
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="container-fluid" onSubmit={doSignIn}>
      <Row>
        <Col customClasses="sign-in-header">
          <div>
            Streetlives <strong>NYC</strong>
          </div>
          <br />
          <div>Thank you for choosing to be a Streetlives Street team member</div>
        </Col>
      </Row>

      <Row>
        <Col><h3>Login</h3></Col>
      </Row>

      <Row>
        <Col>
          <label className="w-100" htmlFor="username">Username or Phone Number</label>
          <Input
            autoFocus
            tabIndex={0}
            fluid
            placeholder="Enter your username or phone number"
            id="username"
            name="username"
            autoCorrect="off"
            autoCapitalize="none"
            value={form.username}
            onChange={handleInputChange}
            disabled={busy}
          />
        </Col>
      </Row>

      <Row>
        <Col>
          <label className="w-100" htmlFor="password">Password</label>
          <Input
            tabIndex={0}
            fluid
            placeholder="Enter your password"
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleInputChange}
            disabled={busy}
          />
        </Col>
      </Row>

      <Row>
        <Col>
          <input
            type="submit"
            className="Button Button-primary mt-3"
            value={busy ? 'Logging in…' : 'Login'}
            disabled={busy || !form.username.trim() || !form.password}
          />
        </Col>
      </Row>

      {err && (
        <Row>
          <Col>
            <div role="alert" style={{ color: '#c62828', marginTop: 8 }}>{err}</div>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <button
            type="button"
            className="default"
            onClick={onForgotPassword || (() => (window.location.href = '/forgot-password'))}
            disabled={busy}
          >
            Forgot password? Click here
          </button>
        </Col>
      </Row>
    </form>
  );
}
