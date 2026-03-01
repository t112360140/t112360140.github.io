const OBSTACLE_LABELS = {
    0: 'Unknown',
    1: 'Car',
    2: 'Truck',
    3: 'Bus',
    4: 'Trailer',
    5: 'Motorcycle', 
    6: 'Bicycle',
    7: 'Pedestrian'
};

class MapViewer {
    constructor(canvas, height = 512, width = 512, parentDiv=null, mapDiv=null) {
        this.canvas = typeof canvas=='string'?document.getElementById(canvas):canvas;
        if(this.canvas){
            this.ctx = this.canvas.getContext('2d');
            this.canvas.width = width;
            this.canvas.height = height;
        }

        // 不需要繪製的命名空間過濾清單
        this.filter = [
            'lanelet direction',
            'road_lanelets',
            'center_line_arrows',
            'center_lane_line',
            'lanelet_id',
        ];

        // 離屏畫布 (Offscreen Canvas) - 用於預渲染靜態地圖
        this.mapCanvas = document.createElement('canvas');
        this.mapCtx = this.mapCanvas.getContext('2d');

        // --- 狀態變數 ---
        this.zoom = 5; // 像素/公尺
        this.offset = { x: width / 2, y: height / 2 }; // 畫面平移量
        this.mapData = null; // ROS MarkerArray 資料
        
        // 地圖邊界資訊 (全域)
        this.mapBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0, cx: 0, cy: 0 };

        // 車輛狀態
        this.vehicle = {
            x: 0, y: 0, yaw: 0, // 世界座標與航向角 (radians)
            active: false       // 是否已收到車輛資料
        };
        this.vehicleGeo={
            lat: 0,
            lng: 0,
            active: false
        }

        this.enableBackgroundMap = false;
        this.tileCache = {}; // 快取下載過的圖片: "z_x_y" -> Image Object
        this.tileZoom = 18;  // 固定使用由 Zoom 18 的圖資 (解析度夠高)

        this.vehicleSize={
            front_overhang: 0.25,
            rear_overhang: 0.25,
            wheel_base: 1.64,

            wheel_tread: 1,
            left_overhang: 0.1,
            right_overhang: 0.1,
        };
        this.path = [];         // 軌跡陣列
        this.MAX_PATH_COUNT = 250; // 限制軌跡點數量，避免過長

        this.predictedPath = [];

        this.goalPoint=null;

        this.wayPoints = [];

        this.obstacles = [];

        this.velocityFactor=[];
        this.steeringFactor=[];

        // --- 效能優化與防裁切變數 ---
        this.cachedZoom = this.zoom;    // 紀錄離屏畫布產生時的縮放倍率
        this.offscreenScale = 1.0;      // 內部縮放比 (用於防止畫布過大被裁切)
        this.redrawTimer = null;        // 防抖動 Timer

        // --- 新增：互動狀態變數 ---
        this.dragStart = null;   // 拖曳起點 {x, y} (螢幕座標)
        this.dragCurrent = null; // 拖曳當前點 {x, y} (螢幕座標)
        this.events={drag:[]};
        this.canDrag=false;

        this.followMode = false; 
        this.lastRenderVehiclePos = { x: 0, y: 0 };

        // --- 動畫迴圈 ---
        this.fpsInterval = 1000 / 30;   // 限制在 30 FPS
        this.lastDrawTime = 0;
        this.animate = this.animate.bind(this);

        this.initEvents();
        this.animate(performance.now());
    }

    resize(height=128, width=128){
        this.height=height;
        this.width=width;
        
        this.canvas.height=this.height;
        this.canvas.width=this.width;
    }

    on(event, fun){
        if(!event||!fun) return;
        if(this.events[event]) this.events[event].push(fun);
    }

    dist(point1, point2){
        if(!point1||!point2) return Infinity;
        return Math.hypot(point1.x-point2.x, point1.y-point2.y);
    }

    // 經度 -> 瓦片 X 編號
    lon2tile(lon, zoom) {
        return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
    }

    // 緯度 -> 瓦片 Y 編號
    lat2tile(lat, zoom) {
        return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
    }

    // 瓦片 X -> 該瓦片左上角的經度
    tile2lon(x, z) {
        return (x / Math.pow(2, z) * 360 - 180);
    }

    // 瓦片 Y -> 該瓦片左上角的緯度
    tile2lat(y, z) {
        var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
        return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
    }

    // --- API: 更新車輛位置 ---
    updateVehicle(x, y, yaw) {        
        this.vehicle = { x, y, yaw, active: true };

        this.path.push({ x, y });
        if (this.path.length > this.MAX_PATH_COUNT) {
            this.path.shift();
        }

        // 跟隨模式下，如果車子開出了安全範圍，自動觸發地圖重繪
        if (this.followMode) {
            const dist = Math.hypot(x - this.lastRenderVehiclePos.x, y - this.lastRenderVehiclePos.y);
            const threshold = (this.canvas.width / this.zoom) * 0.25; // 當移動超過螢幕寬度 1/4 時
            if (dist > threshold) {
                this.lastRenderVehiclePos = { x, y };
                if (this.redrawTimer) clearTimeout(this.redrawTimer);
                this.redrawTimer = setTimeout(() => { this.renderMapOffscreen(); }, 100);
            }
        }
    }

    updateVehicleGoe(lat, lng) {        
        this.vehicleGeo = { lat, lng, active: (lat!=null&&lng!=null) };
    }

    setBackgroundMap(enable=false){
        this.enableBackgroundMap=enable;
    }

    getBackgroundMap(){
       return this.enableBackgroundMap;
    }

    clearVehicle(){
        this.vehicle={
            x: 0, y: 0, yaw: 0,
            active: false
        };
        this.path=[];

        this.vehicleGeo={ lat: 0, lng: 0, active: false };
    }

    setVehicleSize(size){
        this.vehicleSize=size;
    }

    // --- API: 更新預定路徑 ---
    updatePredictedPath(pathArray) {
        this.predictedPath = pathArray || [];
    }

    // --- API: 清除預定路徑 ---
    clearPredictedPath() {
        this.predictedPath = [];
    }

    updateObstacles(msg) {
        const obstacleList = [];
        msg.objects.forEach(obj => {
            // 取得分類和機率 (通常陣列第一個是機率最高的)
            const classification = obj.classification[0];
            const label = classification ? classification.label : 0;
            const prob = classification ? classification.probability : 1.0;

            // 取得位置與四元數
            const pose = obj.kinematics.pose;
            const x = pose.position.x;
            const y = pose.position.y;
            
            // 四元數轉 Yaw
            const q = pose.orientation;
            const yaw = Math.atan2(2.0*(q.w*q.z + q.x*q.y), 1.0-2.0*(q.y*q.y+q.z*q.z));

            // 取得形狀尺寸 (假設是 BoundingBox)
            const shape = obj.shape;
            const length = shape.dimensions[0];
            const width = shape.dimensions[1];

            // 取得預測軌跡 (假設取第一條可能性最高的軌跡)
            let predPath = [];
            if (obj.kinematics.predicted_paths && obj.kinematics.predicted_paths.length > 0) {
                predPath = obj.kinematics.predicted_paths[0].path.map(p => ({
                    x: p.position.x,
                    y: p.position.y
                }));
            }

            obstacleList.push({
                id: obj.id.uuid,
                label: label,
                prob: prob,
                x: x, y: y, yaw: yaw,
                length: length, width: width,
                predicted_path: predPath
            });
        });
        
        this.obstacles = obstacleList;
    }

    clearObstacles(){
        this.obstacles = [];
    }

    updateVelocityFactor(msg){
        this.velocityFactor=[];
        msg.factors.forEach((factor)=>{
            const q = factor.pose.orientation;
            const yaw = Math.atan2(2.0*(q.w*q.z + q.x*q.y), 1.0-2.0*(q.y*q.y+q.z*q.z));
            this.velocityFactor.push({
                status: factor.status,
                x: factor.pose.position.x,
                y: factor.pose.position.y,
                yaw: yaw,
                distance: factor.distance,
                behavior: factor.behavior,
            });
        });
    }

    updateSteeringFactor(msg){
        this.steeringFactor=[];
        msg.factors.forEach((factor)=>{
            const q = factor.pose.map((pose)=>(pose.orientation));
            const yaw = q.map((q)=>(Math.atan2(2.0*(q.w*q.z + q.x*q.y), 1.0-2.0*(q.y*q.y+q.z*q.z))));
            this.steeringFactor.push({
                status: factor.status,
                x: factor.pose.map((pose)=>(pose.position.x)),
                y: factor.pose.map((pose)=>(pose.position.y)),
                yaw: yaw,
                distance: factor.distance,
                behavior: factor.behavior,
                direction: factor.direction,
            });
        });
    }

    clearFactor(){
        this.velocityFactor=[];
        this.steeringFactor=[];
    }

    setGoalPoint(x, y){
        this.goalPoint={x, y};
    }

    clearGoalPoint(){
        this.goalPoint=null;
    }

    addWayPoint(x, y, yaw){
        this.wayPoints.push({x, y, yaw});
    }

    getWayPoint(){
        return this.wayPoints;
    }

    clearWayPoint(){
        this.wayPoints=[];
    }

    setFollowMode(enable) {
        this.followMode = enable;
        this.zoom=20;
        if (enable) {
            // 開啟時清除正在進行的互動
            this.dragStart = null;
            this.dragCurrent = null;
            // 立刻重繪地圖以適應新視角
            this.renderMapOffscreen();
        }else if(this.vehicle.active){
            this.setCenter(this.vehicle.x, this.vehicle.y);
        }
    }

    setCanDrag(enable){
        this.canDrag=enable;
    }

    // --- API: 設定視野中心 ---
    setCenter(worldX, worldY) {
        const canvasCX = this.canvas.width / 2;
        const canvasCY = this.canvas.height / 2;
        const { cx, cy } = this.mapBounds;

        // 計算新的 Offset，讓 worldX, worldY 位於畫布中心
        this.offset.x = canvasCX - (worldX - cx) * this.zoom;
        this.offset.y = canvasCY + (worldY - cy) * this.zoom; // ROS Y反轉
    }

    // --- 核心: 接收 ROS 資料 ---
    updateMarkerArray(msg) {
        this.mapData = msg.markers;

        // 預處理：計算每個 Marker 的 Bounding Box (為了後續快速剔除)
        // 這步驟只在接收資料時做一次，非常划算
        this.mapData.forEach(marker => {
            // 初始化 bbox
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            let valid = false;

            if (marker.points && marker.points.length > 0) {
                marker.points.forEach(p => {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                });
                valid = true;
            } else if (marker.pose) {
                // 單點物件 (如文字)
                const x = marker.pose.position.x;
                const y = marker.pose.position.y;
                const r = 2.0; // 給一個假設半徑
                minX = x - r; maxX = x + r;
                minY = y - r; maxY = y + r;
                valid = true;
            }

            if (valid) {
                marker._bbox = { minX, maxX, minY, maxY };
            }
        });

        // 1. 計算全域地圖邊界
        this.calculateBounds(); 
        // 2. 強制重繪離屏地圖
        this.renderMapOffscreen();
    }

    // 計算全域地圖資料的 Bounding Box 與中心點
    calculateBounds() {
        if (!this.mapData) return;
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let hasPoints = false;

        this.mapData.forEach(marker => {
            if (marker.action === 2 || marker.action === 3) return;
            if (this.filter.includes(marker.ns)) return;
            if (!marker._bbox) return;

            if (marker._bbox.minX < minX) minX = marker._bbox.minX;
            if (marker._bbox.maxX > maxX) maxX = marker._bbox.maxX;
            if (marker._bbox.minY < minY) minY = marker._bbox.minY;
            if (marker._bbox.maxY > maxY) maxY = marker._bbox.maxY;
            hasPoints = true;
        });

        if (!hasPoints) {
            this.mapBounds = { minX: -100, maxX: 100, minY: -100, maxY: 100, cx: 0, cy: 0 };
        } else {
            this.mapBounds = {
                minX, maxX, minY, maxY,
                cx: (minX + maxX) / 2,
                cy: (minY + maxY) / 2
            };
        }
    }

    // 取得目前螢幕可見的世界座標範圍 (World Bounds)
    getVisibleBounds() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        if (this.followMode && this.vehicle.active) {
            // 在旋轉的跟隨模式下，最長對角線距離就是安全半徑
            const maxR = Math.hypot(width, height) / this.zoom;
            return {
                minX: this.vehicle.x - maxR,
                maxX: this.vehicle.x + maxR,
                minY: this.vehicle.y - maxR,
                maxY: this.vehicle.y + maxR
            };
        }

        const { cx, cy } = this.mapBounds;
        const w1x = (0 - this.offset.x) / this.zoom + cx;
        const w1y = cy - (0 - this.offset.y) / this.zoom; 
        const w2x = (width - this.offset.x) / this.zoom + cx;
        const w2y = cy - (height - this.offset.y) / this.zoom;

        const minX = Math.min(w1x, w2x);
        const maxX = Math.max(w1x, w2x);
        const minY = Math.min(w1y, w2y);
        const maxY = Math.max(w1y, w2y);

        const bufferX = (maxX - minX) * 0.5;
        const bufferY = (maxY - minY) * 0.5;

        return {
            minX: minX - bufferX,
            maxX: maxX + bufferX,
            minY: minY - bufferY,
            maxY: maxY + bufferY
        };
    }

    // 檢查 Marker 是否在視野內 (Culling)
    isMarkerVisible(marker, viewBounds) {
        if (!marker._bbox) return false;
        const b = marker._bbox;
        // 矩形重疊檢查：如果沒有分離，就是重疊
        return !(b.maxX < viewBounds.minX || 
                 b.minX > viewBounds.maxX || 
                 b.maxY < viewBounds.minY || 
                 b.minY > viewBounds.maxY);
    }

    toRGBA(colorObj, defaultAlpha = 1.0) {
        const r = Math.floor(colorObj.r * 255);
        const g = Math.floor(colorObj.g * 255);
        const b = Math.floor(colorObj.b * 255);
        const a = (colorObj.a !== undefined) ? colorObj.a : defaultAlpha;
        return `rgba(${r},${g},${b},${a})`;
    }

    // --- 核心：渲染向量地圖到離屏 Canvas ---
    renderMapOffscreen() {
        if (!this.mapData) return;

        // 1. 更新快取狀態
        this.cachedZoom = this.zoom; 

        // 2. 取得可見範圍
        const viewBounds = this.getVisibleBounds();

        const { minX, maxX, minY, maxY, cx, cy } = this.mapBounds;
        const padding = 100; // 邊緣留白
        
        // 計算「理論上」需要的畫布大小 (基於全域地圖)
        // 註：這裡為了座標轉換的一致性，還是維持全圖對應，但利用 isMarkerVisible 跳過繪製
        // 若要極致優化記憶體，可以只開 viewBounds 大小的 Canvas，但座標轉換會變複雜
        const rawWidth = (maxX - minX) * this.zoom + padding;
        const rawHeight = (maxY - minY) * this.zoom + padding;
        
        // 瀏覽器 Canvas 尺寸安全上限
        const MAX_CANVAS_SIZE = 8000;

        // 3. 計算「適配比例」 (Auto-Scaling) 防止裁切
        const scaleX = rawWidth > MAX_CANVAS_SIZE ? MAX_CANVAS_SIZE / rawWidth : 1.0;
        const scaleY = rawHeight > MAX_CANVAS_SIZE ? MAX_CANVAS_SIZE / rawHeight : 1.0;
        this.offscreenScale = Math.min(scaleX, scaleY);

        // 4. 設定實際畫布大小
        this.mapCanvas.width = rawWidth * this.offscreenScale;
        this.mapCanvas.height = rawHeight * this.offscreenScale;

        const ctx = this.mapCtx;
        const canvasCenterX = this.mapCanvas.width / 2;
        const canvasCenterY = this.mapCanvas.height / 2;

        ctx.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        this.mapData.forEach(marker => {
            if (marker.action === 2 || marker.action === 3) return;
            if (this.filter.includes(marker.ns)) return;

            // [優化] 視錐剔除：如果在畫面外，直接跳過
            if (!this.isMarkerVisible(marker, viewBounds)) {
                return; 
            }

            const globalColorStr = this.toRGBA(marker.color);
            ctx.strokeStyle = globalColorStr;
            ctx.fillStyle = globalColorStr;
            
            // 計算線寬：需考慮 zoom 和 offscreenScale
            const effectiveZoom = this.zoom * this.offscreenScale;
            ctx.lineWidth = Math.max(1, marker.scale.x * effectiveZoom);

            this.drawMarker(ctx, marker, canvasCenterX, canvasCenterY);
        });
        
        this.needsRedrawMap = true;
    }

    drawMarker(ctx, marker, ox, oy) {
        const { cx, cy } = this.mapBounds;
        
        // 關鍵：繪圖座標的縮放比例 = 當前縮放 * 畫布適配縮放
        const z = this.cachedZoom * this.offscreenScale;

        // 座標轉換函數 (ROS World -> Canvas Pixel)
        const transformX = (x) => ox + (x - cx) * z;
        const transformY = (y) => oy - (y - cy) * z; // ROS Y+ 為上，Canvas Y+ 為下，需反轉

        switch (marker.type) {
            case 4: // LINE_STRIP
            case 5: // LINE_LIST
                this.drawLines(ctx, marker, transformX, transformY);
                break;
            case 8: // POINTS
                this.drawPoints(ctx, marker, transformX, transformY);
                break;
            case 9: // TEXT_VIEW_FACING
                this.drawText(ctx, marker, transformX, transformY);
                break;
            case 11: // TRIANGLE_LIST
                this.drawTriangles(ctx, marker, transformX, transformY);
                break;
        }
    }

    drawLines(ctx, marker, tx, ty) {
        const pts = marker.points;
        const colors = marker.colors;
        const useVertexColors = (colors && colors.length === pts.length);
        if (pts.length < 2) return;

        if (marker.type === 4 && useVertexColors) {
            let currentColorStr = null;
            let isPathStarted = false;
            for (let i = 0; i < pts.length - 1; i++) {
                const segmentColorStr = this.toRGBA(colors[i]);
                const x1 = tx(pts[i].x), y1 = ty(pts[i].y);
                const x2 = tx(pts[i+1].x), y2 = ty(pts[i+1].y);

                if (segmentColorStr !== currentColorStr) {
                    if (isPathStarted) ctx.stroke();
                    ctx.beginPath();
                    ctx.strokeStyle = segmentColorStr;
                    currentColorStr = segmentColorStr;
                    ctx.moveTo(x1, y1);
                    isPathStarted = true;
                }
                ctx.lineTo(x2, y2);
            }
            if (isPathStarted) ctx.stroke();
        } else {
            ctx.beginPath();
            for (let i = 0; i < pts.length; i++) {
                const x = tx(pts[i].x);
                const y = ty(pts[i].y);
                if (marker.type === 4) i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                else (i % 2 === 0) ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    drawPoints(ctx, marker, tx, ty) {
        const effectiveZoom = this.cachedZoom * this.offscreenScale;
        const size = Math.max(2, marker.scale.x * effectiveZoom);
        const offset = size / 2;
        
        marker.points.forEach((pt, i) => {
            if (marker.colors.length === marker.points.length) {
                 ctx.fillStyle = this.toRGBA(marker.colors[i]);
            }
            ctx.fillRect(tx(pt.x) - offset, ty(pt.y) - offset, size, size);
        });
    }

    drawTriangles(ctx, marker, tx, ty) {
        const pts = marker.points;
        const colors = marker.colors;
        const useVertexColors = (colors && colors.length === pts.length);
        
        ctx.lineWidth = 1; // 補縫

        for (let i = 0; i < pts.length; i += 3) {
            if (i + 2 >= pts.length) break;
            const x1 = tx(pts[i].x),   y1 = ty(pts[i].y);
            const x2 = tx(pts[i+1].x), y2 = ty(pts[i+1].y);
            const x3 = tx(pts[i+2].x), y3 = ty(pts[i+2].y);

            ctx.beginPath();
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath();

            let colorStr = useVertexColors ? this.toRGBA(colors[i]) : ctx.fillStyle;
            ctx.fillStyle = colorStr;
            ctx.fill();
            ctx.strokeStyle = colorStr;
            ctx.stroke();
        }
    }

    drawText(ctx, marker, tx, ty) {
        const effectiveZoom = this.cachedZoom * this.offscreenScale;
        const fontSize = Math.max(10, marker.scale.z * effectiveZoom);
        
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; 
        
        const x = Math.round(tx(marker.pose.position.x));
        const y = Math.round(ty(marker.pose.position.y));
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'black'; 
        ctx.strokeText(marker.text, x, y);
        
        ctx.fillStyle = this.toRGBA(marker.color);
        ctx.fillText(marker.text, x, y);
    }

    // --- 主畫面渲染迴圈 ---
    animate(now) {
        requestAnimationFrame(this.animate);
        const elapsed = now - this.lastDrawTime;
        if (elapsed < this.fpsInterval) return;
        this.lastDrawTime = now - (elapsed % this.fpsInterval);
        this.draw();
    }

    draw() {
        const { ctx, canvas, mapCanvas } = this;
        ctx.fillStyle = '#242424'; // 背景色
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save(); // [保護一] 儲存攝影機變換狀態

        // --- 1. 攝影機變換 (Camera Transform) ---
        if (this.followMode && this.vehicle.active) {
            const focalX = canvas.width / 2;
            const focalY = canvas.height * 0.75; 
            ctx.translate(focalX, focalY);

            // 【修正點】：將 -this.vehicle.yaw 改為 +this.vehicle.yaw
            // 這樣推導出來車子本身的絕對角度才會永遠是 -PI/2 (正上方)
            ctx.rotate(this.vehicle.yaw - Math.PI / 2);

            const { cx, cy } = this.mapBounds;
            const vxPixel = (this.vehicle.x - cx) * this.zoom;
            const vyPixel = -(this.vehicle.y - cy) * this.zoom;
            ctx.translate(-vxPixel, -vyPixel);
        } else {
            ctx.translate(this.offset.x, this.offset.y);
        }

        this.drawTiles(ctx);

        // --- 2. 畫靜態地圖 ---
        if (mapCanvas.width > 0) {
            ctx.save();
            let scale = this.zoom / this.cachedZoom;
            scale = scale / this.offscreenScale;
            ctx.scale(scale, scale);
            ctx.drawImage(mapCanvas, -mapCanvas.width / 2, -mapCanvas.height / 2);
            ctx.restore();
        }

        // --- 3. 畫動態圖層 (車子與軌跡) ---
        this.drawDynamicLayer(ctx);

        ctx.restore(); // [還原一] 將座標系切回原始的螢幕 Pixel 座標

        // --- 4. 畫不受旋轉影響的 UI ---
        if (!this.followMode) {
            this.drawInteractionArrow();
        }
        this.drawOverlay();
    }

    // 將 ROS 世界座標 (x, y) 轉回 經緯度
    worldToGeo(wx, wy) {
        if (!this.vehicleGeo.active) return null;

        const R = 6378137; // 地球半徑
        const centerLatRad = this.vehicleGeo.lat * Math.PI / 180;

        // 計算相對於車子的距離 (公尺)
        const dx = wx - this.vehicle.x;
        const dy = wy - this.vehicle.y;

        // 反推經緯度差
        const dLat = (dy / R) * (180 / Math.PI);
        const dLon = (dx / (R * Math.cos(centerLatRad))) * (180 / Math.PI);

        return {
            lat: this.vehicleGeo.lat + dLat,
            lng: this.vehicleGeo.lng + dLon
        };
    }

    drawTiles(ctx) {
        // 安全檢查：若無地理資料或縮放無效，則不進行繪製
        if (!this.enableBackgroundMap || !this.vehicleGeo.active || !this.vehicle.active || this.zoom <= 0) {
            return;
        }

        // --- 1. 定義常數與取得視圖中心 ---
        const MAX_SERVER_ZOOM = 21; // 您可以設定您需要的最大層級
        const TILE_COUNT_LIMIT = 64;  // 效能警戒線

        const centerWorld = this.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);
        const centerGeo = this.worldToGeo(centerWorld.x, centerWorld.y);
        if (!centerGeo) return;

        // --- 2. 計算最佳圖磚縮放層級 ---
        const estimatedZoom = Math.log2(this.zoom * 156543.03 * Math.cos(centerGeo.lat * Math.PI / 180));
        let tileZoom = Math.min(MAX_SERVER_ZOOM, Math.max(10, Math.floor(estimatedZoom)));

        // --- 3. 健壯地計算地理邊界 ---
        const getGeoBounds = (z) => {
            const corners = [
                this.screenToWorld(0, 0),
                this.screenToWorld(this.canvas.width, 0),
                this.screenToWorld(this.canvas.width, this.canvas.height),
                this.screenToWorld(0, this.canvas.height)
            ];
            let minLon = 181, maxLon = -181, minLat = 91, maxLat = -91;
            let valid = false;
            corners.forEach(p => {
                const geo = this.worldToGeo(p.x, p.y);
                if (geo) {
                    minLon = Math.min(minLon, geo.lng);
                    maxLon = Math.max(maxLon, geo.lng);
                    minLat = Math.min(minLat, geo.lat);
                    maxLat = Math.max(maxLat, geo.lat);
                    valid = true;
                }
            });

            // 進行地理擴張 (Geographic Padding)
            if (valid) {
                const lonPerTile = 360 / Math.pow(2, z);
                const latPerTile = this.tile2lat(0, z) - this.tile2lat(1, z);
                // 這裡用 1.5 倍的 Padding 已經非常足夠
                const lonPad = lonPerTile * 1.5;
                const latPad = latPerTile * 1.5;

                minLon -= lonPad;
                maxLon += lonPad;
                minLat -= latPad;
                maxLat += latPad;
            }
            return { minLon, maxLon, minLat, maxLat, valid };
        };

        // --- 4. 使用 WHILE 迴圈進行智慧降級 ---
        let bounds, minTileX, maxTileX, minTileY, maxTileY;
        while (tileZoom >= 10) {
            bounds = getGeoBounds(tileZoom);
            if (!bounds.valid) break;

            minTileX = this.lon2tile(bounds.minLon, tileZoom);
            maxTileX = this.lon2tile(bounds.maxLon, tileZoom);
            minTileY = this.lat2tile(bounds.maxLat, tileZoom);
            maxTileY = this.lat2tile(bounds.minLat, tileZoom);

            const tileCount = (maxTileX - minTileX + 1) * (maxTileY - minTileY + 1);
            if (tileCount < TILE_COUNT_LIMIT) break;
            tileZoom--;
        }

        if (!bounds || !bounds.valid) return;

        // --- 5. 最終安全備援 (Fallback) ---
        if ((maxTileX - minTileX) > 15 || (maxTileY - minTileY) > 15) {
            const cx = this.lon2tile(centerGeo.lng, tileZoom);
            const cy = this.lat2tile(centerGeo.lat, tileZoom);
            minTileX = cx - 3; maxTileX = cx + 3;
            minTileY = cy - 3; maxTileY = cy + 3;
        }

        // --- 6. 繪製迴圈 ---
        const R = 6378137;
        const centerLatRad = this.vehicleGeo.lat * Math.PI / 180;
        const metersPerPixelRaw = 156543.03 * Math.cos(centerLatRad) / Math.pow(2, tileZoom);
        const tileSizeInMeters = 256 * metersPerPixelRaw;
        const drawSize = tileSizeInMeters * this.zoom + 0.6;
        const { cx, cy } = this.mapBounds; // 取得地圖中心點

        for (let x = minTileX; x <= maxTileX; x++) {
            for (let y = minTileY; y <= maxTileY; y++) {
                const key = `${tileZoom}_${x}_${y}`;
                let img = this.tileCache[key];

                if (!img) {
                    img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.src = `https://a.basemaps.cartocdn.com/dark_all/${tileZoom}/${x}/${y}.png`;
                    // img.src = `https://tile.openstreetmap.org/${tileZoom}/${x}/${y}.png`;
                    // img.src = `https://mts1.google.com/vt/lyrs=m&src=app&x=${x}&y=${y}&z=${tileZoom}`;
                    // img.src = `https://mts1.google.com/vt/lyrs=y&src=app&x=${x}&y=${y}&z=${tileZoom}`;
                    this.tileCache[key] = img;
                    if (Object.keys(this.tileCache).length > 200) {
                        delete this.tileCache[Object.keys(this.tileCache)[0]];
                    }
                    img.onload = () => { img.loaded = true; };
                }

                if (img.loaded) {
                    const tileLat = this.tile2lat(y, tileZoom);
                    const tileLon = this.tile2lon(x, tileZoom);

                    const dLat = (tileLat - this.vehicleGeo.lat) * Math.PI / 180;
                    const dLon = (tileLon - this.vehicleGeo.lng) * Math.PI / 180;

                    const dy = dLat * R;
                    const dx = dLon * R * Math.cos(centerLatRad);

                    const worldX = this.vehicle.x + dx;
                    const worldY = this.vehicle.y + dy;
                    
                    // 【最終修正的繪製座標】
                    const px = (worldX - cx) * this.zoom;
                    const py = -(worldY - cy) * this.zoom;

                    ctx.drawImage(img, px, py, drawSize, drawSize);
                }
            }
        }
    }

    // 繪製動態物件
    drawDynamicLayer(ctx) {
        if (!this.vehicle.active) return;

        const { cx, cy } = this.mapBounds;

        // 【重大簡化】因為 draw() 已經幫我們把 ctx 做過 Camera Transform 了
        // 這裡的轉換「不需要」再加 offset.x/y，只需要轉成相對 Map Center 的像素即可
        const toLocalX = (wx) => (wx - cx) * this.zoom;
        const toLocalY = (wy) => -(wy - cy) * this.zoom; 

        // 畫預定路徑
        if (this.predictedPath.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]); 
            ctx.moveTo(toLocalX(this.predictedPath[0].x), toLocalY(this.predictedPath[0].y));
            for (let i = 1; i < this.predictedPath.length; i++) {
                ctx.lineTo(toLocalX(this.predictedPath[i].x), toLocalY(this.predictedPath[i].y));
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 畫歷史軌跡
        if (this.path.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.moveTo(toLocalX(this.path[0].x), toLocalY(this.path[0].y));
            for (let i = 1; i < this.path.length; i++) {
                ctx.lineTo(toLocalX(this.path[i].x), toLocalY(this.path[i].y));
            }
            ctx.stroke();
        }

        this.drawObstacles(ctx, toLocalX, toLocalY);

        // 畫車子
        const vx = toLocalX(this.vehicle.x);
        const vy = toLocalY(this.vehicle.y);

        ctx.save();
        ctx.translate(vx, vy);
        ctx.rotate(-this.vehicle.yaw); 

        ctx.beginPath();
        ctx.fillStyle = '#ffffff9c';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        const carLenF = (this.vehicleSize.front_overhang+this.vehicleSize.wheel_base) * this.zoom;
        const carLenR = (this.vehicleSize.rear_overhang) * this.zoom;
        const carWid = (this.vehicleSize.wheel_tread+this.vehicleSize.left_overhang+this.vehicleSize.right_overhang) * this.zoom;
        ctx.fillRect(-carLenR, -carWid/2, carLenF+carLenR, carWid);
        ctx.rect(-carLenR, -carWid/2, carLenF+carLenR, carWid);
        
        ctx.moveTo(carLenF, 0);
        ctx.lineTo(carLenF-carWid/2, -carWid / 2);
        ctx.lineTo(carLenF-carWid/2, carWid / 2);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        
        if(this.velocityFactor.length>0){
            this.velocityFactor.forEach((factor)=>{
                ctx.save();
                ctx.translate(toLocalX(factor.x), toLocalY(factor.y));
                ctx.rotate(-factor.yaw);
                ctx.beginPath();
                ctx.strokeStyle = '#f00';
                const len = Math.max(15, 3 * this.zoom);
                ctx.lineWidth = 3;
                ctx.moveTo(0, -len/2);
                ctx.lineTo(0, len/2);
                ctx.stroke();
                ctx.restore();
            });
        }
        
        if(this.steeringFactor.length > 0){
            this.steeringFactor.forEach((factor)=>{
                ctx.save();
                ctx.translate(toLocalX(factor.x[0]), toLocalY(factor.y[0]));
                let yaw=-factor.yaw[0];
                if(factor.direction==1) yaw-=0.5;
                else if(factor.direction==2) yaw+=0.5;
                ctx.rotate(yaw); // 將 X 軸對齊為當前車頭方向
            
                ctx.beginPath();
                ctx.strokeStyle = '#000';
                ctx.fillStyle = '#fff';
                ctx.lineWidth = 1;
                const len = Math.max(7, 1.5 * this.zoom);

                ctx.beginPath();
                ctx.moveTo(len/2, 0);
                ctx.lineTo(-len/2, len/3);
                ctx.lineTo(-len/2, -len/3);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            });
        }
    }

    drawObstacles(ctx, toLocalX, toLocalY) {
        if (!this.obstacles || this.obstacles.length === 0) return;

        this.obstacles.forEach(obs => {
            const labelInfo = OBSTACLE_LABELS[obs.label] || OBSTACLE_LABELS[0];
            const screenX = toLocalX(obs.x);
            const screenY = toLocalY(obs.y);
            
            // 將長寬轉成像素
            const wPixel = obs.length * this.zoom;
            const hPixel = obs.width * this.zoom;

            ctx.save();
            ctx.translate(screenX, screenY);
            // 旋轉 Bounding Box (ROS yaw 轉 Canvas)
            ctx.rotate(-obs.yaw);

            // 1. 畫 Bounding Box
            ctx.beginPath();
            ctx.strokeStyle = '#00ccffcc';
            ctx.lineWidth = 2;
            
            // 矩形中心點在物體中心
            ctx.rect(-wPixel / 2, -hPixel / 2, wPixel, hPixel);
            // ctx.fill();
            ctx.stroke();

            // 畫個小三角形標示車頭方向
            ctx.beginPath();
            ctx.strokeStyleStyle = '#00ccffcc';
            ctx.moveTo(wPixel / 2, 0);
            ctx.lineTo(wPixel / 2 - hPixel / 2, -hPixel / 2);
            ctx.lineTo(wPixel / 2 - hPixel / 2, hPixel / 2);
            ctx.closePath();
            ctx.stroke();

            // 2. 畫文字 (類型與機率)
            // 為了讓文字永遠正視，我們需要抵銷剛才的旋轉
            ctx.rotate(obs.yaw); 
            
            // 如果是在跟隨模式，為了讓文字不要倒過來，還要額外抵銷地圖的旋轉
            if (this.followMode) {
                 ctx.rotate(-this.vehicle.yaw + Math.PI / 2);
            }

            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const textStr = `${labelInfo} ${(obs.prob * 100).toFixed(0)}%`;
            
            // 加個黑色背景讓文字更清楚
            const textWidth = ctx.measureText(textStr).width;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-textWidth/2 - 2, -15 - 12, textWidth + 4, 14);
            
            ctx.fillStyle = '#fff';
            ctx.fillText(textStr, 0, -15);

            ctx.restore();

            // 3. 畫預測軌跡 (不需要 translate，直接在全域畫)
            if (obs.predicted_path && obs.predicted_path.length > 1) {
                ctx.beginPath();
                ctx.strokeStyle = '#0f0';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]); // 虛線表示預測
                ctx.lineJoin = 'round';
                
                ctx.moveTo(toLocalX(obs.predicted_path[0].x), toLocalY(obs.predicted_path[0].y));
                for (let i = 1; i < obs.predicted_path.length; i++) {
                    ctx.lineTo(toLocalX(obs.predicted_path[i].x), toLocalY(obs.predicted_path[i].y));
                }
                ctx.stroke();
                ctx.setLineDash([]);
            }
        });
    }

    drawOverlay() {
        if(this.wayPoints.length>0){
            for(let i=0;i<this.wayPoints.length;i++){
                const pos = this.worldToScreen(this.wayPoints[i].x, this.wayPoints[i].y);

                this.ctx.beginPath();
                this.ctx.fillStyle = '#ffffffa4';
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 5;

                const flagLen = Math.max(8, 1 * this.zoom);
                this.ctx.arc(pos.x, pos.y, flagLen, 0, 2*Math.PI);
                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.fillStyle = '#000000';
                this.ctx.textAlign='center';
                this.ctx.textBaseline='middle';
                const index=`${(i+1)}`;
                this.ctx.font=`bold ${Math.floor(flagLen)}pt sans-serif`;
                this.ctx.fillText(index, pos.x, pos.y+flagLen*0.1);
            }
        }

        if (this.goalPoint) {
            // 利用新函式算出螢幕上的絕對像素位置
            const pos = this.worldToScreen(this.goalPoint.x, this.goalPoint.y);

            this.ctx.beginPath();
            this.ctx.fillStyle = '#ff0000bb';
            this.ctx.strokeStyle = '#ff0000bb';
            this.ctx.lineWidth = 5;
            const flagLen = Math.max(16, 2 * this.zoom);
            
            // 直接在螢幕座標系畫圖，不受地圖旋轉影響
            this.ctx.moveTo(pos.x, pos.y + flagLen/2);
            this.ctx.lineTo(pos.x, pos.y - flagLen/2);
            this.ctx.lineTo(pos.x + flagLen/2, pos.y - flagLen/4);
            this.ctx.lineTo(pos.x, pos.y);

            this.ctx.fill();
            this.ctx.stroke();
        }
        
        // this.ctx.fillStyle = "white";
        // this.ctx.textBaseline = "top";
        // this.ctx.textAlign = "left";
        // this.ctx.font = "14px monospace";
        // this.ctx.fillText(`Zoom: ${this.zoom.toFixed(1)}`, 10, 10);
        // this.ctx.fillText(`Center: (${this.mapBounds.cx.toFixed(1)}, ${this.mapBounds.cy.toFixed(1)})`, 10, 30);

        
    }

    drawInteractionArrow() {
        if (!this.dragStart || !this.dragCurrent) return;
        
        const ctx = this.ctx;
        const start = this.dragStart;
        const current = this.dragCurrent;

        // 1. 計算拖曳向量
        const dx = current.x - start.x;
        const dy = current.y - start.y;
        
        // 2. 計算距離與角度
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        // 如果拖曳距離太短 (小於 10px)，為了避免箭頭亂轉，先不畫
        if (dist < 10) return;

        // 3. 設定箭頭固定長度 (例如 80px)
        const arrowLength = 40;

        // 4. 計算固定長度的終點
        // 公式：新X = 起點X + 長度 * cos(角度)
        const endX = start.x + (arrowLength-8) * Math.cos(angle);
        const endY = start.y + (arrowLength-8) * Math.sin(angle);

        // --- 開始繪圖 ---
        
        // 設定樣式 (使用亮綠色代表「設定目標」)
        const arrowColor = '#00FF00'; 
        ctx.lineWidth = 2;
        ctx.strokeStyle = arrowColor;
        ctx.fillStyle = arrowColor;
        ctx.lineCap = 'round';

        // A. 畫箭身 (從起點 到 固定終點)
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        const endXA = start.x + arrowLength * Math.cos(angle);
        const endYA = start.y + arrowLength * Math.sin(angle);

        // B. 畫箭頭頭部
        const headLen = 10; // 頭部大小
        ctx.beginPath();
        ctx.moveTo(endXA, endYA);
        
        // 計算箭頭兩側的點 (角度 +/- 30度)
        const angleLeft = angle - Math.PI / 6;
        const angleRight = angle + Math.PI / 6;

        ctx.lineTo(endXA - headLen * Math.cos(angleLeft), endYA - headLen * Math.sin(angleLeft));
        ctx.lineTo(endXA - headLen * Math.cos(angleRight), endYA - headLen * Math.sin(angleRight));
        ctx.closePath();
        ctx.fill();

        // D. (選用) 畫一條淡淡的虛線連到滑鼠當前位置 (讓使用者知道還在拖曳中)
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // 半透明白線
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // 虛線
        ctx.moveTo(endX, endY);
        ctx.lineTo(current.x, current.y);
        ctx.stroke();
        ctx.setLineDash([]); // 還原實線
    }

    worldToScreen(worldX, worldY) {
        const { cx, cy } = this.mapBounds;
        const lx = (worldX - cx) * this.zoom;
        const ly = -(worldY - cy) * this.zoom; // ROS Y反轉

        if (this.followMode && this.vehicle.active) {
            // 跟隨模式：包含平移與旋轉矩陣計算
            const focalX = this.canvas.width / 2;
            const focalY = this.canvas.height * 0.75;
            const vxPixel = (this.vehicle.x - cx) * this.zoom;
            const vyPixel = -(this.vehicle.y - cy) * this.zoom;
            
            const dx = lx - vxPixel;
            const dy = ly - vyPixel;
            
            // 必須跟 draw() 裡的 rotation 保持一致
            const angle = this.vehicle.yaw - Math.PI / 2; 
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            
            return {
                x: focalX + dx * cosA - dy * sinA,
                y: focalY + dx * sinA + dy * cosA
            };
        } else {
            // 一般模式
            return {
                x: this.offset.x + lx,
                y: this.offset.y + ly
            };
        }
    }

    // 將螢幕像素座標轉為 ROS 世界座標
    screenToWorld(screenX, screenY) {
        const { cx, cy } = this.mapBounds;

        if (this.followMode && this.vehicle.active) {
            // --- Follow Mode 的逆向工程 ---
            // Draw 邏輯: Translate(Focal) -> Rotate(Yaw-90) -> Translate(-Vx, -Vy) -> Draw(Wx*z, -Wy*z)
            
            const focalX = this.canvas.width / 2;
            const focalY = this.canvas.height * 0.75;
            
            // 1. 移除焦點偏移 (Undo Focal Translation)
            const dx = screenX - focalX;
            const dy = screenY - focalY;

            // 2. 移除旋轉 (Undo Rotation)
            // 原本角度: this.vehicle.yaw - Math.PI / 2
            // 逆向旋轉就是取負號
            const angle = this.vehicle.yaw - Math.PI / 2;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            
            // 旋轉矩陣逆運算:
            // x' = x*cos(-a) - y*sin(-a) = x*cos(a) + y*sin(a)
            // y' = x*sin(-a) + y*cos(-a) = -x*sin(a) + y*cos(a)
            const unrotatedX = dx * cosA + dy * sinA;
            const unrotatedY = -dx * sinA + dy * cosA;

            // 3. 移除車輛平移與縮放 (Undo Vehicle Translation & Zoom)
            // 在 draw() 中，我們最後是在 (worldX * zoom, -worldY * zoom) 的位置畫圖，
            // 並且原點被移到了 (vxPixel, vyPixel)
            // unrotatedX = (WorldX * zoom) - (VehicleX * zoom)
            // unrotatedY = (-WorldY * zoom) - (-VehicleY * zoom)
            
            // WorldX = VehicleX + unrotatedX / zoom
            // WorldY = VehicleY - unrotatedY / zoom  <-- 注意 Y 軸的負號處理

            const worldX = this.vehicle.x + unrotatedX / this.zoom;
            const worldY = this.vehicle.y - unrotatedY / this.zoom;

            return { x: worldX, y: worldY };
        } else {
            // --- Free Mode (保持不變) ---
            const wx = (screenX - this.offset.x) / this.zoom + cx;
            const wy = cy - (screenY - this.offset.y) / this.zoom;
            return { x: wx, y: wy };
        }
    }
    
    // --- 事件綁定 ---
    initEvents() {
        let evCache = []; // 儲存 Pointer 事件
        let prevDiff = -1; // 儲存上一次的雙指距離
        let isDragging = false;
        let isMove = false;

        // 設置 CSS 防止瀏覽器原生縮放
        this.canvas.style.touchAction = 'none';

        // 處理滾輪縮放 (保持你原有的邏輯，Chrome 會把觸控板雙指模擬為 wheel + ctrlKey)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.handleZoom(scaleFactor, e.clientX, e.clientY);
        }, { passive: false });

        const pointerdown = (e) => {
            evCache.push(e); // 將新觸碰點加入緩存
            if (this.followMode) return;

            isDragging = true;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (e.button==0 && this.canDrag && evCache.length === 1) {
                this.dragStart = { x, y };
                this.dragCurrent = { x, y };
                isMove = false;
            } else {
                isMove = true;
            }
        };

        const pointermove = (e) => {
            // 更新緩存中的點資訊
            const index = evCache.findIndex(ev => ev.pointerId === e.pointerId);
            if (index !== -1) evCache[index] = e;

            // --- 處理雙指縮放 (Pinch) ---
            if (evCache.length === 2) {
                const curDiff = Math.hypot(
                    evCache[0].clientX - evCache[1].clientX,
                    evCache[0].clientY - evCache[1].clientY
                );

                if (prevDiff > 0) {
                    const scaleFactor = curDiff / prevDiff;
                    // 以兩指中心點作為縮放中心
                    const centerX = (evCache[0].clientX + evCache[1].clientX) / 2;
                    const centerY = (evCache[0].clientY + evCache[1].clientY) / 2;
                    this.handleZoom(scaleFactor, centerX, centerY);
                }
                prevDiff = curDiff;
                return; // 縮放時不執行拖拽邏輯
            }

            // --- 處理單指/滑鼠拖拽 ---
            if (isDragging && evCache.length === 1) {
                if (isMove) {
                    // 使用 e.movementX/Y 或自行計算位移
                    this.offset.x += e.movementX;
                    this.offset.y += e.movementY;
                    this.debounceRedraw();
                }
                if (this.dragStart) {
                    const rect = this.canvas.getBoundingClientRect();
                    this.dragCurrent = { 
                        x: e.clientX - rect.left, 
                        y: e.clientY - rect.top 
                    };
                }
            }
        };

        const pointerup = (e) => {
            // 從緩存移除點
            const index = evCache.findIndex(ev => ev.pointerId === e.pointerId);
            if (index !== -1) evCache.splice(index, 1);

            if (evCache.length < 2) prevDiff = -1;

            if (isDragging && evCache.length === 0) {
                if (this.dragStart) {
                    const dx = this.dragCurrent.x - this.dragStart.x;
                    const dy = -(this.dragCurrent.y - this.dragStart.y);
                    const dist = Math.hypot(dx, dy);
                    if (dist >= 10) {
                        const worldPos = this.screenToWorld(this.dragStart.x, this.dragStart.y);
                        const yaw = Math.atan2(dy, dx);
                        this.events.drag.forEach(f => f(worldPos.x, worldPos.y, yaw, e.shiftKey));
                    }
                    this.dragStart = null;
                    this.dragCurrent = null;
                }
                isDragging = false;
                isMove = false;
            }
        };

        // 綁定 Pointer Events
        this.canvas.addEventListener('pointerdown', pointerdown);
        window.addEventListener('pointermove', pointermove);
        window.addEventListener('pointerup', pointerup);
        window.addEventListener('pointercancel', pointerup); // 處理意外中斷（如視窗切換）
    }

    // 提取共用的縮放邏輯
    handleZoom(scaleFactor, clientX, clientY) {
        this.zoom *= scaleFactor;
        if (!this.followMode) {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = clientX - rect.left;
            const mouseY = clientY - rect.top;
            
            // 如果有 dragStart，以 dragStart 為中心，否則以當前座標為中心
            const pivotX = this.dragStart ? this.dragStart.x : mouseX;
            const pivotY = this.dragStart ? this.dragStart.y : mouseY;

            this.offset.x = pivotX - (pivotX - this.offset.x) * scaleFactor;
            this.offset.y = pivotY - (pivotY - this.offset.y) * scaleFactor;
        }
        this.debounceRedraw();
    }

    // 提取共用的防抖重繪
    debounceRedraw() {
        if (this.redrawTimer) clearTimeout(this.redrawTimer);
        this.redrawTimer = setTimeout(() => {
            this.renderMapOffscreen();
        }, 200);
    }
}

function getMap(){
    let getMap = new ROSLIB.Topic({
        ros: ros,
        name: "/map/vector_map_marker",
        messageType: "visualization_msgs/msg/MarkerArray",
    });
    getMap.subscribe(function (msg){
        // console.log(msg);
        map.updateMarkerArray(msg);
        getMap.unsubscribe();
    });
}