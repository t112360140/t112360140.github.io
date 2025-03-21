class Map{
    pointList=[];
    chucks=[];
    constructor(canvas,config={}){
        this.canvas=canvas;

        this.chuckSize=config.chuckSize??20;
        this.height=Math.ceil(this.canvas.height/this.chuckSize);
        this.width=Math.ceil(this.canvas.width/this.chuckSize);
        this.maxPoint=config.maxPoint??100;
        this.weight=config.weight??0.99;

        this.init();
    }

    init(){
        this.chucks=[];
        for(let i=0;i<this.width;i++){
            let tempList=[];
            for(let j=0;j<this.height;j++){
                tempList.push({
                    line:null,
                    n:0,
                    Ax:0,
                    Ay:0,
                    Sxx:0,
                    Sxy:0,
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
                
                if(chuck.n<this.maxPoint){
                    chuck.Ax=(chuck.Ax*chuck.n+dx)/(chuck.n+1);
                    chuck.Ay=(chuck.Ay*chuck.n+dy)/(chuck.n+1);
                    chuck.n+=1;
                    chuck.Sxx+=dx*dx;
                    chuck.Sxy+=dx*dy;
                }else{
                    chuck.Ax=chuck.Ax*this.weight+dx*(1-this.weight);
                    chuck.Ay=chuck.Ay*this.weight+dy*(1-this.weight);
                    chuck.Sxx=chuck.Sxx*this.weight+dx*dx*(1-this.weight);
                    chuck.Sxy=chuck.Sxy*this.weight+dx*dy*(1-this.weight);
                }
                if(chuck.n>1){
                    
                    const side=[
                        [[0,0],[0,this.chuckSize]],
                        [[0,this.chuckSize],[this.chuckSize,this.chuckSize]],
                        [[this.chuckSize,this.chuckSize],[this.chuckSize,0]],
                        [[this.chuckSize,0],[0,0]],
                    ];
                    let crossPoint=[];
                    for(let j=0;j<side.length;j++){
                        const isCross=this.intersect(line,side[j]);
                        if(isCross.cross){
                            crossPoint.push(isCross.pos);
                        }
                    }
                    if(crossPoint.length>=2){
                        chuck.line=[crossPoint[0],crossPoint[1]];
                    }
                }
            }
        }
    }
    /**
    newPoint(newPointList=[]){
        for(let i=0;i<newPointList.length;i++){
            const x=Math.floor(newPointList[i][0]/this.chuckSize);
            const y=Math.floor(newPointList[i][1]/this.chuckSize);
            const dx=(newPointList[i][0]%this.chuckSize);
            const dy=(newPointList[i][1]%this.chuckSize);
            if(0<=x&&0<=y&&x<this.width&&y<this.height){
                const chuck=this.chucks[x][y];
                
                if(chuck.n<this.maxPoint){
                    chuck.Ax=(chuck.Ax*chuck.n+dx)/(chuck.n+1);
                    chuck.Ay=(chuck.Ay*chuck.n+dy)/(chuck.n+1);
                    chuck.n+=1;
                    chuck.Sxx+=dx*dx;
                    chuck.Sxy+=dx*dy;
                }else{
                    chuck.Ax=chuck.Ax*this.weight+dx*(1-this.weight);
                    chuck.Ay=chuck.Ay*this.weight+dy*(1-this.weight);
                    chuck.Sxx=chuck.Sxx*this.weight+dx*dx*(1-this.weight);
                    chuck.Sxy=chuck.Sxy*this.weight+dx*dy*(1-this.weight);
                }
                if(chuck.n>1){
                    let m,c;
                    let line=[[0,0],[0,0]];
                    if((chuck.Sxx-chuck.n*chuck.Ax*chuck.Ax)!==0){
                        m=(chuck.Sxy-chuck.n*chuck.Ax*chuck.Ay)/(chuck.Sxx-chuck.n*chuck.Ax*chuck.Ax);
                        c=chuck.Ay-m*chuck.Ax;
                        if(Math.abs(m)>1){
                            line=[
                                [
                                    (((-this.chuckSize)-c)/m),
                                    (-this.chuckSize),
                                ],
                                [
                                    (((2*this.chuckSize)-c)/m),
                                    (2*this.chuckSize),
                                ],
                            ]
                        }else{
                            line=[
                                [
                                    (-this.chuckSize),
                                    (m*(-this.chuckSize)+c),
                                ],
                                [
                                    (2*this.chuckSize),
                                    (m*(2*this.chuckSize)+c),
                                ],
                            ]
                        }
                    }else{
                        line=[
                            [
                                (chuck.Ax),
                                (-this.chuckSize),
                            ],
                            [
                                (chuck.Ax),
                                (2*this.chuckSize),
                            ],
                        ]
                    }
                    const side=[
                        [[0,0],[0,this.chuckSize]],
                        [[0,this.chuckSize],[this.chuckSize,this.chuckSize]],
                        [[this.chuckSize,this.chuckSize],[this.chuckSize,0]],
                        [[this.chuckSize,0],[0,0]],
                    ];
                    let crossPoint=[];
                    for(let j=0;j<side.length;j++){
                        const isCross=this.intersect(line,side[j]);
                        if(isCross.cross){
                            crossPoint.push(isCross.pos);
                        }
                    }
                    if(crossPoint.length>=2){
                        chuck.line=[crossPoint[0],crossPoint[1]];
                    }
                }
            }
        }
    }**/

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

        return {cross:true,pos:pos};
    }
}