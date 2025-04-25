import {builtinPanels} from "./builtinPanels";
import type {EditorElementDescription, EditorElement} from "./builtinPanels";
import { generateId } from "./id_generator";

interface AppState{
	pageElements:EditorElement[];
}

interface SerializedAppStateDescriptor{
	id:string;
	name?:string;
	ts:number;
}

interface SerializedAppState{
	createdOn:string;
	lastModification:string;
	pageData:any[];
}

class StateHandler{
	state:AppState;
	openedState:Partial<SerializedAppStateDescriptor>;
	availableStates:SerializedAppStateDescriptor[];

	constructor(){
		this.state = { pageElements:[] as EditorElement[] };
		this.openedState = {
			id:generateId(),
			name:undefined,
			ts:Date.now()
		};
		this.loadAvailableStates();
	}

	loadAvailableStates(){
		try{
			const available = localStorage.getItem("spe-pages");
			if (available === null)
				return false;
			this.availableStates = JSON.parse(available);
		}
		catch(e){
			this.availableStates = [];
			this.saveAvailableStates();
		}
	}

	saveAvailableStates(){
		localStorage.setItem("spe-pages", JSON.stringify(this.availableStates));
	}

	addPanel(element:EditorElement){
		this.state.pageElements.push(element);
	}

	removePanel(elementId:string){
		const elementIndex = this.state.pageElements.findIndex(el => el.editorElementId === elementId)
		if (elementIndex == -1)
			throw Error(`Element with ID ${elementId} does not exist`);
		this.state.pageElements[elementIndex].delete();
		this.state.pageElements.splice(elementIndex, 1);
	}

	selectAvailableState(){
		
	}

	async loadState(){
		let existingPages;
		const page = existingPages[existingPages.length - 1].id;
		const data = JSON.parse(localStorage.getItem(page)).pageData;
		const max = data.length;
		for(let i = 0; i < max; i++){
			let obj = data[i][1];
			try{addNewEditorElement(obj[1].type, obj[1]);} catch(e){
				console.error(`Failed loading Object: ${JSON.stringify(obj)}`);
				console.error(e);
			}
		}
	}
	async saveState(){
		// First find state, then save, if not exist create new
		existingPages.push({id:id, ts:datetime});
		const totalData = {};
		totalData["createdOn"] = new Date(datetime).toISOString();
		totalData["pageData"] = lstPageElements.map(async (el, index) => {
			data = await el.serialize();
			return [index, data];
		});
		totalData["pageData"] = await Promise.all(
			totalData["pageData"].map((val, index) => (
				val.then((res) => {
					return [index, res]
				}).catch((reason)=>{
					console.error(`Error while waiting on promise at index ${index}`);
				})
			))
		)
		
		localStorage.setItem(id, JSON.stringify(totalData));
		localStorage.setItem("spe-pages", JSON.stringify(existingPages));
	}

}

export class App{
	stateHandler:StateHandler;
	availablePanels:EditorElementDescription[];
	constructor(){
		this.availablePanels = [];
		this.availablePanels.push(...builtinPanels);
		this.stateHandler = new StateHandler();
	}

	setupPage(){
		const body = document.body;
		//	PANEL BUTTONS
		for (let panel of this.availablePanels)
		{
			let button = document.createElement("button");
			button.innerText = panel.name;
			button.classList.add("btn-add-panel");
			button.onclick = () => {
				this.stateHandler.addPanel(new panel.cls(generateId))
			}
			button.onmouseover = null; //todo: onhover -> display panel.description next to mouse :)
			body.appendChild(button);
		}
		body.appendChild(document.createElement("br"));
		//	LOAD AND SAVE BUTTONS
		let btnSaveLoc = document.createElement("button");
		btnSaveLoc.innerText = "Save (Browser)";
		btnSaveLoc.onclick = this.stateHandler.saveState;
		let btnLoadLoc = document.createElement("button");
		btnLoadLoc.innerText = "Load (Browser)";
		btnLoadLoc.onclick = this.stateHandler.selectAvailableState;
	}

	addNewEditorElement(type:string){
		const element = this.availablePanels.find(elem => elem.name == type);
		if (element === undefined)
			throw Error(`Type ${type} not found in available panels. Maybe extension not loaded?`);
		this.stateHandler.addPanel(new element.cls(generateId()));
	}

	loadEditorElement(cls:new (...args:any[]) => EditorElement, object:any){
		
	}

	generateStaticSite(){}
}