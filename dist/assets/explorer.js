/* Historical graph exploration. Path tracing is unweighted reachability. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const kinds = {SUPPLY_UP:'Supply relationship',COMPETITOR:'Competitor',SHARED_DRIVER:'Shared economic driver',COST_LINK:'Input cost link',DUAL_CLASS:'Share classes'};
  const statuses = {profile:'Profile assertion',candidate:'Filing candidate',reviewed:'Reviewed filing'};
  const palette = ['#536f9e','#a47a60','#598e8e','#8a6ea8','#6e8c56','#ab6b7b','#b08a3d','#537e74','#796c5d','#637cba','#9b7899'];
  let data, nodeMap, focus='AAPL', ego=false, selected=null, trace=null, visible=[], shown=[], positions=new Map(), sectorCenters=[];
  let scale=1, tx=0, ty=0, width=800, height=510, needsFit=true, drag=null, timer=null;
  const canvas=$('graph-canvas'), ctx=canvas.getContext('2d');
  const adjacent=(edges,ticker=focus)=>edges.filter(e=>e.source===ticker||e.target===ticker);
  const neighbors=edges=>new Set(adjacent(edges).map(e=>e.source===focus?e.target:e.source));
  function filters(){
    const layer=$('relation-filter').value, evidence=$('evidence-filter').value, basis=$('basis-filter').value, sector=$('sector-filter').value;
    return data.edges.filter(e=>(layer==='all'||e.type===(layer==='supply'?'SUPPLY_UP':layer))
      &&(basis==='all'||e.basis!=='inferred')
      &&(evidence==='all'||(evidence==='reviewed'?e.status==='reviewed':e.evidence.length>0))
      &&(sector==='all'||nodeMap.get(e.source).sector===sector&&nodeMap.get(e.target).sector===sector));
  }
  function stopTrace(){clearTimeout(timer);trace=null;}
  function saveState(){history.replaceState(null,'','#'+new URLSearchParams({company:focus,layer:$('relation-filter').value,evidence:$('evidence-filter').value,basis:$('basis-filter').value,sector:$('sector-filter').value,view:ego?'neighborhood':'all',depth:$('hops').value,channel:$('scenario').value,trace:trace?'1':'0'}));}
  function populate(){
    const term=$('company-search').value.trim().toLowerCase(), matches=data.nodes.filter(n=>`${n.id} ${n.name}`.toLowerCase().includes(term)), select=$('company');
    select.replaceChildren();
    for(const n of matches){const option=document.createElement('option');option.value=n.id;option.textContent=`${n.id} · ${n.name}`;select.append(option);}
    if(!matches.length){const option=document.createElement('option');option.textContent='No matching companies';option.disabled=true;select.append(option);}
    select.value=matches.some(n=>n.id===focus)?focus:matches[0]?.id||'';return matches;
  }
  function selectCompany(id){focus=id;if($('sector-filter').value!=='all'&&nodeMap.get(id).sector!==$('sector-filter').value)$('sector-filter').value='all';stopTrace();$('company-search').value='';populate();needsFit=ego;render();}
  function showEvidence(edge){
    selected=edge.id;const box=$('evidence-content');box.replaceChildren();
    const add=(tag,text,className)=>{const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;box.append(el);return el;};
    add('h2',`${edge.source} ${['SUPPLY_UP','COST_LINK'].includes(edge.type)?'→':'↔'} ${edge.target}`,'evidence-title');
    add('span',statuses[edge.status],`badge ${edge.status}`);add('p',edge.why,'evidence-text');
    const explanation=edge.status==='reviewed'?'A parent-level relationship through named subsidiaries was reviewed in the historical filing pilot. This does not establish a current contract.':edge.status==='candidate'?'The filing supports a component mention; a direct purchasing relationship remains unverified.':edge.basis==='inferred'?'Inferred from shared drivers, inputs, outputs or other business tags. This is a research candidate, not evidence of a direct commercial relationship.':'Named in a retrospective company profile. No independently reviewed filing citation is attached.';
    add('p',explanation,'evidence-text');
    for(const ev of edge.evidence){const row=document.createElement('div');row.className='evidence-item';const date=document.createElement('time');date.dateTime=ev.date;date.textContent=`DISCLOSED ${ev.date}`;const a=document.createElement('a');a.href=ev.url;a.target='_blank';a.rel='noopener';a.textContent='Open SEC filing ↗';const p=document.createElement('p');p.textContent=ev.note;row.append(date,a,p);box.append(row);}
    if(edge.regime_changed)add('p','Historical change flag: a static edge can misrepresent when this relationship was valid.','warning-inline');
    add('p',`Provenance: ${edge.source_file}`,'cost-note');
    document.querySelectorAll('.edge-row').forEach(el=>el.classList.toggle('active',el.dataset.id===selected));draw();
  }
  function layout(edges){
    const near=neighbors(edges), ids=new Set([focus,...near]);
    if(trace)for(const [id,hop] of trace.distances)if(hop<=trace.phase)ids.add(id);
    const sector=$('sector-filter').value;
    shown=data.nodes.filter(n=>ego?ids.has(n.id):(sector==='all'||n.sector===sector));
    const shownIds=new Set(shown.map(n=>n.id));visible=edges.filter(e=>shownIds.has(e.source)&&shownIds.has(e.target));
    positions=new Map();sectorCenters=[];
    if(ego){
      positions.set(focus,[0,0]);const others=shown.filter(n=>n.id!==focus).sort((a,b)=>a.sector.localeCompare(b.sector)||a.id.localeCompare(b.id));
      others.forEach((n,i)=>{const angle=i*2.3999632297,r=70+Math.sqrt(i+1)*23;positions.set(n.id,[Math.cos(angle)*r,Math.sin(angle)*r]);});
    }else{
      const sectors=[...new Set(data.nodes.map(n=>n.sector))].sort();
      sectors.forEach((sector,i)=>{const angle=-Math.PI/2+i*2*Math.PI/sectors.length,cx=Math.cos(angle)*390,cy=Math.sin(angle)*330;
        const group=shown.filter(n=>n.sector===sector).sort((a,b)=>a.id.localeCompare(b.id));
        if(!group.length)return;
        group.forEach((n,j)=>{const a=j*2.3999632297,r=Math.sqrt(j)*13;positions.set(n.id,[cx+Math.cos(a)*r,cy+Math.sin(a)*r]);});
        sectorCenters.push({name:sector,x:cx,y:cy-130,color:palette[i%palette.length]});
      });
    }
    $('graph-count').textContent=`${shown.length} / 477 companies · ${visible.length.toLocaleString()} links`;
    canvas.setAttribute('aria-label',`${shown.length} of 477 companies and ${visible.length} filtered relationships. Focus: ${focus}. Use the company selector and relationship list for keyboard access.`);
    if(needsFit){fit();needsFit=false;}else draw();
  }
  function fit(){
    if(!shown.length)return;const xs=shown.map(n=>positions.get(n.id)[0]),ys=shown.map(n=>positions.get(n.id)[1]);
    if(!ego)for(const center of sectorCenters){xs.push(center.x);ys.push(center.y);}
    const minX=Math.min(...xs)-80,maxX=Math.max(...xs)+80,minY=Math.min(...ys)-25,maxY=Math.max(...ys)+35;
    scale=Math.min(width/(maxX-minX),height/(maxY-minY))*.94;tx=width/2-(maxX+minX)/2*scale;ty=height/2-(maxY+minY)/2*scale;draw();
  }
  function draw(){
    if(!data||!shown.length)return;
    const dpr=Math.min(devicePixelRatio||1,2);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const near=new Set(adjacent(visible).map(e=>e.id));const reached=trace?new Set([...trace.distances].filter(([,h])=>h<=trace.phase).map(([id])=>id)):null;
    const activeSteps=new Set(trace?trace.steps.filter(s=>s.hop<=trace.phase).map(s=>s.edge):[]);
    ctx.save();ctx.translate(tx,ty);ctx.scale(scale,scale);
    const drawEdge=(e,highlight)=>{const a=positions.get(e.source),b=positions.get(e.target);if(!a||!b)return;
      const active=activeSteps.has(e.id),chosen=e.id===selected;
      ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle=chosen||active?'#7f00ff':e.status==='reviewed'?'#237a7d':'#667c99';
      ctx.globalAlpha=chosen||active ? .95 : highlight ? (trace ? .16 : .48) : (trace ? .018 : visible.length>4000 ? .025 : .09);
      ctx.lineWidth=(chosen||active?2:highlight?1:.65)/scale;ctx.stroke();
      if(highlight&&e.type==='SUPPLY_UP'&&(ego||scale>1.2)){
        const angle=Math.atan2(b[1]-a[1],b[0]-a[0]),r=8/scale,x=b[0]-Math.cos(angle)*r,y=b[1]-Math.sin(angle)*r;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-6/scale*Math.cos(angle-.45),y-6/scale*Math.sin(angle-.45));ctx.lineTo(x-6/scale*Math.cos(angle+.45),y-6/scale*Math.sin(angle+.45));ctx.closePath();ctx.fillStyle=ctx.strokeStyle;ctx.fill();
      }
    };
    for(const e of visible)if(!near.has(e.id))drawEdge(e,false);
    for(const e of visible)if(near.has(e.id))drawEdge(e,true);
    ctx.globalAlpha=1;
    if(!ego&&scale<1.7)for(const s of sectorCenters){ctx.font=`${11/scale}px Roboto, sans-serif`;ctx.fillStyle=s.color;ctx.textAlign='center';ctx.fillText(s.name,s.x,s.y);}
    const connected=neighbors(visible),sectors=[...new Set(data.nodes.map(n=>n.sector))].sort();
    for(const n of [...shown.filter(n=>n.id!==focus),...shown.filter(n=>n.id===focus)]){
      const [x,y]=positions.get(n.id),isFocus=n.id===focus,isNear=connected.has(n.id),active=reached?.has(n.id);
      ctx.globalAlpha=trace&&!active ? .3 : 1;ctx.beginPath();ctx.arc(x,y,(isFocus?7:isNear?4.5:3.2)/scale,0,Math.PI*2);ctx.fillStyle=isFocus||active?'#7f00ff':palette[sectors.indexOf(n.sector)%palette.length];ctx.fill();
      if(isFocus){ctx.beginPath();ctx.arc(x,y,11/scale,0,Math.PI*2);ctx.strokeStyle='#7f00ff';ctx.lineWidth=1/scale;ctx.stroke();}
      if(isFocus||ego||scale>1.7){ctx.font=`${isFocus?'500 ':'400 '}${(isFocus?13:10)/scale}px Roboto, sans-serif`;ctx.textAlign='center';ctx.fillStyle='#011735';ctx.strokeStyle='#f6f9fc';ctx.lineWidth=3/scale;ctx.strokeText(n.id,x,y-10/scale);ctx.fillText(n.id,x,y-10/scale);}
    }
    ctx.restore();ctx.globalAlpha=1;
  }
  function render(){
    if(!data)return;const edges=filters(), n=nodeMap.get(focus), direct=adjacent(edges).sort((a,b)=>({reviewed:0,candidate:1,profile:2}[a.status]-{reviewed:0,candidate:1,profile:2}[b.status]));
    $('focus-sector').textContent=`${n.sector} / ${n.id}`;$('focus-name').textContent=n.name;$('focus-note').textContent=n.note||'Historical research profile.';
    $('neighbor-count').textContent=neighbors(edges).size;$('ego-toggle').setAttribute('aria-pressed',String(ego));$('ego-toggle').textContent=ego?'Show full network':'View neighborhood';
    $('edge-list-title').textContent=`Relationships around ${focus}`;$('edge-count').textContent=`${direct.length} links`;
    const list=$('edge-list');list.replaceChildren();
    if(!direct.length){const p=document.createElement('p');p.className='empty';p.textContent='No links under these filters. Include inferred candidates, change relationship type, or try the Delta filing example.';list.append(p);}
    for(const e of direct){const b=document.createElement('button');b.type='button';b.className='edge-row';b.dataset.id=e.id;const left=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=`${e.source} ${['SUPPLY_UP','COST_LINK'].includes(e.type)?'→':'↔'} ${e.target}`;small.textContent=`${kinds[e.type]} · ${e.basis==='inferred'?'Inferred candidate':e.basis==='named'?'Named profile':'Filing record'}`;left.append(strong,small);const badge=document.createElement('span');badge.className=`badge ${e.status}`;badge.textContent=statuses[e.status];b.append(left,badge);b.addEventListener('click',()=>showEvidence(e));list.append(b);}
    layout(edges);const current=direct.find(e=>e.id===selected)||direct[0];
    if(current)showEvidence(current);else{selected=null;$('evidence-content').textContent='Choose another company or filter to inspect a relationship.';}
    $('scenario-state').textContent=trace?`${[...trace.distances.values()].filter(h=>h>0&&h<=trace.phase).length} companies reached within ${trace.phase} hops. Connected paths, not estimated effects.`:'Follow supply relationships in either direction. No transmission sizes are estimated.';
    saveState();
  }
  function startTrace(animate=true){
    stopTrace();if(!['supply','all'].includes($('relation-filter').value))$('relation-filter').value='supply';
    const edges=filters().filter(e=>e.type==='SUPPLY_UP'),depth=+$('hops').value,channel=$('scenario').value,distances=new Map([[focus,0]]),steps=[],outgoing=new Map();
    for(const e of edges){const from=channel==='demand'?e.target:e.source,to=channel==='demand'?e.source:e.target;if(!outgoing.has(from))outgoing.set(from,[]);outgoing.get(from).push({to,edge:e.id});}
    let frontier=[focus];for(let hop=1;hop<=depth;hop++){const next=[];for(const from of frontier)for(const item of outgoing.get(from)||[]){if(distances.has(item.to))continue;distances.set(item.to,hop);next.push(item.to);steps.push({edge:item.edge,hop});}frontier=next;}
    trace={distances,steps,phase:animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches?0:depth};ego=true;needsFit=true;render();
    const tick=()=>{if(!trace)return;trace.phase++;needsFit=true;render();if(trace.phase<depth)timer=setTimeout(tick,650);};if(trace.phase<depth)timer=setTimeout(tick,650);
  }
  function zoom(factor,cx=width/2,cy=height/2){const next=Math.max(.15,Math.min(8,scale*factor)),ratio=next/scale;tx=cx-(cx-tx)*ratio;ty=cy-(cy-ty)*ratio;scale=next;draw();}
  function hit(x,y){let best=null,dist=12;for(const n of shown){const p=positions.get(n.id),d=Math.hypot(p[0]*scale+tx-x,p[1]*scale+ty-y);if(d<dist){best=n;dist=d;}}return best;}
  function resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);width=rect.width;height=rect.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(shown.length)fit();}
  function exportLinks(){const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';const rows=[['source','target','type','status','basis','historical_change','filing_urls'],...visible.map(e=>[e.source,e.target,e.type,e.status,e.basis,e.regime_changed,e.evidence.map(x=>x.url).join('; ')])];const url=URL.createObjectURL(new Blob([rows.map(r=>r.map(quote).join(',')).join('\n')],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`historical-network-${focus}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function readState(){
    const q=new URLSearchParams(location.hash.slice(1));focus=nodeMap.has(q.get('company'))?q.get('company'):'AAPL';
    for(const [id,key,fallback] of [['relation-filter','layer','supply'],['evidence-filter','evidence','all'],['basis-filter','basis','named'],['sector-filter','sector','all'],['hops','depth','1'],['scenario','channel','demand']])$(id).value=[...$(id).options].some(o=>o.value===q.get(key))?q.get(key):fallback;
    if($('sector-filter').value!=='all'&&nodeMap.get(focus).sector!==$('sector-filter').value)focus=data.nodes.find(n=>n.sector===$('sector-filter').value).id;
    ego=q.get('view')==='neighborhood';return q;
  }
  async function init(){try{
    const res=await fetch('assets/graph-data.json');if(!res.ok)throw Error('Data request failed');data=await res.json();nodeMap=new Map(data.nodes.map(n=>[n.id,n]));
    for(const sector of [...new Set(data.nodes.map(n=>n.sector))].sort()){const o=document.createElement('option');o.value=sector;o.textContent=sector;$('sector-filter').append(o);}
    const q=readState();populate();$('load-status').hidden=true;$('network-explorer').hidden=false;resize();
    $('company-search').addEventListener('input',()=>{const matches=populate();if(matches.length){focus=$('company').value;if($('sector-filter').value!=='all'&&nodeMap.get(focus).sector!==$('sector-filter').value){$('sector-filter').value='all';needsFit=true;}stopTrace();needsFit=needsFit||ego;render();}});
    $('company').addEventListener('change',()=>selectCompany($('company').value));
    ['relation-filter','evidence-filter','basis-filter','sector-filter','hops','scenario'].forEach(id=>$(id).addEventListener('change',()=>{stopTrace();if(id==='sector-filter'&&$('sector-filter').value!=='all'&&nodeMap.get(focus).sector!==$('sector-filter').value){focus=data.nodes.find(n=>n.sector===$('sector-filter').value).id;$('company-search').value='';populate();}needsFit=true;render();}));
    $('ego-toggle').addEventListener('click',()=>{ego=!ego;needsFit=true;render();});$('trace').addEventListener('click',()=>startTrace());$('clear-trace').addEventListener('click',()=>{stopTrace();render();});$('export-graph').addEventListener('click',exportLinks);
    $('zoom-in').addEventListener('click',()=>zoom(1.35));$('zoom-out').addEventListener('click',()=>zoom(1/1.35));$('fit-graph').addEventListener('click',fit);
    $('reset-graph').addEventListener('click',()=>{stopTrace();focus='AAPL';ego=false;$('company-search').value='';for(const [id,value] of [['relation-filter','supply'],['evidence-filter','all'],['basis-filter','named'],['sector-filter','all'],['hops','1'],['scenario','demand']])$(id).value=value;populate();needsFit=true;render();});
    document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{stopTrace();focus=b.dataset.preset;ego=true;$('company-search').value='';$('relation-filter').value='supply';$('evidence-filter').value=focus==='DAL'?'reviewed':'all';$('basis-filter').value='named';$('sector-filter').value='all';populate();needsFit=true;render();}));
    canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();zoom(Math.exp(-Math.max(-120,Math.min(120,e.deltaY))*.002),e.clientX-r.left,e.clientY-r.top);},{passive:false});
    canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,tx,ty,moved:false};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)drag.moved=true;tx=drag.tx+dx;ty=drag.ty+dy;draw();}else{const n=hit(e.clientX-r.left,e.clientY-r.top);canvas.style.cursor=n?'pointer':'grab';$('graph-tooltip').textContent=n?`${n.id} · ${n.name} · ${n.sector}`:'Drag to pan · scroll to zoom · select a company to inspect its relationships.';}});
    canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const r=canvas.getBoundingClientRect(),n=hit(e.clientX-r.left,e.clientY-r.top);if(n)selectCompany(n.id);}drag=null;});canvas.addEventListener('pointercancel',()=>{drag=null;});
    window.addEventListener('hashchange',()=>{stopTrace();const state=readState();$('company-search').value='';populate();needsFit=true;if(state.get('trace')==='1')startTrace(false);else render();});
    new ResizeObserver(resize).observe(canvas);if(q.get('trace')==='1')startTrace(false);else render();
  }catch(e){$('load-status').textContent=`The graph could not load. ${e.message}. Try refreshing the page.`;$('load-status').className='error-message';}}
  init();
})();
