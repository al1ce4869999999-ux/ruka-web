"use strict";
(() => {
 const byId=id=>document.getElementById(id);
 const keyInput=byId("apiKey"),go=byId("generateNovel"),output=byId("novelOutput"),status=byId("novelStatus"),copy=byId("copyNovel"),rating=byId("novelFeedback");
 let generated="",controller=null;
 const escapeValue=v=>typeof v==="string"?v.trim():"";
 function buildWritingTask({plot,facts,avoid,style,features,structure}){
   if(!plot)throw new Error("プロットを入力してください。");
   const avg=Number.isFinite(features?.average)?features.average:null;
   const ratio=Number.isFinite(features?.dialogue)?features.dialogue:null;
   const parts=[
    "新しい日本語小説の本文を執筆してください。指示文や前置き、分析の説明は出さない。",
    "【プロット】",plot,
    "【守る設定】",facts||"明示された人物と出来事を維持する。",
    "【禁止事項】",avoid||"指定されていない重大な設定を勝手に確定しない。",
    "【文体】",style||"自然な日本語の小説",
    "【表現設計】",
    avg===null?"文の長短に自然な変化をつける。":"平均文長 "+avg.toFixed(1)+"字は緩やかな参考値。数値達成を目的にしない。",
    ratio===null?"台詞は物語の必要に合わせる。":"会話率 "+ratio.toFixed(1)+"%は粗い推定値。鉤括弧なしの台詞を含む場合はこの数値に従わない。",
    "抽象的な特徴（リズム、視点の距離、心理描写と身体描写の配置）を優先する。元の参考文の固有の比喩、表現、固有名詞、展開を流用しない。",
    "単なる説明の羅列を避け、一場面の時間と行動を描く。確定事項のない細部は控えめに補い、不明な事実は断定しない。",
    "【長さ】","およそ600〜1000字を目安に、ひとまとまりの小説本文。",
   ];
   if(structure)parts.push("【任意の構造上の手がかり】",structure);
   parts.push("【出力】","小説本文のみ。");
   return parts.join("\n");
 }
 function getStyle(){
   const select=byId("styleSource"),selected=select?.value||"current";
   if(selected==="current"){
     const f=typeof current!=="undefined"?current:null;
     return {name:"現在の文章分析",features:f};
   }
   const s=typeof styles!=="undefined"?styles.find(x=>x.id===selected):null;
   return s?{name:s.name,features:s.features}:{name:"自然な文章",features:null};
 }
 function showError(message){status.textContent=message;status.setAttribute("data-state","error");}
 go.addEventListener("click",async()=>{
   const apiKey=keyInput.value.trim();
   if(!apiKey){showError("OpenRouterのAPIキーを入力してください。キーは保存されません。");keyInput.focus();return}
   const plot=escapeValue(byId("plot").value);
   if(!plot){showError("プロットを入力してください。");byId("plot").focus();return}
   const style=getStyle();
   const structure=byId("useStructure").checked&&typeof structureRows!=="undefined"&&structureRows.length?
     "段落構成は参考文章から機械推定されるため、固定のルールにしない。短い独立台詞や視点の切替は必要に応じて採用する。":"";
   const task=buildWritingTask({plot,facts:escapeValue(byId("facts").value),avoid:escapeValue(byId("avoid").value),style:style.name,features:style.features,structure});
   controller=new AbortController();
   go.disabled=true;byId("cancelNovel").disabled=false;copy.disabled=true;rating.hidden=true;output.hidden=false;output.textContent="";generated="";
   status.textContent="小説を生成中… 無料モデルの混雑状況によって時間がかかる場合があります。";status.removeAttribute("data-state");
   try{
     const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{
       method:"POST",signal:controller.signal,
       headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json","X-Title":"ruka."},
       body:JSON.stringify({model:"openrouter/free",messages:[{role:"system",content:"You are a Japanese fiction writer. Output only Japanese literary prose, not a prompt or explanation."},{role:"user",content:task}],temperature:0.9,max_tokens:1800,stream:false})
     });
     let data;try{data=await response.json()}catch{throw new Error("API応答を読み取れませんでした。")}
     if(!response.ok)throw new Error("APIエラー "+response.status+"："+String(data?.error?.message||"無料枠・キー・接続状況を確認してください。").slice(0,260));
     let result=data?.choices?.[0]?.message?.content;
     if(Array.isArray(result))result=result.filter(p=>p.type==="text").map(p=>p.text||"").join("\n");
     if(typeof result!=="string"||!result.trim())throw new Error("本文が返されませんでした。別のタイミングで試してください。");
     generated=result.trim();output.textContent=generated;copy.disabled=false;rating.hidden=false;
     status.textContent="生成完了 · 使用モデル："+String(data.model||"無料モデル")+" · "+[...generated].length+"文字";
   }catch(e){
     if(e.name==="AbortError")showError("生成を中止しました。");
     else if(e instanceof TypeError)showError("通信できませんでした。Safariの接続設定またはAPI側のブラウザ通信制限を確認してください。");
     else showError(e.message||"生成に失敗しました。");
   }finally{go.disabled=false;byId("cancelNovel").disabled=true;controller=null}
 });
 byId("cancelNovel").addEventListener("click",()=>controller?.abort());
 copy.addEventListener("click",async()=>{if(!generated)return;try{await navigator.clipboard.writeText(generated);status.textContent="小説本文をコピーしました。"}catch{status.textContent="自動コピーに失敗しました。本文を長押しでコピーしてください。"}});
 byId("goodNovel").addEventListener("click",()=>{status.textContent="「好き」を記録しました（この画面のみ）。次回生成への反映は今後の機能です。"});
 byId("badNovel").addEventListener("click",()=>{status.textContent="「調整したい」を記録しました（この画面のみ）。次回生成への反映は今後の機能です。"});
 window.rukaBuildWritingTask=buildWritingTask;
})();