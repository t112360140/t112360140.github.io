class Canvas{
    shape=[];
    newPointColor=' #a0a0a0';
    newPointList=[];
    point=[];

    constructor(element,config){
        this.canvas=element;
        this.height=config.height??500;
        this.width=config.width??500;

        this.background=config.background??' #000000';
        this.border=config.border;

        this.canvas.height=this.height;
        this.canvas.width=this.width;

        this.ctx=this.canvas.getContext("2d");

        this.refresh();

        this.canvas.addEventListener('mousemove',(event)=>{
            this.mousePos=[
                event.offsetX*(this.width/this.canvas.offsetWidth),
                event.offsetY*(this.height/this.canvas.offsetHeight)
            ];
        });
    }

    clear(refresh=false){
        this.shape=[];
        this.newPointList=[];
        if(refresh){
            this.refresh();
        }
    }

    refresh(){
        this.ctx.fillStyle=this.background;
        this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        if(this.border){
            this.ctx.strokeStyle=this.border;
            this.ctx.lineWidth=5;
            this.ctx.strokeRect(0,0,this.canvas.width,this.canvas.height);
        }

        this.ctx.lineCap='round';
        for(let i=0;i<this.shape.length;i++){
            this.ctx.fillStyle=this.shape[i].color;
            this.ctx.strokeStyle=this.shape[i].color;
            if(this.shape[i].type==='point'){
                const shift=Math.floor(this.shape[i].width/2);
                this.ctx.fillRect(this.shape[i].point[0]-shift,this.shape[i].point[1]-shift,this.shape[i].width,this.shape[i].width);
            }else{
                this.ctx.lineWidth=this.shape[i].width;
                this.ctx.beginPath();
                this.ctx.moveTo(this.shape[i].point[0][0],this.shape[i].point[0][1]);
                for(let j=1;j<this.shape[i].point.length;j++){
                    this.ctx.lineTo(this.shape[i].point[j][0],this.shape[i].point[j][1]);
                }
                if(this.shape[i].type==='polygon'){
                    this.ctx.closePath();
                    if(this.shape[i].fill){
                        this.ctx.fill();
                    }
                }
                this.ctx.stroke();
            }
        }

        if(this.newPointList.length>=2){
            this.ctx.strokeStyle=this.newPointColor;
            this.ctx.lineWidth=2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.newPointList[0][0],this.newPointList[0][1]);
            for(let i=1;i<this.newPointList.length;i++){
                this.ctx.lineTo(this.newPointList[i][0],this.newPointList[i][1]);
            }
            this.ctx.stroke();
        }
    }

    newShape(config={}){
        const color=config.color??' #a0a0a0';
        this.newPointColor=color;
        const id=config.id;
        this.newPointList=[[0,0]];
        const newPointFun=(event)=>{
            event.preventDefault();
            switch(event.button){
                case 0:
                    this.newPointList.push([
                        event.offsetX*(this.width/this.canvas.offsetWidth),
                        event.offsetY*(this.height/this.canvas.offsetHeight)
                    ]);
                    this.refresh();
                    break;
                case 2:
                    this.newPointList.pop(1);
                    if(this.newPointList.length===2||config.line){
                        let n=0;
                        for(let i=0;i<this.shape.length;i++){
                            if(this.shape[i].type==='line'){
                                n++;
                            }
                        }
                        this.shape.push({
                            id:(id??('line_'+n.toString())),
                            type:'line',
                            color:color,
                            point:this.newPointList,
                            width:(config.width??1),
                        });
                    }else if(this.newPointList.length>2){
                        let n=0;
                        for(let i=0;i<this.shape.length;i++){
                            if(this.shape[i].type==='polygon'){
                                n++;
                            }
                        }
                        this.shape.push({
                            id:(id??('polygon_'+n.toString())),
                            type:'polygon',
                            color:color,
                            fill:config.fill??true,
                            point:this.newPointList,
                            width:(config.width??1),
                        });
                    }
                    this.newPointList=[];
                    this.refresh();
                    this.canvas.removeEventListener('mousedown', newPointFun);
                    this.canvas.removeEventListener('mousemove', mouseMoveFun);
                    break;
            }
        }
        this.canvas.addEventListener('mousedown',newPointFun);
        const mouseMoveFun=(event)=>{
            this.newPointList[this.newPointList.length-1]=[
                    event.offsetX*(this.width/this.canvas.offsetWidth),
                    event.offsetY*(this.height/this.canvas.offsetHeight)
                ];
            this.refresh();
        }
        this.canvas.addEventListener('mousemove',mouseMoveFun);
        this.canvas.addEventListener('contextmenu',(event)=>{
            event.preventDefault();
        },{once:true});
    }

    newPolygon(pointList,config={}){
        const color=config.color??' #a0a0a0';
        let n=0;
        for(let i=0;i<this.shape.length;i++){
            if(this.shape[i].type==='polygon'){
                n++;
            }
        }
        this.shape.push({
            id:(config.id??('polygon_'+n.toString())),
            type:'polygon',
            color:color,
            hide:config.hide?true:false,
            fill:config.fill??true,
            point:pointList,
            width:(config.width??1),
        });
        if(config.refresh){
            this.refresh();
        }
    }

    newLine(line,config={}){
        const color=config.color??'rgb(70, 255, 70)';
        let n=0;
        for(let i=0;i<this.shape.length;i++){
            if(this.shape[i].type==='line'){
                n++;
            }
        }
        this.shape.push({
            id:(config.id??('line_'+n.toString())),
            type:'line',
            color:color,
            hide:config.hide?true:false,
            point:line,
            width:(config.width??1),
        });
        if(config.refresh){
            this.refresh();
        }
    }

    newPoint(x,y,config={}){
        const color=config.color??'rgb(70, 255, 70)';
        let n=0;
        for(let i=0;i<this.shape.length;i++){
            if(this.shape[i].type==='point'){
                n++;
            }
        }
        this.shape.push({
            id:(config.id??('point_'+n.toString())),
            type:'point',
            color:color,
            hide:config.hide?true:false,
            point:[x,y],
            width:(config.width??2),
        });
        if(config.refresh){
            this.refresh();
        }
    }

    distance(pos1,pos2){
        return Math.sqrt(Math.pow((pos1[0]-pos2[0]),2)+Math.pow((pos1[1]-pos2[1]),2));
    }

    intersect(line1,line2){
        let a1,b1,c1,a2,b2,c2;
        if((line1[0][0]-line1[1][0])===0){
            a1=1;
            b1=0;
            c1=line1[0][0];
        }else{
            a1=(line1[0][1]-line1[1][1])/(line1[0][0]-line1[1][0]);
            b1=-1;
            c1=-(line1[0][1]-a1*line1[0][0]);
        }
        if((line2[0][0]-line2[1][0])===0){
            a2=1;
            b2=0;
            c2=line2[0][0];
        }else{
            a2=(line2[0][1]-line2[1][1])/(line2[0][0]-line2[1][0]);
            b2=-1;
            c2=-(line2[0][1]-a2*line2[0][0]);
        }

        const D=a1*b2-b1*a2;
        const Dx=c1*b2-b1*c2;
        const Dy=a1*c2-c1*a2;
        
        if(D===0){
            return {cross:false};
        }

        const pos=[Dx/D,Dy/D];

        for(let i=0;i<2;i++){
            if(Math.max(line1[0][i],line1[1][i])<pos[i]||Math.min(line1[0][i],line1[1][i])>pos[i]||
                Math.max(line2[0][i],line2[1][i])<pos[i]||Math.min(line2[0][i],line2[1][i])>pos[i]){
                return {cross:false};
            }
        }
        return {cross:true,pos:[Math.round(pos[0]),Math.round(pos[1])]};
    }

    getAllLine(border=false){
        let list=[];
        for(let i=0;i<this.shape.length;i++){
            if(!this.shape[i].hide){
                for(let j=1;j<this.shape[i].point.length;j++){
                    list.push([this.shape[i].point[j-1],this.shape[i].point[j]]);
                }
                if(this.shape[i].type==='polygon'){
                    list.push([this.shape[i].point[this.shape[i].point.length-1],this.shape[i].point[0]]);
                }
            }
        }
        if(border){
            list.push(  [[0,0],[0,this.height]],
                        [[0,this.height],[this.width,this.height]],
                        [[this.width,this.height],[this.width,0]],
                        [[this.width,0],[0,0]],
                    )
        }
        return list;
    }
    
    getShapeIndex(id){
        for(let i=0;i<this.shape.length;i++){
            if(this.shape[i].id===id){
                return i;
            }
        }
        return -1;
    }
}