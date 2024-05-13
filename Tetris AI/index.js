
var scores = [];
var logs=[];
var saveModel=false;
var stopTrain=false;

async function TrainModel(model,config){
    let env = config["env"]!=null?config["env"]:Tetris_list[0];
    let episodes = config["episodes"]!=null?config["episodes"]:2000;
    let max_steps = config["max_steps"]!=null?config["max_steps"]:50000;
    let discount = config["discount"]!=null?config["discount"]:0.99;
    let replay_mem_size = config["replay_mem_size"]!=null?config["replay_mem_size"]:20000;
    let minibatch_size = config["minibatch_size"]!=null?config["minibatch_size"]:512;
    let epsilon = config["epsilon"]!=null?config["epsilon"]:1;
    let epsilon_min = config["epsilon_min"]!=null?config["epsilon_min"]:0;
    let epsilon_stop_episode = config["epsilon_stop_episode"]!=null?config["epsilon_stop_episode"]:2000;
    let learning_rate = config["learning_rate"]!=null?config["learning_rate"]:1e-2;
    let epochs = config["epochs"]!=null?config["epochs"]:1;
    let show_every = config["show_every"]!=null?config["show_every"]:50;
    let replay_start_size = config["replay_start_size"]!=null?config["replay_start_size"]:2000;
    let hidden_dims = config["hidden_dims"]!=null?config["hidden_dims"]:[64, 64];
    let activations = config["activations"]!=null?config["activations"]:['relu', 'relu', 'linear'];

    const min_score=config["min_score"]!=null?config["min_score"]:10000;
    const output_model=config["output_model"]!=null?config["output_model"]:null;

    let agent =new DQN(4, discount, replay_mem_size, minibatch_size, epsilon,epsilon_stop_episode, epsilon_min,  learning_rate,'meanSquaredError',tf.train.adam(learning_rate), hidden_dims, activations, replay_start_size, model);

    scores = [];
    logs=[];
    let score=[0,0,0,Infinity];
    
    stopTrain=false;
    saveModel=false;
    
    for(let episode=0;episode<episodes;episode++){
        let current_state = env.reset();
        env.newRandShape();
        env.isStart=true;
        let done=false;
        let step=0;
        env.print=false;

        if(show_every&&(episode%show_every)==0){
            env.print=true;
        }

        while(!done&&(!max_steps||step<max_steps)){
            const next_states=env.getNextStatus();
            let temp=[];
            for(let i=0;i<next_states.length;i++){
                temp[i]=next_states[i][1];
            }
            const best_state=agent.best_state(temp);

            let best_index=best_state[1];
            let best_action = next_states[best_index][0];

            const ret=env.play_game(best_action);
            done=(ret["status"]=='Game Over');
            let reward=(1+ret["line"]*ret["line"]*env.width);

            if(env.print){
                await env.paint();
            }

            agent.update_replay_memory(current_state, best_action, next_states[best_index][1], reward, done);
            current_state = next_states[best_index][1];
            step++;
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
            console.log("Episode "+episode+"  score: "+env.score+"  epsilon: "+Math.round(agent.epsilon*100)/100);
            
            console.log("Ave:"+(score[1]/score[0])+" Max:"+(score[2])+" Min:"+(score[3]));
            score=[0,0,0,Infinity];
        }

        scores.push(env.score);
        logs.push({"E":episode,"S":env.score,"e":Math.round(agent.epsilon*100)/100});
        
        await agent.train(epochs);

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
        return tf.tidy(() => {return this.model.predict(state).dataSync()[0];});
    }

    best_state(states) {
        let max_value = null;
        let best_state = null;

        if (Math.random() <= this.epsilon) {
            const i=getRandom(0,(states.length-1));
            return [states[i],i];
        }else{
            let n=null
            for(let i=0;i<states.length;i++){
                const value=this.get_qs(tf.tidy(()=>{return tf.reshape(states[i],[1,this.state_size]);}));
                if(max_value==null||max_value<value){
                    max_value=value;
                    best_state=states[i];
                    n=i;
                }
            }
            return [best_state,n];
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
    
    state_size=4;
    
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
        return tf.tidy(() => {return this.model.predict(state).dataSync()[0];});
    }
    
    best_state(states) {
        let max_value = null;
        let best_state = null;
        let n=null;
        
        for(let i=0;i<states.length;i++){
            const value=this.get_qs(tf.tidy(()=>{return tf.reshape(states[i],[1,this.state_size]);}));
            if(max_value==null||max_value<value){
                max_value=value;
                best_state=states[i];
                n=i;
            }
        }
        return [best_state,n];
    }
    
    nextAction(states){
        let temp=[];
        for(let i=0;i<states.length;i++){
            temp.push(states[i][1]);
        }
        
        let bestState=this.best_state(temp);
        return (states[bestState[1]][0]);
    }
}


function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min+1) + min);
}
