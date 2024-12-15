/* global Test */
/// <reference path="lib.js" />

var AUTO_PLAY=false;

function auto_play_count_space(map,pos){
    map=cloneJSON(map);
    pos=cloneJSON(pos);
    const num=full_chunk(pos)-1;
    const chunk_count=count_chunk_num();
    return [num,chunk_count];

    function count_chunk_num(){
        let id_list=[];
        for(let i=0;i<16;i++){
            for(let j=0;j<32;j++){
                if(map[i][j]<=-100&&!id_list.includes(map[i][j])){
                    id_list.push((id_list[id_list.length-1]||-100)-1);
                    full_chunk([i,j],id_list[id_list.length-1],-100);
                }
            }
        }
        return id_list.length;
    }

    function full_chunk(pos,id=-100,change=0){
        let num=1;
        if(map[pos[0]][pos[1]]==change){
            map[pos[0]][pos[1]]=id;
        }
        if(pos[1]-1>=0&&map[pos[0]][pos[1]-1]==change){
            num+=full_chunk([pos[0],pos[1]-1],id,change);
        }
        if(pos[1]+1<32&&map[pos[0]][pos[1]+1]==change){
            num+=full_chunk([pos[0],pos[1]+1],id,change);
        }
        if(pos[0]-1>=0&&map[pos[0]-1][pos[1]]==change){
            num+=full_chunk([pos[0]-1,pos[1]],id,change);
        }
        if(pos[0]+1<16&&map[pos[0]+1][pos[1]]==change){
            num+=full_chunk([pos[0]+1,pos[1]],id,change);
        }
        return num;
    }
}

function auto_play_apple_dis(map,pos){
    let apple_list=[];
    let apple_dis_min=32+16;
    for(let i=0;i<16;i++){
        for(let j=0;j<32;j++){
            if(-5<map[i][j]&&map[i][j]<0){
                apple_list.push([i,j]);
            }
        }
    }
    for(let i=0;i<apple_list.length;i++){
        const dis=Math.abs(pos[0]-apple_list[i][0])+Math.abs(pos[1]-apple_list[i][1]);
        if(dis<apple_dis_min){
            apple_dis_min=dis;
        }
    }
    return apple_dis_min;
}

function auto_play_next_map(num=1,map,pos,face,score){   //return 1: player1 lost, 2: player2 lost, 3: 2 players lost, 10>: new apple(11: player1 eat, 12: player2 eat, 13: 2player eat)
    map=cloneJSON(map);
    face=cloneJSON(face);
    pos=cloneJSON(pos);
    score=cloneJSON(score);
    let lost=0,apple=10;
    let out=0;
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
            out=3;
        }else{
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
                out=lost;
            }else{
                for(let i=0;i<num;i++){
                    if(map[pos[i][0]][pos[i][1]]<0){
                        apple+=i+1;
                        score[i]++;
                    }
                    map[pos[i][0]][pos[i][1]]=score[i]+base_len+i*1024;
                }
            }
        }
    }else{
        out=lost;
    }
    return [out,map,pos,score,face];
}

function autp_play_find_list_action(num=1,map,face,pos,score,id=0){
    let possible=[],hit=[[],[]];
    if(num==1){
        for(let i=-1;i<=1;i++){
            const temp_data=auto_play_next_map(num,map,pos,[(face[0]+i+4)%4,face[1]],score);
            const space=auto_play_count_space(temp_data[1],temp_data[2][0]);
            if(temp_data[0]!=1){
                possible.push({
                    'action':[i],
                    'space':[space[0]],
                    'chunk_n':[space[1]],
                    'score':[(temp_data[3][0]-score[0])],
                    'apple_dis':[auto_play_apple_dis(temp_data[1],temp_data[2][0])],
                    'stats':temp_data,
                });
            }
        }
    }else if(num==2){
        for(let i=-1;i<=1;i++){
            for(let j=-1;j<=1;j++){
                const temp_data=auto_play_next_map(num,map,pos,[(face[0]+i+4)%4,(face[1]+j+4)%4],score);
                const space=[auto_play_count_space(temp_data[1],temp_data[2][0]),auto_play_count_space(temp_data[1],temp_data[2][1])];
                if(temp_data[0]!=1&&temp_data[0]!=2&&temp_data[0]!=3){
                    possible.push({
                        'action':[i,j],
                        'space':[space[0][0],space[1][0]],
                        'chunk_n':[space[0][1],space[1][1]],
                        'score':[(temp_data[3][0]-score[0]),(temp_data[3][1]-score[1])],
                        'apple_dis':[auto_play_apple_dis(temp_data[1],temp_data[2][0]),auto_play_apple_dis(temp_data[1],temp_data[2][1])],
                        'stats':temp_data,
                    });
                }else if(temp_data[0]==3){
                    hit[0].push(i);
                    hit[1].push(j);
                }
            }
        }
    }
    return [possible,hit];
}

function auto_play_mapRemove(map,n=1){
    map=cloneJSON(map);
    for(let k=0;k<n;k++){
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
    }
    return map;
}

let auto_play_loop_counter=0;
function auto_play_find_best_action(num=1,id=0,other_action=0,n=4,tmap=null,tface=null,tpos=null,tscore=null,nfirst=null){
    if(n>0){
        tmap=tmap||cloneJSON(map);
        tface=tface||cloneJSON(face);
        tpos=tpos||cloneJSON(pos);
        tscore=tscore||cloneJSON(score);
        const list=autp_play_find_list_action(num,tmap,tface,tpos,tscore,id);
        let max_score=-(Infinity);
        let action=0;
        let index=-1;
        for(let j=0;j<2;j++){
            for(let i=0;i<list[0].length;i++){
                if(num==1||j>0||!list[1][id].includes(list[0][i]['action'][id])){
                    if(num==1||(other_action>10||list[0][i]['action'][(id+1)%2]==other_action)){
                        let canLeave=0;
                        if(list[0][i]['chunk_n'][id]>1){
                            const n=list[0][i]['chunk_n'][id];
                            if(auto_play_count_space(auto_play_mapRemove(list[0][i]['stats'][1],list[0][i]['space'][id]-1),list[0][i]['stats'][2][id])[id][1]>=n){
                                canLeave=-50000;
                            }
                        }
                        const next_score=auto_play_find_best_action(num,id,99,n-1,list[0][i]['stats'][1],list[0][i]['stats'][4],list[0][i]['stats'][2],list[0][i]['stats'][3],true);
                        const temp=canLeave+(list[0][i]['space'][id]-list[0][i]['chunk_n'][id]*100-list[0][i]['apple_dis'][id]*2*(Math.max((auto_play_loop_counter-(32*16)),1))+list[0][i]['score'][id]*500)+0.5*next_score[1];
                        if(temp>max_score){
                            max_score=temp;
                            action=list[0][i]['action'][id];
                            index=i;
                        }
                    }
                }
            }
            if(index>=0){
                break;
            }
        }
        if(!nfirst){
            auto_play_loop_counter++;
            if(index>=0&&list[0][index]['score'][id]>0){
                auto_play_loop_counter=0;
            }
        }
        return [action,max_score];
    }
    return [0,0];
}