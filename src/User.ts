import { SerializedPanelState, SerializedAppStateDescriptor } from "./App"

export class frontendClient{
    _isLoggedIn:boolean
    onStateChange:(val:boolean) => void
    constructor(onNotLogedIn:() => void){
        this._isLoggedIn = false;
        this.checkLogin().then( (result) => {
            this.isLoggedIn = result;
        }).catch(() => {
            onNotLogedIn();
        })
        this.onStateChange = () => {};
    }

    get isLoggedIn(){
        return this._isLoggedIn;
    }

    set isLoggedIn(val:boolean){
        console.log(`isLoggedIn ${val}`);
        if (this._isLoggedIn == val)
            return ;
        this._isLoggedIn = val;
        this.onStateChange(val);
    }

    async register(email:string, password:string){
        const response = await fetch("/register", {
            method:"POST",
            headers: {
              'Content-Type': 'application/json'
            },
            body:JSON.stringify({
                email:email,
                password:password
            })
        });
        if (response.status != 201)
            throw Error(`Registration failed: Server returned status \
${response.status}and message ${await response.body?.getReader().read()}`);
        return this.login(email, password);
    }

    async login(email:string, password:string){
        console.log("Loggin in...");
        const response = await fetch("/login", {
            method:"POST",
            credentials: 'include',
            headers: {
            'Content-Type': 'application/json'
            },
            body:JSON.stringify({
                email:email,
                password:password,
            })
        })
        if (response.status != 200)
            throw Error(`Login failed`);
        this.isLoggedIn = true;
        return ;
    }

    async getOverview(){
        if (!this.isLoggedIn)
            await this.checkLogin();            
        const response = await fetch("/toc", {credentials: 'include'})
        if (!response.ok){
            throw Error (`Request returned status ${response.status}`);
        }
        const data = await response.json() as SerializedAppStateDescriptor[];
        return (data);
    }

    async setOverview(data:SerializedAppStateDescriptor[]){
        if (!this.isLoggedIn)
            await this.checkLogin();
        const response = await fetch("/toc", {
            method: "POST",
            credentials: "include",
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
        });
        if (!response.ok)
            throw Error(`Request returned status ${response.status}`);
        return ;
    }

    async checkLogin():Promise<boolean>{
        const response = await fetch("/check", {credentials: 'include'})
        // WITH VITE THIS RETURNS SOMETHING...
        this.isLoggedIn = response.ok;
        if (!response.ok)
            throw Error("Not logged in!");
        return response.ok;
    }

    async requestDocument(id:string){
        if (!this.isLoggedIn)
            await this.checkLogin();
        const response = await fetch("/load", 
            {
                method:'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json'
                },
                body:JSON.stringify({ documentId:id })
            })
        if (!response.ok)
            throw Error(`Request returned status ${response.status}`);
        const data = await response.json() as SerializedPanelState[];
        return data;
    }

    async saveDocument(id:string, state:SerializedPanelState[]){
        if (!this.isLoggedIn)
            await this.checkLogin();
        const response = await fetch("/save", {
            method:"POST",
            credentials:'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body:JSON.stringify({
                id:id,
                data:state,
            })
        });
        if (!response.ok)
            throw Error(`Request returned status ${response.status}`);
        return ;
    }

    async saveFile(id:string, data:Blob){
        const formData = new FormData();
        // "file" is the key your server expects in request.files["file"]
        formData.append("files", data, "upload.bin");
      
        const response = await fetch(`/store/${encodeURIComponent(id)}`, {
          method: "POST",
          body: formData,
        });
      
        if (!response.ok) {
          throw new Error(`Failed to save file for id ${id}: ${response.statusText}`);
        }
    }

    async loadFile(id:string, cache:Cache){
        const response = await fetch(`/download/${id}`)
        if (!response.ok)
            throw Error(`File ${id} couldnt be loaded from remote`);
        const blob = await response.blob();
        const cacheKey = `${window.location.origin}/download/${id}`
        await cache.put(
            new Request(cacheKey),
            new Response(blob, {headers: {"Content-Type": blob.type}})
        )
        return cacheKey;
    }
}