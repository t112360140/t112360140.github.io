class autoPlay{
    
    state_size=input_size;
    epsilon=0;
    useAI=false;
    num=1;
    id=1;
    
    constructor(){
        
    }
    
    async loadModel(json,weights){
        this.model=await tf.loadLayersModel(tf.io.browserFiles([json, weights]));
    }
    
    async loadModelUrl(url){
        this.model=await tf.loadLayersModel(url);
    }

    set_player_num(num){
        this.num=num;
    }
    set_player_ID(id){
        this.id=id;
    }
    
    get_qs(state) {
        return tf.tidy(() => {return this.model.predict(state).dataSync();});
    }

    best_state(states) {

        // tf.util.shuffle(states);

        if (Math.random() <= this.epsilon) {
            const i=getRandom(0,(states.length-1));
            return [states[i][1],states[i][0]];
        }else{
            let temp=[[],[]];
            for(let i=0;i<states.length;i++){
                temp[0].push(states[i][1]);
                let temp1=[];
                for(let j=0;j<states[i][2].length;j++){
                    temp1.push(states[i][2][j][1]);
                }
                temp[1].push(temp1);
            }
            if(temp[0][0]!=undefined){
                let score=this.get_qs(tf.tidy(()=>{return tf.tensor(temp[0]);}));
                for(let i=0;i<score.length;i++){
                    let max_score=0;
                    if(temp[1][i][0]!=undefined&&next_rate>0){
                        let tscore=this.get_qs(tf.tidy(()=>{return tf.tensor(temp[1][i]);}));
                        for(let j=0;j<tscore.length;j++){
                            if(tscore[j]>max_score){
                                max_score=tscore[j];
                            }
                        }
                    }
                    score[i]=score[i]+max_score*(next_rate);
                }
                let max_score=0;
                let max_index=0;
                for(let i=0;i<score.length;i++){
                    if(score[i]>max_score){
                        max_score=score[i];
                        max_index=i;
                    }
                }
                return [states[max_index][1],states[max_index][0]];
            }else{
                return;
            }
        }
    }

    nextAction(states){
        // let temp=[];
        // for(let i=0;i<states.length;i++){
        //     temp.push(states[i][1]);
        // }
        
        // let bestState=this.best_state(temp);
        let bestState=this.best_state(states);
        if(states[0]==undefined){
            return null;
        }else{
            // return (states[bestState[1]][0]);
            return (bestState[1]);
        }
    }

    getNextStatus(tMap,tPos,n){
        tMap=tMap?cloneJSON(tMap):cloneJSON(map);
        tPos=tPos?cloneJSON(tPos):cloneJSON(pos);
        let tFace=this.face;
        let tScore=this.score;
        let lastScore=0;
        let out=[];
        for(let i=0;i<4;i++){
            lastScore=this.score;
            if(this.setFace(i)){
                if(this.next()){
                    const area=this.getArea();
                    const range=this.getRange();
                    if(n!=undefined){
                        out.push([i,[(this.score+this.long),(this.score-lastScore)?0:this.getdic(),area[0],area[1],this.getTail()]]);
                    }else{
                        let nnext=this.getNextStatus(this.map,this.pos,i);
                        if((this.score-lastScore)){
                            for(let j=0;j<nnext.length;j++){
                                nnext[j][1][1]=this.height+this.width;
                            }
                        }
                        out.push([i,[(this.score+this.long),(this.score-lastScore)?0:this.getdic(),area[0],area[1],this.getTail()],nnext]);
                    }
                }
            }
            this.map=cloneJSON(tMap);
            this.pos=cloneJSON(tPos);
            this.face=tFace;
            this.score=tScore;
        }
        return out;
    }
    
    next_map(map,pos,face){   //return 1: player1 lost, 2: player2 lost, 3: 2 players lost, 4: full map, 10>: new apple(11: player1 eat, 12: player2 eat, 13: 2player eat)
        let lost=0,apple=10;
        map=cloneJSON(map);
        pos=cloneJSON(pos);
        face=cloneJSON(face);
        score=[0,0];
        for(let i=0;i<this.num;i++){
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
            if(pos[0][0]==pos[1][0]&&pos[0][1]==pos[1][1]&&this.num>=2){
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
            for(let i=0;i<this.num;i++){
                if(map[pos[i][0]][pos[i][1]]>0){
                    lost+=i+1;
                }
            }
            if(lost>0){
                return lost;
            }
            for(let i=0;i<this.num;i++){
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
}


function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min+1) + min);
}
