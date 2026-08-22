import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./design/fonts.css";
import "./design/tokens.css";
import "./design/base.css";

const racine = document.getElementById("racine");
if (!racine) throw new Error("Point de montage #racine introuvable");

createRoot(racine).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
