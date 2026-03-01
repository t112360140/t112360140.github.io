function setInitPose(x=0, y=0, yaw=0){
    const initTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/initialpose',
        messageType: 'geometry_msgs/msg/PoseWithCovarianceStamped'
    });

    const data = {
        header: {
            stamp: getStamp(),
            frame_id: 'map'
        },
        pose: {
            pose: {
                position: { x: x, y: y, z: 0.0 },
                orientation: { x: 0.0, y: 0.0, z: Math.sin(yaw/2), w: Math.cos(yaw/2) }
            },
            covariance: [
                0.25, 0, 0, 0, 0, 0,
                0, 0.25, 0, 0, 0, 0,
                0, 0, 0.0, 0, 0, 0,
                0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0.06853891909122467
            ]
        }
    };

    initTopic.publish(data);
}

function clearRoute(){
    return new Promise((resolve, reject) => {
        const service = new ROSLIB.Service({
            ros: ros,
            name: '/api/routing/clear_route',
            serviceType: 'autoware_adapi_v1_msgs/srv/ClearRoute'
        });

        const request = {};

        service.callService(request, function (result) {
            console.log('clear route:', result);
            if(result.status.success) resolve();
            else reject(result.status.message);
        });
    });
}

function setRoute(x=0, y=0, yaw=0, waypoints=[]){
    waypoints=waypoints.map((pose)=>({
        position: { x: pose.x, y: pose.y, z: 0.0 },
        orientation: { x: 0.0, y: 0.0, z: Math.sin(pose.yaw/2), w: Math.cos(pose.yaw/2) }
    }));
    return new Promise(async (resolve, reject) => {
        try{
            await clearRoute();
            const service = new ROSLIB.Service({
                ros: ros,
                name: '/api/routing/set_route_points',
                serviceType: 'autoware_adapi_v1_msgs/srv/SetRoutePoints'
            });

            const request = {
                header: {
                    stamp: getStamp(),
                    frame_id: 'map'
                },
                goal: {
                    position: { x: x, y: y, z: 0.0 },
                    orientation: { x: 0.0, y: 0.0, z: Math.sin(yaw/2), w: Math.cos(yaw/2) }
                },
                waypoints,
            };

            service.callService(request, function (result) {
                console.log('set route:', result);
                if(result.status.success) resolve();
                else reject(result.status.message);
            });
        }catch(e){
            reject(e);
        }
    });
}

function changeRoute(x=0, y=0, yaw=0, waypoints=[]){
    waypoints=waypoints.map((pose)=>({
        position: { x: pose.x, y: pose.y, z: 0.0 },
        orientation: { x: 0.0, y: 0.0, z: Math.sin(pose.yaw/2), w: Math.cos(pose.yaw/2) }
    }));
    return new Promise(async (resolve, reject) => {
        try{
            const service = new ROSLIB.Service({
                ros: ros,
                name: '/api/routing/change_route_points',
                serviceType: 'autoware_adapi_v1_msgs/srv/SetRoutePoints'
            });

            const request = {
                header: {
                    stamp: getStamp(),
                    frame_id: 'map'
                },
                goal: {
                    position: { x: x, y: y, z: 0.0 },
                    orientation: { x: 0.0, y: 0.0, z: Math.sin(yaw/2), w: Math.cos(yaw/2) }
                },
                waypoints,
            };

            service.callService(request, function (result) {
                console.log('change route:', result);
                if(result.status.success) resolve();
                else reject(result.status.message);
            });
        }catch(e){
            reject(e);
        }
    });
}

function modeChangeToAutonomous(){
    return new Promise((resolve, reject) => {
        const service = new ROSLIB.Service({
            ros: ros,
            name: '/api/operation_mode/change_to_autonomous',
            serviceType: 'autoware_adapi_v1_msgs/srv/ChangeOperationMode'
        });

        const request = {};

        service.callService(request, function (result) {
            console.log('change to autonomous:', result);
            if(result.status.success) resolve();
            else reject(result.status.message);
        });
    });
}

function modeChangeToStop(){
    return new Promise((resolve, reject) => {
        const service = new ROSLIB.Service({
            ros: ros,
            name: '/api/operation_mode/change_to_stop',
            serviceType: 'autoware_adapi_v1_msgs/srv/ChangeOperationMode'
        });

        const request = {};

        service.callService(request, function (result) {
            console.log('change to stop:', result);
            if(result.status.success) resolve();
            else reject(result.status.message);
        });
    });
}

function modeChangeToLocal(){
    return new Promise((resolve, reject) => {
        const service = new ROSLIB.Service({
            ros: ros,
            name: '/api/operation_mode/change_to_local',
            serviceType: 'autoware_adapi_v1_msgs/srv/ChangeOperationMode'
        });

        const request = {};

        service.callService(request, function (result) {
            console.log('change to local:', result);
            if(result.status.success) resolve();
            else reject(result.status.message);
        });
    });
}

function modeChangeToRemote(){
    return new Promise((resolve, reject) => {
        const service = new ROSLIB.Service({
            ros: ros,
            name: '/api/operation_mode/change_to_remote',
            serviceType: 'autoware_adapi_v1_msgs/srv/ChangeOperationMode'
        });

        const request = {};

        service.callService(request, function (result) {
            console.log('change to remote:', result);
            if(result.status.success) resolve();
            else reject(result.status.message);
        });
    });
}

function enableAutowareControl(){
    return new Promise((resolve, reject) => {
        const service = new ROSLIB.Service({
            ros: ros,
            name: '/api/operation_mode/enable_autoware_control',
            serviceType: 'autoware_adapi_v1_msgs/srv/ChangeOperationMode'
        });

        const request = {};

        service.callService(request, function (result) {
            console.log('enable autoware control:', result);
            if(result.status.success) resolve();
            else reject(result.status.message);
        });
    });
}

function disableAutowareControl(){
    return new Promise((resolve, reject) => {
        const service = new ROSLIB.Service({
            ros: ros,
            name: '/api/operation_mode/disable_autoware_control',
            serviceType: 'autoware_adapi_v1_msgs/srv/ChangeOperationMode'
        });

        const request = {};

        service.callService(request, function (result) {
            console.log('disable autoware control:', result);
            if(result.status.success) resolve();
            else reject(result.status.message);
        });
    });
}

function getVehicleDimensions(){
    return new Promise((resolve, reject) => {
        const service = new ROSLIB.Service({
            ros: ros,
            name: '/api/vehicle/dimensions',
            serviceType: 'autoware_adapi_v1_msgs/srv/GetVehicleDimensions'
        });

        const request = {};

        service.callService(request, function (result) {
            console.log('get vehicle dimensions:', result);
            if(result.status.success) resolve(result.dimensions);
            else reject(result.status.message);
        });
    });
}

function resetDiagnostics(){
    return new Promise((resolve, reject) => {
        const service = new ROSLIB.Service({
            ros: ros,
            name: '/api/system/diagnostics/reset',
            serviceType: 'autoware_adapi_v1_msgs/srv/ResetDiagGraph'
        });

        const request = {};

        service.callService(request, function (result) {
            console.log('reset diagnostics:', result);
            if(result.status.success) resolve(result.dimensions);
            else reject(result.status.message);
        });
    });
}