const fs = require('fs');
const path = require('path');

const files = {
  'frontend/package.json': '{"name":"nri-tax-app-frontend","version":"0.1.0","dependencies":{"react":"^18.2.0","react-dom":"^18.2.0","react-router-dom":"^6.14.0","axios":"^1.4.0"},"scripts":{"start":"react-scripts start"},"devDependencies":{"react-scripts":"5.0.1"}}',
  'frontend/public/index.html': '<!DOCTYPE html><html><head><title>NRI Tax App</title><script src="https://cdn.tailwindcss.com"></script></head><body><div id="root"></div></body></html>',
  'frontend/src/index.js': 'import React from "react";import ReactDOM from "react-dom/client";import App from "./App";const root = ReactDOM.createRoot(document.getElementById("root"));root.render(<App />);',
  'frontend/src/App.jsx': 'export default function App() { return <div className="p-4"><h1 className="text-3xl font-bold">NRI Tax App</h1><p>Welcome!</p></div>; }',
  'frontend/.env.local': 'REACT_APP_API_URL=http://localhost:5000',
  'backend/package.json': '{"name":"nri-tax-app-backend","main":"src/server.js","scripts":{"start":"node src/server.js"},"dependencies":{"express":"^4.18.2","cors":"^2.8.5","dotenv":"^16.3.1"}}',
  'backend/src/server.js': 'const express = require("express");const app = express();app.use(express.json());app.get("/api/health", (req, res) => res.json({status: "OK"}));app.listen(5000, () => console.log("Backend running on :5000"));',
  'backend/.env': 'PORT=5000\nNODE_ENV=development'
};

Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Created: ' + filePath);
  }
});

console.log('\nAll files created!');