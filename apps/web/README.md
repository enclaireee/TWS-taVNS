# Web dashboard

Next.js dashboard for the TWS-taVNS demo. It reads live telemetry from the API (WebSocket) and shows the device state, signals and event log. The only action it can send is **ABORT**.

```bash
npm install
npm run dev     # http://localhost:3000, expects the API on :8000
```

From the repo root, `make dev` starts the API and this dashboard together. API reference: [`docs/api.md`](../../docs/api.md).
