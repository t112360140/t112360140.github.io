class Dashboard{
    constructor(canvas, height=128, width=128){
        this.height=height;
        this.width=width;

        this.canvas=(typeof canvas=='string')?document.getElementById(canvas):canvas;
        if(this.canvas){
            this.canvas.height=this.height;
            this.canvas.width=this.width;
            this.ctx=this.canvas.getContext("2d");
        }

        if(TurnSignal) this.turnSignal=new TurnSignal();

        this.status={
            velocity:0,
            velocityLimit:0,
            turnSignal:0,
            hazardLights: 0,
            steering:0,
            gear:0,
        }

        this.fps = 30;
        this.fpsInterval = 1000 / this.fps;
        this.lastDrawTime = 0;
        
        this.animate = this.animate.bind(this);

        this.start();
    }
    
    start(){
        this.animate(performance.now());
    }

    animate(now){
        requestAnimationFrame(this.animate);

        const elapsed = now - this.lastDrawTime;

        if (elapsed < this.fpsInterval) return;

        this.lastDrawTime = now - (elapsed % this.fpsInterval);
        this.draw();
    }

    draw(){
        if(!this.canvas||!this.ctx) return;

        const halfH=this.height/2;
        const halfW=this.width/2;

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.beginPath();

        this.ctx.fillStyle='#000000c9';
        this.ctx.roundRect(0, 0, this.width, this.height, halfH);
        this.ctx.fill();

        this.ctx.fillStyle='#e6e6e6';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';

        this.ctx.font=`${Math.floor(halfH*24/30)}pt sans-serif`;
        this.ctx.fillText(Math.abs(Math.round(this.status.velocity)).toString(), halfW, halfH*20/30);

        this.ctx.font=`${Math.floor(halfH*6/30)}pt sans-serif`;
        this.ctx.fillText('km/h', halfW, halfH*38/30);


        this.ctx.lineWidth=halfH*1/13;

        this.ctx.beginPath();
        this.ctx.strokeStyle=((this.status.hazardLights==2||this.status.turnSignal==2)&&(!this.turnSignal||this.turnSignal.light))
                                ?'#0f0':'rgba(141, 141, 141, 0.25)';
        this.ctx.moveTo(halfW/2, halfH*15/30);
        this.ctx.lineTo(halfW/2-halfH*8/30, halfH*23/30);
        this.ctx.lineTo(halfW/2, halfH*31/30);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.strokeStyle=((this.status.hazardLights==2||this.status.turnSignal==3)&&(!this.turnSignal||this.turnSignal.light))
                                ?'#0f0':'rgba(141, 141, 141, 0.25)';
        this.ctx.moveTo(this.width-halfW/2, halfH*15/30);
        this.ctx.lineTo(this.width-(halfW/2-halfH*8/30), halfH*23/30);
        this.ctx.lineTo(this.width-halfW/2, halfH*31/30);
        this.ctx.stroke();

        this.ctx.save();
        this.ctx.translate(this.width-halfW*1/2, this.height-halfH*1/3);
        this.ctx.rotate(-this.status.steering*13.5);
        this.ctx.fillStyle='#e6e6e6';
        this.ctx.strokeStyle='#e6e6e6';
        this.ctx.lineWidth=halfH*1/13;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, halfH*1/8, 0, 2*Math.PI, false);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(0, 0, halfH*1/4, 0, 2*Math.PI, false);
        this.ctx.moveTo(halfH*1/4, 0);
        this.ctx.lineTo(-halfH*1/4, 0);
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, halfH*1/4);
        this.ctx.stroke();
        this.ctx.restore();

        this.ctx.fillStyle='#000';
        this.ctx.font=`${Math.floor(halfH*1/13)}pt sans-serif`;
        this.ctx.fillText(`${(this.status.steering*(180/Math.PI)).toFixed(1)}°`, this.width-halfW*1/2, this.height-halfH*1/3);

        this.ctx.beginPath();
        this.ctx.strokeStyle='#e6e6e6';
        this.ctx.lineWidth=halfH*1/26;
        this.ctx.roundRect(halfW*1/2-halfH*1/6, this.height-halfH*1/3-halfH*1/6, halfH*1/3, halfH*1/3, halfH*1/10);
        this.ctx.stroke();

        this.ctx.fillStyle='#e6e6e6';
        this.ctx.font=`bold ${Math.floor(halfH*1/5)}pt sans-serif`;

        let gearString='D';
        switch(this.status.gear){
            case 1:
                gearString = "N";
                break;
            case 3:
                gearString = "R";
                break;
            case 4:
                gearString = "P";
                break;
            case 5:
                gearString = "L";
                break;
            default:
                gearString = "D";
                break;
        }
        this.ctx.fillText(gearString, halfW*1/2, this.height-halfH*1/3+halfH*1/40);

        this.ctx.beginPath();
        this.ctx.strokeStyle=this.status.velocity>this.status.velocityLimit?'#ff0000':'#ff9393';
        this.ctx.lineWidth=halfH*1/20;
        this.ctx.arc(halfW, this.height-halfH*1/3, halfH*1/4, 0, 2*Math.PI, false);
        this.ctx.stroke();
        this.ctx.fillStyle='#e6e6e6';
        this.ctx.font=`${Math.floor(halfH*6/30)}pt sans-serif`;
        this.ctx.fillText(Math.round(this.status.velocityLimit).toString(), halfW, this.height-halfH*1/3+halfH*1/50);
    }

    setVelocity(velocity=0){
        this.status.velocity=velocity;
    }
    setVelocityLimit(velocity=0){
        this.status.velocityLimit=velocity;
    }
    setSteering(steering=0){
        this.status.steering=steering;
    }
    setTurnSignal(turnSignal=0){
        this.status.turnSignal=turnSignal;
        this.setTurnSignalSound();
    }
    setHazardLights(hazardLights=0){
        this.status.hazardLights=hazardLights;
        this.setTurnSignalSound();
    }
    setGear(gear=0){
        this.status.gear=gear;
    }

    setTurnSignalSound(){
        if(this.turnSignal){
            if(this.status.hazardLights==2) this.turnSignal.setMode(TurnSignal.MODES.BOTH);
            else if(this.status.turnSignal==2) this.turnSignal.setMode(TurnSignal.MODES.LEFT);
            else if(this.status.turnSignal==3) this.turnSignal.setMode(TurnSignal.MODES.RIGHT);
            else this.turnSignal.setMode(TurnSignal.MODES.OFF);
        }
    }
}

class ConnectState{
    constructor(canvas, height=64, width=128){
        this.height=height;
        this.width=width;

        this.canvas=(typeof canvas=='string')?document.getElementById(canvas):canvas;
        if(this.canvas){
            this.canvas.height=this.height;
            this.canvas.width=this.width;
            this.ctx=this.canvas.getContext("2d");
        }

        this.status={
            connect: false,
        }

        this.button={
            mouse: null,
            connect_btn: false,
            auto_connect: false,
            ip_set: false,
        }

        this.event={
            'connect_btn':[],
            'ip_set':[],
        };

        this.fps = 15;
        this.fpsInterval = 1000 / this.fps;
        this.lastDrawTime = 0;
        
        this.animate = this.animate.bind(this);

        this.start();

        if(this.canvas){
            const rect = this.canvas.getBoundingClientRect();
            window.addEventListener('mousemove', (e) => {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.button.mouse={x, y};
            });
            this.canvas.addEventListener('click', ()=>{
                if(this.button.connect_btn) this.event.connect_btn.forEach(F=>F());
                if(this.button.ip_set) this.event.ip_set.forEach(F=>F());
            })
        }
    }

    on(event, fun){
        if(!event||!fun||!this.event[event]) return false;
        this.event[event].push(fun);
        return true;
    }
    
    start(){
        this.animate(performance.now());
    }

    animate(now){
        requestAnimationFrame(this.animate);

        const elapsed = now - this.lastDrawTime;

        if (elapsed < this.fpsInterval) return;

        this.lastDrawTime = now - (elapsed % this.fpsInterval);
        this.draw();
    }

    dist(point1, point2){
        if(!point1||!point2) return Infinity;
        return Math.hypot(point1.x-point2.x, point1.y-point2.y);
    }

    draw(){
        if(!this.canvas||!this.ctx) return;

        const halfH=this.height/2;
        const halfW=this.width/2;

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.beginPath();

        this.ctx.fillStyle='#000000c9';
        this.ctx.roundRect(0, 0, this.width, this.height, halfH);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.fillStyle=this.status.connect?'#0f0':'#f00';
        this.ctx.arc(halfH, halfH, halfH*0.4, 0, 2*Math.PI, true);
        this.ctx.fill();

        if(!this.status.auto_connect){
            this.ctx.beginPath();
            this.ctx.fillStyle=(this.dist(this.button.mouse, {x:this.width-halfH*1.2, y:halfH})<=halfH*0.7)?'#b3b3b3':'#c6c6c6';
            this.button.connect_btn=(this.dist(this.button.mouse, {x:this.width-halfH*1.2, y:halfH})<=halfH*0.7);
            this.ctx.strokeStyle='#bebebe';
            this.ctx.lineWidth=3;
            this.ctx.arc(this.width-halfH*1.2, halfH, halfH*0.7, 0, 2*Math.PI, true);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.fillStyle='#000';
            this.ctx.textAlign='center';
            this.ctx.textBaseline='middle';
            this.ctx.font=`bold ${Math.floor(halfH*0.4)}pt sans-serif`;
            this.ctx.fillText(this.status.connect?'斷開':'連接', this.width-halfH*1.17, halfH*1.05);
        }


        if(this.status.auto_connect){
            this.ctx.beginPath();
            this.ctx.fillStyle=(this.dist(this.button.mouse, {x:this.width-halfH*1.2, y:halfH})<=halfH*0.7)?'#b3b3b3':'#c6c6c6';
            this.button.ip_set=(this.dist(this.button.mouse, {x:this.width-halfH*1.2, y:halfH})<=halfH*0.7);
            this.ctx.strokeStyle='#bebebe';
            this.ctx.lineWidth=3;
            this.ctx.arc(this.width-halfH*1.2, halfH, halfH*0.7, 0, 2*Math.PI, true);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.fillStyle='#000';
            this.ctx.textAlign='center';
            this.ctx.textBaseline='middle';
            this.ctx.font=`bold ${Math.floor(halfH*0.3)}pt sans-serif`;
            this.ctx.fillText('更改IP', this.width-halfH*1.17, halfH*1.05);
        }

        this.canvas.style.cursor=(
            (this.dist(this.button.mouse, {x:this.width-halfH*1.2, y:halfH})<=halfH*0.7)
        )?'pointer':'default';
    }

    connect(){
        this.status.connect=true;
    }

    disconnect(){
        this.status.connect=false;
    }

    setAutoConnect(enable=false){
        this.status.auto_connect=enable;
    }

    isConnect(){
        return this.status.connect;
    }
}

class StatusDraw{
    constructor(canvas, height=128, width=256){
        this.height=height;
        this.width=width;

        this.canvas=(typeof canvas=='string')?document.getElementById(canvas):canvas;
        if(this.canvas){
            this.canvas.height=this.height;
            this.canvas.width=this.width;
            this.ctx=this.canvas.getContext("2d");
        }

        this.modeStatus={
            mode: 0,
            is_autoware_control_enabled: false,
            is_in_transition: false,
            is_stop_mode_available: false,
            is_autonomous_mode_available: false,
            is_local_mode_available: false,
            is_remote_mode_available: false,
        }

        this.status={
            route_state: 0,
            motion_state: 0,

            control_mode: 6,
        };

        this.button={
            mouse: null,
            stop_btn: false,
            local_btn: false,
            remote_btn: false,
            auto_btn: false,

            clear_route_btn: false,
        }

        this.event={
            'stop_btn':[],
            'local_btn':[],
            'remote_btn':[],
            'auto_btn':[],
            
            'clear_route_btn':[],
        };

        this.fps = 15;
        this.fpsInterval = 1000 / this.fps;
        this.lastDrawTime = 0;
        
        this.animate = this.animate.bind(this);

        this.start();

        if(this.canvas){
            const rect = this.canvas.getBoundingClientRect();
            window.addEventListener('mousemove', (e) => {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.button.mouse={x, y};
            });
            this.canvas.addEventListener('click', ()=>{
                if(this.modeStatus.is_stop_mode_available&&this.button.stop_btn) this.event.stop_btn.forEach(F=>F());
                else if(this.modeStatus.is_local_mode_available&&this.button.local_btn) this.event.local_btn.forEach(F=>F());
                else if(this.modeStatus.is_remote_mode_available&&this.button.remote_btn) this.event.remote_btn.forEach(F=>F());
                else if(this.modeStatus.is_autonomous_mode_available&&this.button.auto_btn) this.event.auto_btn.forEach(F=>F());
                else if(this.button.clear_route_btn) this.event.clear_route_btn.forEach(F=>F());
            })
        }
    }

    on(event, fun){
        if(!event||!fun||!this.event[event]) return false;
        this.event[event].push(fun);
        return true;
    }
    
    start(){
        this.animate(performance.now());
    }

    animate(now){
        requestAnimationFrame(this.animate);

        const elapsed = now - this.lastDrawTime;

        if (elapsed < this.fpsInterval) return;

        this.lastDrawTime = now - (elapsed % this.fpsInterval);
        this.draw();
    }

    dist(point1, point2){
        if(!point1||!point2) return Infinity;
        return Math.hypot(point1.x-point2.x, point1.y-point2.y);
    }

    draw(){
        if(!this.canvas||!this.ctx) return;

        const halfH=this.height/2;
        const halfW=this.width/2;
        const halfHalfH=halfH/2;
        const halfHalfW=halfW/2;
        const W_5=this.width/5;

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.beginPath();

        this.ctx.fillStyle='#000000c9';
        this.ctx.roundRect(0, 0, this.width, this.height, this.height/3);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.fillStyle=(this.modeStatus.is_autonomous_mode_available&&this.dist(this.button.mouse, {x:W_5, y:halfHalfH})<=halfHalfH*0.7)?'#b3b3b3':'#c6c6c6';
        this.button.auto_btn=(this.modeStatus.is_autonomous_mode_available&&this.dist(this.button.mouse, {x:W_5, y:halfHalfH})<=halfHalfH*0.7);
        this.ctx.strokeStyle=this.modeStatus.mode==2?'#3535fd':'#bebebe';
        this.ctx.lineWidth=3;
        this.ctx.arc(W_5, halfHalfH, halfHalfH*0.7, 0, 2*Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle=this.modeStatus.is_autonomous_mode_available?'#000':'#929292';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(halfHalfH*0.4)}pt sans-serif`;
        this.ctx.fillText('自動', W_5, halfHalfH*1.05);
        
        this.ctx.beginPath();
        this.ctx.fillStyle=(this.modeStatus.is_remote_mode_available&&this.dist(this.button.mouse, {x:W_5*2, y:halfHalfH})<=halfHalfH*0.7)?'#b3b3b3':'#c6c6c6';
        this.button.remote_btn=(this.modeStatus.is_remote_mode_available&&this.dist(this.button.mouse, {x:W_5*2, y:halfHalfH})<=halfHalfH*0.7);
        this.ctx.strokeStyle=this.modeStatus.mode==4?'#3535fd':'#bebebe';
        this.ctx.lineWidth=3;
        this.ctx.arc(W_5*2, halfHalfH, halfHalfH*0.7, 0, 2*Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle=this.modeStatus.is_remote_mode_available?'#000':'#929292';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(halfHalfH*0.4)}pt sans-serif`;
        this.ctx.fillText('遠端', W_5*2, halfHalfH*1.05);
        
        this.ctx.beginPath();
        this.ctx.fillStyle=(this.modeStatus.is_local_mode_available&&this.dist(this.button.mouse, {x:W_5*3, y:halfHalfH})<=halfHalfH*0.7)?'#b3b3b3':'#c6c6c6';
        this.button.local_btn=(this.modeStatus.is_local_mode_available&&this.dist(this.button.mouse, {x:W_5*3, y:halfHalfH})<=halfHalfH*0.7);
        this.ctx.strokeStyle=this.modeStatus.mode==3?'#3535fd':'#bebebe';
        this.ctx.lineWidth=3;
        this.ctx.arc(W_5*3, halfHalfH, halfHalfH*0.7, 0, 2*Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle=this.modeStatus.is_local_mode_available?'#000':'#929292';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(halfHalfH*0.4)}pt sans-serif`;
        this.ctx.fillText('本地', W_5*3, halfHalfH*1.05);
        
        this.ctx.beginPath();
        this.ctx.fillStyle=(this.modeStatus.is_stop_mode_available&&this.dist(this.button.mouse, {x:W_5*4, y:halfHalfH})<=halfHalfH*0.7)?'#b3b3b3':'#c6c6c6';
        this.button.stop_btn=(this.modeStatus.is_stop_mode_available&&this.dist(this.button.mouse, {x:W_5*4, y:halfHalfH})<=halfHalfH*0.7);
        this.ctx.strokeStyle=this.modeStatus.mode==1?'#3535fd':'#bebebe';
        this.ctx.lineWidth=3;
        this.ctx.arc(W_5*4, halfHalfH, halfHalfH*0.7, 0, 2*Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle=this.modeStatus.is_stop_mode_available?'#000':'#929292';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(halfHalfH*0.4)}pt sans-serif`;
        this.ctx.fillText('停止', W_5*4, halfHalfH*1.05);
        
        this.ctx.beginPath();
        this.ctx.fillStyle=(this.dist(this.button.mouse, {x:W_5*3, y:this.height-halfHalfH})<=halfHalfH*0.7)?'#b3b3b3':'#c6c6c6';
        this.button.clear_route_btn=(this.dist(this.button.mouse, {x:W_5*3, y:this.height-halfHalfH})<=halfHalfH*0.7);
        this.ctx.strokeStyle='#bebebe';
        this.ctx.lineWidth=3;
        this.ctx.arc(W_5*3, this.height-halfHalfH, halfHalfH*0.7, 0, 2*Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle='#000';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(halfHalfH*0.3)}pt sans-serif`;
        this.ctx.fillText('清除', W_5*3, this.height-halfHalfH*0.95-halfHalfH*0.2);
        this.ctx.fillText('路線', W_5*3, this.height-halfHalfH*0.95+halfHalfH*0.2);
        
        this.canvas.style.cursor=(
            (this.modeStatus.is_autonomous_mode_available&&this.dist(this.button.mouse, {x:W_5, y:halfHalfH})<=halfHalfH*0.7)||
            (this.modeStatus.is_remote_mode_available&&this.dist(this.button.mouse, {x:W_5*2, y:halfHalfH})<=halfHalfH*0.7)||
            (this.modeStatus.is_local_mode_available&&this.dist(this.button.mouse, {x:W_5*3, y:halfHalfH})<=halfHalfH*0.7)||
            (this.modeStatus.is_stop_mode_available&&this.dist(this.button.mouse, {x:W_5*4, y:halfHalfH})<=halfHalfH*0.7)||
            (this.dist(this.button.mouse, {x:W_5*3, y:this.height-halfHalfH})<=halfHalfH*0.7))?'pointer':'default';

        const route_color=['#bebebe', '#bebebe', '#3535fd', '#00ff00', '#ffff50'];
        const route_text=['未知', '未設定', '已設定', '已抵達', '更改中'];
        this.ctx.beginPath();
        this.ctx.strokeStyle=route_color[this.status.route_state];
        this.ctx.lineWidth=3;
        this.ctx.arc(W_5*1, this.height-halfHalfH, halfHalfH*0.7, 0, 2*Math.PI, true);
        this.ctx.stroke();
        this.ctx.fillStyle='#c6c6c6';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(halfHalfH*0.3)}pt sans-serif`;
        this.ctx.fillText(route_text[this.status.route_state], W_5*1, this.height-halfHalfH*0.95);

        const motion_color=['#bebebe', '#ff9393', '#9393ff', '#93ff93'];
        const motion_text=['未知', '停止', '啟動', '移動'];
        this.ctx.beginPath();
        this.ctx.strokeStyle=motion_color[this.status.motion_state];
        this.ctx.lineWidth=3;
        this.ctx.arc(W_5*2, this.height-halfHalfH, halfHalfH*0.7, 0, 2*Math.PI, true);
        this.ctx.stroke();
        this.ctx.fillStyle='#c6c6c6';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(halfHalfH*0.4)}pt sans-serif`;
        this.ctx.fillText(motion_text[this.status.motion_state], W_5*2, this.height-halfHalfH*0.95);

        const control_mode_color=['darkgray ', 'green', 'darkgray', 'darkgray', 'red', 'orange', 'darkgray'];
        const control_mode_text=[
            ['待命', '模式'], ['自動', '駕駛'], ['自動', '轉向'],
            ['自動', '控速'], ['手動', '駕駛'], ['系統', '脫離'], ['尚未', '就緒']
        ];
        this.ctx.beginPath();
        this.ctx.strokeStyle=control_mode_color[this.status.control_mode];
        this.ctx.fillStyle=control_mode_color[this.status.control_mode];
        this.ctx.lineWidth=3;
        this.ctx.arc(W_5*4, this.height-halfHalfH, halfHalfH*0.7, 0, 2*Math.PI, true);
        this.ctx.stroke();
        this.ctx.fill();
        this.ctx.fillStyle='white';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(halfHalfH*0.3)}pt sans-serif`;
        this.ctx.fillText(control_mode_text[this.status.control_mode][0], W_5*4, this.height-halfHalfH*0.95-halfHalfH*0.2);
        this.ctx.fillText(control_mode_text[this.status.control_mode][1], W_5*4, this.height-halfHalfH*0.95+halfHalfH*0.2);
    }

    setModeStatus(msg){
        this.modeStatus=msg;
    }
    setRouteState(state){
        this.status.route_state=state;
    }
    getRouteStatus(){
        return this.status.route_state;
    }
    setMotionState(state){
        this.status.motion_state=state;
    }

    serControlMode(mode){
        this.status.control_mode=mode;
    }
}

class MissionState{
    constructor(canvas, height=128, width=128){
        this.height=height;
        this.width=width;

        this.canvas=(typeof canvas=='string')?document.getElementById(canvas):canvas;
        if(this.canvas){
            this.canvas.height=this.height;
            this.canvas.width=this.width;
            this.ctx=this.canvas.getContext("2d");
        }

        this.status={
            remaining_distance: 0,
            remaining_time: 0,

            direction: 0,
            distance: 0,

            distanceNum: 'Null',
            distanceUnit: 'm',
            timeNum: 'Null',
            timeUnit: 'sec',

            steerDistanceNum: 'Null',
            steerDistanceUnit: 'm',
        }

        this.button={
            
        }

        this.event={
            
        };

        this.fps = 15;
        this.fpsInterval = 1000 / this.fps;
        this.lastDrawTime = 0;
        
        this.animate = this.animate.bind(this);

        this.start();

        if(this.canvas){
            const rect = this.canvas.getBoundingClientRect();
            window.addEventListener('mousemove', (e) => {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.button.mouse={x, y};
            });
            this.canvas.addEventListener('click', ()=>{
                if(this.button.connect_btn) this.event.connect_btn.forEach(F=>F());
                if(this.button.ip_set) this.event.ip_set.forEach(F=>F());
            })
        }
    }

    on(event, fun){
        if(!event||!fun||!this.event[event]) return false;
        this.event[event].push(fun);
        return true;
    }
    
    start(){
        this.animate(performance.now());
    }

    animate(now){
        requestAnimationFrame(this.animate);

        const elapsed = now - this.lastDrawTime;

        if (elapsed < this.fpsInterval) return;

        this.lastDrawTime = now - (elapsed % this.fpsInterval);
        this.draw();
    }

    dist(point1, point2){
        if(!point1||!point2) return Infinity;
        return Math.hypot(point1.x-point2.x, point1.y-point2.y);
    }

    draw(){
        if(!this.canvas||!this.ctx) return;

        const halfH=this.height/2;
        const halfW=this.width/2;
        const H_5=this.height/5;
        const W_4=this.width/4;

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.beginPath();

        this.ctx.fillStyle='#000000c9';
        this.ctx.roundRect(0, 0, this.width, this.height, W_4);
        this.ctx.fill();

        this.ctx.fillStyle='#e6e6e6';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(H_5*0.7)}pt sans-serif`;
        this.ctx.fillText(this.status.distanceNum, W_4*2.7, H_5*1.5);
        this.ctx.fillText(this.status.timeNum, W_4*2.7, H_5*3.5);

        this.ctx.font=`bold ${Math.floor(H_5*0.4)}pt sans-serif`;
        this.ctx.fillText(this.status.distanceUnit, W_4*2.7, H_5*2);
        this.ctx.fillText(this.status.timeUnit, W_4*2.7, H_5*4);

        this.ctx.fillStyle='#e6e6e6';
        this.ctx.strokeStyle='#e6e6e6';
        this.ctx.lineWidth=W_4*0.3;
        let print_text=false;
        if(this.status.direction==1){   //左
            this.ctx.beginPath();
            this.ctx.moveTo(W_4*1.4, H_5*3);
            this.ctx.lineTo(W_4*1.4, H_5*1.8);
            this.ctx.arc(W_4, H_5*1.8, W_4*0.4, 0, -Math.PI/2, true);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(W_4*0.7, H_5*1.8-W_4*0.3);
            this.ctx.lineTo(W_4*1.1, H_5*1-W_4*0.3);
            this.ctx.lineTo(W_4*1.1, H_5*2.6-W_4*0.3);
            this.ctx.closePath();
            this.ctx.fill();
            print_text=true;
        }else if(this.status.direction==2){ //右
            this.ctx.beginPath();
            this.ctx.moveTo(W_4*0.6, H_5*3);
            this.ctx.lineTo(W_4*0.6, H_5*1.8);
            this.ctx.arc(W_4, H_5*1.8, W_4*0.4, Math.PI, -Math.PI/2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(W_4*1.3, H_5*1.8-W_4*0.3);
            this.ctx.lineTo(W_4*0.9, H_5*1-W_4*0.3);
            this.ctx.lineTo(W_4*0.9, H_5*2.6-W_4*0.3);
            this.ctx.closePath();
            this.ctx.fill();
            print_text=true;
        }else if(this.status.direction==3){ //直
            this.ctx.beginPath();
            this.ctx.moveTo(W_4, H_5*3);
            this.ctx.lineTo(W_4, H_5*2);
            this.ctx.stroke();
            this.ctx.moveTo(W_4, H_5*0.5);
            this.ctx.lineTo(W_4*0.5, H_5*2.2);
            this.ctx.lineTo(W_4, H_5*2.1);
            this.ctx.lineTo(W_4*1.5, H_5*2.2);
            this.ctx.closePath();
            this.ctx.fill();
            print_text=true;
        }
        if(print_text){
            this.ctx.font=`bold ${Math.floor(H_5*0.5)}pt sans-serif`;
            this.ctx.fillText(this.status.steerDistanceNum, W_4, H_5*3.7);
            this.ctx.font=`bold ${Math.floor(H_5*0.4)}pt sans-serif`;
            this.ctx.fillText(this.status.steerDistanceUnit, W_4, H_5*4.3);
        }
    }

    setRemaining(msg){
        this.status.remaining_distance=msg.remaining_distance;
        this.status.remaining_time=msg.remaining_time;


        if(this.status.remaining_distance<=10){
            this.status.distanceNum=this.status.remaining_distance.toFixed(1);
            this.status.distanceUnit='m';
        }else if(this.status.remaining_distance<=1000){0
            this.status.distanceNum=this.status.remaining_distance.toFixed(0);
            this.status.distanceUnit='m';
        }else if(this.status.remaining_distance<=10000){
            this.status.distanceNum=(this.status.remaining_distance/1000).toFixed(2);
            this.status.distanceUnit='km';
        }else if(this.status.remaining_distance<=100000){
            this.status.distanceNum=(this.status.remaining_distance/1000).toFixed(1);
            this.status.distanceUnit='km';
        }else{
            this.status.distanceNum=(this.status.remaining_distance/1000).toFixed(0);
            this.status.distanceUnit='km';
        }
        if(this.status.remaining_time<=60){
            this.status.timeNum=this.status.remaining_time.toFixed(0);
            this.status.timeUnit='sec';
        }else if(this.status.remaining_time<=600){
            this.status.timeNum=(this.status.remaining_time/60).toFixed(1);
            this.status.timeUnit='min';
        }else if(this.status.remaining_time<=3600){
            this.status.timeNum=(this.status.remaining_time/60).toFixed(0);
            this.status.timeUnit='min';
        }else if(this.status.remaining_time<=36000){
            this.status.timeNum=(this.status.remaining_time/3600).toFixed(1);
            this.status.timeUnit='hr';
        }else{
            this.status.timeNum=(this.status.remaining_time/3600).toFixed(0);
            this.status.timeUnit='hr';
        }
    }

    setSteering(msg){
        if(msg&&msg.factors.length>0){
            this.status.direction=msg.factors[0].direction;
            this.status.distance=msg.factors[0].distance[0];
        }else{
            this.status.direction=0;
            this.status.distance=0;
        }
        
        if(this.status.distance<0){
            this.status.steerDistanceNum='';
            this.status.steerDistanceUnit='';
        }else if(this.status.distance<=10){
            this.status.steerDistanceNum=this.status.distance.toFixed(1);
            this.status.steerDistanceUnit='m';
        }else if(this.status.distance<=1000){
            this.status.steerDistanceNum=this.status.distance.toFixed(0);
            this.status.steerDistanceUnit='m';
        }else if(this.status.distance<=10000){
            this.status.steerDistanceNum=(this.status.distance/1000).toFixed(2);
            this.status.steerDistanceUnit='km';
        }else if(this.status.distance<=100000){
            this.status.steerDistanceNum=(this.status.distance/1000).toFixed(1);
            this.status.steerDistanceUnit='km';
        }else{
            this.status.steerDistanceNum=(this.status.distance/1000).toFixed(0);
            this.status.steerDistanceUnit='km';
        }
    }
}

class MapCtrl{
    constructor(canvas, height=180, width=64){
        this.height=height;
        this.width=width;

        this.canvas=(typeof canvas=='string')?document.getElementById(canvas):canvas;
        if(this.canvas){
            this.canvas.height=this.height;
            this.canvas.width=this.width;
            this.ctx=this.canvas.getContext("2d");
        }

        this.status={
            set_pose: false,
            set_goal: false,
            add_way: false,
            followMode: false,

            pose_inited: 0,

            drawMap: false,
        }

        this.button={
            mouse: null,
            set_pose_btn: false,
            set_goal_btn: false,
            add_way_btn: false,
            remove_way_btn: false,
            set_follow_btn: false,
            set_draw_map_btn: false,
        }

        this.event={
            'set_pose_btn':[],
            'set_goal_btn':[],
            'add_way_btn':[],
            'remove_way_btn':[],
            'set_follow_btn':[],
            'set_draw_map_btn':[]
        };

        this.fps = 15;
        this.fpsInterval = 1000 / this.fps;
        this.lastDrawTime = 0;
        
        this.animate = this.animate.bind(this);

        this.start();

        if(this.canvas){
            const rect = this.canvas.getBoundingClientRect();
            window.addEventListener('mousemove', (e) => {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.button.mouse={x, y};
            });
            this.canvas.addEventListener('click', ()=>{
                if(this.button.set_pose_btn) this.event.set_pose_btn.forEach(F=>F());
                else if(this.button.set_goal_btn) this.event.set_goal_btn.forEach(F=>F());
                else if(this.button.add_way_btn) this.event.add_way_btn.forEach(F=>F());
                else if(this.button.remove_way_btn) this.event.remove_way_btn.forEach(F=>F());
                else if(this.button.set_follow_btn) this.event.set_follow_btn.forEach(F=>F());
                else if(this.button.set_draw_map_btn) this.event.set_draw_map_btn.forEach(F=>F());
            });
        }
    }

    on(event, fun){
        if(!event||!fun||!this.event[event]) return false;
        this.event[event].push(fun);
        return true;
    }
    
    start(){
        this.animate(performance.now());
    }

    animate(now){
        requestAnimationFrame(this.animate);

        const elapsed = now - this.lastDrawTime;

        if (elapsed < this.fpsInterval) return;

        this.lastDrawTime = now - (elapsed % this.fpsInterval);
        this.draw();
    }

    dist(point1, point2){
        if(!point1||!point2) return Infinity;
        return Math.hypot(point1.x-point2.x, point1.y-point2.y);
    }

    draw(){
        if(!this.canvas||!this.ctx) return;

        const halfH=this.height/2;
        const halfW=this.width/2;
        const H_7=this.height/7;
        const W_4=this.width/4;

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.beginPath();

        this.ctx.fillStyle='#000000c9';
        this.ctx.roundRect(0, 0, this.width, this.height, W_4);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.fillStyle=(this.dist(this.button.mouse, {x:W_4, y:H_7*1.5})<=W_4*0.7)?'#b3b3b3':'#c6c6c6';
        this.button.set_pose_btn=!(this.status.set_goal||this.status.add_way)&&(this.dist(this.button.mouse, {x:W_4, y:H_7*1.5})<=W_4*0.7);
        if(this.status.pose_inited==2) this.ctx.strokeStyle='#4f4fff';
        else if(this.status.pose_inited==3) this.ctx.strokeStyle='#4fff4f';
        else this.ctx.strokeStyle='#ff4f4f';
        this.ctx.lineWidth=3;
        this.ctx.arc(W_4, H_7*1.5, W_4*0.7, 0, 2*Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle=!(this.status.set_goal||this.status.add_way)?'#000':'#929292';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(W_4*0.3)}pt sans-serif`;
        this.ctx.fillText('設定', W_4, H_7*1.5-W_4*0.2);
        this.ctx.fillText('姿態', W_4, H_7*1.5+W_4*0.2);

        this.ctx.beginPath();
        this.ctx.fillStyle=(this.dist(this.button.mouse, {x:W_4*3, y:H_7*1.5})<=W_4*0.7)?'#b3b3b3':'#c6c6c6';
        this.button.set_goal_btn=!(this.status.set_pose||this.status.add_way)&&(this.dist(this.button.mouse, {x:W_4*3, y:H_7*1.5})<=W_4*0.7);
        this.ctx.strokeStyle='#bebebe';
        this.ctx.lineWidth=3;
        this.ctx.arc(W_4*3, H_7*1.5, W_4*0.7, 0, 2*Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle=!(this.status.set_pose||this.status.add_way)?'#000':'#929292';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(W_4*0.3)}pt sans-serif`;
        this.ctx.fillText('設定', W_4*3, H_7*1.5-W_4*0.2);
        this.ctx.fillText('目標', W_4*3, H_7*1.5+W_4*0.2);

        this.ctx.beginPath();
        this.ctx.fillStyle=(this.dist(this.button.mouse, {x:W_4, y:H_7*5.5})<=W_4*0.7)?'#b3b3b3':'#c6c6c6';
        this.button.set_follow_btn=(this.dist(this.button.mouse, {x:W_4, y:H_7*5.5})<=W_4*0.7);
        this.ctx.strokeStyle='#bebebe';
        this.ctx.lineWidth=3;
        this.ctx.arc(W_4, H_7*5.5, W_4*0.7, 0, 2*Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle='#000';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(W_4*0.3)}pt sans-serif`;
        this.ctx.fillText(this.status.followMode?'自由':'追隨', W_4, H_7*5.5-W_4*0.2);
        this.ctx.fillText(this.status.followMode?'移動':'車輛', W_4, H_7*5.5+W_4*0.2);

        this.ctx.beginPath();
        this.ctx.fillStyle=(this.dist(this.button.mouse, {x:W_4*3, y:H_7*5.5})<=W_4*0.7)?'#b3b3b3':'#c6c6c6';
        this.button.set_draw_map_btn=(this.dist(this.button.mouse, {x:W_4*3, y:H_7*5.5})<=W_4*0.7);
        this.ctx.strokeStyle=this.status.drawMap?'#4fff4f':'#4f4fff';
        this.ctx.lineWidth=3;
        this.ctx.arc(W_4*3, H_7*5.5, W_4*0.7, 0, 2*Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle='#000';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(W_4*0.3)}pt sans-serif`;
        this.ctx.fillText(this.status.drawMap?'隱藏':'顯示', W_4*3, H_7*5.5-W_4*0.2);
        this.ctx.fillText('地圖', W_4*3, H_7*5.5+W_4*0.2);

        this.ctx.beginPath();
        this.ctx.fillStyle=(this.dist(this.button.mouse, {x:W_4*1, y:H_7*3.5})<=W_4*0.7)?'#b3b3b3':'#c6c6c6';
        this.button.add_way_btn=!(this.status.set_pose||this.status.set_goal)&&(this.dist(this.button.mouse, {x:W_4*1, y:H_7*3.5})<=W_4*0.7);
        if(this.status.pose_inited==2) this.ctx.strokeStyle='#4f4fff';
        this.ctx.strokeStyle='#bebebe';
        this.ctx.lineWidth=3;
        this.ctx.arc(W_4*1, H_7*3.5, W_4*0.7, 0, 2*Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle=!(this.status.set_pose||this.status.set_goal)?'#000':'#929292';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(W_4*0.3)}pt sans-serif`;
        this.ctx.fillText('添加', W_4*1, H_7*3.5-W_4*0.2);
        this.ctx.fillText('航點', W_4*1, H_7*3.5+W_4*0.2);

        this.ctx.beginPath();
        this.ctx.fillStyle=(this.dist(this.button.mouse, {x:W_4*3, y:H_7*3.5})<=W_4*0.7)?'#b3b3b3':'#c6c6c6';
        this.button.remove_way_btn=(this.dist(this.button.mouse, {x:W_4*3, y:H_7*3.5})<=W_4*0.7);
        this.ctx.strokeStyle='#bebebe';
        this.ctx.lineWidth=3;
        this.ctx.arc(W_4*3, H_7*3.5, W_4*0.7, 0, 2*Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle='#000';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(W_4*0.3)}pt sans-serif`;
        this.ctx.fillText('清除', W_4*3, H_7*3.5-W_4*0.2);
        this.ctx.fillText('航點', W_4*3, H_7*3.5+W_4*0.2);
        
        this.canvas.style.cursor=(
            (!(this.status.set_goal||this.status.add_way)&&this.dist(this.button.mouse, {x:W_4, y:H_7*1.5})<=W_4*0.7)||
            (!(this.status.set_pose||this.status.add_way)&&this.dist(this.button.mouse, {x:W_4, y:H_7*3.5})<=W_4*0.7)||
            (this.dist(this.button.mouse, {x:W_4, y:H_7*5.5})<=W_4*0.7)||
            (this.dist(this.button.mouse, {x:W_4, y:H_7*7.5})<=W_4*0.7)||
            (!(this.status.set_pose||this.status.set_goal)&&this.dist(this.button.mouse, {x:W_4*3, y:H_7*1.5})<=W_4*0.7)||
            (this.dist(this.button.mouse, {x:W_4*3, y:H_7*3.5})<=W_4*0.7)
        )?'pointer':'default';
    }

    setPose(enable){
        this.status.set_pose=enable;
    }
    setGoal(enable){
        this.status.set_goal=enable;
    }
    setWay(enable){
        this.status.add_way=enable;
    }
    setFollowMode(enable){
        this.status.followMode=enable;
    }
    isFolowMode(){
        return this.status.followMode;
    }
    setPoseInited(state){
        this.status.pose_inited=state;
    }
    setDrawMap(state){
        this.status.drawMap=state;
    }
}