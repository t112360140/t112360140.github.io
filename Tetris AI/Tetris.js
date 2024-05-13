class Tetris{
    
    blockW=30;
    score=0;
    numDelLines=0;
    height=22;
    width=10;
    table=[];
    isStart=false;
    speed=200;
    print=true;
    doPrint=false;
    player=false;
    lastMax=0;
    MaxScore=0;
    shapePool=[];
    poolSize=7;
    NewShape=false;
    AITestPaint=true;
    
    color=["00f0f0","0000f0","f0a000","f0f000","00f000","a000f0","f00000"];
    shapePos=[
            [[-1,0],[0,0],[1,0],[2,0]],//I
            [[-1,0],[0,0],[1,0],[1,1]],///L
            [[-1,1],[-1,0],[0,0],[1,0]],//L
            [[0,1],[0,0],[1,0],[1,1]],//O
            [[-1,1],[0,1],[0,0],[1,0]],//S
            [[-1,0],[0,0],[0,1],[1,0]],//T
            [[-1,0],[0,0],[0,1],[1,1]]//Z
        ];
            
    constructor(element,blockWidht,x,y){
        this.blockW=blockWidht;
        (x>0)?this.width=x:this.width=10;
        (y>0)?this.height=y:this.height=22;
        let scoreboard=document.createElement("div");
        this.scoreboard=element.appendChild(scoreboard);
        let canvas=document.createElement("canvas");
        canvas.height=(this.height+1)*this.blockW;
        canvas.width=(this.width+5)*this.blockW;
        canvas.getContext("2d").fillStyle="#000000";
        canvas.getContext("2d").fillRect(0,0,(this.width+5)*this.blockW,(this.height+1)*this.blockW)
        this.canvas=element.appendChild(canvas);
        this.paint();
        this.reset(10,22);
    }
    
    start(x,y){
        if(this.isStart){
            clearInterval(this.loop);
            this.isStart=false;
        }else{
            this.loop=setInterval(()=>{this.next(x,y)},this.speed);
            this.isStart=true;
        }
    }
    
    autoPlay(nextAction,x,y){
        if(this.isStart){
            clearInterval(this.loop);
            this.isStart=false;
        }else{
            this.loop=setInterval(()=>{this.next(nextAction,x,y)},this.speed);
            this.isStart=true;
        }
    }
    
    reSpeed(speed){
        this.speed=speed;
        if(this.isStart){
            clearInterval(this.loop);
            this.loop=setInterval(()=>{this.next()},this.speed);
        }
    }
    
    next(nextAction,x,y){
        if(this.shape==null){
            this.newRandShape();
            this.NewShape=true;
        }
        if(!this.AITestPaint){
            this.NewShape=true;
        }
        if(nextAction!=null&&this.NewShape){
            let action=nextAction.nextAction(this.getNextStatus());
            for(let i=0;i<action[1];i++){
                this.shapeRightRot();
            }
    
            for(let i=0;i<Math.abs(action[0]-(this.width/2-1));i++){
                if(action[0]>(this.width/2-1)){
                    this.shapeRightMov();
                }else{
                    this.shapeLeftMov();
                }
            }
            
            if(!this.AITestPaint){
                while(!this.doDrop());
            }
        }
        if(this.doDrop()){
            this.placeShape();
            this.delLines();
            if(!this.newRandShape()){
                if(this.numDelLines>this.MaxScore){
                    this.MaxScore=this.numDelLines;
                }
                this.paint;
                if(this.player){
                    alert("Game Over!\nScore:"+this.numDelLines);
                    if(this.isStart){
                        this.start();
                    }
                }else{
                    if(this.isStart){
                        this.start();
                    }
                }
                    return false;
            }
            this.NewShape=true;
        }else{
            this.NewShape=false;
        }
        return true;
    }
    
    reset(x,y){
        x>0?this.width=x:this.width=10;
        y>0?this.height=y:this.height=22;
        for(let i=0;i<this.height;i++){
            for(let j=0;j<this.width;j++){
                this.table[i*this.width+j]=0;
            }
        }
        this.shapePool=[];
        this.numDelLines=0;
        this.score=0;
        this.lastMax=0;
        if(this.doPrint){
            this.paint();
        }
        return [0,0,0,0];
    }
    
    newRandShape(){
        if(this.shapePool[1]==undefined){
            this.shapePool=this.genRandPool(2);
        }
        if(this.shapePool[2]==undefined){
            this.shapePool=this.shapePool.concat(this.genRandPool(this.poolSize));
        }
        const next=this.shapePool[0];
        this.shapePool.shift();
        return this.newShape(next);
    }
    
    newShape(type){
        let shape={type:type,pos:[4,2],shape:this.shapePos[type],angle:0,stop:0};
        if(this.tryMove(shape)){
            this.shape=cloneJSON(shape);
            if(this.doPrint){
                this.paint();
            }
            return true;
        }else{
            this.shape=null;
            return false;
        }
    }
    
    genRandPool(n){
        n<=7?n=n:n=7;
        let temp=[];
        for(let i=0;i<n;i++){
            while(1){
                const rand=getRandom(0,6);
                let exist=false;
                for(let j=0;j<temp.length;j++){
                    if(temp[j]==rand){
                        exist=true;
                    }
                }
                if(!exist){
                    temp.push(rand);
                    break;
                }
            }
        }
        return temp;
    }

    tryMove(shape){
        if(shape!=null){
            let out=false;
        
            for(let i=0;i<4;i++){
                if(shape["pos"][0]+shape["shape"][i][0]<0||shape["pos"][0]+shape["shape"][i][0]>=this.width||shape["pos"][1]+shape["shape"][i][1]<0||shape["pos"][1]+shape["shape"][i][1]>=this.height){
                    return false;
                }else if(this.table[(shape["pos"][1]+shape["shape"][i][1])*this.width+(shape["pos"][0]+shape["shape"][i][0])]!=0){
                    return false;
                }
            }
            return true
        }
        return false;
    }
    
    doDrop(){
        let shape=cloneJSON(this.shape);
        if(shape!=null){
            shape["pos"][1]++;
            if(this.tryMove(shape)){
                this.shape=cloneJSON(shape);
                if(this.doPrint){
                    this.paint();
                }
		shape["stop"]=0;
                return false;
            }else if(shape["stop"]==0){
                if(this.doPrint){
                    this.paint();
                }
                this.shape["stop"]++;
                return false;
            }
        }
        return true;
    }
    
    shapeRightMov(){
        let shape=cloneJSON(this.shape);
        shape["pos"][0]++;
        if(this.tryMove(shape)){
            this.shape=cloneJSON(shape);
            if(this.doPrint){
                this.paint();
            }
            return true;
        }
        return false;
    }
    
    shapeLeftMov(){
        let shape=cloneJSON(this.shape);
        shape["pos"][0]--;
        if(this.tryMove(shape)){
            this.shape=cloneJSON(shape);
            if(this.doPrint){
                this.paint();
            }
            return true;
        }
        return false;
    }
    
    shapeRightRot(n){
        if(n==null){
            let shape=cloneJSON(this.shape);
            for(let i=0;i<4;i++){
                shape["shape"][i]=[-shape["shape"][i][1],shape["shape"][i][0]];
            }
            if(this.tryMove(shape)){
                shape["angle"]=(++shape["angle"])%4;
                this.shape=cloneJSON(shape);
                if(this.doPrint){
                    this.paint();
                }
                return true;
            }
            return false;
        }else{
            for(let i=0;i<n;i++){
                if(!this.shapeRightRot()){
                    return false;
                }
            }
            return true;
        }
    }
    
    shapeLeftRot(){
        let shape=cloneJSON(this.shape);
        for(let i=0;i<4;i++){
            shape["shape"][i]=[shape["shape"][i][1],-shape["shape"][i][0]];
        }
        if(this.tryMove(shape)){
            shape["angle"]=(--shape["angle"])%4;
            this.shape=cloneJSON(shape);
            if(this.doPrint){
                this.paint();
            }
            return true;
        }
        return false;
    }
    
    placeShape(){
        let shape=cloneJSON(this.shape);
        if(this.tryMove(shape)){
            for(let i=0;i<4;i++){
                this.table[(shape["pos"][1]+shape["shape"][i][1])*this.width+(shape["pos"][0]+shape["shape"][i][0])]=shape["type"]+1;
            }
            this.shape=null;
            if(this.doPrint){
                this.paint();
            }
            return true;
        }
        return false;
    }
    
    delLines(save=true){
        let numDel=0;
        let k=1;
        let table=[];
        for(let i=this.height-1;i>=0;i--){
            let full=true;
            for(let j=0;j<this.width;j++){
                if(this.table[i*this.width+j]==0){
                    full=false;
                    break;
                }
            }
            if(full){
                numDel++;
            }else{
                for(let j=this.width-1;j>=0;j--){
                    table[this.width*this.height-k]=this.table[i*this.width+j];
                    k++;
                }
            }
        }
        for(let i=0;i<this.width*this.height;i++){
            if(table[i]==null){
                table[i]=0;
            }else{
                break;
            }
        }
        this.table=cloneJSON(table);
        if(save){
            this.numDelLines+=numDel;
        }
        if(this.doPrint){
            this.paint();
        }
        return numDel;
    }
    
    paint(){
        if(this.canvas.getContext&&this.print){
            let ctx=this.canvas.getContext("2d");
            ctx.fillStyle="#000000";
            ctx.fillRect(0,0,this.width*this.blockW,this.height*this.blockW);
            for(let i=0;i<this.height;i++){
                for(let j=0;j<this.width;j++){
                    if(this.table[i*this.width+j]>0){
                        ctx.fillStyle="#"+this.color[this.table[i*this.width+j]-1];
                    }else{
                        ctx.fillStyle="#000000";
                    }
                    ctx.fillRect((j+0.5)*this.blockW,(i+0.5)*this.blockW,this.blockW,this.blockW);
                }
            }
            if(this.shape!=null){
                ctx.fillStyle="#"+this.color[this.shape["type"]];
                for(let i=0;i<4;i++){
                    ctx.fillRect((this.shape["pos"][0]+this.shape["shape"][i][0]+0.5)*this.blockW,(this.shape["pos"][1]+this.shape["shape"][i][1]+0.5)*this.blockW,this.blockW,this.blockW);
                }
            }
            ctx.fillStyle="#a0a0a0";
            ctx.fillRect((this.width+1)*this.blockW,(0)*this.blockW,4*this.blockW,(this.height+1)*this.blockW);
            ctx.fillStyle="#000000";
            ctx.fillRect((this.width+1.25)*this.blockW,(0.5)*this.blockW,3.5*this.blockW,3*this.blockW);
            if(this.shapePool[1]!=null){
                ctx.fillStyle="#"+this.color[this.shapePool[1]];
                for(let i=0;i<4;i++){
                    ctx.fillRect((this.width+2.5)*this.blockW+(this.shapePos[this.shapePool[1]][i][0]+0.5)*(this.blockW/2),(1.5)*this.blockW+(this.shapePos[this.shapePool[1]][i][1]+0.5)*(this.blockW/2),(this.blockW/2),(this.blockW/2));
                }
            }
        }
        
        this.scoreboard.innerHTML="Score:"+this.numDelLines+"&nbsp;Highest Score:"+this.MaxScore;
        
    }
    
    getMaxHeight(){
        let Max=0;
        for(let i=this.height-1;i>=0;i--){
            for(let j=0;j<this.width;j++){
                if(this.table[i*this.width+j]>0){
                    Max=i;
                    break;
                }
            }
        }
        return this.height-Max-1;
    }

    getColHeight(col){
        for(let i=0;i<this.height;i++){
            if(this.table[i*this.width+col]>0){
                return (this.height-i);
            }
        }
        return 0;
    }

    getHeightSum(){
        let height=0;
        for(let i=0;i<this.width;i++){
            height+=this.getColHeight(i);
        }
        return height;
    }

    getBum(){
        let bum=[];
        for(let i=0;i<this.width-1;i++){
            bum.push((this.getColHeight(i+1)-this.getColHeight(i)));
        }
        return (bum);
    }

    getBumNum(){
        let list=this.getBum();
        let num=0;
        for(let i=0;i<list.length;i++){
            num+=Math.abs(list[i]);
        }
        return num;
    }

    getHoleNum(){
        let num=0;
        for(let i=0;i<this.width;i++){
            let hasBlock=false;
            for(let j=0;j<this.height;j++){
                if(this.table[j*this.width+i]>0){
                    hasBlock=true;
                }else if(this.table[j*this.width+i]<=0&&hasBlock){
                    num++;
                }
            }
        }
        return num;
    }

    getNextStatus(){
        let out=[];
        let tableBackup=cloneJSON(this.table);
        let shapeBackup=cloneJSON(this.shape);
        for(let i=0;i<this.width;i++){
            for(let j=0;j<4;j++){
                if(this.shapeRightRot(j)){
                    for(let k=0;k<Math.abs(i-(this.width/2-1));k++){
                        if(i>(this.width/2-1)){
                            this.shapeRightMov();
                        }else{
                            this.shapeLeftMov();
                        }
                    }
                    if(this.shape["pos"][0]==i){
                        while(!this.doDrop());
                        this.placeShape();
                        const lines=this.delLines(false);
                        const height=this.getHeightSum();
                        const holeNum=this.getHoleNum();
                        const bumNum=this.getBumNum();
                        out.push([[i,j],[lines,holeNum,bumNum,height]]);
                    }
                }
                this.table=cloneJSON(tableBackup);
                this.shape=cloneJSON(shapeBackup);
            }
        }
        this.table=cloneJSON(tableBackup);
        this.shape=cloneJSON(shapeBackup);
        return out;
    }
    
    play_game(action){
        for(let i=0;i<action[1];i++){
            this.shapeRightRot();
        }

        for(let i=0;i<Math.abs(action[0]-(this.width/2-1));i++){
            if(action[0]>(this.width/2-1)){
                this.shapeRightMov();
            }else{
                this.shapeLeftMov();
            }
        }
        
        while(!this.doDrop());
        this.placeShape();
        const delLine=this.delLines();
        if(this.numDelLines>this.MaxScore){
            this.MaxScore=this.numDelLines;
        }
        this.score+=1+(delLine*delLine*this.width);
        if(!this.newRandShape()){
            return {status:'Game Over',line:delLine};
        }else{
            return {status:'New Shape',line:delLine};
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
