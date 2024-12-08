/* global Test */
/// <reference path="main.js" />

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

function LED_PWM(led=0,pwm=0){
    if(0<=led&&led<=3&&0<=pwm&&pwm<=255)
        document.getElementById('LED'+led).style.opacity=(pwm)/255;
}

let last_button_stats=[0,0];
function BUTTON_STATUS(button=0){
    if(0<=button&&button<=1)
        if(document.getElementById('BT'+button).dataset.press==='true'&&!last_button_stats[button]){
            last_button_stats[button]=document.getElementById('BT'+button).dataset.press==='true';
            return true;
        }else{
            last_button_stats[button]=document.getElementById('BT'+button).dataset.press==='true';
            return false;
        }
    return null;
}

function GET_ADC_VALUE(){
    return Number(document.getElementById('ADC').value);
}

function LCD_RESET(){
    const canvas=document.getElementById('canvas');
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#909090";
    ctx.fillRect(0,0,128*8,64*8);
}

function LCD_PRINTBLOCK(x=0,y=0,data=[]){
    data=cloneJSON(data);
    const canvas=document.getElementById('canvas');
    const ctx=canvas.getContext("2d");
    for(let i=0;i<data.length;i++){
        ctx.fillStyle="#909090";
        ctx.fillRect((x+i)*8,y*8*8,1*8,8*8);
        ctx.fillStyle="#000000";
        for(let j=0;j<8;j++){
            if(data[i]&1){
                ctx.fillRect((x+i)*8,(y*8+j)*8,1*8,1*8);
            }
            data[i]=data[i]>>1;
        }
    }
}

function LCD_PRINTCHAR(x=0,y=0,char=0){
    LCD_PRINTBLOCK(x*8,y*2,LCD_CHAR.slice(char*16,char*16+8));
    LCD_PRINTBLOCK(x*8,y*2+1,LCD_CHAR.slice(char*16+8,char*16+16));
}
function LCD_PRINTCUSTCHAR(x=0,y=0,char=[]){
    LCD_PRINTBLOCK(x*8,y*2,char.slice(0,8));
    LCD_PRINTBLOCK(x*8,y*2+1,char.slice(8,16));
}

function LCD_PRINTSTRING(x=0,y=0,string=[]){
    for(let i=0;(i<string.length&&i<16);i++){
        LCD_PRINTCHAR((x+i),y,string[i]);
    }
}

function LCD_PRINTTURESTRING(x=0,y=0,string=''){
    const punc=[46,45,58,33,63,47,256,62];
    let trans=[];
    for(let i=0;i<string.length;i++){
        const char=string[i].charCodeAt();
        if(48<=char&&char<=57){         //0-9
            trans.push(char-48+0)
        }else if(97<=char&&char<=122){  //a-z
            trans.push(char-97+30)
        }else if(65<=char&&char<=90){   //A-Z
            trans.push(char-65+56)
        }else{
            if(punc.indexOf(char)>=0){
                trans.push(20+punc.indexOf(char));
            }else{
                trans.push(82);
            }
        }
    }
    for(let i=0;(i<trans.length&&i<16);i++){
        LCD_PRINTCHAR((x+i),y,trans[i]);
    }
}

function cloneJSON(obj) {
    // basic type deep copy
    if (obj === null || obj === undefined || typeof obj !== 'object')  {
        return obj
    }
    // array deep copy
    if (obj instanceof Array) {
        var cloneA = [];
        for (var i = 0; i < obj.length; ++i) {
            cloneA[i] = cloneJSON(obj[i]);
        }              
        return cloneA;
    }                  
    // object deep copy
    var cloneO = {};   
    for (var i in obj) {
        cloneO[i] = cloneJSON(obj[i]);
    }                  
    return cloneO;
}

const LCD_CHAR=[
    0x00,0xE0,0x10,0x08,0x08,0x10,0xE0,0x00,0x00,0x0F,0x10,0x20,0x20,0x10,0x0F,0x00,    //0 0
    0x00,0x10,0x10,0xF8,0x00,0x00,0x00,0x00,0x00,0x20,0x20,0x3F,0x20,0x20,0x00,0x00,
    0x00,0x70,0x08,0x08,0x08,0x88,0x70,0x00,0x00,0x30,0x28,0x24,0x22,0x21,0x30,0x00,
    0x00,0x30,0x08,0x88,0x88,0x48,0x30,0x00,0x00,0x18,0x20,0x20,0x20,0x11,0x0E,0x00,
    0x00,0x00,0xC0,0x20,0x10,0xF8,0x00,0x00,0x00,0x07,0x04,0x24,0x24,0x3F,0x24,0x00,
    0x00,0xF8,0x08,0x88,0x88,0x08,0x08,0x00,0x00,0x19,0x21,0x20,0x20,0x11,0x0E,0x00,
    0x00,0xE0,0x10,0x88,0x88,0x18,0x00,0x00,0x00,0x0F,0x11,0x20,0x20,0x11,0x0E,0x00,
    0x00,0x38,0x08,0x08,0xC8,0x38,0x08,0x00,0x00,0x00,0x00,0x3F,0x00,0x00,0x00,0x00,
    0x00,0x70,0x88,0x08,0x08,0x88,0x70,0x00,0x00,0x1C,0x22,0x21,0x21,0x22,0x1C,0x00,
    0x00,0xE0,0x10,0x08,0x08,0x10,0xE0,0x00,0x00,0x00,0x31,0x22,0x22,0x11,0x0F,0x00,    //9 9

    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x30,0x30,0x00,0x00,0x00,0x00,0x00,    //. 10
    0x08,0xF8,0x00,0x00,0x80,0x80,0x80,0x00,0x20,0x3F,0x24,0x02,0x2D,0x30,0x20,0x00,    //k 11
    0xF8,0x08,0x00,0xF8,0x00,0x08,0xF8,0x00,0x03,0x3C,0x07,0x00,0x07,0x3C,0x03,0x00,    //w 12
    0x08,0xF8,0x00,0x80,0x80,0x80,0x00,0x00,0x20,0x3F,0x21,0x00,0x00,0x20,0x3F,0x20,    //h 13
    0x80,0x80,0x80,0x00,0x00,0x80,0x80,0x80,0x00,0x01,0x0E,0x30,0x08,0x06,0x01,0x00,    //v 14
    0x00,0x00,0x80,0x80,0x80,0x80,0x00,0x00,0x00,0x19,0x24,0x22,0x22,0x22,0x3F,0x20,    //a 15
    0x80,0x80,0x80,0x00,0x80,0x80,0x80,0x00,0x20,0x20,0x3F,0x21,0x20,0x00,0x01,0x00,    //r 16
    0x08,0x78,0x88,0x00,0x00,0xC8,0x38,0x08,0x00,0x00,0x07,0x38,0x0E,0x01,0x00,0x00,    //V 17
    0x00,0x00,0xC0,0x38,0xE0,0x00,0x00,0x00,0x20,0x3C,0x23,0x02,0x02,0x27,0x38,0x20,    //A 18
    0x08,0xF8,0x88,0x88,0x88,0x70,0x00,0x00,0x20,0x3F,0x20,0x20,0x20,0x11,0x0E,0x00,    //B 19

    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x30,0x30,0x00,0x00,0x00,0x00,0x00,    //. 20
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x01,0x01,0x01,0x01,0x01,0x01,    //- 21
    0x00,0x60,0x60,0x00,0x00,0x00,0x00,0x00,0x00,0x30,0x30,0x00,0x00,0x00,0x00,0x00,    //: 22
    0x00,0xF8,0xF8,0x00,0x00,0x00,0x00,0x00,0x00,0x37,0x37,0x00,0x00,0x00,0x00,0x00,    //! 23
    0x30,0x38,0x18,0x98,0xF8,0xF0,0x00,0x00,0x00,0x36,0x37,0x03,0x01,0x00,0x00,0x00,    //? 24
    0x00,0x00,0x00,0x00,0xC0,0xF0,0x30,0x00,0x00,0x30,0x3C,0x0F,0x03,0x00,0x00,0x00,    /// 25
    0x00,0x54,0x38,0x7C,0x38,0x54,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,	//*	26
    0x00,0x00,0x04,0x08,0x10,0x20,0x40,0x80,0x00,0x00,0x20,0x10,0x08,0x04,0x02,0x01,	//>	27
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,

    0x00,0x00,0x80,0x80,0x80,0x80,0x00,0x00,0x00,0x19,0x24,0x22,0x22,0x22,0x3F,0x20,    //a 30
    0x08,0xF8,0x00,0x80,0x80,0x00,0x00,0x00,0x00,0x3F,0x11,0x20,0x20,0x11,0x0E,0x00,
    0x00,0x00,0x00,0x80,0x80,0x80,0x00,0x00,0x00,0x0E,0x11,0x20,0x20,0x20,0x11,0x00,
    0x00,0x00,0x00,0x80,0x80,0x88,0xF8,0x00,0x00,0x0E,0x11,0x20,0x20,0x10,0x3F,0x20,
    0x00,0x00,0x80,0x80,0x80,0x80,0x00,0x00,0x00,0x1F,0x22,0x22,0x22,0x22,0x13,0x00,
    0x00,0x80,0x80,0xF0,0x88,0x88,0x88,0x18,0x00,0x20,0x20,0x3F,0x20,0x20,0x00,0x00,
    0x00,0x00,0x80,0x80,0x80,0x80,0x80,0x00,0x00,0x6B,0x94,0x94,0x94,0x93,0x60,0x00,
    0x08,0xF8,0x00,0x80,0x80,0x80,0x00,0x00,0x20,0x3F,0x21,0x00,0x00,0x20,0x3F,0x20,
    0x00,0x80,0x98,0x98,0x00,0x00,0x00,0x00,0x00,0x20,0x20,0x3F,0x20,0x20,0x00,0x00,
    0x00,0x00,0x00,0x80,0x98,0x98,0x00,0x00,0x00,0xC0,0x80,0x80,0x80,0x7F,0x00,0x00,
    0x08,0xF8,0x00,0x00,0x80,0x80,0x80,0x00,0x20,0x3F,0x24,0x02,0x2D,0x30,0x20,0x00,
    0x00,0x08,0x08,0xF8,0x00,0x00,0x00,0x00,0x00,0x20,0x20,0x3F,0x20,0x20,0x00,0x00,
    0x80,0x80,0x80,0x80,0x80,0x80,0x80,0x00,0x20,0x3F,0x20,0x00,0x3F,0x20,0x00,0x3F,
    0x80,0x80,0x00,0x80,0x80,0x80,0x00,0x00,0x20,0x3F,0x21,0x00,0x00,0x20,0x3F,0x20,
    0x00,0x00,0x80,0x80,0x80,0x80,0x00,0x00,0x00,0x1F,0x20,0x20,0x20,0x20,0x1F,0x00,
    0x80,0x80,0x00,0x80,0x80,0x00,0x00,0x00,0x80,0xFF,0xA1,0x20,0x20,0x11,0x0E,0x00,
    0x00,0x00,0x00,0x80,0x80,0x80,0x80,0x00,0x00,0x0E,0x11,0x20,0x20,0xA0,0xFF,0x80,
    0x80,0x80,0x80,0x00,0x80,0x80,0x80,0x00,0x20,0x20,0x3F,0x21,0x20,0x00,0x01,0x00,
    0x00,0x00,0x80,0x80,0x80,0x80,0x80,0x00,0x00,0x33,0x24,0x24,0x24,0x24,0x19,0x00,
    0x00,0x80,0x80,0xE0,0x80,0x80,0x00,0x00,0x00,0x00,0x00,0x1F,0x20,0x20,0x00,0x00,
    0x80,0x80,0x00,0x00,0x00,0x80,0x80,0x00,0x00,0x1F,0x20,0x20,0x20,0x10,0x3F,0x20,
    0x80,0x80,0x80,0x00,0x00,0x80,0x80,0x80,0x00,0x01,0x0E,0x30,0x08,0x06,0x01,0x00,
    0x80,0x80,0x00,0x80,0x00,0x80,0x80,0x80,0x0F,0x30,0x0C,0x03,0x0C,0x30,0x0F,0x00,
    0x00,0x80,0x80,0x00,0x80,0x80,0x80,0x00,0x00,0x20,0x31,0x2E,0x0E,0x31,0x20,0x00,
    0x80,0x80,0x80,0x00,0x00,0x80,0x80,0x80,0x80,0x81,0x8E,0x70,0x18,0x06,0x01,0x00,
    0x00,0x80,0x80,0x80,0x80,0x80,0x80,0x00,0x00,0x21,0x30,0x2C,0x22,0x21,0x30,0x00,    //z 55

    0x00,0x00,0xC0,0x38,0xE0,0x00,0x00,0x00,0x20,0x3C,0x23,0x02,0x02,0x27,0x38,0x20,    //A 56
    0x08,0xF8,0x88,0x88,0x88,0x70,0x00,0x00,0x20,0x3F,0x20,0x20,0x20,0x11,0x0E,0x00,
    0xC0,0x30,0x08,0x08,0x08,0x08,0x38,0x00,0x07,0x18,0x20,0x20,0x20,0x10,0x08,0x00,
    0x08,0xF8,0x08,0x08,0x08,0x10,0xE0,0x00,0x20,0x3F,0x20,0x20,0x20,0x10,0x0F,0x00,
    0x08,0xF8,0x88,0x88,0xE8,0x08,0x10,0x00,0x20,0x3F,0x20,0x20,0x23,0x20,0x18,0x00,
    0x08,0xF8,0x88,0x88,0xE8,0x08,0x10,0x00,0x20,0x3F,0x20,0x00,0x03,0x00,0x00,0x00,
    0xC0,0x30,0x08,0x08,0x08,0x38,0x00,0x00,0x07,0x18,0x20,0x20,0x22,0x1E,0x02,0x00,
    0x08,0xF8,0x08,0x00,0x00,0x08,0xF8,0x08,0x20,0x3F,0x21,0x01,0x01,0x21,0x3F,0x20,
    0x00,0x08,0x08,0xF8,0x08,0x08,0x00,0x00,0x00,0x20,0x20,0x3F,0x20,0x20,0x00,0x00,
    0x00,0x00,0x08,0x08,0xF8,0x08,0x08,0x00,0xC0,0x80,0x80,0x80,0x7F,0x00,0x00,0x00,
    0x08,0xF8,0x88,0xC0,0x28,0x18,0x08,0x00,0x20,0x3F,0x20,0x01,0x26,0x38,0x20,0x00,
    0x08,0xF8,0x08,0x00,0x00,0x00,0x00,0x00,0x20,0x3F,0x20,0x20,0x20,0x20,0x30,0x00,
    0x08,0xF8,0xF8,0x00,0xF8,0xF8,0x08,0x00,0x20,0x3F,0x00,0x3F,0x00,0x3F,0x20,0x00,
    0x08,0xF8,0x30,0xC0,0x00,0x08,0xF8,0x08,0x20,0x3F,0x20,0x00,0x07,0x18,0x3F,0x00,
    0xE0,0x10,0x08,0x08,0x08,0x10,0xE0,0x00,0x0F,0x10,0x20,0x20,0x20,0x10,0x0F,0x00,
    0x08,0xF8,0x08,0x08,0x08,0x08,0xF0,0x00,0x20,0x3F,0x21,0x01,0x01,0x01,0x00,0x00,
    0xE0,0x10,0x08,0x08,0x08,0x10,0xE0,0x00,0x0F,0x18,0x24,0x24,0x38,0x50,0x4F,0x00,
    0x08,0xF8,0x88,0x88,0x88,0x88,0x70,0x00,0x20,0x3F,0x20,0x00,0x03,0x0C,0x30,0x20,
    0x00,0x70,0x88,0x08,0x08,0x08,0x38,0x00,0x00,0x38,0x20,0x21,0x21,0x22,0x1C,0x00,
    0x18,0x08,0x08,0xF8,0x08,0x08,0x18,0x00,0x00,0x00,0x20,0x3F,0x20,0x00,0x00,0x00,
    0x08,0xF8,0x08,0x00,0x00,0x08,0xF8,0x08,0x00,0x1F,0x20,0x20,0x20,0x20,0x1F,0x00,
    0x08,0x78,0x88,0x00,0x00,0xC8,0x38,0x08,0x00,0x00,0x07,0x38,0x0E,0x01,0x00,0x00,
    0xF8,0x08,0x00,0xF8,0x00,0x08,0xF8,0x00,0x03,0x3C,0x07,0x00,0x07,0x3C,0x03,0x00,
    0x08,0x18,0x68,0x80,0x80,0x68,0x18,0x08,0x20,0x30,0x2C,0x03,0x03,0x2C,0x30,0x20,
    0x08,0x38,0xC8,0x00,0xC8,0x38,0x08,0x00,0x00,0x00,0x20,0x3F,0x20,0x00,0x00,0x00,
    0x10,0x08,0x08,0x08,0xC8,0x38,0x08,0x00,0x20,0x38,0x26,0x21,0x20,0x20,0x18,0x00,    //Z 81
    
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,    //SPACE 82
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
		
    0x00,0x00,0x00,0x80,0x80,0x80,0x80,0x80,0x00,0x00,0x00,0x01,0x01,0x01,0x01,0x01,    //	84
    0x80,0x80,0x80,0x80,0x80,0x80,0x80,0x80,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,
    0x80,0x80,0x80,0x80,0x80,0x00,0x00,0x00,0x01,0x01,0x01,0x01,0x01,0x00,0x00,0x00,    
    0x00,0x00,0x00,0xF0,0xF0,0x80,0x80,0x80,0x00,0x00,0x00,0x0F,0x0F,0x01,0x01,0x01,    
    0x80,0x80,0x80,0xF0,0xF0,0x80,0x80,0x80,0x01,0x01,0x01,0x0F,0x0F,0x01,0x01,0x01,    
    0x80,0x80,0x80,0xF0,0xF0,0x00,0x00,0x00,0x01,0x01,0x01,0x0F,0x0F,0x00,0x00,0x00,    
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,    
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,    
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,    
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,    
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,    
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,    
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,    
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,    
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,   
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,    //	99
		
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,		//LOGO	100
    0x00,0xE0,0xE0,0xE0,0x00,0xE0,0xE0,0xE0,0x00,0xEE,0xEE,0xEE,0x00,0x00,0x00,0x00,
    0x00,0xE0,0xE0,0xE0,0x00,0xE0,0xE0,0xE0,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0xE0,0xE0,0xE0,0x00,0xE0,0xE0,0xE0,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0xE0,0xE0,0xE0,0x00,0xE0,0xE0,0xE0,0x00,0x80,0x80,0xC0,0xC0,0xC0,0xE0,0xE0,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xE0,0xE0,0xE0,0xE0,0xC0,0xC0,0xC0,0x80,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x80,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xC0,0xC0,0xC0,0xE0,0xE0,0xE0,0xE0,0xE0,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xE0,0xC0,0xC0,0xC0,0x80,0x80,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0xA0,0x40,0xA0,0x00,0xA0,0x40,0xA0,0x00,0x00,0x00,0x00,0x00,0xAA,0x44,0xAA,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0xEE,0xEE,0xEE,0x00,0x00,0x00,0x00,0x00,0xEE,0xEE,0xEE,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xE0,
    0x00,0x00,0xC0,0xE0,0xF0,0xFC,0xFE,0xFE,0xFC,0xFF,0xFF,0xFF,0xFF,0xFF,0x0F,0x03,
    0xFF,0xFF,0x7F,0x7F,0x3F,0x3F,0x7F,0x7F,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0xFF,0xFF,0xFF,0xFC,0xFC,0xEF,0xC7,0x17,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x37,0x76,0x60,0xE0,0xE0,0xC0,0x80,0x80,0x00,0x00,0x00,0x00,0x01,0x03,0x07,0x0F,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x1F,0x3F,0xFE,0xFC,0xF8,0xF0,0xF0,0xE0,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x80,0xC0,0x80,0x18,0x3C,0x7E,0x7F,0x1F,0x0F,
    0x80,0xC0,0xE0,0xE0,0x60,0x76,0x37,0x17,0x07,0x03,0x01,0x00,0x00,0x00,0x00,0x00,
    0xC7,0xEF,0xFC,0xFC,0xFF,0xFF,0xFF,0x7F,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x7F,0x3F,0x3F,0x7F,0x7F,0xFF,0xFF,0xFE,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x03,
    0xFE,0xFC,0xF0,0xE0,0xC0,0x00,0x00,0x00,0x0F,0xFF,0xFF,0xFF,0xFF,0xFF,0xFC,0xE0,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0xAA,0x44,0xAA,0x00,0x00,0x00,0x00,0x00,0xAA,0x44,0xAA,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0xEE,0xEE,0xEE,0x00,0x00,0x00,0x00,0x00,0xEE,0xEE,0xEE,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x1F,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xC0,0x80,0x00,0x03,0x0F,0x1F,0x3F,0x7F,0xFF,0xFF,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xFE,0xFC,0xFC,0xF8,0xF8,0xF0,0xF0,0xF0,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xF0,0xF0,0xF0,0xF0,0xF0,0xF0,0xF8,0xF8,
    0x00,0x00,0x00,0x00,0x00,0x80,0xC0,0xE0,0xFC,0xFC,0xFE,0xFE,0x7F,0x7F,0x3F,0x1F,
    0xF0,0xF8,0xF8,0xF1,0xE3,0xC7,0x0F,0x1F,0x0F,0x0F,0x07,0x03,0x01,0x00,0x00,0x00,
    0x3F,0x7F,0xFF,0xFE,0xFC,0xF8,0xF0,0xE0,0x00,0x00,0x00,0x01,0x03,0x07,0x0F,0x1F,
    0xC0,0x80,0x80,0x00,0x00,0x00,0x00,0x00,0x3F,0x7F,0x7F,0xFF,0xFE,0xFE,0xFC,0xF8,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xF8,0xF0,0xF0,0xF0,0xF0,0xF0,0xF0,0xF0,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x80,0xF0,0xF0,0xF8,0xF8,0xFC,0xFC,0xFE,0xFF,
    0xC0,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0x1F,0xFF,0x7F,0x3F,0x1F,0x0F,0x03,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0xAA,0x44,0xAA,0x00,0x00,0x00,0x00,0x00,0xAA,0x44,0xAA,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0xEE,0xEE,0xEE,0x00,0x00,0x00,0x00,0x00,0x0E,0x0E,0x0E,0x00,0x0E,0x0E,0x0E,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x01,0x01,0x03,0x03,0x03,0x03,0x07,0x07,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x07,0x07,0x07,0x07,0x07,0x07,0x03,0x03,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x03,0x01,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x01,0x01,0x03,0x03,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x03,0x07,0x07,0x07,0x07,0x07,0x07,0x07,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x07,0x03,0x03,0x03,0x03,0x01,0x01,0x00,0x00,0x0A,0x04,0x0A,0x00,0x0A,0x04,0x0A,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x0A,0x04,0x0A,0x00,0x0A,0x04,0x0A,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x0A,0x04,0x0A,0x00,0x0A,0x04,0x0A,
    0x00,0x00,0x00,0x00,0x00,0xAA,0x44,0xAA,0x00,0x0A,0x04,0x0A,0x00,0x0A,0x04,0x0A,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,

    0x00,0x00,0x00,0x80,0x52,0x25,0xA5,0x95,0x00,0x80,0xC0,0x7F,0x40,0x41,0x80,0x80,
    0x15,0x15,0x95,0xA2,0x60,0x90,0x00,0x00,0x42,0x44,0x82,0x80,0x41,0xFF,0x00,0x00,
    0x00,0x00,0x00,0x00,0xA8,0x54,0x54,0x54,0x00,0x80,0xFC,0x83,0x80,0x42,0x42,0x81,
    0x54,0x54,0x54,0x48,0xA0,0x00,0x00,0x00,0x84,0x48,0x45,0x42,0x82,0x41,0x7E,0x80,
    0x00,0x00,0x20,0xA0,0x44,0x4A,0x2A,0x2A,0x80,0xC0,0x7E,0x41,0x80,0x82,0x41,0x41,
    0x2A,0x2A,0x4A,0x44,0xA0,0x20,0x00,0x00,0x84,0x88,0x45,0x41,0x42,0x83,0xFC,0x80,

];

const wah=[
    0x00,0x00,0x00,0x80,0x52,0x25,0xA5,0x95,0x00,0x80,0xC0,0x7F,0x40,0x41,0x80,0x80,
    0x15,0x15,0x95,0xA2,0x60,0x90,0x00,0x00,0x42,0x44,0x82,0x80,0x41,0xFF,0x00,0x00,
    0x00,0x00,0x00,0x00,0xA8,0x54,0x54,0x54,0x00,0x80,0xFC,0x83,0x80,0x42,0x42,0x81,
    0x54,0x54,0x54,0x48,0xA0,0x00,0x00,0x00,0x84,0x48,0x45,0x42,0x82,0x41,0x7E,0x80,
    0x00,0x00,0x20,0xA0,0x44,0x4A,0x2A,0x2A,0x80,0xC0,0x7E,0x41,0x80,0x82,0x41,0x41,
    0x2A,0x2A,0x4A,0x44,0xA0,0x20,0x00,0x00,0x84,0x88,0x45,0x41,0x42,0x83,0xFC,0x80,
];