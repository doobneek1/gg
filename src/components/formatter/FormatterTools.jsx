import React, { useMemo, useRef, useState } from 'react';

// Preview formatting: inserts breaks before bullets and shows bullets nicely
function previewText(raw) {
  let firstLineEnd = raw.indexOf('\n');
  if (firstLineEnd === -1) firstLineEnd = raw.length;
  const before = raw.slice(0, firstLineEnd);
  const after = raw.slice(firstLineEnd);
  const fixed = before + after.replace(/([^\n])\s*•/g, '$1\n•');
  return fixed
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim();
      const needsBreak = trimmed.startsWith('•') && index !== 0;
      const prefix = needsBreak ? '<br>' : '';
      return `${prefix}<span>${trimmed}</span>`;
    })
    .join('');
}

function expandDayRange(text) {
  const days = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
  const fullDays = { su: 'Sunday', mo: 'Monday', tu: 'Tuesday', we: 'Wednesday', th: 'Thursday', fr: 'Friday', sa: 'Saturday' };
  return text.replace(/\b(su|mo|tu|we|th|fr|sa)-(su|mo|tu|we|th|fr|sa)\b/gi, (_, s, e) => {
    const startIdx = days.indexOf(s.toLowerCase());
    const endIdx = days.indexOf(e.toLowerCase());
    if (startIdx === -1 || endIdx === -1) return `${s}-${e}`;
    if (endIdx < startIdx) return `${fullDays[s.toLowerCase()]} through ${fullDays[e.toLowerCase()]} (next week)`;
    return `${fullDays[s.toLowerCase()]} through ${fullDays[e.toLowerCase()]}`;
  });
}

function formatTimeRange(text) {
  return text.replace(/(\d{1,4}[ap])-(\d{1,4}[ap])/gi, (_, start, end) => {
    const normalize = (t) => {
      const m = t.match(/^(\d{1,2})(\d{2})?([ap])$/i);
      if (!m) return t;
      const [, h, mm = '00', p] = m;
      return `${h.padStart(2, '0')}${mm}${p}`;
    };
    const parse = (t) => {
      t = normalize(t);
      const period = t.includes('a') ? 'AM' : 'PM';
      t = t.replace(/[ap]/i, '');
      const h = parseInt(t.slice(0, -2)) || 0;
      const m = parseInt(t.slice(-2)) || 0;
      let hour = h;
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      return new Date(0, 0, 0, hour, m);
    };
    const s = parse(start);
    const e = parse(end);
    const nextDay = e < s ? '⁺¹' : '';
    return `${s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} — ${e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${nextDay}`;
  });
}

function formatAge(text) {
  const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  return text.replace(/age\((.+?)\)/gi, (_m, ages, offset, full) => {
    const nums = ages.split(/[-,]/).map(Number);
    const phrase = nums.length === 2 ? `age requirement: ${nums[0]}-${nums[1]} (until your ${ordinal(nums[1] + 1)} birthday)` : `age requirement: ${nums[0]}+`;
    // Capitalize if at start of string or after a line break
    const pre = full.slice(Math.max(0, offset - 1), offset);
    const cap = /(^|\n)\s*$/.test(pre) ? phrase.charAt(0).toUpperCase() + phrase.slice(1) : phrase;
    return cap;
  });
}

function safeHyperlink(text) {
  const parts = text.split(/(<a .*?>.*?<\/a>)/g);
  const out = [];
  for (let part of parts) {
    if (part.startsWith('<a ')) { out.push(part); continue; }
    part = part.replace(
      /(?<!href=")(?<!<a[^>]*>)(\b([\w.-]+@[\w.-]+\.\w+|((https?:\/\/)?[^\s<>()|]+\.[^\s<>()|]+(?:\/[^\s<>()|]*)?))(?:\|\(([^)]+)\))?|\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?:,\d+)?)(?![^<]*>)/g,
      (match) => {
        const phoneMatch = match.match(/^(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})(?:,(\d+))?$/);
        if (phoneMatch) {
          const clean = phoneMatch[1].replace(/\D/g, '');
          const ext = phoneMatch[2];
          const formatted = `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
          return ext ? `<a href="tel:${clean},${ext}">${formatted} x${ext}</a>` : `<a href="tel:${clean}">${formatted}</a>`;
        }
        const emailMatch = match.match(/^[\w.-]+@[\w.-]+\.\w+$/);
        if (emailMatch) return `<a href="mailto:${match}">${match}</a>`;
        const labelMatch = match.match(/^((https?:\/\/)?[^\s<>()|]+\.[^\s<>()|]+(?:\/[^\s<>()|]*)?)(?:\|\(([^)]+)\))?$/);
        if (labelMatch) {
          let [, rawUrl, scheme, label] = labelMatch;
          let trailing = '';
          if (!label) {
            const forbiddenEnd = /[.,;:!?]$/;
            if (forbiddenEnd.test(rawUrl)) { trailing = rawUrl.slice(-1); rawUrl = rawUrl.slice(0, -1); }
          }
          const urlWithScheme = scheme ? rawUrl : `https://${rawUrl}`;
          let u; try { u = new URL(urlWithScheme); } catch { return match; }
          const host = u.hostname; const partsH = host.split('.');
          if (partsH.length < 2) return match;
          const tld = partsH[partsH.length - 1]; const sld = partsH[partsH.length - 2];
          if (!/^[a-z]{2,24}$/i.test(tld)) return match;
          if (!sld || sld.length < 2) return match;
          const display = label || (u.host + u.pathname + u.search + u.hash).replace(/^www\./, '');
          const isYourPeer = host.endsWith('yourpeer.nyc');
          const targetAttr = isYourPeer ? '' : 'target="_blank" rel="noopener noreferrer"';
          return `<a href="${u.href}" ${targetAttr}>${display}</a>${trailing}`;
        }
        return match;
      }
    );
    out.push(part);
  }
  return out.join('');
}

function processText(input) {
  const normalized = input
    .replace(/([^\n])\s*•\s+/g, '$1\n• ')
    .replace(/^\s*•/gm, '•');
  const lines = normalized.split('\n');
  let output = [], lastWasEmpty = false;
  lines.forEach((line, i) => {
    let raw = line.trim();
    if (!raw) { lastWasEmpty = true; return; }
    const isFirst = i === 0;
    const alreadyBullet = raw.startsWith('•') || raw.startsWith('<br>&emsp;—') || raw.startsWith('<br>');
    if (!alreadyBullet && !(isFirst && raw.endsWith(':'))) {
      if (raw.startsWith('-')) raw = `<br>&emsp;— ${raw.slice(1).trim()}`;
      else if (lastWasEmpty) raw = `<br>${raw}`;
      else raw = `• ${raw}`;
    }
    lastWasEmpty = false;
    const formatted = formatAge(formatTimeRange(expandDayRange(raw)));
    output.push(safeHyperlink(formatted));
  });
  return output.join('\n');
}

export default function FormatterTools({ value, onChange }) {
  const [lastValue, setLastValue] = useState(value || '');

  const preview = useMemo(() => ({ __html: previewText(value || '') }), [value]);

  const doConvert = () => {
    setLastValue(value || '');
    const formatted = processText(value || '');
    onChange(formatted);
  };
  const doUndo = () => onChange(lastValue);
  const addPrefix = (prefix) => onChange(`${prefix}\n${(value || '').trim()}`);
  const appendLine = (line) => onChange(`${value || ''}\n${line}`);

  const buttonStyle = {
    padding: '6px 10px', fontSize: 12, cursor: 'pointer', border: '2px solid black', background: 'white', marginRight: 6, marginBottom: 6,
  };

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button style={buttonStyle} onClick={doConvert}>Convert</button>
        <button style={buttonStyle} onClick={doUndo}>Undo</button>
        <button style={buttonStyle} onClick={() => addPrefix('Services include:')}>+ Services Include</button>
        <button style={buttonStyle} onClick={() => appendLine('• If you are a Medicaid or Medicare recipient, see if you qualify for a Round-Trip MetroCard upon your visit.')}>+ Metrocard Line</button>
        <button style={buttonStyle} onClick={() => appendLine('• If you are a non-citizen with a criminal record, please <a href="https://docs.google.com/document/d/e/2PACX-1vQ-cQznO83jSMzdwQoOOZMO22gOesH8YgiSo3GTzuRpHjMczqzzFz8JR23pM6_ZMG8khiGazWIcF-jA/pub" target="_blank" rel="noopener noreferrer">see if you might be at risk of deportation</a>.')}>+ Criminal Risk Line</button>
        <button style={buttonStyle} onClick={() => appendLine('• If you are a non-citizen, please <a href="https://docs.google.com/document/d/e/2PACX-1vSRz4FT0ndCbqt63vO1Dq5Isj7FS4TZjw5NMc0gn8HCSg2gLx-MXD56X8Z56IDD5qbLX2_xzpwCqHaK/pub" target="_blank" rel="noopener noreferrer">see if you might qualify for this service</a>.')}>+ Ineligibility Link</button>
        <button style={buttonStyle} onClick={() => appendLine('• If you are a non-citizen and survived a crime, please <a href="https://docs.google.com/document/d/e/2PACX-1vSRz4FT0ndCbqt63vO1Dq5Isj7FS4TZjw5NMc0gn8HCSg2gLx-MXD56X8Z56IDD5qbLX2_xzpwCqHaK/pub" target="_blank" rel="noopener noreferrer">see if you might qualify for some immigration benefits</a>.')}>+ Survivor Benefits</button>
      </div>
      <div className="formatter-preview" style={{ marginTop: 10, border: '2px solid black', padding: 10, minHeight: 60, fontSize: 14, fontFamily: 'sans-serif' }}
        dangerouslySetInnerHTML={preview}
      />
    </div>
  );
}

