class Snake{

    height=20;
    width=20;
    blockW=20;
    map=[];
    face=0;
    pos=[];
    score=0;
    MaxScore=0;
    long=1;
    isStart=false;
    speed=200;

    print=true;
    
    constructor(element,blockWidht,x,y){
        this.blockW=blockWidht;
        (x>0)?this.width=x:this.width=20;
        (y>0)?this.height=y:this.height=20;
        let scoreboard=document.createElement("div");
        this.scoreboard=element.appendChild(scoreboard);
        let canvas=document.createElement("canvas");
        canvas.height=(this.height+1)*this.blockW;
        canvas.width=(this.width+5)*this.blockW;
        canvas.getContext("2d").fillStyle="#000000";
        canvas.getContext("2d").fillRect(0,0,(this.width)*this.blockW,(this.height)*this.blockW)
        this.canvas=element.appendChild(canvas);
        this.paint();
        this.reset();
    }

    reset(){
        for(let i=0;i<this.height*this.width;i++){
            this.map[i]=0;
        }
        this.score=0;
        this.face=0;
        this.lastScore=0;
        this.pos=[getRandom((this.width/4-1),(this.width*3/4-1)),getRandom((this.height/4-1),(this.height*3/4-1))];
        this.map[this.pos[1]*this.width+this.pos[0]]=this.score+this.long;
        this.setBerry();
        this.paint();
        const area=this.getArea();
        return [(this.score+this.long),this.getdic(),area,(this.getSpaceArea()-area)];
    }

    start(nextAction){
        if(this.isStart){
            this.isStart=false;
            clearInterval(this.loop);
        }else{
            this.isStart=true;
            this.loop=setInterval(()=>{
                if(!this.next(nextAction)){
                    if(this.score>this.MaxScore){
                        this.MaxScore=this.score;
                    }
                    this.isStart=false;
                    clearInterval(this.loop);
                    alert('Game over!\nScore:'+this.score);
                    this.reset();
                }
                this.paint();
            },this.speed);
        }
    }

    next(nextAction){
        if(nextAction!=null){
            let action=nextAction.nextAction(this.getNextStatus());
            if(action==null){
                return false;
            }
            this.setFace(action);
        }
        for(let i=0;i<this.height*this.width;i++){
            if(this.map[i]>0){
                this.map[i]--;
            }
        }
        switch(this.face){
            case 0:{
                if(this.pos[1]<=0||this.map[(this.pos[1]-1)*this.width+this.pos[0]]>0){
                    return false;
                }
                this.pos[1]--;
                break;
            }
            case 1:{
                if(this.pos[0]>this.width-2||this.map[this.pos[1]*this.width+(this.pos[0]+1)]>0){
                    return false;
                }
                this.pos[0]++;
                break;
            }
            case 2:{
                if(this.pos[1]>this.height-2||this.map[(this.pos[1]+1)*this.width+this.pos[0]]>0){
                    return false;
                }
                this.pos[1]++;
                break;
            }
            case 3:{
                if(this.pos[0]<=0||this.map[this.pos[1]*this.width+(this.pos[0]-1)]>0){
                    return false;
                }
                this.pos[0]--;
                break;
            }
        }
        if(this.map[this.pos[1]*this.width+this.pos[0]]<0){
            this.score++;
            if(!this.setBerry()){
                return false;
            }
        }
        this.map[this.pos[1]*this.width+this.pos[0]]=this.score+this.long;
        return true;
    }

    setFace(face){
        if(face!=((this.face+2)%4)){
            this.face=face;
            return true;
        }
        return false;
    }

    setBerry(){
        let space=false;
        for(let i=0;i<this.height*this.width;i++){
            if(this.map[i]==0){
                space=true;
            }
        }
        while(space){
            let Bpos=[getRandom(0,this.width-1),getRandom(0,this.width-1)];
            if(this.map[Bpos[1]*this.width+Bpos[0]]==0){
                this.map[Bpos[1]*this.width+Bpos[0]]=-1;
                return true;
            }
        }
        return false;
    }
    
    async paint(){
        if(this.canvas.getContext&&this.print){
            let ctx=this.canvas.getContext("2d");
            ctx.fillStyle="#000000";
            ctx.fillRect(0,0,this.width*this.blockW,this.height*this.blockW);
            for(let i=0;i<this.height;i++){
                for(let j=0;j<this.width;j++){
                    if(this.map[i*this.width+j]<0){
                        ctx.fillStyle="#ff0000";
                        ctx.fillRect((j+0.1)*this.blockW,(i+0.1)*this.blockW,this.blockW*0.8,this.blockW*0.8);
                    }else if(this.map[i*this.width+j]>0){
                        if(this.map[i*this.width+j]==(this.score+this.long)){
                            ctx.fillStyle="#ffff00";
                        }else{
                            ctx.fillStyle="#00ff00";
                        }
                        ctx.fillRect((j+0.05)*this.blockW,(i+0.05)*this.blockW,this.blockW*0.9,this.blockW*0.9);
                    }
                }
            }
        }
        
        this.scoreboard.innerHTML="Score:"+this.score+"&nbsp;Highest Score:"+this.MaxScore;
        
    }

    getArea(map,pos){
        let tMap;
        let tPos;
        let area=0;
        map?tMap=map:tMap=cloneJSON(this.map);
        pos?tPos=pos:tPos=cloneJSON(this.pos);
        tMap[tPos[1]*this.width+tPos[0]]=-2;
        if(tPos[1]>0&&tMap[(tPos[1]-1)*this.width+tPos[0]]==0){
            area+=(1+this.getArea(tMap,[tPos[0],tPos[1]-1]));
        }
        if(tPos[0]<(this.width-1)&&tMap[tPos[1]*this.width+(tPos[0]+1)]==0){
            area+=(1+this.getArea(tMap,[tPos[0]+1,tPos[1]]));
        }
        if(tPos[1]<(this.height-1)&&tMap[(tPos[1]+1)*this.width+tPos[0]]==0){
            area+=(1+this.getArea(tMap,[tPos[0],tPos[1]+1]));
        }
        if(tPos[0]>0&&tMap[tPos[1]*this.width+(tPos[0]-1)]==0){
            area+=(1+this.getArea(tMap,[tPos[0]-1,tPos[1]]));
        }
        return area;
    }

    // getArea(map,pos,set,first){
    //     let tMap;
    //     let tPos;
    //     let area=0;
    //     map?tMap=map:tMap=cloneJSON(this.map);
    //     pos?tPos=pos:tPos=cloneJSON(this.pos);
    //     (set!=null)?set=set:set=-2
    //     if(tMap[tPos[1]*this.width+tPos[0]]==0||tMap[tPos[1]*this.width+tPos[0]]==-1){
    //         tMap[tPos[1]*this.width+tPos[0]]=set;
    //     }
    //     if(tPos[1]>=0&&(tMap[(tPos[1]-1)*this.width+tPos[0]]==0||tMap[(tPos[1]-1)*this.width+tPos[0]]==-1)){
    //         area+=(1+this.getArea(tMap,[tPos[0],tPos[1]-1],set,true));
    //     }
    //     if(!first)set--;
    //     if(tPos[0]<=(this.width-1)&&(tMap[tPos[1]*this.width+(tPos[0]+1)]==0||tMap[tPos[1]*this.width+(tPos[0]+1)]==-1)){
    //         area+=(1+this.getArea(tMap,[tPos[0]+1,tPos[1]],set,true));
    //     }
    //     if(!first)set--;
    //     if(tPos[1]<=(this.height-1)&&(tMap[(tPos[1]+1)*this.width+tPos[0]]==0||tMap[(tPos[1]+1)*this.width+tPos[0]]==-1)){
    //         area+=(1+this.getArea(tMap,[tPos[0],tPos[1]+1],set,true));
    //     }
    //     if(!first)set--;
    //     if(tPos[0]>=0&&(tMap[tPos[1]*this.width+(tPos[0]-1)]==0||tMap[tPos[1]*this.width+(tPos[0]-1)]==-1)){
    //         area+=(1+this.getArea(tMap,[tPos[0]-1,tPos[1]],set,true));
    //     }
    //     if(!first){
    //         let n=[];
    //         for(let i=0;i<this.height*this.width;i++){
    //             if(tMap[i]<-1&&!n.includes(tMap[i])){
    //                 n.push(tMap[i]);
    //             }
    //         }
    //         return [area,n.length];
    //     }else{
    //         return area;
    //     }
    // }

    getSpaceArea(){
        let area=0;
        for(let i=0;i<this.height*this.width;i++){
            if(this.map[i]<=0){
                area++;
            }
        }
        return area;
    }

    getdic(){
        let Bpos=null;
        for(let i=0;i<this.height;i++){
            for(let j=0;j<this.width;j++){
                if(this.map[i*this.width+j]<0){
                    Bpos=[j,i];
                    break;
                }
            }
            if(Bpos!=null){
                break;
            }
        }
        return (Math.abs(Bpos[0]-this.pos[0])+Math.abs(Bpos[1]-this.pos[1]));
    }

    getNextStatus(){
        let tMap=cloneJSON(this.map);
        let tPos=cloneJSON(this.pos);
        let tFace=this.face;
        let tScore=this.score;
        let lastScore=0;
        let out=[];
        for(let i=0;i<4;i++){
            lastScore=this.score;
            if(this.setFace(i)){
                if(this.next()){
                    const area=this.getArea();
                    out.push([i,[(this.score+this.long),(this.score-lastScore)?0:this.getdic(),area,(this.getSpaceArea()-area)]]);
                }
            }
            this.map=cloneJSON(tMap);
            this.pos=cloneJSON(tPos);
            this.face=tFace;
            this.score=tScore;
        }
        return out;
    }

    play_game(action){
        this.setFace(action);
        if(this.next()){
            const score=(this.score-this.lastScore);
            this.lastScore=this.score;
            return {"status":"Alive","score":score};
        }else{
            const score=(this.score-this.lastScore);
            this.lastScore=this.score;
            return {"status":"Game Over","score":score};
        }
    }
    
}

function cloneJSON(obj){
    if (obj===null||obj===undefined||typeof obj!=='object')  {
        return obj
    }
    if (obj instanceof Array){
        let cloneA=[];
        for(let i=0;i<obj.length;i++) {
            cloneA[i]=cloneJSON(obj[i]);
        }              
        return cloneA;
    }
    let cloneO={};   
    for(let i in obj) {
        cloneO[i]=cloneJSON(obj[i]);
    }                  
    return cloneO;
}


function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min+1) + min);
}