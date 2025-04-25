export interface EditorElementDescription{
	cls:new (...args:any[]) => EditorElement;
	name:string;
	description:string;
}

export interface SerializedElementDescription extends Partial<EditorElementDescription>{}

export class EditorElement{
	editorElementId;
	type;
	constructor(editorElementId, type){
		this.editorElementId = editorElementId;
		this.type = type;
	}
	toggleEditor(){
		console.error("Should be implemented by Class");
	}
	delete (){
		// Nothing to do...
	}
}

class EditorText extends EditorElement{
	pageElement;
	displayElement;
	textareaElement;
	buttonContainer;
	constructor(editorElementId) {
		super(editorElementId, EditorType.TEXT);
		this.pageElement = document.createElement("div");
		this.pageElement.classList.add("editorText");
		// Delete Button
		this.buttonContainer = document.createElement("div");
		this.buttonContainer.classList.add("elem-btn-cont");
		let deleteButton = document.createElement("button");
		deleteButton.innerHTML = "🗑️";
		deleteButton.onclick = () => {
			this.delete();
		}
		this.buttonContainer.appendChild(deleteButton);
		this.pageElement.appendChild(this.buttonContainer);
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
		// Append to body
		document.body.insertBefore(
			this.pageElement,
			document.getElementById("pageEnd"));
	}

	toggleEditor(){
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

	replaceMD(markdown)
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
	
	async serialize(){
		return {
			type:this.type,
			text:this.textareaElement.value,
			editorElementId:this.editorElementId,
		};
	}

	static fromDataObj(obj){
		if (obj.editorElementId === undefined || obj.text === undefined){
			throw Error("obj corrupted");
		}
		const res = new EditorText(obj.editorElementId);
		res.textareaElement.value = obj.text;
		res.render();
		return res;
	}
}

class EditorPicture extends EditorElement{
	pageElement;
	imageElement;
	editorElement;
	fileSelectorElement;
	linkSelectorElement;
	imageData;
	constructor(editorElementId){
		super(editorElementId, EditorType.PICTURE);
		this.pageElement = document.createElement("div");
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
		lbl_file.classList.add = "file-button";
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
		document.body.insertBefore(
			this.pageElement,
			document.getElementById("pageEnd"));
	}

	toggleEditor(){
		if (this.pageElement.classList.contains("editMode")){
			this.pageElement.classList.remove("editMode");
			if (this.linkSelectorElement.value)
				this.imageElement.src = this.linkSelectorElement.value;
			else if (this.fileSelectorElement.value){
				const file = this.fileSelectorElement.files[0];
				if (!file) return;

				const reader = new FileReader();
				reader.onload = (e) => { this.imageElement.src = e.target.result; };
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
	
	async serialize(){
		return {
			editorElementId:this.editorElementId,
			type:this.type,
			src:await this.saveLoadedImageData(),
		};
	}

	static fromDataObj(obj){
		if (obj.editorElementId === undefined || obj.src === undefined){
			throw Error("obj corrupted");
		}
		const res = new EditorPicture(obj.editorElementId);
		caches.open("spe-images").then((cache) => 
			cache.match(obj.src).then((resp) =>
				resp.blob().then((blob) => {
					res.imageElement.src = URL.createObjectURL(blob);
					res.linkSelectorElement.value = res.imageElement.src;
				})
			)
		)
		// res.imageElement.src = obj.src;
		// res.imageElement.linkSelectorElement.value = obj.src;
		res.toggleEditor();
		return res;
	}
}

class EditorAction extends EditorElement{
	pageElement;
	data;
	constructor(editorElementId){
		super(editorElementId, EditorType.ACTION);
		this.data = [
			["", "Description", "Responsible", "Date"]
		]
		this.pageElement = document.createElement("div");
		this.pageElement.classList.add("editorAction");
		document.body.insertBefore(
			this.pageElement,
			document.getElementById("pageEnd"));
		this.render();
	}

	render(){
		let result = document.createElement("table")
		// Header
		let header = document.createElement("tr");
		header.append(...this.data[0].map((e)=>{
			let el = document.createElement("th");
			el.innerText = e;
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
		this.pageElement.replaceChildren(result);
	}

	add_row(){
		this.data.push([false, null, null, null]);
		this.render();
	}

	handleFieldData(data, row, col){
		let result = document.createElement("td");
		const add_edit_handler = () =>{
			result.ondblclick = () => {
				let in_data = document.createElement("input");
				in_data.onblur = (e) => {
					this.data[row][col] = in_data.value;
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
			check.checked = data;
			result.appendChild(check);
		}
		else if(!isNaN(Date.parse(data))){
			result.innerText = data.toLocaleDateString();
			add_edit_handler();
		}
		else if (
			(typeof data === "string" || data instanceof String)
			&& data != ""
			){
			result.innerText = data;
			add_edit_handler();
		}   
		else if (data === null || data == "")
		{
			let in_data = document.createElement("input");
			in_data.onblur = (e) => {
				this.data[row][col] = in_data.value;
				this.render();
			}
			result.appendChild(in_data);
		}
		return result;
	}

	async serialize(){
		return {
			type:this.type,
			editorElementId:this.editorElementId,
			data:this.data
		};
	}

	static fromDataObj(obj){
		if (obj.editorElementId === undefined || obj.data === undefined){
			throw Error("obj corrupted");
		}
		const res = new EditorAction(obj.editorElementId);
		res.data = obj.data;
		res.render();
		return res;
	}
}

export const builtinPanels:EditorElementDescription[] = [
	{
		cls:EditorText,
		name:"Text",
		description:"A Markdown-Formated textfield"
	},
	{
		cls:EditorPicture,
		name:"Picture",
		description:"A Picture from a link or from a file"
	},
	{
		cls:EditorAction,
		name:"Action",
		description:"An Element oranizing actions"
	}
]