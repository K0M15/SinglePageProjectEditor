import { App, SerializedPanelState } from "./App";

enum EditorType{
	TEXT,
	PICTURE,
	ACTION,
}

export interface EditorElementDescription{
	cls:new (editorElementId:string, parent:HTMLElement, options:any) => EditorElement;
	fromObject:(
		obj:SerializedPanelState,
		parent:HTMLElement,
		load_file:(...args:any[]) => Promise<string>,
	) => EditorElement;
	name:string;
	description:string;
}

export interface SerializedElementDescription extends Partial<EditorElementDescription>{}

function elementBuilder<K extends keyof HTMLElementTagNameMap>(
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

export class EditorElement{
	pageElement:HTMLDivElement;
	buttonContainer:HTMLDivElement;
	editorElementId:string;
	type:string;
	changeListener:((el:EditorElement)=>void)[];
	constructor(editorElementId:string, type:string, parent:HTMLElement){
		this.pageElement = document.createElement("div");
		this.pageElement.classList.add("editorElement");
		// Delete Button
		this.buttonContainer = elementBuilder("div", 
			{
				parent:this.pageElement,
				classList:["elem-btn-cont"],
				children:[
					elementBuilder("button", {
						innerText:"🗑️",
						onClick:() => {
							this.delete();
						}
					}),
					elementBuilder("button", {
						innerText:"⬆️",
						onClick:() => {
							this.moveUp();
						}
					}),
					elementBuilder("button", {
						innerText:"⬇️",
						onClick:() => {
							this.moveDown();
						}
					}),
				]
			}
		)
		this.editorElementId = editorElementId;
		this.type = type;
		this.changeListener = [];
		parent.appendChild(this.pageElement);
	}
	triggerChange(){
		this.changeListener.forEach((listener) => {
			listener(this);
		})
	}
	toggleEditor(){
		console.error("Should be implemented by Class");
	}
	delete (){
		this.triggerChange();
	}
	async serialize(app:App):Promise<SerializedPanelState>{
		throw Error("Object serialization should be implemented by child class");
	}

	static fromDataObj(obj:SerializedPanelState, parent:HTMLElement, loadFile:(id:string, cache:Cache)=>Promise<string>):EditorElement{
		throw Error("Object serialization should be implemented by child class");
	}
	
	moveUp(){
		this.pageElement.parentElement?.insertBefore(this.pageElement, this.pageElement.previousElementSibling);
	}

	moveDown(){
		this.pageElement.parentElement?.insertBefore(this.pageElement, this.pageElement.nextElementSibling?.nextElementSibling);
	}
}

class EditorText extends EditorElement{
	displayElement;
	textareaElement;
	constructor(editorElementId:string, parent:HTMLElement) {
		super(editorElementId, "Text", parent);
		this.pageElement.classList.add("editorText");
		// Textarea element for editor mode
		this.textareaElement = document.createElement("textarea")
		this.pageElement.appendChild(this.textareaElement);
		this.pageElement.ondblclick = () => {
			this.toggleEditor();
		};
		// Display element for display mode
		this.displayElement = document.createElement("div");
		this.displayElement.classList.add("displayText");
		this.pageElement.appendChild(this.displayElement);
	}

	toggleEditor(){
		this.triggerChange();
		if (this.pageElement.classList.contains("editMode")){
			this.pageElement.classList.remove("editMode");
			this.render();
		}
		else
			this.pageElement.classList.add("editMode");
	}

	render(){
		let data = this.textareaElement.value;
		this.displayElement.innerHTML = this.replaceMD(data);
	}

	replaceMD(markdown:string)
	{
		
		// Escape HTML
		markdown = markdown.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/(?<!^)>/gm, "&gt;");
		
		// Blockquotes
		markdown = markdown.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');
		// Code blocks (```...```)
		markdown = markdown.replace(/```([\s\S]*?)```/g, (_, code) =>
			`<pre class="code-block"><code>${code}</code></pre>`
		);

		// Inline code (`...`)
		markdown = markdown.replace(/`([^`\n]+)`/g, '<code>$1</code>');

		// Headings
		markdown = markdown.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
		markdown = markdown.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
		markdown = markdown.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
		markdown = markdown.replace(/^### (.*)$/gm, '<h3>$1</h3>');
		markdown = markdown.replace(/^## (.*)$/gm, '<h2>$1</h2>');
		markdown = markdown.replace(/^# (.*)$/gm, '<h1>$1</h1>');
	   
		// Bold
		markdown = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
		markdown = markdown.replace(/__(.*?)__/g, '<strong>$1</strong>');

		// Italic
		markdown = markdown.replace(/\*(.*?)\*/g, '<em>$1</em>');
		markdown = markdown.replace(/_(.*?)_/g, '<em>$1</em>');

		// Ordered Lists
		markdown = markdown.replace(/^\d+\. (.*)$/gm, '<li>$1</li>');
		markdown = markdown.replace(/(<li>.*<\/li>)/gms, '<ol>$1</ol>');

		// Unordered Lists
		markdown = markdown.replace(/^[-+*] (.*)$/gm, '<li>$1</li>');
		markdown = markdown.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');

		// Paragraphs (lines that don't already have tags)
		markdown = markdown.replace(/^(?!<h|<ul>|<ol>|<li>|<blockquote>|<pre>|<p>|<code>)(.+)$/gm, '<p>$1</p>');

		return markdown;
	}

	delete(){
		this.pageElement.remove();
		super.delete();
	}
	
	async serialize(app:App){
		return {
			panelType:this.type,
			data:this.textareaElement.value,
			id:this.editorElementId,
		};
	}

	static fromDataObj(obj:SerializedPanelState, parent:HTMLElement, load_file:any){
		if (obj.id === undefined || obj.data === undefined){
			throw Error("obj corrupted");
		}
		const res = new EditorText(obj.id, parent);
		res.textareaElement.value = obj.data;
		res.render();
		return res;
	}
}

class EditorPicture extends EditorElement{
	imageElement;
	editorElement;
	fileSelectorElement;
	linkSelectorElement;
	constructor(editorElementId:string, parent:HTMLElement){
		super(editorElementId, "Picture", parent);
		this.pageElement.classList.add("editorPicture", "editMode");
		this.imageElement = document.createElement("img");
		this.imageElement.src = "";
		this.editorElement = document.createElement("div");
		this.editorElement.classList.add("edit");
		let btn_file = document.createElement("button");
		let lbl_file = document.createElement("label");
		this.fileSelectorElement = document.createElement("input");
		btn_file.innerText = "Select Local";
		btn_file.onclick = () => {
			this.fileSelectorElement.click();
		}
		this.fileSelectorElement.type = "file";
		this.fileSelectorElement.accept = "image/*,.svg";
		this.fileSelectorElement.hidden = true;
		lbl_file.classList.add("file-button");
		lbl_file.appendChild(btn_file);
		lbl_file.appendChild(this.fileSelectorElement);
		this.linkSelectorElement = document.createElement("input");
		this.linkSelectorElement.type = "text";
		this.linkSelectorElement.placeholder = "Paste Webpath";
		this.editorElement.appendChild(lbl_file);
		this.editorElement.appendChild(this.linkSelectorElement);
		let btn_close = document.createElement("button");
		btn_close.onclick = () => {
			this.toggleEditor();
		}
		btn_close.innerText = "Close";  
		this.editorElement.appendChild(btn_close);
		this.pageElement.appendChild(this.editorElement);
		this.pageElement.appendChild(this.imageElement);
		this.pageElement.ondblclick = () => {
			this.toggleEditor();
		};
	}

	toggleEditor(){
		if (this.pageElement.classList.contains("editMode")){
			this.triggerChange();
			this.pageElement.classList.remove("editMode");
			if (this.linkSelectorElement.value)
				this.imageElement.src = this.linkSelectorElement.value;
			else if (this.fileSelectorElement.value && this.fileSelectorElement.files != null){
				const file = this.fileSelectorElement.files[0];
				if (!file) return;

				const reader = new FileReader();
				reader.onload = (e) => {
					if (e.target != null
						&& e.target.result != null 
						&& typeof e.target.result == "string")
					this.imageElement.src = e.target.result; 
				};
				reader.readAsDataURL(file);
			}
		}
		else
			this.pageElement.classList.add("editMode");
	}
	
	delete(){
		this.pageElement.remove();
		super.delete();
	}

	async saveLoadedImageData(){
		const cache = await caches.open("spe-images");
		const response = await fetch(this.imageElement.src);
		if (!response.ok) throw Error(`Could not fetch image \
			${this.editorElementId} from Source ${this.imageElement.src}\
			`);
		const blob = await response.blob();
		const cacheKey = `http://synthetic.spe/${this.editorElementId}`;
		await cache.put(
			new Request(cacheKey),
			new Response(blob, {headers: { "Content-Type": blob.type }})
		);
		return cacheKey;
	}
	
	async saveLoadedImageRemote(app:App){
		const cache = await caches.open("spe-images");
		const response = await cache.match(`http://synthetic.spe/${this.editorElementId}`);
		if (response === undefined)
			throw Error(`Cannot read ${this.editorElementId}`);
		const blob = await response.blob();
		app.client.saveFile(this.editorElementId, blob);
	}

	async serialize(app:App){
		const result = {
			id:this.editorElementId,
			panelType:this.type,
			data:await this.saveLoadedImageData(),
		}
		await this.saveLoadedImageRemote(app);
		return result;
	}

	static fromDataObj(obj:SerializedPanelState, parent:HTMLElement, load_file:(id:string, cache:Cache)=>Promise<string>){
		if (obj.id === undefined || obj.data === undefined){
			throw Error("obj corrupted");
		}
		const res = new EditorPicture(obj.id, parent);
		caches.open("spe-images").then((cache) => 
			cache.match(obj.data).then(async (resp) => {
				if (resp === undefined){
					resp = await cache.match(await load_file(obj.id, cache));
					if (resp === undefined)
						throw Error(`File not found on remote or local. FileID: ${obj.id}`)
				}
				resp.blob().then((blob) => {
					res.imageElement.src = URL.createObjectURL(blob);
					res.linkSelectorElement.value = res.imageElement.src;
				})
			})
		)
		// res.imageElement.src = obj.src;
		// res.imageElement.linkSelectorElement.value = obj.src;
		res.toggleEditor();
		return res;
	}
}

type EditorActionCell = string | number | boolean | null;
type EditorActionCol = Array<EditorActionCell>;
type EditorActionGrid = Array<EditorActionCol>;

class EditorAction extends EditorElement{
	data:EditorActionGrid;
	constructor(editorElementId:string, parent:HTMLElement){
		super(editorElementId, "Action", parent);
		this.data = [
			["", "Description", "Responsible", "Date"]
		]
		this.pageElement.classList.add("editorAction");
		this.pageElement.ondblclick = () => {
			if (this.pageElement.classList.contains("editMode"))
				this.pageElement.classList.remove("editMode");
			else
				this.pageElement.classList.add("editMode");
		}
		this.render();
	}

	render(){
		let result = document.createElement("table")
		// Header
		let header = document.createElement("tr");
		header.append(...this.data[0].map((e)=>{
			let el = document.createElement("th");
			el.innerText = e as string;
			return el;
		}));
		result.appendChild(header);
		// Rows
		let ctr = 1;
		while (ctr < this.data.length){
			let row = document.createElement("tr");
			row.append(...this.data[ctr].map((e, index) => this.handleFieldData(e, ctr, index)));
			result.appendChild(row);
			ctr++;
		}
		// Edit row
		let row = document.createElement("tr");
		row.classList.add("editorActionLastRow");
		let btn_add_new = document.createElement("button");
		btn_add_new.onclick = () => { this.add_row(); }
		btn_add_new.innerText = "Add";
		btn_add_new.classList.add("new");
		row.appendChild(btn_add_new);
		result.appendChild(row);
		let btn_cont = Array.from(this.pageElement.children).find(el => el.classList.contains("elem-btn-cont"));
		if (btn_cont == undefined)
			this.pageElement.replaceChildren(result);
		else
			this.pageElement.replaceChildren(btn_cont, result);
	}

	add_row(){
		this.data.push([false, null, null, null]);
		this.triggerChange();
		this.render();
	}

	handleFieldData(data:EditorActionCell, row:number, col:number){
		let result = document.createElement("td");
		const add_edit_handler = () =>{
			result.ondblclick = () => {
				let in_data = document.createElement("input");
				in_data.onblur = (e) => {
					this.data[row][col] = in_data.value;
					this.triggerChange();
					this.render();
				}
				result.replaceChildren(in_data);
				in_data.focus();
			}
		}
		if(col == 0)
		{
			let check = document.createElement("input");
			check.type = "checkbox";
			check.onchange = () => {
				console.log(check.checked);
				this.data[row][col] = check.checked;
			}
			if (typeof data == "boolean")
				check.checked = data;
			else 
				check.checked = false;
			result.appendChild(check);
		}
		else if(typeof data == "string" && !isNaN(Date.parse(data))){
			result.innerText = Date.parse(data).toLocaleString();
			add_edit_handler();
		}
		else if (
			(typeof data === "string")
			&& data != ""){
			result.innerText = data;
			add_edit_handler();
		}   
		else if (data === null || data == "")
		{
			let in_data = document.createElement("input");
			in_data.onblur = (e) => {
					this.triggerChange();
					this.data[row][col] = in_data.value;
				this.render();
			}
			result.appendChild(in_data);
		}
		return result;
	}

	async serialize(){
		return {
			panelType:this.type,
			id:this.editorElementId,
			data:JSON.stringify(this.data)
		};
	}

	static fromDataObj(obj:SerializedPanelState, parent:HTMLElement, load_file:any){
		if (obj.id === undefined || obj.data === undefined){
			throw Error("obj corrupted");
		}
		const res = new EditorAction(obj.id, parent);
		res.data = JSON.parse(obj.data);
		res.render();
		return res;
	}
}

export const builtinPanels:EditorElementDescription[] = [
	{
		cls:EditorText,
		fromObject:EditorText.fromDataObj,
		name:"Text",
		description:"A Markdown-Formated textfield"
	},
	{
		cls:EditorPicture,
		fromObject:EditorPicture.fromDataObj,
		name:"Picture",
		description:"A Picture from a link or from a file"
	},
	{
		cls:EditorAction,
		fromObject:EditorAction.fromDataObj,
		name:"Action",
		description:"An Element oranizing actions"
	}
]