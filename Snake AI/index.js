
var scores = [];
var logs=[];
var saveModel=false;
var stopTrain=false;

const next_rate=0.01;
const input_size=5

async function TrainModel(model,config){
    let env = config["env"]!=null?config["env"]:Snake_list[0];
    let episodes = config["episodes"]!=null?config["episodes"]:5000;
    let max_steps = config["max_steps"]!=null?config["max_steps"]:5000000;
    let discount = config["discount"]!=null?config["discount"]:0.98;
    let replay_mem_size = config["replay_mem_size"]!=null?config["replay_mem_size"]:max_steps;
    let minibatch_size = config["minibatch_size"]!=null?config["minibatch_size"]:8192;
    let epsilon = config["epsilon"]!=null?config["epsilon"]:1;
    let epsilon_min = config["epsilon_min"]!=null?config["epsilon_min"]:0;
    let epsilon_stop_episode = config["epsilon_stop_episode"]!=null?config["epsilon_stop_episode"]:4500;
    let learning_rate = config["learning_rate"]!=null?config["learning_rate"]:1e-2;
    let epochs = config["epochs"]!=null?config["epochs"]:1;
    let show_every = config["show_every"]!=null?config["show_every"]:50;
    let replay_start_size = config["replay_start_size"]!=null?config["replay_start_size"]:8192;
    let hidden_dims = config["hidden_dims"]!=null?config["hidden_dims"]:[64, 64];
    let activations = config["activations"]!=null?config["activations"]:['relu', 'relu', 'linear'];

    const min_score=config["min_score"]!=null?config["min_score"]:300;
    const output_model=config["output_model"]!=null?config["output_model"]:null;

    let BMin=config["BMin"]!=null?config["BMin"]:30;
    let BMax=config["BMax"]!=null?config["BMax"]:100;
    const Bstart=config["Bstart"]!=null?config["Bstart"]:episodes-epsilon_stop_episode;
    const Bstop=config["Bstop"]!=null?config["Bstop"]:epsilon_stop_episode;
    const Bstep_add=config["Bstep_add"]!=null?config["Bstep_add"]:(BMax-BMin)/(Bstop-Bstart);

    let agent =new DQN(input_size, discount, replay_mem_size, minibatch_size, epsilon,epsilon_stop_episode, epsilon_min,  learning_rate,'meanSquaredError',tf.train.adam(learning_rate), hidden_dims, activations, replay_start_size, model);

    scores = [];
    logs=[];
    let score=[0,0,0,Infinity];
    
    stopTrain=false;
    saveModel=false;
    
    for(let episode=0;episode<episodes;episode++){
        let current_state = env.reset();
        env.isStart=true;
        let done=false;
        let step=0;
        let Bstep=BMin;
        // let Bstep=(env.score+env.long)+(env.height+env.width);
        env.print=false;

        if(show_every&&(episode%show_every)==0){
            env.print=true;
        }

        while(!done&&(!max_steps||step<max_steps)){
            const next_states=env.getNextStatus();
            // let temp=[];
            // for(let i=0;i<next_states.length;i++){
            //     temp[i]=next_states[i][1];
            // }
            // if(temp[0]==undefined){
            //     agent.update_replay_memory(current_state, 0, current_state, -15, true);
            //     break;
            // }
            // const best_state=agent.best_state(temp);
            // let best_index=best_state[1];
            // let best_action = next_states[best_index][0];

            if(next_states[0]==undefined){
                agent.update_replay_memory(current_state, 0, current_state, -15, true);
                break;
            }
            const best_state=agent.best_state(next_states);
            let best_nstate=best_state[0];
            let best_action =best_state[1];

            const ret=env.play_game(best_action);
            done=(ret["status"]=='Game Over');
            let reward=(5*(Bstep/BMin)+ret["score"]*10);//(Bstep/BMin)    (1+(ret["score"]*(1+(env.score+env.long)/(env.height*env.width)))*10);
            if(ret["score"]>0){
                Bstep=BMin;
                // Bstep=((episode>Bstart?(BMax-BMin)*((1-agent.epsilon)**3):0)+BMin);//(env.score+env.long)/2+
            }
            Bstep--;
            if(done){
                reward=-15;
                // reward-=10*(2-BMin/BMax); 
                // reward-=10*(1.5-(env.score+env.long)/(env.height*env.width));
            }else if(Bstep<0){
                done=true;
                reward-=10;
            }

            if(env.print){
                env.paint();
                // await tf.nextFrame();
            }

            // agent.update_replay_memory(current_state, best_action, next_states[best_index][1], reward, done);
            agent.update_replay_memory(current_state, best_action, best_nstate, reward, done);
            // await agent.train(current_state,next_states[best_index][1],reward,epochs);
            current_state = best_nstate;
            step++;
        }

        if((BMin+Bstep_add)<=BMax){
            if(episode>Bstart){
                BMin+=Bstep_add;
            }
        }else{
            BMin=BMax;
        }
        
        score[0]++;
        score[1]+=env.score;
        if(env.score>score[2]){
            score[2]=env.score;
        }
        if(env.score<score[3]){
            score[3]=env.score;
        }
        if(env.print){
            console.log("Episode "+episode+"  score: "+env.score+"  epsilon: "+Math.round(agent.epsilon*100)/100+" BMin: "+Math.round(BMin*100)/100);
            // console.log("Episode "+episode+"  score: "+env.score+"  epsilon: "+Math.round(agent.epsilon*100)/100+" BMin: "+Math.round(((episode>Bstart?(BMax-BMin)*((1-agent.epsilon)**3):0)+BMin)*100)/100);

            console.log("Ave:"+(score[1]/score[0])+" Max:"+(score[2])+" Min:"+(score[3]));
            score=[0,0,0,Infinity];
        }

        scores.push(env.score);
        logs.push({"E":episode,"S":env.score,"e":Math.round(agent.epsilon*100)/100});

        await agent.train(epochs);
        // agent.setEpsilon();

        if(env.score>=min_score||saveModel||(output_model&&episode==output_model)){
            await agent.model.save("downloads://model");
            saveModel=false;
        }
        if(stopTrain){
            break;
        }
    }

    await agent.model.save("downloads://model");
}


class DQN {
    constructor(state_size = 4, discount = 0.98, replay_mem_size = 20000,
        minibatch_size = 512, epsilon = 1,
        epsilon_stop_episode = 1500, epsilon_min = 1e-3,
        learning_rate = 1e-3, loss = 'meanSquaredError',
        optimizer = tf.train.adam(1e-3), hidden_dims = [64, 64],
        activations = ['relu', 'relu', 'linear'],
        replay_start_size = null, model=null) {
        this.state_size = state_size;
        this.discount = discount;
        this.memory = new ReplayMemory(replay_mem_size);
        this.minibatch_size = minibatch_size;
        this.epsilon = epsilon;
        this.epsilon_min = epsilon_min;
        this.epsilon_decay = (this.epsilon - this.epsilon_min) / epsilon_stop_episode;
        this.learning_rate = learning_rate;
        this.loss = loss;
        this.optimizer = optimizer;
        this.hidden_dims = hidden_dims;
        this.activations = activations;
        if(replay_start_size==null){
            replay_start_size = replay_mem_size / 2
        }
        this.replay_start_size = replay_start_size

        if(model==null){
            this.model = this.createModel();
        }else{
            this.model=model;
        }
    }

    createModel() {
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: this.hidden_dims[0], inputShape: this.state_size, activation: this.activations[0]}));
        for (let i = 1; i < this.activations; i++) {
            model.add(tf.layers.dense({ units: this.hidden_dims[i], activation: this.activations[i] }));
        }
        model.add(tf.layers.dense({ units: 1, activation: this.activations[this.activations.length - 1] }));

        model.compile({optimizer:this.optimizer, loss:this.loss})

        return model;
    }

    update_replay_memory(current_state, action, next_state, reward, done){
        this.memory.append([current_state, action, next_state, reward, done]);
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
        }
    }

    async train(epochs=3){
        if(this.memory.len()<this.replay_start_size||this.memory.len()<this.minibatch_size){
            return;
        }

        let minibatch = this.memory.sample(this.minibatch_size);
        let next_states=[];
        for(let i=0;i<minibatch.length;i++){
            next_states.push(minibatch[i][2]);
        }

        let temp=tf.tidy(() => {return this.model.predict(tf.tensor(next_states)).dataSync();});
        let next_qs=[];
        for(let i=0;i<temp.length;i++){
            next_qs[i]=temp[i];
        }

        let x=[];
        let y=[];

        for(let i=0;i<minibatch.length;i++){
            let new_q=minibatch[i][3];
            if(!minibatch[i][4]){
                new_q=minibatch[i][3]+this.discount*next_qs[i];
            }

            x.push(minibatch[i][0]);
            y.push(new_q);
        }
        // console.log(x,y)
        await this.model.fit(tf.tensor(x), tf.tensor(y), {batch_size:this.minibatch_size, epochs:epochs, verbose:0});

        if (this.epsilon > this.epsilon_min){
            this.epsilon -= this.epsilon_decay;
        }
    }
}

class ReplayMemory {
    constructor(maxLen) {
        this.maxLen = maxLen;
        this.buffer = [];
        for (let i = 0; i < maxLen; ++i) {
            this.buffer.push(null);
        }
        this.index = 0;
        this.length = 0;

        this.bufferIndices_ = [];
        for (let i = 0; i < maxLen; ++i) {
            this.bufferIndices_.push(i);
        }
    }

    append(item) {
        this.buffer[this.index] = item;
        this.length = Math.min(this.length + 1, this.maxLen);
        this.index = (this.index + 1) % this.maxLen;
    }

    len(){
        let num=0;
        for(let i=0;i<this.maxLen;i++){
            if(this.buffer[i]!=null){
                num++;
            }
        }
        return num;
    }

    sample(batchSize) {
        if (batchSize > this.maxLen) {
            throw new Error(
                `batchSize (${batchSize}) exceeds buffer length (${this.maxLen})`);
        }

        tf.util.shuffle(this.bufferIndices_);

        const out = [];
        let i=0;
        let n=0;
        while(i < batchSize){
            if(this.buffer[this.bufferIndices_[n]]!=null){
                out.push(this.buffer[this.bufferIndices_[n]]);
                i++;
            }
            n++;
        }
        return out;
    }
}

class autoPlay{
    
    state_size=input_size;
    epsilon=0;
    useAI=false;
    
    constructor(game){
        this.game=game;
    }
    
    async loadModel(json,weights){
        this.model=await tf.loadLayersModel(tf.io.browserFiles([json, weights]));
    }
    
    async loadModelUrl(url){
        this.model=await tf.loadLayersModel(url);
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
}


function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min+1) + min);
}
