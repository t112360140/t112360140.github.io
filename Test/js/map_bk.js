class Map{
    pointList=[];
    chucks=[];
    constructor(canvas,config={}){
        this.canvas=canvas;

        this.chuckSize=config.chuckSize??20;
        this.height=Math.ceil(this.canvas.height/this.chuckSize);
        this.width=Math.ceil(this.canvas.width/this.chuckSize);
        this.maxWeight=config.maxWeight??3;

        this.init();
    }

    init(){
        this.chucks=[];
        for(let i=0;i<this.width;i++){
            let tempList=[];
            for(let j=0;j<this.height;j++){
                tempList.push({
                    line:null,
                    point:[],
                    weight:0,
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
            const dx=newPointList[i][0]%this.chuckSize;
            const dy=newPointList[i][1]%this.chuckSize;
            if(0<=x&&0<=y&&x<this.width&&y<this.height){
                const chuck=this.chucks[x][y];
                const pos=[dx,dy];
    
                if(chuck.weight<=0){
                    chuck.point=pos;
                }else if(!chuck.line){
                    chuck.line=[chuck.point,pos];
                }else{
                    const weight=(1/chuck.weight);
                    const pointOnLine=this.pointOnLine(chuck.line,pos);
                    const D=[this.distance(chuck.line[0],pointOnLine),
                            this.distance(chuck.line[1],pointOnLine),this.distance(chuck.line[0],chuck.line[1])];

                    for(let j=0;j<2;j++){
                        for(let k=0;k<2;k++){
                            chuck.line[j][k]+=(pos[k]-pointOnLine[k])*(D[(j+1)%2]/(D[0]+D[1]))*weight;
                        }
                    }
                    if(D[0]>D[2]){
                        chuck.line[1]=[
                            chuck.line[1][0]+(pointOnLine[0]-chuck.line[1][0])*weight,
                            chuck.line[1][1]+(pointOnLine[1]-chuck.line[1][1])*weight,
                        ]
                    }
                    if(D[1]>D[2]){
                        chuck.line[0]=[
                            chuck.line[0][0]+(pointOnLine[0]-chuck.line[0][0])*weight,
                            chuck.line[0][1]+(pointOnLine[0]-chuck.line[0][1])*weight,
                        ]
                    }
                }
                chuck.weight=Math.min(chuck.weight+1,this.maxWeight);
            }
        }
    }

    distance(pos1,pos2){
        return Math.sqrt(Math.pow((pos1[0]-pos2[0]),2)+Math.pow((pos1[1]-pos2[1]),2));
    }
    
    pointOnLine(line,point){
        let a1,b1,c1,a2,b2,c2;
        if((line[0][0]-line[1][0])===0){
            a1=1;
            b1=0;
            c1=line[0][0];
            a2=0;
            b2=1;
            c2=point[1];
        }else{
            let _m1,_m2;
            _m1=((line[1][1]-line[0][1])/(line[1][0]-line[0][0]));
            a1=-_m1;
            b1=1;
            c1=a1*line[0][0]+line[0][1];
            _m2=-(1/_m1);
            a2=-_m2;
            b2=1;
            c2=a2*point[0]+point[1];
        }

        const D=a1*b2-b1*a2;
        const Dx=c1*b2-b1*c2;
        const Dy=a1*c2-c1*a2;
        

        const pos=[Dx/D,Dy/D];

        return pos;
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

        return {cross:true,pos:[Math.ceil(pos[0]),Math.ceil(pos[1])]};
    }
}