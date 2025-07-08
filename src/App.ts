import {builtinPanels} from "./builtinPanels";
import {EditorElementDescription, EditorElement, SerializedElementDescription} from "./builtinPanels";
import { generateId } from "./id_generator";
import { frontendClient as FrontendClient } from "./User";

class AppState{
	pageElements:EditorElement[];
	
	constructor (){
		this.pageElements = [];
	}

	async serialize(app:App){
		return (await Promise.all(this.pageElements.map(el => el.serialize(app))));
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

export interface SerializedAppStateDescriptor{
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

interface StateHandlerChangeEvent{

}


class StateHandler{
	state:AppState;
	openedState:Partial<SerializedAppStateDescriptor>;
	availableStates:SerializedAppStateDescriptor[];
	
	changeListeners:((stateHandler:StateHandler)=>void)[]; // Add state listeners, add 	

	constructor(app:App){
		this.state = new AppState();
		this.openedState = {
			id:generateId(),
			name:undefined,
			ts:Date.now(),
			panels:[]
		};
		this.availableStates = [];
		this.changeListeners = [] as ((stateHandler:StateHandler)=>void)[];
		this.changeListeners.push(() => { this.updateTimestamp(); })
		this.loadAvailableStates(app);
	}

	triggerChange(){
		this.changeListeners.forEach((listener) =>{
			listener(this);
		})
	}

	updateTimestamp(){
		this.openedState.ts = Date.now();
	}

	loadAvailableStates(app:App){
		try{
			const available = localStorage.getItem("spe-pages");
			if (available === null)
				return false;
			this.availableStates.push(...JSON.parse(available) as SerializedAppStateDescriptor[]);
		}
		catch(e){
			this.saveAvailableStates(app);
		}
	}

	updateAvailableStates(app:App){
		const idx = this.availableStates.findIndex(val => val.id == this.openedState.id);
		if (idx == -1)
			if (this.openedState.id != undefined
				&& this.openedState.name != undefined
				&& this.openedState.panels != undefined
				&& this.openedState.ts != undefined){
				this.openedState.panels = app.availablePanels.map(el => el.name);
				this.availableStates.push(this.openedState as SerializedAppStateDescriptor);
			}
			else
				throw Error(`Opened state not in a saveable condition`);
			Object.assign(this.availableStates[idx], this.openedState);
		return this.availableStates;
	}

	saveAvailableStates(app:App){
		this.updateAvailableStates(app);
		localStorage.setItem("spe-pages", JSON.stringify(this.availableStates));
	}

	addPanel(element:EditorElement){
		element.changeListener.push(() => {
			this.triggerChange()
		});
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

	selectAvailableState(app:App, callback:(stateID:string) => void){
		const modal = document.createElement("div");
		modal.classList.add("modal");
		app.showOverlay(modal);
		const table = document.createElement("table");
		table.classList.add("border");
		this.availableStates.forEach((elem) =>{
			const row = document.createElement("tr");
			const descriptor = document.createElement("td");
			descriptor.innerText = (elem.name != undefined 
				&& elem.name != null)?elem.name:elem.id;
			const time = document.createElement("td");
			time.innerText = new Date(elem.ts).toLocaleDateString();
			const deleteCell = document.createElement("td");
			const deleteButton = document.createElement("button");
			deleteCell.appendChild(deleteButton);
			deleteButton.innerText = "🗑️";
			deleteButton.onclick = () => {
				localStorage.removeItem(elem.id);
				const idx = this.availableStates.findIndex(state => state.id == elem.id);
				this.availableStates.slice(idx, 1);
				this.saveAvailableStates(app);
				app.overlayClose();
				this.selectAvailableState(app, callback);
			}
			row.appendChild(descriptor);
			row.appendChild(time);
			row.appendChild(deleteCell);
			time.onclick, descriptor.onclick = () =>{
				callback(elem.id);
			};
			table.appendChild(row);
		});
		modal.appendChild(table);
	}

	loadState(stateId:string, availablePanels:EditorElementDescription[], parent:HTMLElement):Promise<string>{
		//check if even available or error
		const newState = this.availableStates.find(st => st.id == stateId);
		if (newState === undefined)
			throw Error(`State with ID ${stateId} not available in localStorage`);
		this.openedState = newState;
		const storageData = localStorage.getItem(stateId);
		if (storageData === null)
			throw Error(`Data for StateId ${stateId} was not available in localStorage`);
		const data = (JSON.parse(storageData) as SerializedPanelState[]);
		const max = data.length;
		for(let i = 0; i < max; i++){
			let pan = availablePanels.find(el => el.name == data[i].panelType);
			if (pan === undefined)
				throw Error(`Type ${data[i].panelType} not found in available panels. Maybe extension not loaded?`);
			const element = pan.fromObject(data[i], parent);
			this.state.pageElements.push(element);
		}
	}

	saveState(app:App){
		// First find state, then save, if not exist create new
		if (this.openedState.id === undefined)
			this.openedState.id = generateId();
		const modal = document.createElement("div");
		modal.classList.add("modal");
		const input = document.createElement("input");
		input.type = "text";
		input.value = (this.openedState.name != undefined)?this.openedState.name:""
		const button_save = document.createElement("button");
		button_save.innerText = "Save";
		button_save.onclick = () => {
			const newName = input.value;
			if (newName === undefined || newName === "")
				throw Error("Input a name")
			if (this.openedState.name != "" && newName != this.openedState.name)
				this.openedState.id = generateId();
			this.openedState.name = newName;
			this.saveAvailableStates(app);
			this.state.serialize(app).then((data) =>{
				localStorage.setItem(this.openedState.id as string, JSON.stringify(data));
			})
			app.overlayClose();
		}
		const button_save_as = document.createElement("button");
		button_save_as.innerText = "Save as";
		button_save_as.onclick = () => {
			app.overlayClose();
			this.selectAvailableState(app,
				(stateID) => {
					const purgeState  = this.availableStates.find(val => val.id == stateID);
					if (purgeState === null)
						throw Error(`Could not save current state ${stateID}, no state with id found.`);
					this.openedState.id = stateID;
					this.saveAvailableStates(app);
					this.state.serialize(app).then((data) => {
						localStorage.setItem(this.openedState.id as string, JSON.stringify(data));
					});
					app.overlayClose();
				}
			)
		}
		modal.appendChild(input);
		modal.appendChild(button_save);
		modal.appendChild(button_save_as);
		app.showOverlay(modal);
	}
	
	purgeOpenedState(){
		if (this.state.pageElements.length == 0){
			return ;
		}
		this.state.pageElements.forEach ((elem) => {
			this.removePanel(elem.editorElementId);
		})
	}

	async downloadStateAsJSON(app: App) {
        const data = await this.state.serialize(app);
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        const filename = (this.openedState.name ? this.openedState.name : "state") + ".json";
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

}

export class App{
	allowedCookies:boolean
	stateHandler:StateHandler;
	availablePanels:EditorElementDescription[];
	private overlayEventBuffer?:((this:GlobalEventHandlers, event:KeyboardEvent) => void) | null;

	constructor(isStandalone:boolean){
		this.allowedCookies = false;
		this.availablePanels = [];
		this.availablePanels.push(...builtinPanels);
		this.stateHandler = new StateHandler(this);
		this.setupPage();
	}

	checkCookiesAllowed():boolean{
		const cookiesAccepted = localStorage.getItem("cookiesAccepted");
		if (cookiesAccepted == null){
			// this.displayCookieQuestion()
		}
	}

	setupPage(){
		document.title = "SingePageEditor"
		const body = document.body;
		//	PANEL BUTTONS
		const topElement = this.createElement("div",
			{
				classList: ["pageEnd", "controlElement"],
				parent:body,
			}
		)
		const contentEl = this.createElement("div", {
			id:"panel-content",
			parent:body
		})
		for (const panel of this.availablePanels)
		{
			this.createElement("button", {
				innerText:panel.name,
				classList:["btn-add-panel"],
				onClick:() => {
					this.stateHandler.addPanel(new panel.cls(generateId(), contentEl, {}))
				},
				parent:topElement
			});
		}		
		this.createElement("br", {parent:topElement})
		//	LOAD AND SAVE BUTTONS
		this.createElement("button", {
			innerText:"Save",
			onClick:() => {this.stateHandler.saveState(this);},
			parent:topElement
		});
		this.createElement("button", {
			innerText:"Load (Browser)",
			onClick:() => {
				this.stateHandler.selectAvailableState(this, (stateID) => {
					this.stateHandler.loadState(stateID, this.availablePanels, contentEl)
					this.overlayClose();
				});
			},
			parent:topElement
		});
		this.createElement("button", {
			innerText:"Save (Local)",
			onClick:() => {this.stateHandler.downloadStateAsJSON(this);},
			parent:topElement
		});
		const fileInput = this.createElement("input", {
			parent: topElement
		}) as HTMLInputElement;
		fileInput.type = "file";
		fileInput.accept = ".json,application/json";
		fileInput.style.display = "none";
		fileInput.onchange = async (e) => {
			if (fileInput.files && fileInput.files.length > 0) {
				const file = fileInput.files[0];
				const text = await file.text();
				try {
					const data = JSON.parse(text);
					// Clear current panels
					this.stateHandler.purgeOpenedState();
					// Load panels from JSON
					if (Array.isArray(data)) {
						// Old format: just array of panels
						for (const panel of data) {
							this.loadEditorElement(panel);
						}
					} else if (data.pageData) {
						// New format: { pageData: [...] }
						for (const panel of data.pageData) {
							this.loadEditorElement(panel);
						}
					}
				} catch (err) {
					alert("Invalid JSON file.");
				}
			}
		};
		this.createElement("button", {
			innerText: "Load (Local)",
			onClick: () => {
				// Trigger file input click
				fileInput.click();
			},
			parent: topElement
		});
		//Overlay
		const overlay = this.createElement("div", {id:"overlay", classList:["overlay", "hidden"], parent:topElement})
		this.createElement("button", {
			parent:overlay,
			classList:["close_overlay_button"],
			innerText:"X",
			onClick:() => {
				this.overlayClose();
			}
		});
	}

	loadEditorElement(object:SerializedPanelState){
		const element = this.availablePanels.find( av => av.name == object.panelType);
		if (element === undefined)
			throw Error(`Type ${object.panelType} not found in available panels. Maybe extension not loaded?`);
		this.stateHandler.addPanel(element.fromObject(object, document.getElementById("panel-content") as HTMLElement));
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

	createElement<K extends keyof HTMLElementTagNameMap>(
		tagname:K,
				options:Partial<{
			parent:HTMLElement,
			afterElement:HTMLElement,
			beforeELement:HTMLElement,
			classList:string[],
			id:string,
			innerText:string,
			onClick:(this:GlobalEventHandlers, event:MouseEvent) => any,
			children:Node[],
			innerHTML:string,
		}>
	): HTMLElementTagNameMap[K] {
		const element = document.createElement(tagname);
		Object.entries(options).forEach((val) => {
			switch(val[0]){
				case "parent":
					if (options.afterElement || options.beforeELement)
						throw Error("Only one can be set: parent or afterElement")
					options.parent?.appendChild(element);
					break;
				case "afterElement":
					if (options.parent || options.beforeELement)
						throw Error("Only one can be set: parent or afterElement");
					options.afterElement?.after(element);
					break;
				case "beforeElement":
					if (options.parent || options.afterElement)
						throw Error("");
					options.beforeELement?.before(element);
				case "classList":
					element.classList.add(...options.classList ?? []);
					break;
				case "id":
					element.id = options.id ?? element.id;
					break;
				case "innerText":
					element.innerText = options.innerText ?? element.innerText;
					break;
				case "innerHTML":
					element.innerHTML = options.innerHTML ?? element.innerHTML;
					break;
				case "onClick":
					element.onclick = options.onClick ?? element.onclick;
					break;
				case "children":
					element.append(...options.children ?? new Array<Node>())
					break;
				default:
					break
			}
		});
		return element;
	}
}
