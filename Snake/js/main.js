/* global Test */
/// <reference path="lib.js" />
/// <reference path="simplepeer.min.js" />

var map=[];
var last_map=[];
var pos=[[0,0],[0,0]];
var face=[0,0];
var temp_face=0;
var score=[0,0];
var base_len=5;
var clock=[0,0,0,0,0];

var use_webrtc=false;

window.addEventListener('keydown',(e)=>{
    if(e.code==='KeyZ'){
        document.getElementById('BT0').dataset.press='true';
        document.getElementById('BT0').getElementsByTagName('circle')[0].style.fill='#505050';
    }
    if(e.code==='KeyX'){
        document.getElementById('BT1').dataset.press='true';
        document.getElementById('BT1').getElementsByTagName('circle')[0].style.fill='#505050';
    }
    const adc=document.getElementById('ADC');
    if(e.code==='ArrowLeft'){
        adc.value=Math.max(Number(adc.value)-150,0).toString();
    }
    if(e.code==='ArrowRight'){
        adc.value=Math.min(Number(adc.value)+150,4095).toString();
    }
});
window.addEventListener('keyup',(e)=>{
    if(e.code==='KeyZ'){
        document.getElementById('BT0').dataset.press='false';
        document.getElementById('BT0').getElementsByTagName('circle')[0].style.fill='#000000';
    }
    if(e.code==='KeyX'){
        document.getElementById('BT1').dataset.press='false';
        document.getElementById('BT1').getElementsByTagName('circle')[0].style.fill='#000000';
    }
});

function clear(h=16,w=32){
    score=[0,0];
    map=[];
    last_map=[];
    for(let i=0;i<h;i++){
        let temp=[];
        let temp1=[];
        for(let j=0;j<w;j++){
            temp.push(0);
            temp1.push(-99);
        }
        map.push(temp);
        last_map.push(temp1);
    }
}

function print_map(h=16,w=32){
    for(let i=0;i<h;i++){
        for(let j=0;j<w;j++){
            const stats=get_pos_stats(j,i);
            if(stats!==last_map[i][j]){
                print_part(j,i,[get_pos_stats(j,Math.floor(i/2)*2+1),get_pos_stats(j,Math.floor(i/2)*2)])
                last_map[i][j]=stats;
            }
        }
    }
}

function next_map(num=1){   //return 1: player1 lost, 2: player2 lost, 3: 2 players lost, 4: full map, 10>: new apple(11: player1 eat, 12: player2 eat, 13: 2player eat)
    let lost=0,apple=10;
    for(let i=0;i<num;i++){
        switch(face[i]){
            case 0:
                if(pos[i][0]>0){
                    pos[i][0]--;
                }else{
                    lost+=i+1;
                }
                break;
            case 1:
                if(pos[i][1]<31){
                    pos[i][1]++;
                }else{
                    lost+=i+1;
                }
                break;
            case 2:
                if(pos[i][0]<15){
                    pos[i][0]++;
                }else{
                    lost+=i+1;
                }
                break;
            case 3:
                if(pos[i][1]>0){
                    pos[i][1]--;
                }else{
                    lost+=i+1;
                }
                break;
        }
    }
    if(lost<=0){
        if(pos[0][0]==pos[1][0]&&pos[0][1]==pos[1][1]&&num>=2){
            return 3;
        }
        for(let i=0;i<16;i++){
            for(let j=0;j<32;j++){
                if(map[i][j]>0){
                    map[i][j]--;
                }
                if(map[i][j]==1024){
                    map[i][j]=0;
                }
            }
        }
        for(let i=0;i<num;i++){
            if(map[pos[i][0]][pos[i][1]]>0){
                lost+=i+1;
            }
        }
        if(lost>0){
            return lost;
        }
        for(let i=0;i<num;i++){
            if(map[pos[i][0]][pos[i][1]]<0){
                apple+=i+1;
                score[i]++;
                if(!generate_apple()){
                    return 4;
                }
            }
            map[pos[i][0]][pos[i][1]]=score[i]+base_len+i*1024;
        }
    }else{
        return lost;
    }
    return apple;
}

function generate_apple(){
    let space=0;
    for(let i=0;i<16;i++){
        for(let j=0;j<32;j++){
            if(map[i][j]==0){
                space++;
            }
        }
    }
    if(space<=0){
        return 0;
    }else{
        while(1){
            const x=Math.floor(32*random.next());
            const y=Math.floor(16*random.next());
            if(map[y][x]==0){
                map[y][x]=-1;
                return 1;
            }
        }
    }
}

function get_pos_stats(x,y){
    if(map[y][x]>=1024){
        return 2;
    }else if(map[y][x]>=1){
        return 1;
    }else if(map[y][x]==-1){
        return 3;
    }else if(map[y][x]==-2){
        return 4;
    }
    return 0;
}

function print_part(x=0,y=0,id=[0,0]){
    const icon=[[0x00,0x00,0x00,0x00],[0x00,0x0E,0x0E,0x0E],[0x00,0x0A,0x04,0x0A],[0x01,0x0E,0x0A,0x0E],[0x02,0x0E,0x0A,0x0E]];
    let print_char=[];
    for(let i=0;i<4;i++){
        let temp=0;
        for(let j=0;j<id.length;j++){
            temp+=icon[id[j]][i];
            temp=temp<<4;
        }
        print_char.push(temp>>4);
    }
    LCD_PRINTBLOCK(x*4,Math.floor(y/2),print_char);
}

var random=new RNG(123456);
function reset(p=1){
    clear();
    switch(p){
        case 1:
            pos=[[7,15],[0,0]];
            face=[0,0];
            map[pos[0][0]][pos[0][1]]=base_len;
            for(let i=0;i<1;i++){
                generate_apple();
            }
            break;
        case 2:
            pos=[[7,7],[7,23]];
            face=[1,3];
            map[pos[0][0]][pos[0][1]]=base_len;
            map[pos[1][0]][pos[1][1]]=base_len+1024;
            for(let i=0;i<p;i++){
                generate_apple();
            }
            break;
    }
    clock[0]=0;
}

var step=-1;
var hard=3;
var player_mode=0;
let point=0,point2=-1;
let temp_data={};

let UART_port;
let UART_writer={'write':(data)=>{console.log(data);}};

async function main_loop(){
    if(player_mode<=0){
        switch(step){
            case -1:{
                LCD_PRINTSTRING(0,0,[100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,]);
                LCD_PRINTSTRING(0,1,[116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,]);
                LCD_PRINTSTRING(0,2,[132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,]);
                LCD_PRINTSTRING(0,3,[148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,]);
                step++;
                break;
            }
            case 0:{
                if(clock[0]>=500){
                    LED_PWM(3,0);
                    LED_PWM(2,0);
                    LED_PWM(0,0);
                    LED_PWM(1,0);
                    LCD_PRINTTURESTRING(0,0,"     SNAKE!     ");
                    LCD_PRINTTURESTRING(0,1," 1. 1 PLAYER    ");
                    LCD_PRINTTURESTRING(0,2," 2. 2 PLAYER    ");
                    LCD_PRINTTURESTRING(0,3," 3. DIFFICULTY  ");
                    point2=-1;
                    step++;
                    clock[0]=0;
                }
                break;
            }
            case 1:{
                point=(Math.floor(GET_ADC_VALUE()/(0x1000/3)));
                if(point2!=point){
                    LCD_PRINTTURESTRING(0,point2+1,' ');
                    LCD_PRINTTURESTRING(0,point+1,'>');
                    point2=point;
                }
                if(BUTTON_STATUS(0)){
                    if(point==0){
                        clock[0]=0;
                        player_mode=1;
                        point2=-1;
                        step=0;
                    }else if(point==1){
                        clock[0]=0;
                        player_mode=2;
                        point2=-1;
                        step=0;
                    }else if(point==2){
                        for(let i=0;i<4;i++){
                            if(hard==5){
                                LED_PWM(i,255);
                            }else{
                                if((3-i)<=hard-1){
                                    LED_PWM(i,128);
                                }else{
                                    LED_PWM(i,0);
                                }
                            }
                        }
                        step++;
                        temp_data['Progress']=[83,84,85,85,85,85,85,85,85,85,85,85,85,85,85,86];
                        switch(hard){
                            case 1:
                                temp_data['Progress'][1]=87;
                                break;
                            case 2:
                                temp_data['Progress'][4]=88;
                                break;
                            case 3:
                                temp_data['Progress'][8]=88;
                                break;
                            case 4:
                                temp_data['Progress'][12]=88;
                                break;
                            case 5:
                                temp_data['Progress'][15]=89;
                                break;
                        }
                        LCD_PRINTTURESTRING(0,0,"   DIFFICULTY   ");
                        LCD_PRINTSTRING(0,1,temp_data['Progress']);
                        LCD_PRINTTURESTRING(0,2," 1  2   3   4  5");
                        LCD_PRINTTURESTRING(0,3," EXIT           ");
                    }
                }
                break;
            }
            case 2:{
                point=(Math.floor(GET_ADC_VALUE()/(0x1000/2)));
                if(point2!=point){
                    LCD_PRINTTURESTRING(0,point2*2+1,' ');
                    LCD_PRINTTURESTRING(0,point*2+1,'>');
                    point2=point;
                }
                if(BUTTON_STATUS(0)){
                    if(point==0){
                        LCD_PRINTTURESTRING(0,1," ");
                        point2=-1;
                        step++;
                    }else if(point==1){
                        for(let i=0;i<4;i++){
                            LED_PWM(i,0);
                        }
                        step=0;
                    }
                }
                break;
            }
            case 3:{
                temp_data['Progress']=[83,84,85,85,85,85,85,85,85,85,85,85,85,85,85,86];
                point=(Math.floor(GET_ADC_VALUE()/(0x1000/5)));
                if(point2!=point){
                    for(let i=0;i<4;i++){
                        if(point==4){
                            LED_PWM(i,255);
                        }else{
                            if((3-i)<=point){
                                LED_PWM(i,128);
                            }else{
                                LED_PWM(i,0);
                            }
                        }
                    }
                    switch(point){
                        case 0:
                            temp_data['Progress'][1]=87;
                            break;
                        case 1:
                            temp_data['Progress'][4]=88;
                            break;
                        case 2:
                            temp_data['Progress'][8]=88;
                            break;
                        case 3:
                            temp_data['Progress'][12]=88;
                            break;
                        case 4:
                            temp_data['Progress'][15]=89;
                            break;
                    }
                    LCD_PRINTSTRING(0,1,temp_data['Progress']);
                    point2=point;
                }
                if(BUTTON_STATUS(0)){
                    hard=point+1;
                    point2=-1;
                    step=2;
                }
                break;
            }
            default:
                step=-1;
                point2=-1;
                break;
        }
    }else{
        if(player_mode===1){//1 player game
            switch(step){
                case 0:{
                    LCD_RESET();
                    step++;
                    LCD_PRINTTURESTRING(5,1,"READY!");
                    break;
                }
                case 1:{
                    if(clock[0]<=1000){
                        LCD_PRINTTURESTRING(5,2,"3 . .");
                    }else if(clock[0]<=2000){
                        LCD_PRINTTURESTRING(5,2,"3 2 .");
                    }else if(clock[0]<=3000){
                        LCD_PRINTTURESTRING(5,2,"3 2 1");
                    }else{
                        LCD_PRINTTURESTRING(5,1,"      ");
                        LCD_PRINTTURESTRING(5,2,"     ");
                        step++;
                    }
                    break;
                }
                case 2:{
                    reset(1);
                    print_map();
                    step++;
                    break;
                }
                case 3:{
                    if(BUTTON_STATUS(0)){
                        if(temp_face==0){
                            temp_face=-1;
                        }else if(temp_face==1){
                            temp_face=0;
                        }
                    }
                    if(BUTTON_STATUS(1)){
                        if(temp_face==0){
                            temp_face=1;
                        }else if(temp_face==-1){
                            temp_face=0;
                        }
                    }
                    if(clock[3]>=50){
                        if(temp_data['eat_new_apple1']>=0){
                            if(temp_data['eat_new_apple1']%2==0){
                                for(let i=0;i<4;i++){
                                    LED_PWM(i,0);
                                }
                            }else{
                                for(let i=0;i<4;i++){
                                    LED_PWM(i,255);
                                }
                            }
                            if(temp_data['eat_new_apple1']>=0){
                                temp_data['eat_new_apple1']--;
                            }
                        }
                        clock[3]=0;
                    }
                    if(clock[1]>=500){
                        for(let i=0;i<16;i++){
                            for(let j=0;j<32;j++){
                                if(map[i][j]==-1){
                                    map[i][j]=-2;
                                }else if(map[i][j]==-2){
                                    map[i][j]=-1;
                                }
                            }
                        }
                        print_map();
                        clock[1]=0;
                    }
                    if(clock[0]>=(6-hard)*150){
                        face[0]=(face[0]+temp_face+4)%4;
                        temp_face=0;
                        const stats=next_map(1);
                        print_map();
                        if(stats==1){
                            step=4;
                        }else if(stats==4){
                            step=5;
                        }else if(stats>10){
                            if(stats%10==1){
                                temp_data['eat_new_apple1']=10;
                            }
                        }
                        clock[0]=0;
                    }
                    break;
                }
                case 4:{
                    LCD_PRINTTURESTRING(3,0," YOU LOST ");
                    LCD_PRINTTURESTRING(2,1,` SCORE:${score[0].toString().padStart(4,' ')} `);
                    clock[0]=0;
                    step=6;
                    break;
                }
                case 5:{
                    LCD_PRINTTURESTRING(3,0," YOU WIN! ");
                    LCD_PRINTTURESTRING(2,1,` SCORE:${score[0].toString().padStart(4,' ')} `);
                    clock[0]=0;
                    step=6;
                    break;
                }
                case 6:{
                    if(clock[0]>1000){
                        LCD_PRINTTURESTRING(1,3," PRESS BUTTON ");
                        if(BUTTON_STATUS(0)||BUTTON_STATUS(1)){
                            player_mode=0;
                            step=0;
                        }
                    }
                    break;
                }
                default:{
                    player_mode=0;
                    step=0;
                }
            }
        }else if(player_mode===2){//2 player game
            switch(step){
                case 999:{
                    //Debug
                    break;
                }
                case 0:{
                    if(use_webrtc){
                        if(!temp_data['webrtc_step']){
                            temp_data['web_close']=false;
                            LCD_RESET();
                            LCD_PRINTTURESTRING(0,0,'Try to Connect');
                            document.getElementById('webrtc_offer').value='';
                            document.getElementById('webrtc_answer').value='';
                            document.getElementById('webrtc_set').style.display='';
                            temp_data['webrtc_step']=1;
                            UART_port=null;
                        }else if(temp_data['webrtc_step']<10){

                        }else if(temp_data['webrtc_step']===11){
                            if(!temp_data['web_close']){
                                LCD_RESET();
                                LCD_PRINTTURESTRING(0,0,'Try to Connect');
                                temp_data['webrtc_step']=12;
                            }else{
                                temp_data['webrtc_step']=0;
                            }
                        }else if(temp_data['webrtc_step']===12){
                            temp_data['webrtc_step']=11;
                            step=1;
                            RX_buffer=[];
                            clock[0]=0;
                            clock[2]=0;
                        }else{
                            UART_port.on('close',()=>{
                                temp_data['web_close']=true;
                            });
                            UART_writer={'write':(data)=>{try{UART_port.send(data.toString())}catch(error){}}};
                            UART_port.on('data',(data)=>{RX_buffer.push(Number(data))});
                            document.getElementById('webrtc_set').style.display='none';
                            temp_data['webrtc_step']=12;
                        }
                    }else{
                        LCD_RESET();
                        clock[0]=0;
                        clock[2]=0;
                        LCD_PRINTTURESTRING(0,0,'Try to Connect');
                        step=999;
                        RX_buffer=[];
                        try{
                            UART_port=await navigator.serial.requestPort();
                            await port.open({ baudRate: 9600 });
                            UART_writer=port.writable.getWriter();
                            step=1;
                        }catch(error){
                            step=98;
                        }
                    }
                    break;
                }
                case 1:{
                    if(RX_buffer.length>0&&RX_buffer.shift()===112){
                        UART_writer.write(112);
                        LCD_PRINTTURESTRING(0,1,"Exchange Seed!");
                        UART_writer.write(115);
                        clock[1]=0;
                        step++;
                    }else if(clock[0]>=1000){
                        UART_writer.write(112);
                        clock[0]=0;
                    }
                    if(clock[2]>=20000){
                        LCD_PRINTTURESTRING(6,3,(30-Math.floor(clock[2]/1000)).toString().padStart(2,'0')+'..');
                    }
                    if(clock[2]>=30000){
                        step=8;
                    }
                    break;
                }
                case 2:{
                    if(RX_buffer.length>0&&RX_buffer.shift()===115){
                        temp_data['own_seed']=(clock[3]+GET_ADC_VALUE())%256;
                        UART_writer.write(temp_data['own_seed']);
                        clock[1]=0;
                        step++;
                        break;
                    }
                    if(clock[1]>=1000){
                        LCD_PRINTTURESTRING(0,1,"                ");
                        step=1;
                    }
                    break;
                }
                case 3:{
                    if(RX_buffer.length>0){
                        temp_data['other_seed']=RX_buffer.shift();
                        clock[1]=0;
                        if(temp_data['own_seed']==temp_data['other_seed']){
                            UART_writer.write(115);
                            step=2;
                        }else{
                            temp_data['seed']=(temp_data['own_seed']+temp_data['other_seed'])%256;
                            random=new RNG(temp_data['seed']);
                            temp_data['own_order']=(temp_data['own_seed']>temp_data['other_seed'])?1:2;
                            LCD_PRINTTURESTRING(0,1,"Exchange Diff!");
                            UART_writer.write(100);
                            step++;
                        }
                    }
                    if(clock[1]>=1000){
                        LCD_PRINTTURESTRING(0,1,"                ");
                        step=1;
                    }
                    break;
                }
                case 4:{
                    if(RX_buffer.length>0&&RX_buffer.shift()===100){
                        UART_writer.write(hard);
                        clock[1]=0;
                        step++;
                        break;
                    }
                    if(clock[1]>=1000){
                        LCD_PRINTTURESTRING(0,1,"                ");
                        step=1;
                    }
                    break;
                }
                case 5:{
                    if(RX_buffer.length>0){
                        temp_data['other_hard']=RX_buffer.shift();
                        temp_data['game_hard']=(Math.floor(hard+temp_data['other_hard'])/2)%6;
                        UART_writer.write(83);
                        clock[1]=0;
                        step++;
                        break;
                    }
                    if(clock[1]>=1000){
                        LCD_PRINTTURESTRING(0,1,"                ");
                        step=1;
                    }
                    break;
                }
                case 6:{
                    if(RX_buffer.length>0&&RX_buffer.shift()===83){
                        LCD_PRINTTURESTRING(0,0,'Connect Success!');
                        LCD_PRINTTURESTRING(0,1,"                ");
                        LCD_PRINTTURESTRING(0,2,"Your are Player"+temp_data['own_order'].toString());
                        const body=[[0x00,0xE0,0xE0,0xE0],[0x00,0xA0,0x40,0xA0]];
                        for(let i=0;i<12;i++){
                            LCD_PRINTBLOCK((i+10)*4,6,body[temp_data['own_order']-1]);
                        }
                        clock[0]=0;
                        temp_data['win_count']=[0,0];
                        temp_data['game_turn']=1;
                        step++;
                        break;
                    }
                    break;
                }
                case 7:{
                    if(clock[0]>=3000){
                        LCD_PRINTTURESTRING(0,0,`  Game Turn: ${temp_data['game_turn']}  `);
                        LCD_PRINTTURESTRING(0,1,"                ");
                        LCD_PRINTTURESTRING(0,2,"                ");
                        LCD_PRINTTURESTRING(0,3,"                ");
                        clock[0]=0;
                        step=10;
                    }
                    break;
                }
                case 8:{
                    LCD_PRINTTURESTRING(4,1,"TIMEOUT!");
                    LCD_PRINTTURESTRING(2,3,"PRESS BUTTON");
                    step++;
                    break;
                }
                case 9:{
                    if(BUTTON_STATUS(0)||BUTTON_STATUS(1)){
                        player_mode=0;
                        step=0;
                    }
                    break;
                }
                case 10:{
                    LED_PWM(3,temp_data['win_count'][0]>=1?255:0);
                    LED_PWM(2,temp_data['win_count'][0]>=2?255:0);
                    LED_PWM(0,temp_data['win_count'][1]>=1?255:0);
                    LED_PWM(1,temp_data['win_count'][1]>=2?255:0);
                    LCD_PRINTTURESTRING(5,1,"READY!");
                    temp_data['wait']=0;
                    temp_data['game_step']=0;
                    step++;
                    break;
                }
                case 11:{
                    if(clock[0]<=1000){
                        LCD_PRINTTURESTRING(5,2,"3 . .");
                    }else if(clock[0]<=2000){
                        LCD_PRINTTURESTRING(5,2,"3 2 .");
                    }else if(clock[0]<=3000){
                        LCD_PRINTTURESTRING(5,2,"3 2 1");
                    }else{
                        LCD_PRINTTURESTRING(5,1,"      ");
                        LCD_PRINTTURESTRING(5,2,"     ");
                        step++;
                    }
                    break;
                }
                case 12:{
                    reset(2);
                    print_map();
                    clock[0]=0;
                    clock[3]=0;
                    step++;
                    break;
                }
                case 13:{
                    if(BUTTON_STATUS(0)){
                        if(temp_face==0){
                            temp_face=-1;
                        }else if(temp_face==1){
                            temp_face=0;
                        }
                    }
                    if(BUTTON_STATUS(1)){
                        if(temp_face==0){
                            temp_face=1;
                        }else if(temp_face==-1){
                            temp_face=0;
                        }
                    }
                    if(clock[3]>=50){
                        if(temp_data['eat_new_apple1']>=0){
                            if(temp_data['eat_new_apple1']%2==0){
                                for(let i=0;i<2;i++){
                                    LED_PWM(i,0);
                                }
                            }else{
                                for(let i=0;i<2;i++){
                                    LED_PWM(i,255);
                                }
                            }
                            if(temp_data['eat_new_apple1']>=0){
                                temp_data['eat_new_apple1']--;
                            }else{
                                LED_PWM(3,temp_data['win_count'][0]>=1?255:0);
                                LED_PWM(2,temp_data['win_count'][0]>=2?255:0);
                            }
                        }
                        if(temp_data['eat_new_apple2']>=0){
                            if(temp_data['eat_new_apple2']%2==0){
                                for(let i=2;i<4;i++){
                                    LED_PWM(i,0);
                                }
                            }else{
                                for(let i=2;i<4;i++){
                                    LED_PWM(i,255);
                                }
                            }
                            if(temp_data['eat_new_apple2']>=0){
                                temp_data['eat_new_apple2']--;
                            }else{
                                LED_PWM(0,temp_data['win_count'][1]>=1?255:0);
                                LED_PWM(1,temp_data['win_count'][1]>=2?255:0);
                            }
                        }
                        clock[3]=0;
                    }
                    if(clock[1]>=500){
                        for(let i=0;i<16;i++){
                            for(let j=0;j<32;j++){
                                if(map[i][j]==-1){
                                    map[i][j]=-2;
                                }else if(map[i][j]==-2){
                                    map[i][j]=-1;
                                }
                            }
                        }
                        print_map();
                        clock[1]=0;
                    }
                    if(clock[0]>=(6-temp_data['game_hard'])*150){
                        if(!temp_data['wait']){
                            temp_data['game_step']=(temp_data['game_step']+1)%256;
                            UART_writer.write(temp_data['game_step']);
                            face[temp_data['own_order']-1]=(face[temp_data['own_order']-1]+temp_face+4)%4;
                            temp_face=0;
                            UART_writer.write(face[temp_data['own_order']-1]);
                            temp_data['wait']=1;
                            clock[2]=0;
                        }
                        clock[0]=0;
                    }
                    if(temp_data['wait']){
                        if(clock[2]>=1000){
                            step=80;
                            break;
                        }else{
                            if(temp_data['wait']==1&&RX_buffer.length>0){
                                if(temp_data['game_step']===RX_buffer.shift()){
                                    temp_data['wait']++;
                                }else{
                                    step=80;
                                    break;
                                }
                            }
                            if(temp_data['wait']==2&&RX_buffer.length>0){
                                temp_data['wait']=0;
                                face[temp_data['own_order']%2]=(RX_buffer.shift())%4;
                                const stats=next_map(2);
                                print_map();
                                if(1<=stats&&stats<=4){
                                    temp_data['stats']=stats;
                                    UART_writer.write(stats);
                                    step=19;
                                }else if(stats>10){
                                    if(stats%10==1){
                                        temp_data['eat_new_apple1']=10;
                                    }else if(stats%10==2){
                                        temp_data['eat_new_apple2']=10;
                                    }else if(stats%10==3){
                                        temp_data['eat_new_apple1']=10;
                                        temp_data['eat_new_apple2']=10;
                                    }
                                }
                            }
                        }
                    }
                    break;
                }
                case 19:{
                    if(RX_buffer.length>0){
                        if(temp_data['stats']===RX_buffer.shift()){
                            if(temp_data['stats']==1){
                                step=21;
                            }else if(temp_data['stats']==2){
                                step=20;
                            }else{
                                step=22;
                            }
                        }else{
                            step=80;
                        }
                    }
                    break;
                }
                case 20:{
                    LCD_PRINTTURESTRING(0,1,"  Player1 Win!  ");
                    LCD_PRINTTURESTRING(0,3,"                ");
                    for(let i=0;i<12;i++){
                        LCD_PRINTBLOCK((i+10)*4,6,[0x00,0xE0,0xE0,0xE0]);
                    }
                    temp_data['win_count'][0]++;
                    step=23;
                    break;
                }
                case 21:{
                    LCD_PRINTTURESTRING(0,1,"  Player2 Win!  ");
                    LCD_PRINTTURESTRING(0,3,"                ");
                    for(let i=0;i<12;i++){
                        LCD_PRINTBLOCK((i+10)*4,6,[0x00,0xA0,0x40,0xA0]);
                    }
                    temp_data['win_count'][1]++;
                    step=23;
                    break;
                }
                case 22:{
                    LCD_PRINTTURESTRING(0,1,"      TIE!      ");
                    for(let i=0;i<12;i++){
                        LCD_PRINTBLOCK((i+10)*4,6,[[0x00,0xE0,0xE0,0xE0],[0x00,0xA0,0x40,0xA0]][Math.floor(i/6)]);
                    }
                    step=23;
                    break;
                }
                case 23:{
                    LED_PWM(3,temp_data['win_count'][0]>=1?255:0);
                    LED_PWM(2,temp_data['win_count'][0]>=2?255:0);
                    LED_PWM(0,temp_data['win_count'][1]>=1?255:0);
                    LED_PWM(1,temp_data['win_count'][1]>=2?255:0);
                    LCD_PRINTTURESTRING(0,2,`     ${temp_data['win_count'][0]} :  ${temp_data['win_count'][1]}     `);
                    step++;
                    break;
                }
                case 24:{
                    if(temp_data['win_count'][0]>=2||temp_data['win_count'][1]>=2){
                        LCD_PRINTTURESTRING(0,0,"                ");
                        LCD_PRINTTURESTRING(0,3,"                ");
                        if(temp_data['win_count'][temp_data['own_order']-1]>=2){
                            LCD_PRINTTURESTRING(0,1,"    You Win!    ");
                        }else{
                            LCD_PRINTTURESTRING(0,1,"    You Lost!   ");
                        }
                        const body=[[0x00,0xE0,0xE0,0xE0],[0x00,0xA0,0x40,0xA0]];
                        for(let i=0;i<12;i++){
                            LCD_PRINTBLOCK((i+10)*4,6,body[(temp_data['win_count'][0]>=2?0:1)]);
                        }
                        clock[2]=0;
                        clock[3]=0;
                        clock[4]=0;
                        step=26;
                    }else{
                        step++;
                    }
                    break;
                }
                case 25:{
                    temp_data['game_turn']++;
                    step=7;
                    break;
                }
                case 26:{
                    if(clock[3]>=50){
                        LED_PWM(3,temp_data['win_count'][0]>=2&&(clock[4]>clock[3])?255:0);
                        LED_PWM(2,temp_data['win_count'][0]>=2&&(clock[4]>clock[3])?255:0);
                        LED_PWM(0,temp_data['win_count'][1]>=2&&(clock[4]>clock[3])?255:0);
                        LED_PWM(1,temp_data['win_count'][1]>=2&&(clock[4]>clock[3])?255:0);
                        clock[3]=0;
                        if(clock[4]>=100){
                            clock[4]=0;
                        }
                    }
                    if(clock[2]>=2000){
                        LED_PWM(3,temp_data['win_count'][0]>=2?255:0);
                        LED_PWM(2,temp_data['win_count'][0]>=2?255:0);
                        LED_PWM(0,temp_data['win_count'][1]>=2?255:0);
                        LED_PWM(1,temp_data['win_count'][1]>=2?255:0);
                        LCD_PRINTTURESTRING(2,3,"PRESS BUTTON");
                        step=90;
                    }
                    break;
                }
                case 80:{
                    LCD_PRINTTURESTRING(3,1,"GAME ERROR!");
                    LCD_PRINTTURESTRING(2,3,"PRESS BUTTON");
                    step=90;
                    break;
                }
                case 90:{
                    if(use_webrtc){
                        //UART_port.on('close',()=>{});
                        step=99;
                    }else{
                        try {
                            await port.close();
                            player_mode=0;
                            step=0;
                        }catch(error){
                            step++;
                        }
                    }
                    break;
                }
                case 91:{
                    LCD_PRINTTURESTRING(0,0,"Serial not Close");
                    LCD_PRINTTURESTRING(2,1,"Please Check!");
                    LCD_PRINTTURESTRING(2,3,"PRESS BUTTON");
                    step=99;
                    break;
                }
                case 98:{
                    LCD_PRINTTURESTRING(0,0,"Serial Cant Open");
                    LCD_PRINTTURESTRING(2,1,"Please Check!");
                    LCD_PRINTTURESTRING(2,3,"PRESS BUTTON");
                    step++;
                    break;
                }
                case 99:{
                    if(BUTTON_STATUS(0)||BUTTON_STATUS(1)){
                        player_mode=0;
                        step=0;
                    }
                    break;
                }
                default:{
                    player_mode=0;
                    step=0;
                }
            }
        }else{
            player_mode=0;
            step=0;
        }
    }
}

LCD_RESET();

let UART_delay_counter=0;
setInterval(async ()=>{
    for(let i=0;i<clock.length;i++){
        clock[i]+=4;
        if(clock[i]>=4294967295){
            clock[i]=0;
        }
    }
    UART_delay_counter+=4;
    if(UART_delay_counter>=200){
        if(!use_webrtc&&UART_port){
            const UART_reader=UART_port.readable.getReader();
            try{
                const {value,done }=await UART_reader.read();
                while(1){
                    if(done||RX_buffer.length>=10){
                        break;
                    }
                    RX_buffer.push(value)
                }
                UART_reader.releaseLock();
            }catch(error){
                console.error('Error reading data:', error);
            }
        }
        UART_delay_counter=0;
    }
    main_loop();
},4);