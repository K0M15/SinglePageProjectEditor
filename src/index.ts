import { App } from "./App";
import "./css/index.css";
import "./css/editorText.css";
import "./css/editorPicture.css";
import "./css/editorActions.css";

const app = new App(false);
(window as any).App = app;