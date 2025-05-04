import {builtinPanels} from "./builtinPanels";
import {EditorElementDescription, EditorElement, SerializedElementDescription} from "./builtinPanels";
import { generateId } from "./id_generator";
import { frontendClient as FrontendClient } from "./User";

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

class StateHandler{
	state:AppState;
	openedState:Partial<SerializedAppStateDescriptor>;
	availableStates:SerializedAppStateDescriptor[];

	constructor(app:App){
		this.state = new AppState();
		this.openedState = {
			id:generateId(),
			name:undefined,
			ts:Date.now(),
			panels:[]
		};
		this.availableStates = [];
		this.loadAvailableStates(app);
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

	preLoadRemote(id:string, app:App){
		app.client.requestDocument(id).then((res) => {
			localStorage.setItem(id, JSON.stringify(res));
		})
	}

	loadAvailableStatesRemote(app:App){
		app.client.getOverview().then( (remoteStates) => {
			remoteStates.forEach((val) => {
				const idx = this.availableStates.findIndex(state => state.id == val.id)
				if (idx == -1){
					this.availableStates.push(val);
					this.preLoadRemote(val.id, app);
				}
				else{
					Object.assign(this.availableStates[idx], val);
					this.preLoadRemote(val.id, app);
				}
			})
		})
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

	loadState(stateId:string, availablePanels:EditorElementDescription[]){
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
			const element = pan.fromObject(data[i]);
			this.state.pageElements.push(element);
		}
	}

	saveState(app:App){
		function saveRemote(ser:SerializedPanelState[]){
			if (app.client.isLoggedIn){
				if (app.stateHandler.openedState.id === undefined)
					throw Error("Opened state not saveable");
				app.stateHandler.updateAvailableStates(app);
				app.client.setOverview(app.stateHandler.availableStates);
				app.client.saveDocument(
					app.stateHandler.openedState.id,
					ser
				)
			}
		}

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
			this.state.serialize().then((data) =>{
				localStorage.setItem(this.openedState.id as string, JSON.stringify(data));
				saveRemote(data);
			})
			app.overlayClose();
		}
		const button_save_as = document.createElement("button");
		button_save_as.innerText = "Save as";
		button_save_as.onclick = () => {
			app.overlayClose();
			this.selectAvailableState(app,
				(stateID) => {
					const purgeState = this.availableStates.find(val => val.id == stateID);
					if (purgeState === null)
						throw Error(`Could not save current state ${stateID}, no state with id found.`);
					this.openedState.id = stateID;
					this.saveAvailableStates(app);
					this.state.serialize().then((data) => {
						localStorage.setItem(this.openedState.id as string, JSON.stringify(data));
						saveRemote(data);
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

}

export class App{
	client:FrontendClient
	stateHandler:StateHandler;
	availablePanels:EditorElementDescription[];
	private overlayEventBuffer?:((this:GlobalEventHandlers, event:KeyboardEvent) => void) | null;

	constructor(isStandalone:boolean){
		this.availablePanels = [];
		this.availablePanels.push(...builtinPanels);
		this.stateHandler = new StateHandler(this);
		this.setupPage();
		this.client = new FrontendClient(() => {
			if (!isStandalone)
				this.displayLogin();
		})
		this.client.onStateChange = (loggedIn:boolean) => {
			if (loggedIn){
				this.stateHandler.loadAvailableStatesRemote(this); 
			}
		}
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
			button.onmouseover = null; // TODO: onhover -> display panel.description next to mouse :)
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
			this.stateHandler.selectAvailableState(this, (stateID) => {
				this.stateHandler.loadState(stateID, this.availablePanels)
				this.overlayClose();
			});
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

	displayLogin(){
		const modal = this.createElement("div", {
			classList: ["modal"],
		});
		const inputEmail = this.createElement("input", {});
		inputEmail.type = "text";
		const inputPassword = this.createElement("input", {});
		inputPassword.type = "password";
		const loginButton = this.createElement("button", {
			innerText:"Login",
			onClick: () => {
				this.client.login(inputEmail.value, inputPassword.value).then( () => {
					this.overlayClose();
				})
			}
		});
		const registerButton = this.createElement("button", {
			innerText:"Register",
			onClick: () => {
				this.client.register(inputEmail.value, inputPassword.value).then( () => {
					this.overlayClose();
				})
			}
		})
		modal.append(
			inputEmail,
			inputPassword,
			document.createElement("br"),
			loginButton,
			registerButton
		);
		this.showOverlay(modal);
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
				case "onClick":
					element.onclick = options.onClick ?? element.onclick;
				default:
					break
			}
		});
		return element;
	}
}
