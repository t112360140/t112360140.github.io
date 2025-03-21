class Map{
    pointList=[];
    chucks=[];
    constructor(canvas,config={}){
        this.canvas=canvas;

        this.chuckSize=config.chuckSize??20;
        this.height=Math.ceil(this.canvas.height/this.chuckSize);
        this.width=Math.ceil(this.canvas.width/this.chuckSize);
        this.maxPoint=config.maxPoint??20;

        this.init();
    }

    init(){
        this.chucks=[];
        for(let i=0;i<this.width;i++){
            let tempList=[];
            for(let j=0;j<this.height;j++){
                tempList.push({
                    line:null,
                    points:[],
                });
            }
            this.chucks.push(tempList);
        }
    }

    showChucks(){
        for(let i=1;i<this.width;i++){
            this.canvas.newLine([[i*this.chuckSize,0],[i*this.chuckSize,this.canvas.height]],{color:' #ffffff'});
        }
        for(let i=1;i<this.height;i++){
            this.canvas.newLine([[0,i*this.chuckSize],[this.canvas.width,i*this.chuckSize]],{color:' #ffffff'});
        }
        this.canvas.refresh();
    }

    getAllLine(refresh=false){
        let lineList=[];
        for(let i=0;i<this.width;i++){
            for(let j=0;j<this.height;j++){
                if(this.chucks[i][j].line){
                    const line=[
                        [
                            Math.round(this.chucks[i][j].line[0][0]+i*this.chuckSize),
                            Math.round(this.chucks[i][j].line[0][1]+j*this.chuckSize),
                        ],
                        [
                            Math.round(this.chucks[i][j].line[1][0]+i*this.chuckSize),
                            Math.round(this.chucks[i][j].line[1][1]+j*this.chuckSize),
                        ]
                    ];
                    lineList.push(line);
                    if(refresh){
                        this.canvas.newLine(line,{width:5});
                    }
                }
            }
        }
        if(refresh){
            this.canvas.refresh();
        }
        return lineList;
    }

    newPoint(newPointList=[]){
        for(let i=0;i<newPointList.length;i++){
            const x=Math.floor(newPointList[i][0]/this.chuckSize);
            const y=Math.floor(newPointList[i][1]/this.chuckSize);
            const dx=(newPointList[i][0]%this.chuckSize);
            const dy=(newPointList[i][1]%this.chuckSize);
            if(0<=x&&0<=y&&x<this.width&&y<this.height){
                const chuck=this.chucks[x][y];
                
                if(chuck.points.length>this.maxPoint){
                    chuck.points=chuck.points.slice(1);
                }
                chuck.points.push([dx,dy]);

                if(chuck.points>=this.maxPoint){
                    let line=[[0,0],[1,1]];

                }
            }
        }
    }

    XYdist(line,pos){
        const lineDx=line[1][0]-line[0][0];
        const lineDy=line[1][1]-line[0][1];
        let Dx=lineDy!==0?Math.abs():(line[0][0]===pos[0]?0:-1);
        let Dy=lineDx!==0?Math.abs():(line[0][1]===pos[1]?0:-1);

        return [Dx,Dy];
    }

    distance(pos1,pos2){
        return Math.sqrt(Math.pow((pos1[0]-pos2[0]),2)+Math.pow((pos1[1]-pos2[1]),2));
    }

    angle(x,y){
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

        return {cross:true,pos:pos};
    }
}