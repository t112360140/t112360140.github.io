class TurnSignal {

  static MODES = {
    OFF: 'off',
    LEFT: 'left',
    RIGHT: 'right',
    BOTH: 'both'
  };

  constructor() {
    // 1. 建立音訊上下文與基礎節點
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // 主音量控制
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0.5; // 預設音量 50%

    // 聲道平移控制 (-1 是左, 1 是右, 0 是中間)
    this.panner = this.audioCtx.createStereoPanner();

    // 連接節點鏈: [音源] -> MasterGain -> Panner -> 喇叭
    this.masterGain.connect(this.panner);
    this.panner.connect(this.audioCtx.destination);

    this.mode = 'off'; // 狀態：'off', 'left', 'right', 'both'
    this.timer = null;
    
    // 初始化時就啟動背景循環
    this._startLoop();

    this.Listener={on:[], off:[]};
    this.light=false;
  }

  // 內部方法：背景定時器
  _startLoop() {
    this.timer = setInterval(() => {
      if (this.mode === 'off'){
        this.Listener.off.forEach(f=>f());
        this.light=false;
        return;
      }
      this.Listener.on.forEach(f=>f());
      this.light=true;

      // 觸發「滴」 (高音)
      this._emitSound(1500, 0.02);

      // 400ms 後觸發「答」 (低音)
      setTimeout(() => {
        this.Listener.off.forEach(f=>f());
        this.light=false;
        if (this.mode === 'off') return;
        this._emitSound(1000, 0.02);
      }, 400);

    }, 800);
  }

  // 內部方法：產生物理震盪聲
  _emitSound(freq, duration) {
    // 確保瀏覽器允許播放 (需使用者互動後 resume)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

    // 聲音包絡線：瞬間開啟並呈指數衰減
    gain.gain.setValueAtTime(1, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain); // 連接到主音量控制

    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  /**
   * 切換模式
   * @param {string} mode - 'left', 'right', 'both', 'off'
   */
  setMode(mode) {
    // 安全檢查：確保傳入的模式是我們定義好的
    if (!Object.values(TurnSignal.MODES).includes(mode)) {
      console.warn(`無效的模式: ${mode}`);
      return;
    }

    this.mode = mode;
    
    // 根據模式設定聲道
    const panValue = {
      [TurnSignal.MODES.LEFT]: -1,
      [TurnSignal.MODES.RIGHT]: 1,
      [TurnSignal.MODES.BOTH]: 0,
      [TurnSignal.MODES.OFF]: 0
    }[mode];

    this.panner.pan.setValueAtTime(panValue, this.audioCtx.currentTime);
  }

  /**
   * 調整總音量
   * @param {number} value - 0.0 到 1.0
   */
  setVolume(value) {
    // 使用 linearRamp 讓音量調整平滑一點
    this.masterGain.gain.setTargetAtTime(value, this.audioCtx.currentTime, 0.1);
  }

  /**
   * 銷毀執行個體，釋放資源
   */
  destroy() {
    clearInterval(this.timer);
    this.mode = 'off';
    this.audioCtx.close().then(() => {
      console.log("方向燈音效已銷毀");
    });
  }


  on(event, fun){
    if(this.Listener[event]&&fun!=null){
      this.Listener[event].push(fun);
    }
  }
}