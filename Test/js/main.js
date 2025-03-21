const canvas1=new Canvas(document.getElementById('map-1'),{height:500,width:1000,background:' #f9f9f9',border:" #000000"});
const canvas2=new Canvas(document.getElementById('map-2'),{height:500,width:1000});
const canvas3=new Canvas(document.getElementById('map-3'),{height:500,width:1000});
const canvas4=new Canvas(document.getElementById('map-4'),{height:500,width:1000});
const canvas5=new Canvas(document.getElementById('map-5'),{height:300,width:600});

const car=new Car(canvas1,canvas1.width/2,canvas1.height/2,{
        height:20,
        width:15,
        keyboard:true,
        raderCanvas:canvas4,
        raderCanvasCenter:canvas5,
        pathCanvas:canvas2,
        mapCanvas:canvas3,
        realTimeRaderScan:true,
        number:180,
        ray:true,
    });

let realtimeRaderScanLoop=null;
let printRay=true
let rayNumber=180

let carFollowLoop=null;

const map=new Map(canvas3,{
    chuckSize:30,
});

canvas1.canvas.addEventListener('contextmenu',(event)=>{
    event.preventDefault();
    Menu(event.layerX+10,event.layerY+10,[
        {
            name:'RealTime Scan',
            fun:function(){
                if(!realtimeRaderScanLoop){
                    realtimeRaderScanLoop=setInterval(()=>{
                        const point=radarScan(canvas1,canvas1.mousePos[0],canvas1.mousePos[1],{border:true,number:rayNumber,returnPos:true});
                        renderPoint(canvas2,point,{ray:printRay,pos:canvas1.mousePos});
                    },100);
                }else{
                    clearInterval(realtimeRaderScanLoop);
                    realtimeRaderScanLoop=null;
                }
            },
        },
        {
            name:'RealTime Scan wit Map',
            fun:function(){
                if(!realtimeRaderScanLoop){
                    realtimeRaderScanLoop=setInterval(()=>{
                        const point=radarScan(canvas1,canvas1.mousePos[0],canvas1.mousePos[1],{border:true,number:rayNumber,returnPos:true});
                        renderPoint(canvas2,point,{ray:printRay,pos:canvas1.mousePos});
                        map.newPoint(point);
                        map.canvas.clear();
                        map.getAllLine(true);
                    },100);
                }else{
                    clearInterval(realtimeRaderScanLoop);
                    realtimeRaderScanLoop=null;
                }
            },
        },
        {
            name:'Ray?',
            fun:function(){
                printRay=!printRay;
            },
        },
        {
            name:'--Ray Number--',
            fun:()=>{},
            disable:true,
        },
        {
            name:'360',
            fun:()=>{
                rayNumber=360;
            },
        },
        {
            name:'180',
            fun:()=>{
                rayNumber=180;
            },
        },
        {
            name:'60',
            fun:()=>{
                rayNumber=60;
            },
        },
        {
            name:'--------------',
            fun:()=>{},
            disable:true,
        },
        {
            name:'New Shape',
            fun:function(){
                canvas1.newShape();
            },
        },
        {
            name:'New Line',
            fun:function(){
                canvas1.newShape({line:true,width:2});
            },
        },
        {
            name:'Clear',
            fun:function(){
                canvas1.clear();
            },
        },
        {
            name:'Copy Pos',
            fun:function(){
                copy_text(`[${canvas1.mousePos[0]},${canvas1.mousePos[1]}]`);
            },
        },
        {
            name:'--------------',
            fun:()=>{},
            disable:true,
        },
        {
            name:'Car Follow',
            fun:()=>{
                if(!carFollowLoop){
                    carFollowLoop=setInterval(()=>{
                        const status=car.followPoint(canvas1.mousePos,{path:true});
                        if(false&&status!==0){
                            clearInterval(carFollowLoop);
                            carFollowLoop=null;
                        }
                    },25);
                }else{
                    clearInterval(carFollowLoop);
                    carFollowLoop=null;
                }
            },
        },
        {
            name:'Car Follow Back',
            fun:()=>{
                if(!carFollowLoop){
                    carFollowLoop=setInterval(()=>{
                        const status=car.followPoint(canvas1.mousePos,{back:true,path:true});
                        if(false&&status!==0){
                            clearInterval(carFollowLoop);
                            carFollowLoop=null;
                        }
                    },25);
                }else{
                    clearInterval(carFollowLoop);
                    carFollowLoop=null;
                }
            },
        },
    ]);
});

canvas3.canvas.addEventListener('contextmenu',(event)=>{
    event.preventDefault();
    Menu(event.layerX+10,event.layerY+10,[
        {
            name:'Clear',
            fun:function(){
                map.canvas.clear();
                map.canvas.refresh();
            },
        },
        {
            name:'Show Chuck',
            fun:function(){
                map.showChucks();
            },
        },
        {
            name:'Show All Line',
            fun:function(){
                map.getAllLine(true);
            },
        },
    ]);
});