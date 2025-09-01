import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import Input from '../../components/input';
import Button from '../../components/button';
import { Grid, Row, Col } from '../../components/layout/bootstrap';

export default function StreetlivesForgotPassword({ onBackToSignIn }) {
  const [step, setStep] = useState<'request' | 'submit'>('request');
  const [form, setForm] = useState({ username: '', code: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
const [delivery, setDelivery] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const send = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const res = await Auth.forgotPassword(form.username.trim());
      // res: { CodeDeliveryDetails: { Destination, DeliveryMedium, AttributeName } }
      const details = res?.CodeDeliveryDetails || null;
      setDelivery(details);
      setMsg(details
        ? `Code sent via ${details.DeliveryMedium || 'SMS/Email'} to ${details.Destination || ''}`
        : 'Code sent. Check your messages.');
      setStep('submit');
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      await Auth.forgotPasswordSubmit(
        form.username.trim(),
        form.code.trim(),
        form.password
      );
      setMsg('✅ Password updated. You can sign in now.');
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

      {step === 'request' ? (
        <>
          <Row>
            <Col>
              <h3>Forgotten password?<br />No worries.</h3>
              <p>
                Enter your username for the Streetlives street team tool. We’ll
                send an SMS with a reactivation code to the phone number you used to sign up.
              </p>
            </Col>
          </Row>
          <Row>
            <Col>
              <label className="w-100" htmlFor="username">Username</label>
              <Input
                fluid
                placeholder="Enter your username"
                id="username"
                name="username"
                autoComplete="off"
                value={form.username}
                onChange={handleChange}
                disabled={busy}
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Button primary onClick={send} disabled={busy || !form.username.trim()}>
                <span>{busy ? 'Sending…' : 'Send'}</span>
              </Button>
            </Col>
          </Row>
        </>
      ) : (
        <>
          <Row>
            <Col>
              <p>Enter the SMS reactivation code and a new password.</p>
              {delivery && (
                <small>
                  Sent via {delivery.DeliveryMedium || 'SMS/Email'}
                  {delivery.Destination ? ` to ${delivery.Destination}` : ''}
                </small>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <label className="w-100" htmlFor="code">Code</label>
              <Input
                fluid
                placeholder="Code"
                id="code"
                name="code"
                autoComplete="off"
                value={form.code}
                onChange={handleChange}
                disabled={busy}
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <label className="w-100" htmlFor="password">New password</label>
              <Input
                fluid
                type="password"
                placeholder="New password"
                id="password"
                name="password"
                autoComplete="off"
                value={form.password}
                onChange={handleChange}
                disabled={busy}
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Button primary onClick={submit} disabled={busy || !form.username.trim() || !form.code.trim() || !form.password}>
                <span>{busy ? 'Submitting…' : 'Submit'}</span>
              </Button>
            </Col>
          </Row>
        </>
      )}

      {msg && (
        <Row><Col><div role="status" style={{ color: '#2e7d32' }}>{msg}</div></Col></Row>
      )}
      {err && (
        <Row><Col><div role="alert" style={{ color: '#c62828' }}>{err}</div></Col></Row>
      )}

      <Row>
        <Col>
          <button
            className="default"
            onClick={onBackToSignIn || (() => window.location.assign('/sign-in'))}
            disabled={busy}
          >
            Back to Sign In
          </button>
        </Col>
      </Row>
    </Grid>
  );
}
