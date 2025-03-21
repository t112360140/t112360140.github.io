class Car{
    realTimeRaderScanLoop=null;
    raderScanPoint=[];
    raderScanVector=[];
    constructor(canvas,x=0,y=0,config={}){
        this.canvas=canvas;
        this.pos=[x,y];
        this.angle=config.angle??-90;
        this.color=config.color??' #ff0000';
        this.height=config.height??30;
        this.width=config.width??20;
        this.centerScale=config.center??0.8;
        this.centerPos=[x,y];
        
        this.raderNumber=config.number??60;
        this.raderRay=config.ray??false;
        this.raderCanvas=config.raderCanvas;
        this.raderCanvasCenter=config.raderCanvasCenter;
        this.pathCanvas=config.pathCanvas;

        if(config.mapCanvas){
            this.map=new Map(config.mapCanvas,{
                chuckSize:20,
                maxPoint:50,
            });
        }
        
        do{
            this.carId='car_'+Math.ceil(Math.random()*100).toString().padStart(2,'0');
        }while(this.canvas.getShapeIndex(this.carId)>=0);

        this.refresh(true);

        if(this.raderCanvas||this.raderCanvasCenter){
            this.realTimeRaderScan(config.realTimeRaderScan);
        }
        
        let keyPress=[0,0,0,0];
        if(config.keyboard){
            document.addEventListener('keydown',(event)=>{
                if(event.code==='ArrowUp'&&!keyPress[0]){
                    keyPress[0]=1;
                }
                if(event.code==='ArrowDown'&&!keyPress[1]){
                    keyPress[1]=1;
                }
                if(event.code==='ArrowRight'&&!keyPress[2]){
                    keyPress[2]=1;
                }
                if(event.code==='ArrowLeft'&&!keyPress[3]){
                    keyPress[3]=1;
                }
            });
            document.addEventListener('keyup',(event)=>{
                if(event.code==='ArrowUp'&&keyPress[0]){
                    keyPress[0]=0;
                }
                if(event.code==='ArrowDown'&&keyPress[1]){
                    keyPress[1]=0;
                }
                if(event.code==='ArrowRight'&&keyPress[2]){
                    keyPress[2]=0;
                }
                if(event.code==='ArrowLeft'&&keyPress[3]){
                    keyPress[3]=0;
                }
            });
            this.moveLoop=setInterval(()=>{
                const move=(keyPress[0]*2-keyPress[1]*1);
                if(move!==0){
                    this.move(
                        move,
                        (keyPress[2]*5-keyPress[3]*5)*(move/Math.abs(move)),
                        {path:true},
                    );
                }
            },25);
        }
    }

    getRaderScanPoint(){
        this.raderScanPoint=[];
        this.raderScanVector=[];
        const point=radarScan(this.canvas,this.centerPos[0],this.centerPos[1],{border:true,number:this.raderNumber,returnPos:true});
        if(this.map){
            this.map.newPoint(point)
            this.map.canvas.clear();
            this.map.showChucks();
            this.map.getAllLine(true);
        }
        for(let i=0;i<point.length;i++){
            this.raderScanPoint.push([
                (point[i][0]-this.centerPos[0]),
                (point[i][1]-this.centerPos[1]),
            ]);
        }
        const vector=radarScan(this.canvas,this.centerPos[0],this.centerPos[1],{border:true,number:this.raderNumber});
        for(let i=0;i<vector.length;i++){
            this.raderScanVector.push({
                angle:(vector[i].angle+360-this.angle),
                dist:(vector[i].dist),
            });
        }
        return point;
    }

    realTimeRaderScan(enable){
        if(enable){
            this.realTimeRaderScanLoop=setInterval(()=>{
                let point=this.getRaderScanPoint();
                if(this.raderCanvas){
                    renderPoint(this.raderCanvas,point,{ray:this.raderRay,pos:this.centerPos});
                }
                if(this.raderCanvasCenter){
                    point=[];
                    for(let i=0;i<this.raderScanPoint.length;i++){
                        point.push([0,0]);
                        point[i][0]=this.raderScanPoint[i][0]+this.raderCanvasCenter.width/2;
                        point[i][1]=this.raderScanPoint[i][1]+this.raderCanvasCenter.height/2;
                    }
                    renderPoint(this.raderCanvasCenter,point,{ray:this.raderRay,pos:[this.raderCanvasCenter.width/2,this.raderCanvasCenter.height/2]});
                }
            },100);
        }else{
            if(this.realTimeRaderScanLoop){
                clearInterval(this.realTimeRaderScanLoop);
                this.realTimeRaderScanLoop=null;
            }
        }
    }

    refresh(refreshCanvas=false){
        const shapeIndex=this.canvas.getShapeIndex(this.carId);
        let carShape={
                id:this.carId,
                type:'polygon',
                color:this.color,
                hide:true,
                point:[],
                width:2,
                fill:true,
            };
        carShape.point=[
            [this.width/2,this.height*this.centerScale],
            [this.width/2,-this.height*(1-this.centerScale)],
            [-this.width/2,-this.height*(1-this.centerScale)],
            [-this.width/2,this.height*this.centerScale],
            [0,this.height*(this.centerScale+0.3)],
        ];

        const angle=(810-this.angle)%360;
        let tempLen=(this.centerScale-0.5)*this.height;
        this.centerPos=[this.pos[0]+tempLen*Math.cos((angle/180)*Math.PI),this.pos[1]+tempLen*Math.sin((angle/180)*Math.PI)];

        for(let i=0;i<carShape.point.length;i++){
            carShape.point[i]=rotation(carShape.point[i],angle);
            carShape.point[i][0]=this.pos[0]+carShape.point[i][0];
            carShape.point[i][1]=this.pos[1]+carShape.point[i][1];
        }

        if(shapeIndex>=0){
            this.canvas.shape[shapeIndex]=carShape;
        }else{
            this.canvas.shape.push(carShape);
        }
        if(refreshCanvas){
            this.canvas.refresh();
        }
        return {
            shape:carShape,
        };

        function rotation(pos,angle){
            angle=((angle/180)*Math.PI);
            return [
                (pos[0]*Math.cos(angle)+pos[1]*Math.sin(angle)),
                (-pos[0]*Math.sin(angle)+pos[1]*Math.cos(angle)),
            ];
        }
    }

    getPath(dist,angle,len=10){
        if(this.pathCanvas){
            let pathIndex=this.pathCanvas.getShapeIndex((this.carId+'_path1'));
            let pos=cloneJSON(this.pos);
            let newAngle=this.angle;
            let pointList=[];
            for(let i=0;i<len;i++){
                newAngle+=angle*(dist===0?0:((Math.abs(dist)-0.5)/Math.abs(dist)));
                pos[0]+=dist*Math.cos((newAngle/180)*Math.PI);
                pos[1]+=dist*Math.sin((newAngle/180)*Math.PI);
                newAngle=(newAngle+720)%360;
                pointList.push(cloneJSON(pos));
            }
            if(pathIndex<0){
                this.pathCanvas.newLine(pointList,{id:(this.carId+'_path1')});
            }else{
                this.pathCanvas.shape[pathIndex].point=pointList;
            }
            pathIndex=this.pathCanvas.getShapeIndex((this.carId+'_path2'));
            pos=cloneJSON(this.pos);
            newAngle=this.angle;
            pointList=[];
            pointList.push(cloneJSON(pos));
            for(let i=0;i<1;i++){
                newAngle+=angle*(dist===0?0:((Math.abs(dist)-0.5)/Math.abs(dist)));
                pos[0]+=dist*Math.cos((newAngle/180)*Math.PI)*len;
                pos[1]+=dist*Math.sin((newAngle/180)*Math.PI)*len;
                newAngle=(newAngle+720)%360;
                pointList.push(cloneJSON(pos));
            }
            if(pathIndex<0){
                this.pathCanvas.newLine(pointList,{id:(this.carId+'_path2'),color:' #ff0000'});
            }else{
                this.pathCanvas.shape[pathIndex].point=pointList;
            }
            this.pathCanvas.refresh();

            return pointList;
        }
    }

    move(dist,angle,config={}){
        const oldAngle=this.angle;
        const oldPos=cloneJSON(this.pos);
        this.angle+=angle*(dist===0?0:((Math.abs(dist)-0.5)/Math.abs(dist)));
        this.pos[0]+=dist*Math.cos((this.angle/180)*Math.PI);
        this.pos[1]+=dist*Math.sin((this.angle/180)*Math.PI);
        
        this.angle=(this.angle+720)%360;

        if(config.path){
            this.getPath(dist,angle,(config.pathLen??50));
        }

        if(this.carCrash(this.refresh().shape.point)){
            this.angle=oldAngle;
            this.pos=oldPos;
            this.refresh(true);
            return true;
        }else{
            this.canvas.refresh();
            return false;
        }
    }

    carCrash(carPoint){
        const lineList=this.canvas.getAllLine(true);
        let carLine=[];
        for(let j=1;j<carPoint.length;j++){
            carLine.push([carPoint[j-1],carPoint[j]]);
        }
        carLine.push([carPoint[carPoint.length-1],carPoint[0]]);

        for(let i=0;i<carLine.length;i++){
            for(let j=0;j<lineList.length;j++){
                if(this.canvas.intersect(carLine[i],lineList[j]).cross){
                    return true;
                }
            }
        }
        return false;
    }

    followPoint(pos,info={}){
        const maxAngle=info.maxAngle??15;
        const maxSpeed=info.maxSpeed??2;
        const maxBack=info.maxBack??1;
        let speed=maxSpeed;
        if(info.back){
            speed=-maxBack;
            info.back=-1;
        }else{
            info.back=1;
        }
        if(this.distance(pos,this.centerPos)<=10){
            return 1;
        }
        let angle=0;
        angle=(this.getTanAngle((pos[0]-this.pos[0])*info.back,(pos[1]-this.pos[1])*info.back)-this.angle+360)%360;
        angle=angle<=180?angle:(angle-360);
        const k=1;
        angle=maxAngle*Math.tanh((angle/180)*k);
        if(this.move(speed,angle,{path:info.path,pathLen:info.pathLen})){
            return 2;
        }
        return 0;
    }

    getTanAngle(x,y){
        if(x===0){
            if(y>=0){
                return 90;
            }else{
                return 270;
            }
        }
        let angle=Math.atan(y/x)*(180/Math.PI);
        if(x<0){
            return (540+angle)%360;
        }
        return (360+angle)%360;
    }

    distance(pos1,pos2){
        return Math.sqrt(Math.pow((pos1[0]-pos2[0]),2)+Math.pow((pos1[1]-pos2[1]),2));
    }
}