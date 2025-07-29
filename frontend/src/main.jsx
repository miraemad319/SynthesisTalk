import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // 🚀 New: Router support
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter> {/* 🚪 Wrap app so it can handle routes (pages) */}
      <App />
    </BrowserRouter>
  </StrictMode>
);
