# RNG
## js RNG
```javascript
class RNG {
    constructor(seed) {
        this.m = 0x80000000; // 2^31
        this.a = 1664525;    // 常見的乘數
        this.c = 1013904223; // 常見的增量
        this.state = seed;   // 初始化隨機數生成器狀態
    }

    next() {
        this.state = (this.a * this.state + this.c) % this.m;
        return this.state / this.m;  // 返回 [0, 1) 之間的偽隨機數
    }
}

// 使用範例
const rng = new RNG(1234); // 設置種子
console.log(rng.next());  // 生成一個偽隨機數
console.log(rng.next());  // 生成另一個偽隨機數
```
## c RNG
```c
#include <stdint.h>
#include <stdio.h>

// 定義 LCG 的常數
#define M 0x80000000  // 2^31
#define A 1664525     // 常見的乘數
#define C 1013904223  // 常見的增量

typedef struct {
    uint32_t state;  // 隨機數生成器狀態
} RNG;

// 初始化 RNG 狀態
void rng_init(RNG *rng, uint32_t seed) {
    rng->state = seed;  // 設置種子
}

// 生成下一個隨機數
float rng_next(RNG *rng) {
    rng->state = (A * rng->state + C) % M;
    return (float)rng->state / M;  // 返回 [0, 1) 之間的浮點數
}

int main() {
    RNG rng;
    rng_init(&rng, 1234);  // 設置種子

    // 生成並打印隨機數
    printf("Random number 1: %f\n", c);
    printf("Random number 2: %f\n", rng_next(&rng));

    return 0;
}
```

# Serial
## js Serial
```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web Serial API 範例</title>
</head>
<body>
  <h1>Web Serial API 範例</h1>
  <button id="connectButton">連接串行設備</button>
  <button id="sendButton">發送數據</button>
  <button id="disconnectButton">斷開連接</button>
  <p>開啟串口後，接收到的數據會顯示在控制台中。</p>
  <script src="serial.js"></script>
</body>
</html>
```

```javascript
let port;
let reader;
let writer;

async function connectToSerialDevice() {
  try {
    // 請求使用者選擇串行端口
    port = await navigator.serial.requestPort();
    // 開啟端口並設置波特率
    await port.open({ baudRate: 9600 });
    // 建立串行端口的讀寫器
    reader = port.readable.getReader();
    writer = port.writable.getWriter();
    // 開始讀取數據
    readData();
    console.log('串行設備已連接！');
  } catch (error) {
    console.error('無法連接到串行設備:', error);
  }
}

// 非阻塞的讀取數據
async function readData() {
  const decoder = new TextDecoder();
  // 使用 setTimeout 讓這個函數不會阻塞主線程
  async function readLoop() {
    try {
      const { value, done } = await reader.read();
      if (done) {
        reader.releaseLock();
        console.log('串行連接已關閉');
        return;
      }
      // 顯示接收到的數據
      console.log('接收到數據:', decoder.decode(value));
      // 以非阻塞方式繼續讀取
      setTimeout(readLoop, 0);
    } catch (error) {
      console.error('讀取錯誤:', error);
    }
  }
  // 開始讀取循環
  readLoop();
}

// 發送數據到串行設備
function sendData(data) {
  if (writer) {
    const encoder = new TextEncoder();
    writer.write(encoder.encode(data));
    console.log('發送數據:', data);
  } else {
    console.error('串行設備尚未連接');
  }
}

// 斷開串行連接
async function disconnect() {
  if (port) {
    await port.close();
    console.log('串行設備已斷開');
  }
}

// 註冊一些示範操作的按鈕
document.getElementById('connectButton').addEventListener('click', connectToSerialDevice);
document.getElementById('sendButton').addEventListener('click', () => sendData('Hello, UART!'));
document.getElementById('disconnectButton').addEventListener('click', disconnect);
```

# 列印字
```javascript
  LCD_RESET();
  LCD_PRINTBLOCK(0,0,[0x00 , 0xEE , 0xEE , 0xEE]);
  LCD_PRINTBLOCK(4,0,[0x00 , 0xAA , 0x44 , 0xAA]);
```

# Other
```
 0: "own_seed"
 1: "other_seed"
 2: "seed"
 3: "own_order"
 4: "other_hard"
 5: "game_hard"
 6: "game_turn"
 7: "wait"
 8: "game_step"
 9: "stats"
10: "eat_new_apple1"
11: "eat_new_apple2"
```