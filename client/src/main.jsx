import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import ClothesPage from './pages/ClothesPage.jsx';
import BulkDashboardPage from './pages/BulkDashboardPage.jsx';
import RecyclerDashboardPage from './pages/RecyclerDashboardPage.jsx';
import '../../style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/clothes" element={<ClothesPage />} />
        <Route path="/clothes/bulk-dashboard" element={<BulkDashboardPage />} />
        <Route path="/clothes/recycler-dashboard" element={<RecyclerDashboardPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
