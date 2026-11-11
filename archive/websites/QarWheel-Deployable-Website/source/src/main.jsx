import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";

const root = document.getElementById("root");
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const requestedLang = new URLSearchParams(location.search).get('lang') === 'ar' ? 'ar' : 'en';
const requestedPath = location.pathname.split('/').filter(Boolean).join('/') || 'home';
if(root.hasChildNodes() && document.documentElement.lang === requestedLang && root.dataset.page === requestedPath) hydrateRoot(root,app);
else createRoot(root).render(app);
