var WS_IP='ws://127.0.0.1:9090';
var DELAY_TIME=-1;

var dashboard=new Dashboard('dashboard', 128, 256);

var connect_state=new ConnectState('connect-state', 64, 128);
connect_state.on('connect_btn', ()=>{
    if(connect_state.isConnect()) disconnect();
    else connect();
});
connect_state.on('ip_set', ()=>{
    let new_ip=prompt(`更改IP\n目前的IP為: ${WS_IP}\n請輸入{IP}:{PORT}`);
    if(new_ip&&/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}(:([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5]))?$/.test(new_ip)){
        WS_IP=`ws://${new_ip}`
        alert(`IP更改為:\n${WS_IP}`);
        localStorage.setItem('WS_IP', WS_IP);
    }else{
        alert(`輸入IP不合法，不進行更改\n目前的IP為: ${WS_IP}`);
    }
});
// location.search.match(/([a-zA-Z0-9-_.~]+=[a-zA-Z0-9-_.~]+)/g)
if(localStorage.getItem('WS_IP')==null) localStorage.setItem('WS_IP', WS_IP);
else WS_IP=localStorage.getItem('WS_IP');
if(localStorage.getItem('DELAY_TIME')==null) localStorage.setItem('DELAY_TIME', DELAY_TIME);
else DELAY_TIME=parseInt(localStorage.getItem('DELAY_TIME'))??-1;
connect_state.setAutoConnect(DELAY_TIME>=0);
setTimeout(()=>{
    if(DELAY_TIME>=0) connect();
}, 100);

var vehicle_mode_state=new StatusDraw('vehicle-mode-state', 128, 256);
vehicle_mode_state.on('stop_btn', modeChangeToStop);
vehicle_mode_state.on('local_btn', modeChangeToLocal);
vehicle_mode_state.on('remote_btn', modeChangeToRemote);
vehicle_mode_state.on('auto_btn', modeChangeToAutonomous);
vehicle_mode_state.on('clear_route_btn', clearRoute);

var whatSet=0;
var mapCtrl=new MapCtrl('map-ctrl', 180, 128);
mapCtrl.on('set_pose_btn', ()=>{
    if(whatSet==0){
        mapCtrl.setPose(true);
        whatSet=1;
        map.setCanDrag(true);
    }else{
        mapCtrl.setPose(false);
        whatSet=0;
    }
});
mapCtrl.on('set_goal_btn', ()=>{
    if(whatSet==0){
        mapCtrl.setGoal(true);
        whatSet=2;
        map.setCanDrag(true);
    }else{
        mapCtrl.setGoal(false);
        whatSet=0;
    }
});
mapCtrl.on('add_way_btn', ()=>{
    if(whatSet==0){
        mapCtrl.setWay(true);
        whatSet=3;
        map.setCanDrag(true);
    }else{
        mapCtrl.setWay(false);
        whatSet=0;
    }
});
mapCtrl.on('remove_way_btn', ()=>{
    map.clearWayPoint();
});
mapCtrl.on('set_follow_btn', ()=>{
    mapCtrl.setFollowMode(!mapCtrl.isFolowMode());
    map.setFollowMode(mapCtrl.isFolowMode());
    mapCtrl.setPose(false);
    mapCtrl.setGoal(false);
    mapCtrl.setWay(false);
    whatSet=0;
});
mapCtrl.on('set_draw_map_btn', ()=>{
    map.setBackgroundMap(!map.getBackgroundMap());
    mapCtrl.setDrawMap(map.getBackgroundMap());
});

var map=new MapViewer('map', document.body.offsetHeight, document.body.offsetWidth);
window.addEventListener('resize', ()=>{map.resize(document.body.offsetHeight, document.body.offsetWidth)});
map.on('drag', (x, y, yaw, shift)=>{
    if(whatSet==2){
        if(vehicle_mode_state.getRouteStatus()==2) changeRoute(x, y, yaw, map.getWayPoint());
        else setRoute(x, y, yaw, map.getWayPoint());
        mapCtrl.setGoal(false);
    }else if(whatSet==1){
        setInitPose(x, y, yaw);
        mapCtrl.setPose(false);
    }else if(whatSet==3){
        map.addWayPoint(x, y, yaw);
        mapCtrl.setWay(false);
    }
    whatSet=0;
    map.setCanDrag(false);
});

var missionStatus=new MissionState('mission-state', 128, 128);

var diagnostics=new Diagnostics('diagnostics-table');

var remoteCtrl=new RemoteCtrl('remote-ctrl', 128, 256);

var ros=new ROSLIB.Ros();

ros.on("error", function (error) {
    console.log(error);
});
ros.on("close", function () {
    console.log("Disonnection made!");
    connect_state.disconnect();

    if(DELAY_TIME>=0) setTimeout(connect, DELAY_TIME);
});
ros.on("connection", function () {
    console.log("Connection made!");
    connect_state.connect();
    
    setSub();
});

function connect(){
    if(!ros.isConnected) ros.connect(WS_IP);
}

function disconnect(){
    ros.close();
}



function getStamp(){
    const now = new Date();    
    const secs = Math.floor(now.getTime() / 1000);    
    const nsecs = Math.round(1e9 * (now.getTime() / 1000 - secs));

    return { secs, nsecs };
}

function setSub(){
    map.clearVehicle();
    map.clearPredictedPath();
    map.clearGoalPoint();
    map.clearObstacles();
    map.clearFactor();
    getMap();

    mapCtrl.setPoseInited(0);

    getVehicleDimensions().then((msg)=>{
        map.setVehicleSize(msg);
    }).catch((e)=>{
        setTimeout(()=>{
            getVehicleDimensions().then((msg)=>{
                map.setVehicleSize(msg);
            });
        }, 1000);
    });

    remoteCtrl.setRos(ros);

    /*
    let tfClient = new ROSLIB.ROS2TFClient({
        ros: ros,
        fixedFrame: "map",
        angularThres: 0.01,
        transThres: 0.01,
    });
    tfClient.subscribe("base_link", function (tf) {
        const q=tf.rotation;
        const yaw=Math.atan2(2.0*(q.w*q.z + q.x*q.y), 1.0-2.0*(q.y*q.y+q.z*q.z));
        console.log(tf.translation.x, tf.translation.y, yaw);
        map.updateVehicle(tf.translation.x, tf.translation.y, yaw);
        map.setCenter(tf.translation.x, tf.translation.y);
    });
    */

    const tfInterval=1000/30;
    let lastTFGetTime = 0;
    let tfClient = new ROSLIB.Topic({
        ros: ros,
        name: "/tf",
        messageType: "tf2_msgs/msg/TFMessage",
    });
    tfClient.subscribe(function (msg) {
        const now=new Date().getTime();
        if ((now-lastTFGetTime) < tfInterval) return;
        lastTFGetTime = now;
        let tf=null;
        msg.transforms.forEach((t) => {
            if(!t.header.frame_id=='map'||!t.child_frame_id=='base_link') return;
            tf=t.transform;
        });
        if(tf==null) return;
        const q=tf.rotation;
        const yaw=Math.atan2(2.0*(q.w*q.z + q.x*q.y), 1.0-2.0*(q.y*q.y+q.z*q.z));
        // console.log(tf.translation.x, tf.translation.y, yaw);
        map.updateVehicle(tf.translation.x, tf.translation.y, yaw);
    });

    let velocity_kinematics = new ROSLIB.Topic({
        ros: ros,
        name: "/api/vehicle/kinematics",
        messageType: "autoware_adapi_v1_msgs/msg/VehicleKinematics",
    });
    velocity_kinematics.subscribe(function (msg){
        const latLng=msg.geographic_pose.position;
        map.updateVehicleGoe(latLng.latitude, latLng.longitude);
    });

    let velocity_status = new ROSLIB.Topic({
        ros: ros,
        name: "/vehicle/status/velocity_status",
        messageType: "autoware_vehicle_msgs/msg/VelocityReport",
    });
    velocity_status.subscribe(function (msg){
        dashboard.setVelocity(msg.longitudinal_velocity*3.6);
        // velocity_status.unsubscribe();
    });

    let vehicle_status = new ROSLIB.Topic({
        ros: ros,
        name: "/api/vehicle/status",
        messageType: "autoware_adapi_v1_msgs/msg/VehicleStatus",
    });
    vehicle_status.subscribe(function (msg){
        dashboard.setTurnSignal(msg.turn_indicators.status);
        dashboard.setHazardLights(msg.hazard_lights.status);
        dashboard.setSteering(msg.steering_tire_angle);
        dashboard.setGear(msg.gear.status);
    });

    let current_max_velocity = new ROSLIB.Topic({
        ros: ros,
        name: "/planning/scenario_planning/current_max_velocity",
        messageType: "autoware_internal_planning_msgs/msg/VelocityLimit",
    });
    current_max_velocity.subscribe(function (msg){
        dashboard.setVelocityLimit(msg.max_velocity*3.6);
    });


    let initialization_state = new ROSLIB.Topic({
        ros: ros,
        name: "/api/localization/initialization_state",
        messageType: "autoware_adapi_v1_msgs/msg/LocalizationInitializationState",
    });
    initialization_state.subscribe(function (msg){
        mapCtrl.setPoseInited(msg.state);
    });

    let control_mode = new ROSLIB.Topic({
        ros: ros,
        name: "/vehicle/status/control_mode",
        messageType: "autoware_vehicle_msgs/msg/ControlModeReport",
    });
    control_mode.subscribe(function (msg){
        vehicle_mode_state.serControlMode(msg.mode);
    });	

    let routing_state = new ROSLIB.Topic({
        ros: ros,
        name: "/api/routing/state",
        messageType: "autoware_adapi_v1_msgs/msg/RouteState",
    });
    routing_state.subscribe(function (msg){
        vehicle_mode_state.setRouteState(msg.state);
    });
    let routing_route = new ROSLIB.Topic({
        ros: ros,
        name: "/api/routing/route",
        messageType: "autoware_adapi_v1_msgs/msg/Route",
    });
    routing_route.subscribe(function (msg){
        if(msg.data.length>0) map.setGoalPoint(msg.data[0].goal.position.x, msg.data[0].goal.position.y);
        else map.clearGoalPoint();
    });
    let planning_path = new ROSLIB.Topic({
        ros: ros,
        name: "/planning/scenario_planning/lane_driving/behavior_planning/path",
        messageType: "autoware_planning_msgs/msg/Path",
    });
    planning_path.subscribe(function (msg){
        map.updatePredictedPath(msg.points.map(P=>P.pose.position));
    });
    
    let operation_mode = new ROSLIB.Topic({
        ros: ros,
        name: "/api/operation_mode/state",
        messageType: "autoware_adapi_v1_msgs/msg/OperationModeState",
    });
    operation_mode.subscribe(function (msg){
        vehicle_mode_state.setModeStatus(msg);
    });
    
    let motion_state = new ROSLIB.Topic({
        ros: ros,
        name: "/api/motion/state",
        messageType: "autoware_adapi_v1_msgs/msg/MotionState",
    });
    motion_state.subscribe(function (msg){
        vehicle_mode_state.setMotionState(msg.state);
    });
    
    let diagnostics_struct = new ROSLIB.Topic({
        ros: ros,
        name: "/api/system/diagnostics/struct",
        messageType: "autoware_adapi_v1_msgs/msg/DiagGraphStruct",
    });
    diagnostics_struct.subscribe(function (msg){
        diagnostics.setStruct(msg);
    });
    let diagnostics_status = new ROSLIB.Topic({
        ros: ros,
        name: "/api/system/diagnostics/status",
        messageType: "autoware_adapi_v1_msgs/msg/DiagGraphStatus",
    });
    diagnostics_status.subscribe(function (msg){
        diagnostics.setStatus(msg);
    });
    
    let vehicle_kinematics = new ROSLIB.Topic({
        ros: ros,
        name: "/api/vehicle/kinematics",
        messageType: "autoware_adapi_v1_msgs/msg/VehicleKinematics",
    });
    vehicle_kinematics.subscribe(function (msg){
        //console.log(msg);
    });

    let perception_objects = new ROSLIB.Topic({
        ros: ros,
        name: "/api/perception/objects",
        messageType: "autoware_adapi_v1_msgs/msg/DynamicObjectArray",
    });
    perception_objects.subscribe(function (msg){
        map.updateObstacles(msg);
    });

    let velocity_factors = new ROSLIB.Topic({
        ros: ros,
        name: "/api/planning/velocity_factors",
        messageType: "autoware_adapi_v1_msgs/msg/VelocityFactorArray",
    });
    velocity_factors.subscribe(function (msg){
        // map.updateVelocityFactor(msg);
    });
    let steering_factors = new ROSLIB.Topic({
        ros: ros,
        name: "/api/planning/steering_factors",
        messageType: "autoware_adapi_v1_msgs/msg/SteeringFactorArray",
    });
    steering_factors.subscribe(function (msg){
        // map.updateSteeringFactor(msg);
        missionStatus.setSteering(msg);
    });
    let mission_remaining_distance_time = new ROSLIB.Topic({
        ros: ros,
        name: "/planning/mission_remaining_distance_time",
        messageType: "autoware_internal_msgs/msg/MissionRemainingDistanceTime",
    });
    mission_remaining_distance_time.subscribe(function (msg){
        missionStatus.setRemaining(msg);
    });
}

