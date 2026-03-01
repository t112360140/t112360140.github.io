class RemoteCtrl{
    constructor(canvas, height=128, width=256){
        this.ros=null;

        this.control_mode_status=null;
        this.pedalsTopic=null;
        this.steeringTopic=null;
        this.gearTopic=null;
        this.turnIndicatorsTopic=null;
        this.hazardLightsTopic=null;

        this.throttle=0;
        this.brake=0;
        this.angle=0;

        this.THROTTLE_SCALE=1;
        this.MAX_STEER=45*(Math.PI/180);

        this.turnIndicators=1;
        this.hazardLights=1;
        this.gear=4;

        this.remoteStart=false;
        this.interval=null;
        this.delay=100;

        this.hasGamepads=false;
        window.addEventListener("gamepadconnected", (event)=>{
            const gamepads=navigator.getGamepads();
            console.log(gamepads)
            this.hasGamepads=gamepads&&gamepads[0]?true:false;
        });
        window.addEventListener("gamepaddisconnected", (event)=>{
            const gamepads=navigator.getGamepads();
            this.hasGamepads=gamepads&&gamepads[0]?true:false;
            if(!this.hasGamepads) this.stop();
        });

        this.lastButton={};
        
        this.height=height;
        this.width=width;

        this.canvas=(typeof canvas=='string')?document.getElementById(canvas):canvas;
        if(this.canvas){
            this.canvas.height=this.height;
            this.canvas.width=this.width;
            this.ctx=this.canvas.getContext("2d");
            
            this.button={
                mouse: null,
                start: false,
            }
        }

        this.fps = 15;
        this.fpsInterval = 1000 / this.fps;
        this.lastDrawTime = 0;
        
        if(this.canvas){
            this.animate = this.animate.bind(this);
            this.startDraw();

            const rect = this.canvas.getBoundingClientRect();
            window.addEventListener('mousemove', (e) => {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.button.mouse={x, y};
            });
            this.canvas.addEventListener('click', ()=>{
                if(this.button.start){
                    if(this.remoteStart) this.stop();
                    else this.start();
                }
            });
        }
    }

    async start(){
        if(!this.interval){
            if(this.ros&&this.ros.isConnected){
                await modeChangeToStop();
                await this.control_mode_select(2);
            }
            this.interval=setInterval(()=>{
                const gamepads=navigator.getGamepads();
                if(!gamepads) return;

                if(gamepads[0]){
                    this.throttle=gamepads[0].buttons[7].value;
                    this.brake=gamepads[0].buttons[6].value;
                    this.angle=-gamepads[0].axes[2];
                    const buttons={
                        X:gamepads[0].buttons[2].pressed,
                        Y:gamepads[0].buttons[3].pressed,
                        A:gamepads[0].buttons[0].pressed,
                        B:gamepads[0].buttons[1].pressed,
                        U:gamepads[0].buttons[12].pressed,
                        D:gamepads[0].buttons[13].pressed,
                    }
                    if(buttons.X&&!this.lastButton.X){
                        if(this.turnIndicators==2) this.turnIndicators=1;
                        else this.turnIndicators=2;
                    }
                    if(buttons.B&&!this.lastButton.B){
                        if(this.turnIndicators==3) this.turnIndicators=1;
                        else this.turnIndicators=3;
                    }
                    if(buttons.A&&!this.lastButton.A){
                        if(this.hazardLights==2) this.hazardLights=1;
                        else this.hazardLights=2;
                    }
                    if(buttons.U&&!this.lastButton.U){
                        if(this.gear==2) this.gear=1;
                        else if(this.gear==1) this.gear=3;
                        else if(this.gear==3) this.gear=4;
                    }
                    if(buttons.D&&!this.lastButton.D){
                        if(this.gear==4) this.gear=3;
                        else if(this.gear==3) this.gear=1;
                        else if(this.gear==1) this.gear=2;
                    }
                    if(this.ros&&this.ros.isConnected){
                        this.sendPedals(this.throttle*this.THROTTLE_SCALE, (this.throttle==0&&this.brake==0)?0.5:this.brake);
                        this.sendSteering(this.angle*this.MAX_STEER, 0);
                        this.sendGear(this.gear);
                        this.sendTurnIndicators(this.turnIndicators);
                        this.sendHazardLights(this.hazardLights);
                    }
                    this.lastButton=buttons;
                }
            }, this.delay);
            this.remoteStart=true;
        }
    }

    async stop(){
        if(!this.remoteStart) return;
        this.remoteStart=false;
        clearInterval(this.interval);
        this.interval=null;

        this.throttle=0;
        this.angle=0;

        await modeChangeToStop();
        await this.control_mode_select(1);
    }

    setRos(ros){
        this.ros=ros;

        // this.control_mode_status = new ROSLIB.Topic({
        //     ros: this.ros,
        //     name: "/api/manual/remote/control_mode/status",
        //     messageType: "autoware_adapi_v1_msgs/msg/ManualControlModeStatus",
        // });
        // this.control_mode_status.subscribe(function (msg){
        //     console.log(msg.mode);
        // });
        
        this.pedalsTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: "/api/manual/remote/command/pedals",
            messageType: "autoware_adapi_v1_msgs/msg/PedalsCommand",
        });
        this.steeringTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: "/api/manual/remote/command/steering",
            messageType: "autoware_adapi_v1_msgs/msg/SteeringCommand",
        });
        this.gearTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: "/api/manual/remote/command/gear",
            messageType: "autoware_adapi_v1_msgs/msg/GearCommand",
        });
        this.turnIndicatorsTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: "/api/manual/remote/command/turn_indicators",
            messageType: "autoware_adapi_v1_msgs/msg/TurnIndicatorsCommand",
        });
        this.hazardLightsTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: "/api/manual/remote/command/hazard_lights",
            messageType: "autoware_adapi_v1_msgs/msg/HazardLightsCommand",
        });
    }

    control_mode_select(mode=1){
        return new Promise((resolve, reject) => {
            if(!this.ros||!this.ros.isConnected) reject('Ros not connect.');
            const service = new ROSLIB.Service({
                ros: this.ros,
                name: '/api/manual/remote/control_mode/select',
                serviceType: 'autoware_adapi_v1_msgs/srv/SelectManualControlMode'
            });

            const request = {
                mode:{
                    mode: mode
                }
            };

            service.callService(request, function (result) {
                console.log('control mode select:', result);
                if(result.status.success) resolve();
                else reject(result.status.message);
            });
        });
    }

    sendPedals(throttle=0, brake=0){
        if(this.ros&&this.ros.isConnected){
            const msg={
                stamp: getStamp(),
                throttle: throttle,
                brake: brake
            }
            this.pedalsTopic.publish(msg)
        }
    }

    sendSteering(steering_tire_angle=0, steering_tire_velocity=0){
        if(this.ros&&this.ros.isConnected){
            const msg={
                stamp: getStamp(),
                steering_tire_angle: steering_tire_angle,
                steering_tire_velocity: steering_tire_velocity
            }
            this.steeringTopic.publish(msg)
        }
    }
    sendGear(status=0){
        if(this.ros&&this.ros.isConnected){
            const msg={
                stamp: getStamp(),
                command: {
                    status: status
                }
            }
            this.gearTopic.publish(msg)
        }
    }
    sendTurnIndicators(status=0){
        if(this.ros&&this.ros.isConnected){
            const msg={
                stamp: getStamp(),
                command: {
                    status: status
                }
            }
            this.turnIndicatorsTopic.publish(msg)
        }
    }
    sendHazardLights(status=0){
        if(this.ros&&this.ros.isConnected){
            const msg={
                stamp: getStamp(),
                command: {
                    status: status
                }
            }
            this.hazardLightsTopic.publish(msg)
        }
    }

    startDraw(){
        this.animate(performance.now());
    }

    animate(now){
        requestAnimationFrame(this.animate);

        const elapsed = now - this.lastDrawTime;

        if (elapsed < this.fpsInterval) return;

        this.lastDrawTime = now - (elapsed % this.fpsInterval);
        this.draw(now);
    }

    dist(point1, point2){
        if(!point1||!point2) return Infinity;
        return Math.hypot(point1.x-point2.x, point1.y-point2.y);
    }

    draw(now){
        if(!this.canvas||!this.ctx) return;

        const W_6=this.width/6;
        const H_3=this.height/3;

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.beginPath();

        this.ctx.fillStyle='#000000c9';
        this.ctx.roundRect(0, 0, this.width, this.height, this.height/3);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.strokeStyle='#e6e6e6';
        this.ctx.lineWidth=5;
        this.ctx.lineCap = "round";
        this.ctx.moveTo(W_6, this.height*0.2);
        this.ctx.lineTo(W_6, this.height*0.8);
        this.ctx.moveTo(W_6-this.height*0.1, this.height*0.2+(1-this.brake)*this.height*0.6);
        this.ctx.lineTo(W_6+this.height*0.1, this.height*0.2+(1-this.brake)*this.height*0.6);

        this.ctx.moveTo(W_6*5, this.height*0.2);
        this.ctx.lineTo(W_6*5, this.height*0.8);
        this.ctx.moveTo(W_6*5-this.height*0.1, this.height*0.2+(1-this.throttle)*this.height*0.6);
        this.ctx.lineTo(W_6*5+this.height*0.1, this.height*0.2+(1-this.throttle)*this.height*0.6);

        this.ctx.moveTo(W_6*2, H_3*2);
        this.ctx.lineTo(W_6*4, H_3*2);
        this.ctx.moveTo(W_6*2+(1-this.angle)*W_6, H_3*2-this.height*0.1);
        this.ctx.lineTo(W_6*2+(1-this.angle)*W_6, H_3*2+this.height*0.1);

        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.fillStyle=(this.hasGamepads&&this.dist(this.button.mouse, {x:W_6*4, y:H_3})<=H_3*0.5)?'#b3b3b3':'#c6c6c6';
        this.button.start=(this.hasGamepads&&this.dist(this.button.mouse, {x:W_6*4, y:H_3})<=H_3*0.5);
        this.ctx.strokeStyle='#bebebe';
        this.ctx.lineWidth=3;
        this.ctx.arc(W_6*4, H_3, H_3*0.5, 0, 2*Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle=this.hasGamepads?'#000':'#929292';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(H_3*0.3)}pt sans-serif`;
        this.ctx.fillText(this.remoteStart?'停止':'開始', W_6*4, H_3+H_3*0.05);

        this.canvas.style.cursor=(this.hasGamepads&&this.dist(this.button.mouse, {x:W_6*4, y:H_3})<=H_3*0.5)?'pointer':'default';

        this.ctx.beginPath();
        this.ctx.strokeStyle=(this.hazardLights==2||this.turnIndicators==2)&&(now%1000>500)?'#0f0':'#bebebe';
        this.ctx.lineWidth=5;
        this.ctx.lineCap = "butt";
        this.ctx.moveTo(W_6*1.5+H_3*0.3, H_3*0.7);
        this.ctx.lineTo(W_6*1.5, H_3);
        this.ctx.lineTo(W_6*1.5+H_3*0.3, H_3*1.3);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.strokeStyle=(this.hazardLights==2||this.turnIndicators==3)&&(now%1000>500)?'#0f0':'#bebebe';
        this.ctx.lineWidth=5;
        this.ctx.lineCap = "butt";
        this.ctx.moveTo(W_6*3-H_3*0.3, H_3*0.7);
        this.ctx.lineTo(W_6*3, H_3);
        this.ctx.lineTo(W_6*3-H_3*0.3, H_3*1.3);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.fillStyle='#bebebe';
        this.ctx.textAlign='center';
        this.ctx.textBaseline='middle';
        this.ctx.font=`bold ${Math.floor(H_3*0.4)}pt sans-serif`;
        let gearStr='U';
        if(this.gear==2) gearStr='D';
        else if(this.gear==4) gearStr='P';
        else if(this.gear==3) gearStr='R';
        else if(this.gear==1) gearStr='N';
        this.ctx.fillText(gearStr, W_6*2.25, H_3+H_3*0.05);
    }
}