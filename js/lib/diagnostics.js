class Diagnostics{
    constructor(parent){
        this.id=null;
        this.nodes=[];
        this.diags=[];

        this.tops=[];

        this.errorStr=['OK', 'WARN', 'ERROR', 'STALE'];
        this.errorColor=['green', 'rgb(255, 196, 0)', 'red', '#8f8f8f'];

        this.table=null;
        this.updateList=[];
        this.titleStatet=null;

        this.parent=(parent)?(typeof parent=='string'?document.getElementById(parent):parent):null;
    }

    setStruct(struct){
        this.id=struct.id;
        this.tops=[];

        this.nodes=struct.nodes;
        this.nodes.forEach((node)=>{
            node.parents=[];
            node.childs=[];
            node.diags=[];
            node.state=null;
        });

        this.diags=struct.diags;
        this.diags.forEach((diag, i)=>{
            diag.state=null;
            this.nodes[diag.parent].diags.push(i);
        });

        struct.links.forEach((link)=>{
            this.nodes[link.parent].childs.push(link.child);
            this.nodes[link.child].parents.push(link.parent);
        });

        this.nodes.forEach((node, i)=>{
            if(node.parents.length<=0){
                this.tops.push(i);
            }
        });

        if(this.parent) this.parent.replaceChildren(this.buildTable());
    }

    setStatus(status){
        if(status.id!=this.id) return;

        this.diags.map((state, i)=>{
            state.state=status.diags[i];
        });

        let allLevel=0;
        this.nodes.map((state, i)=>{
            state.state=status.nodes[i];
            if(this.tops.includes(i)&&status.nodes[i].level>allLevel) allLevel=status.nodes[i].level;
        });

        this.titleState.style.color=this.errorColor[allLevel];

        this.updateList.forEach((node)=>{
            if(node.type=='node') this.updateNode(node);
            else if(node.type=='diag') this.updateDiag(node);
        });
    }

    buildTable(){
        if(this.table){
            this.table.remove();
            this.updateList=[];
        }
        this.table=document.createElement('table');
        this.table.style.cssText='border-collapse: collapse;';
        const header=this.table.createTHead();
        const title=header.insertRow();
        title.style.cssText='border-bottom: 1px solid #000;';
        const titleT=title.insertCell();
        titleT.style.textAlign='center';
        titleT.colSpan=2;
        this.titleState=document.createElement('span');
        this.titleState.textContent='●';
        this.titleState.style.color='red';
        titleT.append(this.titleState, ' 診斷資訊');
        titleT.style.cursor='pointer';
        titleT.onmouseover=(e)=>{if(e.target==titleT) e.target.style.backgroundColor='#b9b9b9';}
        titleT.onmouseout=(e)=>{if(e.target==titleT) e.target.style.backgroundColor='transparent';}
        
        let body=null;
        titleT.onclick=(e)=>{
            const parent=e.target;
            if(parent!=titleT) return;
            if(body){
                body.remove();
                body=null;
                this.updateList=[];
            }else{
                body=this.table.createTBody();
                this.tops.forEach((i)=>{
                    this.buildNode(body, i)
                });
            }
        }

        return this.table;
    }

    buildNode(body, index, id=''){
        const nId=`${id}/${index}`;
        const row=body.insertRow();
        row.style.cssText='border-bottom: 1px solid #000;';
        const stateS=document.createElement('span');
        stateS.textContent='●';
        stateS.style.color='red';
        const stateC=row.insertCell();
        stateC.style.cssText='border-right: 1px solid #000;';
        stateC.appendChild(stateS);
        const path=row.insertCell();
        path.textContent=this.nodes[index].path;
        path.style.cursor='pointer';
        path.onmouseover=(e)=>{if(e.target==path) e.target.style.backgroundColor='#b9b9b9';}
        path.onmouseout=(e)=>{if(e.target==path) e.target.style.backgroundColor='transparent';}
        let child=null;
        path.onclick=(e)=>{
            const parent=e.target;
            if(parent!=path) return;
            if(child){
                child.remove();
                child=null;
                this.updateList=this.updateList.filter(N=>!N.id.startsWith(node.id+'/'));
            }else{
                child=document.createElement('table');
                parent.appendChild(child);
                this.nodes[index].childs.forEach((i)=>{this.buildNode(child, i, nId);});
                this.nodes[index].diags.forEach((i)=>{this.buildDiag(child, i, nId);});
            }
        }
        
        const node={
            id: nId,
            type: 'node',
            index: index,
            path: path,
            state: stateS,
        };

        this.updateList.push(node);
        this.updateNode(node);
    }

    updateNode(node){
        const state=this.nodes[node.index].state;
        if(!state) return;
        node.state.style.color=this.errorColor[state.level];
        node.path.title=`level: ${this.errorStr[state.level]}\ninput level: ${this.errorStr[state.input_level]}\nlatch level: ${this.errorStr[state.latch_level]}`;
    }

    buildDiag(body, index, id=''){
        const nId=`${id}/${index}`;
        const row=body.insertRow();
        row.style.cssText='border-bottom: 1px solid #000;';
        const stateS=document.createElement('span');
        stateS.textContent='●';
        const stateC=row.insertCell();
        stateC.style.cssText='border-right: 1px solid #000;';
        stateC.style.backgroundColor='#a8a8fd';
        stateC.appendChild(stateS);
        const name=row.insertCell();
        name.textContent=this.diags[index].name;
        name.onmouseover=(e)=>{if(e.target==name) e.target.style.backgroundColor='#8383ff';}
        name.onmouseout=(e)=>{if(e.target==name) e.target.style.backgroundColor='#a8a8fd';}
        
        const node={
            id: nId,
            type: 'diag',
            index: index,
            name: name,
            state: stateS,
            child: null,
        };
        name.onclick=(e)=>{
            const parent=e.target;
            if(parent!=name) return;
            if(node.child){
                node.child.remove();
                node.child=null;
                this.updateList=this.updateList.filter(N=>!N.id.startsWith(node.id+'/'));
            }else{
                node.child=document.createElement('div');
                node.child.style.borderTop='1px solid #000';
                parent.appendChild(node.child);
            }
        }

        this.updateList.push(node);
        this.updateDiag(node);
    }

    updateDiag(diag){
        const state=this.diags[diag.index].state;
        if(!state) return;
        diag.state.style.color=this.errorColor[state.level];
        let title=`level: ${this.errorStr[state.level]}\ninput level: ${this.errorStr[state.input_level]}\nmessage: ${state.message}\n\n`;
        state.values.forEach((V)=>{
            title+=`${V.key}: ${V.value}\n`;
        });
        if(diag.child) diag.child.innerText=title;
    }
}

function resetDiagnostics(){
    return new Promise((resolve, reject) => {
        const service = new ROSLIB.Service({
            ros: ros,
            name: '/api/system/diagnostics/reset',
            serviceType: 'autoware_adapi_v1_msgs/srv/ResetDiagGraph'
        });

        const request = {};

        service.callService(request, function (result) {
            console.log('reset diagnostics:', result);
            if(result.status.success) resolve();
            else reject(result.status.message);
        });
    });
}