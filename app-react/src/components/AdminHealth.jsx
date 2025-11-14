import React, { useState } from 'react';
import { getHealth, verifyBalances } from '../api';

export default function AdminHealth() {
  const [health, setHealth] = useState(null);
  const [verify, setVerify] = useState(null);

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Diagnostics</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={async () => setHealth(await getHealth())}>Load Health</button>
        <button onClick={async () => setVerify(await verifyBalances())}>Verify Balances</button>
      </div>
      {health && (
        <div style={{ marginTop: 12 }}>
          <h4>Health</h4>
          <pre>{JSON.stringify(health, null, 2)}</pre>
        </div>
      )}
      {verify && (
        <div style={{ marginTop: 12 }}>
          <h4>Verify</h4>
          <pre>{JSON.stringify(verify, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
