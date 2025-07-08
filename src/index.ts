import { App } from "./App";
import "./css/index.css";
import "./css/editorText.css";
import "./css/editorPicture.css";
import "./css/editorActions.css";
import "./css/datePicker.css";
import { generateId } from "./id_generator";
import { DatePicker } from "./CalendarElement";

customElements.define("date-picker", DatePicker);

const app = new App(false);
(window as any).App = app;

// const el = app.availablePanels.find(el => el.name = "SWOT")?.cls(generateId());
// app.stateHandler.addPanel(el);