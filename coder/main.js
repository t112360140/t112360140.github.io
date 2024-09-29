const lines_text=document.getElementById('lines');
const error_text=document.getElementById('error');
const error_count=document.getElementById('error_count');
const code_text=document.getElementById('code');
const encode_text=document.getElementById('encode');

const h_lines_text=document.getElementById('h_lines');
const h_error_text=document.getElementById('h_error');
const h_code_text=document.getElementById('h_code');

const bit=12;
const syntax=['reset','address','write','read','add','shift','goto','com','logic','daddress'];
const limit=[[1,0],[2**bit,0],[2**bit,0],[4,0],[1,0],[5,0],[2**bit,0],[4,0],[5,0],[1,0],]

code_text.addEventListener('scroll',()=>{
    lines_text.scrollTop=code_text.scrollTop;
    error_text.scrollTop=code_text.scrollTop;
});

code_text.addEventListener('input',()=>{
    set_number();
    compile();
});

h_code_text.addEventListener('scroll',()=>{
    h_lines_text.scrollTop=h_code_text.scrollTop;
    h_error_text.scrollTop=h_code_text.scrollTop;
});

h_code_text.addEventListener('input',()=>{
    h_set_number();
    h_compile();
});

window.addEventListener('keydown',(e)=>{
    if(e.ctrlKey){
        if(e.code=='KeyS'){
            const text=JSON.stringify({'HLPL':h_code_text.value,'ASL':code_text.value});
            let blob = new Blob([text],{type:'text/plain'});
            let link=document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download='code.txt';
            link.click();
            e.preventDefault(); 
            return false;
        }
    }
});

function load_code(){
    const file_uplad=document.createElement('input');
    file_uplad.type='file';
    file_uplad.addEventListener('change',(e)=>{
        const input = e.target
        if ('files' in input&&input.files.length>0) {
            const reader=new FileReader();
            reader.onload=e=>{
                const content=JSON.parse(e.target.result);
                if(content['HLPL']&&content['HLPL']!=''){
                    h_code_text.value=content['HLPL'];
                    h_compile();
                    h_set_number();
                }else if(content['ASL']&&content['ASL']!=''){
                    code_text.value=content['ASL'];
                    compile();
                    set_number();
                }
            }
            reader.readAsText(input.files[0]);
        }
    });
    file_uplad.click();
}

function set_number(){
    lines.value='';
    let line_context=code_text.value.split('\n');
    if(line_context[line_context.length-1]!=''){
        line_context.push('');
    }
    let k=0;
    for(let i=0;i<line_context.length;i++){
        if((line_context[i].split(/\/\/|#/g)[0]&&line_context[i].split(/\/\/|#/g)[0]!='')||i>=line_context.length-1){
            let space='';
            if(k<10){
                space+=' ';
            }
            if(k<100){
                space+=' ';
            }
            lines.value+=space+k+'\n';
            k++;
        }else{
            lines.value+='\n';
        }
    }
}
set_number();

function print_error(err){
    let max_long=0;
    let output=''
    let error_counter=0;
    for(let i=0;i<err.length;i++){
        if(err[i].length>max_long){
            max_long=err[i].length;
        }
        if(err[i]){
            error_counter++;
        }
        output+=err[i]+'\n';
    }
    error_text.cols=((max_long>3)?(max_long):3);
    error_text.value=output;
    error_count.value='';
    if(error_counter){
        error_count.value='There are '+error_counter+' errors!';
    }
}

function cut_string(str='',max=6){
    str=str.toString();
    if(str.length>max){
        str=str.slice(0,max-2);
        str+='..';
    }
    return str;
}

function compile(){
    let output='';
    let code=code_text.value.split('\n');
    let error=[];
    let const_var={};
    let k=0;
    for(let i=0;i<code.length;i++){
        error.push('');
        code[i]=code[i].replace(/^\s+/g,'').split('//')[0];
        if(code[i]!=''){
            if(code[i].slice(0,1)=='#'){
                let cut=code[i].replaceAll('#','').replaceAll(/\s+/g,'').split('=');
                if(const_var[cut[0]]==null&&cut[0]!=''){
                    if(isNaN(Number(cut[0]))){
                        const_var[cut[0]]=0;
                    }else{
                        error[i]='"'+cut_string(cut[0])+'" cannot be used as a variable name!';
                    }
                }
                if(cut[1]&&cut[1]!=''){
                    let num=Number(cut[1]);
                    if(cut[1].slice(0,2)=='0b'){
                        num=parseInt(cut[1].slice(2,cut[1].length),2);
                    }else if(cut[1].slice(0,2)=='0x'){
                        num=parseInt(cut[1].slice(2,cut[1].length),16);
                    }else if(cut[1].slice(0,2)=='0o'){
                        num=parseInt(cut[1].slice(2,cut[1].length),8);
                    }
                    if(isNaN(num)){
                        error[i]='"'+cut[1]+'" is not a number!';
                    }else if(!((2**bit)>num&&num>=0)){
                        error[i]='The number '+cut_string(cut[1])+'('+cut_string(num)+') is out of range!';
                    }else{
                        const_var[cut[0]]=num;
                    }
                }
            }else if(i>=(2**bit)){
                error[i]='Too many command!';
            }else{
                let cut=code[i].replaceAll(/\s+/g,' ').replace(' ',',').split(',');
                if(syntax.indexOf(cut[0])>=0){
                    if(!cut[1]){
                        cut[1]='0';
                    }
                    cut[1]=cut[1].replaceAll(' ','');
                    let num=Number(cut[1]);
                    if(const_var[cut[1]]!=null){
                        num=const_var[cut[1]];
                    }else{
                        if(cut[1].slice(0,2)=='0b'){
                            num=parseInt(cut[1].slice(2,cut[1].length),2);
                        }else if(cut[1].slice(0,2)=='0x'){
                            num=parseInt(cut[1].slice(2,cut[1].length),16);
                        }else if(cut[1].slice(0,2)=='0o'){
                            num=parseInt(cut[1].slice(2,cut[1].length),8);
                        }
                        if(isNaN(num)){
                            error[i]='"'+cut[1]+'" is not a number!';
                            num=0;
                        }
                        if(!(limit[syntax.indexOf(cut[0])][0]>num&&num>=limit[syntax.indexOf(cut[0])][1])){
                            error[i]='The number '+cut_string(cut[1])+'('+cut_string(num)+') is out of range!';
                            num=0;
                        }
                    }
                    code[i]=syntax.indexOf(cut[0])*(2**(bit))+num;
                }else{
                    if(cut[0].length>0){
                        error[i]=cut_string(cut[0])+' is not a command!';
                    }
                    code[i]=0;
                }
                if(k%8==0){
                    if(k>0){
                        output+='\n';
                    }
                    output+=k+': ';
                }
                output+=code[i]+' ';
                k++;
            }
        }
    }
    encode_text.value=output;
    print_error(error);
}

function h_set_number(){
    h_lines.value='';
    let h_line_context=h_code_text.value.split('\n');
    for(let i=0;i<h_line_context.length+1;i++){
            let space='';
            if((i+1)<10){
                space+=' ';
            }
            if((i+1)<100){
                space+=' ';
            }
            h_lines.value+=space+(i+1)+'\n';
    }
}
h_set_number();

function h_print_error(err){
    let max_long=0;
    let output=''
    for(let i=0;i<err.length;i++){
        if(err[i].length>max_long){
            max_long=err[i].length;
        }
        output+=err[i]+'\n';
    }
    h_error_text.cols=((max_long>3)?(max_long):3);
    h_error_text.value=output;
}

function h_compile(){
    h_code_text.value=h_code_text.value.replaceAll(/;(?=[^\n]|(?=\S))/g,';\n');
    h_set_number();
    let code=h_code_text.value.replaceAll(';','').split(/[\n]/g);
    let goto_list=[];
    let var_list=[];
    let encode_code=[];
    let error=[];
    let var_head='';
    for(let i=0;i<code.length;i++){
        let output='';
        error.push('');
        if(code[i]!=''){
            let cut=code[i].replace(/^\s+/g,'').replaceAll(/\s+/g,' ').split('//')[0].replace(' ','#').split('#');
            switch(cut[0]){
                case 'let':
                    if(!cut[1]){
                        break;
                    }
                    if(cut[1].includes(',')){
                        error[i]='One time one variable!';
                        break;
                    }
                    cut[1]=cut[1].split('=');
                    if(!cut[1][0]){
                        break;
                    }
                    if(!isNaN(Number(cut[1][0]))){
                        error[i]='"'+cut_string(cut[1][0])+'" cannot be used as a variable name!';
                        break;
                    }
                    if(!var_list.includes(cut[1][0])){
                        if(var_list.length>=(2**bit-1)){
                            error[i]='Too many variables!';
                            break;
                        }else{
                            var_list.push(cut[1][0]);
                        }
                    }
                    if(!cut[1][1]){
                        break;
                    }
                    if(/[+-]|<<|>>/.test(cut[1][1])){
                        output+=count(cut[1][0]+'='+cut[1][1]);
                        encode_code=encode_code.concat(output.split('\n').filter(e=>e!=''));
                        break;
                    }
                    let num=Number(cut[1][1]);
                    if(cut[1][1]){
                        if(cut[1][1].slice(0,2)=='0b'){
                            num=parseInt(cut[1][1].slice(2,cut[1][1].length),2);
                        }else if(cut[1][1].slice(0,2)=='0x'){
                            num=parseInt(cut[1][1].slice(2,cut[1][1].length),16);
                        }else if(cut[1][1].slice(0,2)=='0o'){
                            num=parseInt(cut[1][1].slice(2,cut[1][1].length),8);
                        }
                    }
                    if(isNaN(num)){
                        if(!var_list.includes(cut[1][1])){
                            error[i]='"'+cut_string(cut[1][1])+'" is not a variable!';
                        }else if(cut[1][0]==cut[1][1]){
                            error[i]='Cannot set value to self!';
                        }else{
                            output+='address '+var_list.indexOf(cut[1][1])+'\nread 0\naddress '+var_list.indexOf(cut[1][0])+'\nlogic 3\nread 0\nlogic 3';
                            encode_code=encode_code.concat(output.split('\n').filter(e=>e!=''));
                        }
                        break;
                    }
                    if(!(2**bit>num&&num>=0)){
                        error[i]='The number '+cut_string(cut[1][1])+'('+cut_string(num)+') is out of range!';
                        break;
                    }
                    output+='address '+var_list.indexOf(cut[1][0])+'\nwrite '+num;
                    encode_code=encode_code.concat(output.split('\n').filter(e=>e!=''));
                    break;
                case 'if':
                    if(/[>=<]/.test(cut[1])){

                    }
                    break;
                case 'end_if':
                    if(goto_list[goto_list.length-1]){
                        if(goto_list[goto_list.length-1]['c']!='if'){
                            error[i]='Wrong correspondence: '+ goto_list[goto_list.length-1]['c'];
                            break;
                        }
                        encode_code[goto_list[goto_list.length-1]['p']]='goto '+encode_code.length;
                        goto_list.pop();
                    }else{
                        error[i]='Wrong correspondence!';
                    }
                    break;
                default:
                    if(var_list.includes(cut[0].split('=')[0])&&cut[0].includes('=')){
                        output+=count(cut[0]);
                        encode_code=encode_code.concat(output.split('\n').filter(e=>e!=''));
                        break;
                    }
                    error[i]='Unknow command!';
                    break;
            }
        }
        function count(str){
            let output='';
            let first_num=null;
            if(!str.includes('=')){
                return '';
            }
            let cut=str.split('=');
            if(!var_list.includes(cut[0])){
                error[i]='Cannot find variable +"'+cut[0]+'"';
                return '';
            }
            cut[1]=cut[1].split(/[+-]|<<|>>/g);
            if(!cut[1][0]){
                error[i]='The first position has no value!';
                return '';
            }
            if(var_list.includes(cut[1][0])){
                output+='address '+var_list.indexOf(cut[1][0])+'\nread 0\n';
            }else{
                let num=Number(cut[1][0]);
                if(cut[1][0]){
                    if(cut[1][0].slice(0,2)=='0b'){
                        num=parseInt(cut[1][0].slice(2,cut[1][0].length),2);
                    }else if(cut[1][0].slice(0,2)=='0x'){
                        num=parseInt(cut[1][0].slice(2,cut[1][0].length),16);
                    }else if(cut[1][0].slice(0,2)=='0o'){
                        num=parseInt(cut[1][0].slice(2,cut[1][0].length),8);
                    }
                }
                if(isNaN(num)){
                    error[i]='"'+cut[1][0]+'" is not a number!';
                    return '';
                }
                if(!(2**bit>num&&num>=0)){
                    error[i]='The number '+cut_string(cut[1][0])+'('+cut_string(num)+') is out of range!';
                    return '';
                }
                first_num=num;
                if(/[+-]|<<|>>/.test(str)){
                    output+='address '+(2**bit-1)+'\nwrite '+num+'\nread 0\n';
                }else{
                    output+='address '+var_list.indexOf(cut[0])+'\nwrite '+num;
                    return output;
                }
            }
            if(str.includes('+')){
                if(!cut[1][1]){
                    error[i]='The second position has no value!';
                    return '';
                }
                if(var_list.includes(cut[1][1])){
                    if(cut[1][0]!=cut[1][1]){
                        output+='address '+var_list.indexOf(cut[1][1])+'\n';
                    }
                    output+='read 1\naddress '+var_list.indexOf(cut[0])+'\nadd';
                }else{
                    let num=Number(cut[1][1]);
                    if(cut[1][1]){
                        if(cut[1][1].slice(0,2)=='0b'){
                            num=parseInt(cut[1][1].slice(2,cut[1][1].length),2);
                        }else if(cut[1][1].slice(0,2)=='0x'){
                            num=parseInt(cut[1][1].slice(2,cut[1][1].length),16);
                        }else if(cut[1][1].slice(0,2)=='0o'){
                            num=parseInt(cut[1][1].slice(2,cut[1][1].length),8);
                        }
                    }
                    if(isNaN(num)){
                        error[i]='"'+cut[1][1]+'" is not a number!';
                        return '';
                    }
                    if(!(2**bit>num&&num>=0)){
                        error[i]='The number '+cut_string(cut[1][1])+'('+cut_string(num)+') is out of range!';
                        return '';
                    }
                    if(first_num!=null){
                        output='address '+var_list.indexOf(cut[0])+'\nwrite '+((first_num+num)&(2**bit-1)).toString();
                    }else{
                        output+='address '+(2**bit-1)+'\nwrite '+num+'\nread 1\naddress '+var_list.indexOf(cut[0])+'\nadd';
                    }
                }
            }else if(str.includes('-')){
                if(!cut[1][1]){
                    error[i]='The second position has no value!';
                    return '';
                }
                if(var_list.includes(cut[1][1])){
                    if(cut[1][0]!=cut[1][1]){
                        outut+='address '+var_list.indexOf(cut[1][1])+'\n';
                    }
                    output+='read 1\naddress '+(2**bit-1)+'\nlogic 3\n read 0\naddress '+var_list.indexOf(cut[0])+'\nadd\nread 0\n logic 3';
                }else{
                    let num=Number(cut[1][1]);
                    if(cut[1][1]){
                        if(cut[1][1].slice(0,2)=='0b'){
                            num=parseInt(cut[1][1].slice(2,cut[1][1].length),2);
                        }else if(cut[1][1].slice(0,2)=='0x'){
                            num=parseInt(cut[1][1].slice(2,cut[1][1].length),16);
                        }else if(cut[1][1].slice(0,2)=='0o'){
                            num=parseInt(cut[1][1].slice(2,cut[1][1].length),8);
                        }
                    }
                    if(isNaN(num)){
                        error[i]='"'+cut[1][1]+'" is not a number!';
                        return '';
                    }
                    if(!(2**bit>num&&num>=0)){
                        error[i]='The number '+cut_string(cut[1][1])+'('+cut_string(num)+') is out of range!';
                        return '';
                    }
                    if(first_num!=null){
                        output='address '+var_list.indexOf(cut[0])+'\nwrite '+((first_num-num)&(2**bit-1)).toString();
                    }else{
                        output+='address '+(2**bit-1)+'\nwrite '+((~num)&(2**bit-1)).toString()+'\nread 1\naddress '+var_list.indexOf(cut[0])+'\nadd';
                    }    
                }
            }else if(str.includes('<<')){
                output+='address '+var_list.indexOf(cut[0])+'\n';
                if(cut[1][1]=='1'){
                    output+='shift 2';
                }else{
                    output+='shift 0';
                }
            }else if(str.includes('>>')){
                output+='address '+var_list.indexOf(cut[0])+'\n';
                if(cut[1][1]=='1'){
                    output+='shift 3';
                }else{
                    output+='shift 1';
                }
            }else{
                if(cut[0]!=cut[1][1]){
                    output+='address '+var_list.indexOf(cut[0])+'\nlogic 3\nread 0\nlogic 3';
                }else{
                    output='';
                }
            }
            return output;
        }
    }
    h_print_error(error);
    code_text.value=encode_code.toString().replaceAll(',','\n');
    set_number();
    compile();
}
