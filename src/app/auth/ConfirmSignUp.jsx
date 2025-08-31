// src/auth/StreetlivesConfirmSignUp.jsx
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import Input from '../../components/input';
import Button from '../../components/button';
import { Grid, Row, Col } from '../../components/layout/bootstrap';

export default function StreetlivesConfirmSignUp({ onBackToSignIn }) {
  const [form, setForm] = useState({ username: '', code: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const confirm = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      await Auth.confirmSignUp(form.username.trim(), form.code.trim());
      setMsg('✅ Account confirmed. You can sign in now.');
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      await Auth.resendSignUp(form.username.trim());
      setMsg('📨 Code sent. Check your email/SMS.');
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Grid>
      <Row>
        <Col customClasses="sign-in-header">
          <div>Streetlives <strong>NYC</strong></div>
        </Col>
      </Row>

      <Row><Col><h3>Confirm Sign Up</h3></Col></Row>

      <Row>
        <Col>
          <label className="w-100" htmlFor="username">Username</label>
          <Input
            fluid
            placeholder="Enter your username"
            id="username"
            name="username"
            value={form.username}
            onChange={handleInputChange}
            disabled={busy}
          />
        </Col>
      </Row>

      <Row>
        <Col>
          <label className="w-100" htmlFor="code">Code</label>
          <Input
            fluid
            placeholder="Enter your code"
            id="code"
            name="code"
            type="text"
            value={form.code}
            onChange={handleInputChange}
            disabled={busy}
          />
        </Col>
      </Row>

      <Row>
        <Col>
          <Button primary onClick={confirm} disabled={busy}>
            <span>{busy ? 'Confirming…' : 'Confirm'}</span>
          </Button>
        </Col>
        <Col>
          <Button secondary onClick={resend} disabled={busy || !form.username.trim()}>
            <span>{busy ? 'Sending…' : 'Resend Code'}</span>
          </Button>
        </Col>
      </Row>

      {msg && (
        <Row><Col><div role="status" style={{ color: '#2e7d32' }}>{msg}</div></Col></Row>
      )}
      {err && (
        <Row><Col><div role="alert" style={{ color: '#c62828' }}>{err}</div></Col></Row>
      )}

      <Row>
        <Col>
          <button className="default" onClick={onBackToSignIn}>
            Want to go back to sign in? Click here
          </button>
        </Col>
      </Row>
    </Grid>
  );
}
