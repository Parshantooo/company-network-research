/* Historical structural graph. Traces are graph reachability, not fitted effects. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const NS='http://www.w3.org/2000/svg';
  const positions={AAPL:[240,230],QCOM:[90,155],INTC:[355,155],MU:[115,290],TXN:[280,345],AMAT:[200,65],HPQ:[450,70],CSCO:[510,250],NVDA:[380,285],MSFT:[625,165],GOOGL:[690,65],AMZN:[665,340],FDX:[760,460],PG:[505,430],KO:[385,460],PEP:[275,465],WMT:[595,490],DAL:[85,440],SKYW:[45,360],RJET:[165,500]};
  const kindNames={SUPPLY_UP:'Supply relationship',COMPETITOR:'Competitor',SHARED_DRIVER:'Shared economic driver',COST_LINK:'Input cost link'};
  const statusNames={profile:'Profile assertion',candidate:'Filing candidate',reviewed:'Reviewed filing'};
  let data,focus='AAPL',selectedEdge=null,ego=true,trace=null,timer=null;
  const svgEl=(tag,attrs={},text='')=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text)e.textContent=text;return e;};
  function filters(){
    const layer=$('relation-filter').value,evidence=$('evidence-filter').value;
    return data.edges.filter(e=>(layer==='all'||(layer==='supply'?e.type==='SUPPLY_UP':e.type===layer))
      &&(evidence==='all'||(evidence==='reviewed'?e.status==='reviewed':e.evidence.length>0)));
  }
  function neighbors(edges){return new Set(edges.filter(e=>e.source===focus||e.target===focus).map(e=>e.source===focus?e.target:e.source));}
  function bfs(edges,channel,depth){
    const distances=new Map([[focus,0]]),steps=[];
    let frontier=[focus];
    for(let hop=1;hop<=depth;hop++){
      const next=[];
      for(const ticker of frontier)for(const e of edges){
        if(e.type!=='SUPPLY_UP')continue;
        const from=channel==='demand'?e.target:e.source,to=channel==='demand'?e.source:e.target;
        if(from!==ticker||distances.has(to))continue;
        distances.set(to,hop);next.push(to);steps.push({edge:e.id,hop,from,to});
      }
      frontier=next;
    }
    return {distances,steps,phase:depth,depth,channel};
  }
  function stopTrace(){if(timer){clearInterval(timer);timer=null;}trace=null;}
  function saveState(){
    const q=new URLSearchParams({company:focus,layer:$('relation-filter').value,evidence:$('evidence-filter').value,depth:$('hops').value,channel:$('scenario').value,ego:ego?'1':'0',trace:trace?'1':'0'});
    history.replaceState(null,'',`#${q}`);
  }
  function populateCompanies(){
    const term=$('company-search').value.trim().toLowerCase(),select=$('company');select.replaceChildren();
    const matches=data.nodes.filter(n=>`${n.id} ${n.name}`.toLowerCase().includes(term));
    for(const n of matches){const o=document.createElement('option');o.value=n.id;o.textContent=`${n.id} · ${n.name}`;select.append(o);}
    if(!matches.length){const o=document.createElement('option');o.textContent='No matching companies';o.disabled=true;select.append(o);}
    select.value=matches.some(n=>n.id===focus)?focus:matches[0]?.id||'';
    return matches;
  }
  function showEvidence(edge){
    selectedEdge=edge.id;
    const box=$('evidence-content');box.replaceChildren();
    const badge=document.createElement('span');badge.className=`badge ${edge.status}`;badge.textContent=statusNames[edge.status];
    const title=document.createElement('h2');title.className='evidence-title';title.textContent=`${edge.source} ${edge.type==='SUPPLY_UP'?'→':'↔'} ${edge.target}`;
    const text=document.createElement('p');text.className='evidence-text';text.textContent=edge.why;
    const explanation=document.createElement('p');explanation.className='evidence-text';
    explanation.textContent=edge.status==='profile'?'This relationship is asserted in the historical research profile graph. No independently reviewed filing citation is attached.':edge.status==='candidate'?'The cited filing supports a component mention. Direct commercial purchasing remains unverified.':'The local filing pilot approved a parent-level relationship through named subsidiaries. This is historical evidence, not confirmation of a current contract.';
    box.append(title,badge,text,explanation);
    for(const ev of edge.evidence){
      const row=document.createElement('div');row.className='evidence-item';
      const date=document.createElement('time');date.textContent=`DISCLOSED ${ev.date}`;date.dateTime=ev.date;
      const a=document.createElement('a');a.href=ev.url;a.target='_blank';a.rel='noopener';a.textContent='Open source SEC filing ↗';
      const p=document.createElement('p');p.textContent=ev.note;row.append(date,a,p);box.append(row);
    }
    if(edge.regime_changed){const p=document.createElement('p');p.className='warning-inline';p.textContent='Historical change flag: this relationship changed during the research sample. A static edge can misrepresent its validity.';box.append(p);}
    const source=document.createElement('p');source.className='cost-note';source.textContent=`Local provenance: ${edge.source_file}`;box.append(source);
    document.querySelectorAll('.edge-row').forEach(e=>e.classList.toggle('active',e.dataset.id===edge.id));
  }
  function drawGraph(edges){
    const svg=$('graph-svg');svg.replaceChildren();
    const defs=svgEl('defs');
    const marker=svgEl('marker',{id:'arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'});
    marker.append(svgEl('path',{d:'M0 0L10 5L0 10Z',fill:'#8d94a5'}));defs.append(marker);svg.append(defs);
    const connected=neighbors(edges),shown=new Set([focus,...connected]);
    if(trace)trace.distances.forEach((d,t)=>{if(d<=trace.phase)shown.add(t);});
    const nodes=ego?data.nodes.filter(n=>shown.has(n.id)):data.nodes;
    if(ego){
      const xs=nodes.map(n=>positions[n.id][0]),ys=nodes.map(n=>positions[n.id][1]);
      const x0=Math.min(...xs)-65,y0=Math.min(...ys)-65;
      svg.setAttribute('viewBox',`${x0} ${y0} ${Math.max(250,Math.max(...xs)-x0+65)} ${Math.max(230,Math.max(...ys)-y0+65)}`);
    }else svg.setAttribute('viewBox','0 0 850 530');
    const box=svg.viewBox.baseVal;
    const fontScale=Math.max(1,box.width/Math.max(280,svg.clientWidth));
    const ids=new Set(nodes.map(n=>n.id)),visible=edges.filter(e=>ids.has(e.source)&&ids.has(e.target));
    const reached=trace?new Set([...trace.distances].filter(([,d])=>d<=trace.phase).map(([t])=>t)):null;
    const activeSteps=trace?new Set(trace.steps.filter(s=>s.hop<=trace.phase).map(s=>s.edge)):new Set();
    for(const edge of visible){
      const [x1,y1]=positions[edge.source],[x2,y2]=positions[edge.target],dx=x2-x1,dy=y2-y1,dist=Math.hypot(dx,dy);
      const start=edge.source===focus?27:21,end=edge.target===focus?29:23;
      const near=edge.source===focus||edge.target===focus,active=activeSteps.has(edge.id);
      const edgeColor=edge.status==='reviewed'?'#237a7d':edge.type==='SUPPLY_UP'?'#9b8cad':'#647c9d';
      const line=svgEl('line',{x1:x1+dx/dist*start,y1:y1+dy/dist*start,x2:x2-dx/dist*end,y2:y2-dy/dist*end,stroke:active?'#7f00ff':edgeColor,'stroke-width':active?2.8:near?1.4:1,opacity:trace?(active?1:.12):near?.85:.14,class:'edge','data-edge':edge.id,'stroke-dasharray':edge.status==='candidate'?'4 4':edge.type==='SUPPLY_UP'?'none':'3 5'});
      if(edge.type==='SUPPLY_UP')line.setAttribute('marker-end','url(#arrow)');
      line.append(svgEl('title',{},`${edge.source} → ${edge.target}: ${kindNames[edge.type]} · ${statusNames[edge.status]}`));
      line.addEventListener('click',()=>showEvidence(edge));
      line.addEventListener('pointerenter',()=>{$('graph-tooltip').textContent=`${edge.source} → ${edge.target} / ${statusNames[edge.status]}`;});
      svg.append(line);
    }
    // Place nodes after edges so the labels and keyboard targets remain on top.
    for(const node of nodes){
      const [x,y]=positions[node.id],isFocus=node.id===focus,near=connected.has(node.id),hop=trace?.distances.get(node.id);
      const active=isFocus||(reached?.has(node.id)),r=isFocus?27:20;
      const group=svgEl('g',{transform:`translate(${x},${y})`,class:'node',tabindex:0,role:'button','aria-label':`${node.id}, ${node.name}. Select as focus.`, 'aria-pressed':String(isFocus),'data-node':node.id,opacity:trace?(active?1:.32):(isFocus||near?1:.45)});
      if(isFocus)group.append(svgEl('circle',{r:35,fill:'none',stroke:'#c9b4e0','stroke-width':1,'stroke-dasharray':'2 5'}));
      group.append(svgEl('circle',{r,fill:isFocus?'#7f00ff':active&&trace?'#e0d0f5':'#e2e9f0',stroke:isFocus?'#7f00ff':active&&trace?'#7f00ff':near?'#b0a6bd':'#b9c5d2','stroke-width':isFocus?2:1}));
      group.append(svgEl('text',{'text-anchor':'middle',y:4,fill:isFocus?'#ffffff':'#011735','font-size':(isFocus?13:12)*fontScale,'font-weight':isFocus?650:400},node.id));
      if(isFocus||near)group.append(svgEl('text',{'text-anchor':'middle',y:r+16,fill:'#506075','font-size':11*fontScale},node.name.length>20?node.name.slice(0,19)+'…':node.name));
      if(trace&&hop>0&&hop<=trace.phase){group.append(svgEl('circle',{cx:19,cy:-18,r:8,fill:'#7f00ff'}),svgEl('text',{x:19,y:-15,'text-anchor':'middle',fill:'#ffffff','font-size':10*fontScale},String(hop)));}
      const activate=()=>{focus=node.id;stopTrace();$('company-search').value='';populateCompanies();render();};
      group.addEventListener('click',activate);group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
      group.addEventListener('pointerenter',()=>{$('graph-tooltip').textContent=`${node.id} / ${node.name} / ${node.sector}`;});
      svg.append(group);
    }
    $('graph-count').textContent=`${nodes.length} nodes / ${visible.length} ${visible.length===1?'link':'links'}`;
    return visible;
  }
  function render(){
    if(!data)return;
    const edges=filters(),n=data.nodes.find(n=>n.id===focus),direct=edges.filter(e=>e.source===focus||e.target===focus);
    $('focus-sector').textContent=`${n.sector} / ${n.id}`;$('focus-name').textContent=n.name;$('focus-note').textContent=n.note||'Historical entity included in the filing pilot.';
    $('neighbor-count').textContent=neighbors(edges).size;
    $('ego-toggle').setAttribute('aria-pressed',String(ego));
    $('edge-count').textContent=`${direct.length} ${direct.length===1?'link':'links'}`;
    $('edge-list-title').textContent=`Relationships around ${focus}`;
    const list=$('edge-list');list.replaceChildren();
    if(!direct.length){const p=document.createElement('p');p.className='empty';p.textContent='No links match these filters. Choose another evidence level, or select Delta for reviewed filing links.';list.append(p);}
    for(const e of direct.sort((a,b)=>({reviewed:0,candidate:1,profile:2}[a.status]-{reviewed:0,candidate:1,profile:2}[b.status]))){
      const b=document.createElement('button');b.className='edge-row';b.dataset.id=e.id;
      const left=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');
      strong.textContent=`${e.source} ${e.type==='SUPPLY_UP'?'→':'↔'} ${e.target}`;small.textContent=kindNames[e.type];left.append(strong,small);
      const badge=document.createElement('span');badge.className=`badge ${e.status}`;badge.textContent=statusNames[e.status];b.append(left,badge);
      b.addEventListener('click',()=>showEvidence(e));list.append(b);
    }
    drawGraph(edges);
    const current=direct.find(e=>e.id===selectedEdge)||direct[0];
    if(current)showEvidence(current);else{
      selectedEdge=null;$('evidence-content').replaceChildren();const p=document.createElement('p');p.className='evidence-text';p.textContent='No relationship to inspect under the selected filters.';$('evidence-content').append(p);
    }
    if(trace){
      const reached=[...trace.distances].filter(([,h])=>h>0&&h<=trace.phase),changed=reached.length;
      $('scenario-state').textContent=`${changed} ${changed===1?'company':'companies'} reached within ${trace.phase} ${trace.phase===1?'hop':'hops'} via ${trace.channel==='demand'?'customer → supplier':'supplier → customer'} paths. Connected paths, not estimated effects.`;
    }else $('scenario-state').textContent='Choose a direction to follow the supply relationships.';
    saveState();
  }
  function startTrace(animate=true){
    stopTrace();
    // Only supply links carry the two explicitly defined scenarios.
    if(!['supply','all'].includes($('relation-filter').value))$('relation-filter').value='supply';
    trace=bfs(filters(),$('scenario').value,+$('hops').value);
    if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      trace.phase=0;render();
      timer=setInterval(()=>{trace.phase++;render();if(trace.phase>=trace.depth){clearInterval(timer);timer=null;}},650);
    }else render();
  }
  function exportLinks(){
    const visible=drawGraph(filters()),head=['source','target','relationship','status','historical_change_flag','filing_dates','filing_urls','scenario_source_hop','scenario_target_hop'];
    const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
    const rows=visible.map(e=>[e.source,e.target,e.type,e.status,e.regime_changed,e.evidence.map(x=>x.date).join('; '),e.evidence.map(x=>x.url).join('; '),trace?.distances.get(e.source)??'',trace?.distances.get(e.target)??'']);
    const text=['# Historical structural graph. Reachability is not a predicted effect.',head.join(','),...rows.map(r=>r.map(quote).join(','))].join('\n');
    const url=URL.createObjectURL(new Blob([text],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download=`historical-network-${focus}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function init(){
    try{
      const res=await fetch('assets/graph-data.json');if(!res.ok)throw Error('Dataset could not be loaded.');data=await res.json();
      const q=new URLSearchParams(location.hash.slice(1));if(data.nodes.some(n=>n.id===q.get('company')))focus=q.get('company');
      for(const [id,key] of [['relation-filter','layer'],['evidence-filter','evidence'],['hops','depth'],['scenario','channel']]){
        if([...$(id).options].some(o=>o.value===q.get(key)))$(id).value=q.get(key);
      }
      ego=q.get('ego')!=='0';populateCompanies();$('load-status').hidden=true;$('network-explorer').hidden=false;
      $('company-search').addEventListener('input',()=>{const matches=populateCompanies();if(matches.length){focus=$('company').value;stopTrace();render();}});
      $('company').addEventListener('change',()=>{if($('company').value){focus=$('company').value;stopTrace();render();}});
      ['relation-filter','evidence-filter','hops','scenario'].forEach(id=>$(id).addEventListener('change',()=>{stopTrace();render();}));
      $('trace').addEventListener('click',()=>startTrace());$('clear-trace').addEventListener('click',()=>{stopTrace();render();});
      $('ego-toggle').addEventListener('click',()=>{ego=!ego;render();});$('export-graph').addEventListener('click',exportLinks);
      $('reset-graph').addEventListener('click',()=>{stopTrace();focus='AAPL';ego=true;$('company-search').value='';$('relation-filter').value='supply';$('evidence-filter').value='all';$('scenario').value='demand';$('hops').value='1';populateCompanies();render();});
      document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{stopTrace();focus=b.dataset.preset;$('company-search').value='';$('relation-filter').value='supply';$('evidence-filter').value=focus==='DAL'?'reviewed':'all';$('scenario').value='demand';populateCompanies();render();}));
      if(q.get('trace')==='1')startTrace(false);else render();
    }catch(e){$('load-status').className='error-message';$('load-status').textContent=`The graph could not load. ${e.message} Serve this folder over HTTP; direct file opening can block data loading.`;}
  }
  init();
})();
