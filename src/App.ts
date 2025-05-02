import {builtinPanels} from "./builtinPanels";
import {EditorElementDescription, EditorElement, SerializedElementDescription} from "./builtinPanels";
import { generateId } from "./id_generator";

class AppState{
	pageElements:EditorElement[];
	
	constructor (){
		this.pageElements = [];
	}

	async serialize(){
		return (await Promise.all(this.pageElements.map(el => el.serialize())));
	}

	push(...args:EditorElement[]){
		this.pageElements.push(...args);
	}
}

export interface SerializedPanelState{
	panelType:string,
	id:string,
	data:string,
}

interface SerializedAppStateDescriptor{
	id:string;
	name?:string;
	ts:number;
	panels:string[];
}


interface SerializedAppState{
	createdOn:string;
	lastModification:string;
	pageData:SerializedPanelState[];
}

class StateHandler{
	state:AppState;
	openedState:Partial<SerializedAppStateDescriptor>;
	availableStates:SerializedAppStateDescriptor[];

	constructor(){
		this.state = new AppState();
		this.openedState = {
			id:generateId(),
			name:undefined,
			ts:Date.now()
		};
		this.availableStates = [];
		this.loadAvailableStates();
	}

	loadAvailableStates(){
		try{
			const available = localStorage.getItem("spe-pages");
			if (available === null)
				return false;
			this.availableStates.push(...JSON.parse(available) as SerializedAppStateDescriptor[]);
		}
		catch(e){
			this.saveAvailableStates();
		}
	}

	saveAvailableStates(){
		if (this.openedState.id === undefined)
			this.openedState.id = generateId();
		if (this.openedState.panels === undefined)
			this.openedState.panels = builtinPanels.map(e => e.name);
		if (this.openedState.ts === undefined)
			this.openedState.ts = Date.now();
		const existingIndex = this.availableStates.findIndex( elem => elem.id == this.openedState.id);
		if (existingIndex == -1)
			this.availableStates.push(this.openedState as SerializedAppStateDescriptor);
		else
			Object.assign(this.availableStates[existingIndex], this.openedState);
		localStorage.setItem("spe-pages", JSON.stringify(this.availableStates));
	}

	addPanel(element:EditorElement){
		this.state.push(element);
	}

	removePanel(elementId:string){
		const elementIndex = this.state.pageElements
			.findIndex(el => el.editorElementId === elementId);
		if (elementIndex == -1)
			throw Error(`Element with ID ${elementId} does not exist`);
		this.state.pageElements[elementIndex].delete();
		this.state.pageElements.splice(elementIndex, 1);
	}

	selectAvailableState(app:App){
		const modal = document.createElement("div");
		modal.classList.add("modal");
		app.showOverlay(modal);
		const table = document.createElement("table");
		table.classList.add("border");
		this.availableStates.map((elem) =>{
			const row = document.createElement("tr");
			const descriptor = document.createElement("td");
			descriptor.innerText = (elem.name != undefined 
				&& elem.name != null)?elem.name:elem.id;
			const time = document.createElement("td");
			time.innerText = new Date(elem.ts).toLocaleDateString();
			row.appendChild(descriptor);
			row.appendChild(time);
			row.onclick = () =>{
				this.loadState(elem.id, app.availablePanels)
					.then(() => { app.overlayClose(); })
			};
			table.appendChild(row);
		});
		modal.appendChild(table);
	}

	async loadState(stateId:string, availablePanels:EditorElementDescription[]){
		//check if even available or error
		const newState = this.availableStates.find(st => st.id == stateId);
		if (newState === undefined)
			throw Error(`State with ID ${stateId} not available in localStorage`);
		this.openedState = newState;
		this.openedState
		const storageData = localStorage.getItem(stateId);
		if (storageData === null)
			throw Error(`Data for StateId ${stateId} was not available in localStorage`);
		const data = (JSON.parse(storageData) as SerializedPanelState[]);
		const max = data.length;
		for(let i = 0; i < max; i++){
			let pan = availablePanels.find(el => el.name == data[i].panelType);
			if (pan === undefined)
				throw Error(`Type ${data[i].panelType} not found in available panels. Maybe extension not loaded?`);
			const element = pan.fromObject(data[i]);
			this.state.pageElements.push(element);
		}
	}

	async saveState(app:App){
		// First find state, then save, if not exist create new
		if (this.openedState.id === undefined)
			this.openedState.id = generateId();
		const modal = document.createElement("div");
		modal.classList.add("modal");
		const input = document.createElement("input");
		input.type = "text";
		const button = document.createElement("button");
		button.innerText = "Save";
		button.onclick = () => {
			const newName = input.value;
			if (newName === undefined || newName === "")
				throw Error("Input a name")
			else if( this.availableStates.find(el => el.name === newName))
				throw Error("Name is already in available states");
			this.openedState.name = newName;
			this.saveAvailableStates();
			this.state.serialize().then((data) =>{
				localStorage.setItem(this.openedState.id as string, JSON.stringify(data));
			})
			app.overlayClose();
		}
		modal.appendChild(input);
		modal.appendChild(button);
		app.showOverlay(modal);
	}

}

export class App{
	stateHandler:StateHandler;
	availablePanels:EditorElementDescription[];
	private overlayEventBuffer?:((this:GlobalEventHandlers, event:KeyboardEvent) => void) | null;

	constructor(){
		this.availablePanels = [];
		this.availablePanels.push(...builtinPanels);
		this.stateHandler = new StateHandler();
		this.setupPage();
	}

	setupPage(){
		document.title = "SingePageEditor"
		const body = document.body;
		//	PANEL BUTTONS
		for (const panel of this.availablePanels)
		{
			let button = document.createElement("button");
			button.innerText = panel.name;
			button.classList.add("btn-add-panel");
			button.onclick = () => {
				this.stateHandler.addPanel(new panel.cls(generateId()))
			}
			button.onmouseover = null; //todo: onhover -> display panel.description next to mouse :)
			body.appendChild(button);
		}
		body.firstElementChild?.classList.add("pageEnd");
		body.appendChild(document.createElement("br"));
		//	LOAD AND SAVE BUTTONS
		let btnSaveLoc = document.createElement("button");
		btnSaveLoc.innerText = "Save (Browser)";
		btnSaveLoc.onclick = () => {
			this.stateHandler.saveState(this);
		}
		body.appendChild(btnSaveLoc);
		let btnLoadLoc = document.createElement("button");
		btnLoadLoc.innerText = "Load (Browser)";
		btnLoadLoc.onclick = ()=>{
			this.stateHandler.selectAvailableState(this);
		}
		body.appendChild(btnLoadLoc);
		//Overlay
		const overlay = document.createElement("div");
		overlay.id = "overlay";
		overlay.classList.add("overlay", "hidden");
		const overlay_close_btn = document.createElement("div");
		overlay_close_btn.classList.add("close_overlay_button");
		overlay_close_btn.innerHTML = "X";
		overlay_close_btn.onclick = () => {
			this.overlayClose();
		}
		overlay.appendChild(overlay_close_btn);
		body.appendChild(overlay);
	}

	addNewEditorElement(type:string){
		const element = this.availablePanels.find(elem => elem.name == type);
		if (element === undefined)
			throw Error(`Type ${type} not found in available panels. Maybe extension not loaded?`);
		this.stateHandler.addPanel(new element.cls(generateId()));
	}

	loadEditorElement(object:SerializedPanelState){
		const element = this.availablePanels.find( av => av.name == object.panelType);
		if (element === undefined)
			throw Error(`Type ${object.panelType} not found in available panels. Maybe extension not loaded?`);
		this.stateHandler.addPanel(new element.cls(object.id));
	}

	loadExistingState(){
	}

	showOverlay(modal:HTMLDivElement){
		const overlayElem = document.getElementById("overlay")
		if (overlayElem == null)
			throw Error("Overlay element not found");
		overlayElem.appendChild(modal);
		overlayElem.classList.remove("hidden");
		this.overlayEventBuffer = document.onkeydown;
		document.onkeydown = (event) => {
			if (event.key == "Escape")
				this.overlayClose();
		}
		// add onlclick outside this.overlayClose()
	}

	overlayClose()
	{
		const overlayElem = document.getElementById("overlay")
		if (overlayElem == null)
			throw Error("Overlay element not found");
		overlayElem.classList.add("hidden");
		const closebtn = overlayElem.firstChild
		overlayElem.innerHTML = "";
		if (closebtn != null)
			overlayElem.appendChild(closebtn);
		if (this.overlayEventBuffer === null || this.overlayEventBuffer === undefined)
			document.onkeydown = null;
		else
			document.onkeydown = this.overlayEventBuffer;
	}

	generateStaticSite(){
		throw Error("NOT IMPLEMENTED App.generateStaticSite");
	}
}