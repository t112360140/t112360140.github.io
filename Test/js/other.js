function Menu(X,Y,context=[{name:'Test',fun:function(){console.log('Wah!')}}]){
    const div=document.createElement('div');
    div.style.cssText=`position:absolute;min-width:50px;top:${Y};left:${X};border:3px solid #000000;background: #f0f0f0;padding:2`;

    for(let i=0;i<context.length;i++){
        const button=document.createElement('a');
        button.style.cssText='margin-bottom:2;cursor:pointer;';
        button.innerHTML=context[i].name;
        if(!context[i].disable){
            button.addEventListener('click',context[i].fun,{once:true});
        }
        div.appendChild(button);
        div.appendChild(document.createElement('br'));
    }
    document.body.appendChild(div);
    document.addEventListener('mousedown',(event)=>{
        setTimeout(()=>{
            document.body.removeChild(div);
        },150);
    },{once:true});
}

function copy_text(text){
    const copyTextarea=document.createElement('textarea');
    text?(copyTextarea.value=text):copyTextarea.value='HI! You find Me!';
    document.body.appendChild(copyTextarea);
    copyTextarea.focus();
    copyTextarea.select();
    try {
        const successful=document.execCommand('copy');
    } catch (err) {
        console.log('Oops, unable to copy');
    }
    document.body.removeChild(copyTextarea);
}

function cloneJSON(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object')  {
        return obj
    }
    if (obj instanceof Array) {
        var cloneA = [];
        for (var i = 0; i < obj.length; ++i) {
            cloneA[i] = cloneJSON(obj[i]);
        }
        return cloneA;
    }
    var cloneO = {};   
    for (var i in obj) {
        cloneO[i] = cloneJSON(obj[i]);
    }
    return cloneO;
}

function radarScan(canvas,x=0,y=0,config={}){
    const number=config.number??30;
    const accuracy=config.accuracy??0.98;
    const maxLen=canvas.height+canvas.width;
    const canvasLineList=canvas.getAllLine(config.border);
    const crossPointList=[];

    if(config.ray){
        config.ray.clear();
    }

    for(let i=0;i<number;i++){
        const angle=2*(i/number)*Math.PI;
        const line=[[x,y],[x+maxLen*Math.cos(angle),y+maxLen*Math.sin(angle)]];
        let mindist=Infinity;
        let crossPos=null;
        for(let j=0;j<canvasLineList.length;j++){
            const cross=canvas.intersect(line,canvasLineList[j]);
            if(cross.cross){
                const dist=canvas.distance([x,y],cross.pos);
                if(dist<mindist){
                    mindist=dist;
                    crossPos=cross.pos;
                }
            }
        }
        if(crossPos){
            if(config.returnPos){
                crossPointList.push([crossPos[0]+((mindist*(1-accuracy))*(Math.random()-0.5)),crossPos[1]+((mindist*(1-accuracy))*(Math.random()-0.5))]);
            }else{
                crossPointList.push({
                    angle:(360*(i/number)),
                    dist:(mindist*(1+(1-accuracy)*(Math.random()-0.5))),
                });
            }
        }

        if(config.ray){
            config.ray.newLine(line,{color:'#ff0000'});
        }
    }
    canvas.refresh();
    return crossPointList;
}

function renderPoint(canvas,pointList=[],config){
    const maxRay=config.maxRay??60;
    canvas.clear();
    if(config.ray&&config.pos){
        canvas.newPoint(config.pos[0],config.pos[1],{width:5,color:'#ff0000'});
        for(let i=0;i<pointList.length;i++){
            if((i+1)%(Math.ceil(pointList.length/maxRay))===0){
                canvas.newLine([config.pos,pointList[i]],{color:'#ff0000'});
            }
        }
    }
    for(let i=0;i<pointList.length;i++){
        canvas.newPoint(pointList[i][0],pointList[i][1],config);
    }
    canvas.refresh();
}