(function(){
var $=function(i){return document.getElementById(i)},M=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
function esc(t){var d=document.createElement('div');d.textContent=t==null?'':t;return d.innerHTML.replace(/"/g,'&quot;')}
function fd(s){if(!s)return'';var p=s.split('-');return p.length==3?p[2]+'/'+p[1]+'/'+p[0]:s}
$('yr').textContent=new Date().getFullYear();
var SAMPLE=[{d:'2026-11-07T21:00',n:'Noite do Rock (exemplo)',l:'Bar do Zé',c:'Osasco, SP'},{d:'2026-11-21T20:00',n:'Festa de Aniversário (exemplo)',l:'Espaço Eventos',c:'São Paulo, SP'}];
function drawEvents(E){
 E=E.filter(function(e){return new Date(e.d)>new Date()}).sort(function(a,b){return new Date(a.d)-new Date(b.d)}).slice(0,6);
 var h='';E.forEach(function(e,i){var t=new Date(e.d);
  h+='<div class="card'+(i?'':' big')+'"><div class="date"><b>'+String(t.getDate()).padStart(2,'0')+'</b><span>'+M[t.getMonth()]+'</span></div><div><h3>'+esc(e.n)+'</h3><p>'+esc(e.l)+(e.c?' · '+esc(e.c):'')+'</p><p>'+t.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})+'</p>'+
  '<a class="l" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((e.l||'')+' '+(e.c||''))+'">Como chegar →</a></div></div>'});
 $('events').innerHTML=h||'<p>Novas datas em breve! Siga nossas redes.</p>';
}
var C=window.RNV||{};
if(C.calendarId&&C.apiKey){
 var u='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(C.calendarId)+'/events?singleEvents=true&orderBy=startTime&maxResults=12&timeMin='+encodeURIComponent(new Date().toISOString())+'&key='+C.apiKey;
 fetch(u).then(function(r){return r.json()}).then(function(j){
  drawEvents((j.items||[]).filter(function(x){return x.start&&x.start.dateTime}).map(function(x){return{d:x.start.dateTime,n:x.summary||'Show',l:x.location||'',c:''}}));
 }).catch(function(){$('events').innerHTML='<p>Não foi possível carregar a agenda agora. Volte em instantes!</p>'});
}else drawEvents(SAMPLE);
var list=[],idx=0;
function show(){$('lc').innerHTML='<img alt="Foto da banda" src="'+list[idx]+'">';$('lb').classList.add('on');$('lp').style.display=$('ln').style.display=list.length>1?'':'none'}
function close(){$('lb').classList.remove('on');$('lc').innerHTML=''}
function step(d){idx=(idx+d+list.length)%list.length;show()}
$('lx').onclick=close;$('lp').onclick=function(){step(-1)};$('ln').onclick=function(){step(1)};
$('lb').onclick=function(e){if(e.target==this)close()};
document.addEventListener('keydown',function(e){if(!$('lb').classList.contains('on'))return;if(e.key=='Escape')close();if(e.key=='ArrowLeft'&&list.length>1)step(-1);if(e.key=='ArrowRight'&&list.length>1)step(1)});
var sx=0;$('lb').addEventListener('touchstart',function(e){sx=e.touches[0].clientX});
$('lb').addEventListener('touchend',function(e){var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>50&&list.length>1)step(d<0?1:-1)});
fetch('data/site.json').then(function(r){return r.json()}).then(function(D){
 var A=D.albums||[];
 $('albums').innerHTML=A.length?A.map(function(a,i){return'<button class="card alb" data-i="'+i+'"><img loading="lazy" alt="Capa do álbum '+esc(a.title)+'" src="'+a.cover+'"><div><h3>'+esc(a.title)+'</h3><p>'+(a.date?fd(a.date)+' · ':'')+a.photos.length+' fotos</p></div></button>'}).join(''):'<p>Em breve, fotos dos nossos shows!</p>';
 $('albums').onclick=function(e){var b=e.target.closest('.alb');if(!b)return;var a=A[b.dataset.i];
  $('atitle').textContent=a.title;$('photos').innerHTML=a.photos.map(function(p,k){return'<img class="th" loading="lazy" alt="Foto '+(k+1)+' de '+esc(a.title)+'" data-k="'+k+'" src="'+p.thumb+'">'}).join('');
  $('photos').onclick=function(ev){var k=ev.target.dataset.k;if(k==null)return;list=a.photos.map(function(p){return p.full});idx=+k;show()};
  $('albums').hidden=true;$('album').hidden=false;$('galeria').scrollIntoView()};
 $('back').onclick=function(){$('album').hidden=true;$('albums').hidden=false};
 var V=D.videos||[];
 $('vids').innerHTML=V.length?V.map(function(v,i){var th=v.youtube?'<img class="th vt" loading="lazy" alt="" src="https://img.youtube.com/vi/'+v.youtube+'/hqdefault.jpg">':'';
  return'<div class="card">'+th+'<h3 style="margin-top:10px">'+esc(v.title)+'</h3>'+(v.date?'<p class="dt">'+fd(v.date)+'</p>':'')+'<a class="l" href="'+esc(v.url)+'" target="_blank" rel="noopener" data-i="'+i+'">▶ Assistir</a></div>'}).join(''):'<p>Em breve, vídeos!</p>';
 $('vids').onclick=function(e){var a=e.target.closest('a[data-i]');if(!a)return;var v=V[a.dataset.i];if(!v.youtube)return;e.preventDefault();
  $('lc').innerHTML='<iframe allowfullscreen allow="autoplay; encrypted-media" src="https://www.youtube.com/embed/'+v.youtube+'?autoplay=1"></iframe>';$('lb').classList.add('on');$('lp').style.display=$('ln').style.display='none'};
 var P=D.posts||[];
 $('posts').innerHTML=P.length?P.map(function(p){return'<div class="card"><p class="dt">'+fd(p.date)+'</p><h3>'+esc(p.title)+'</h3><p class="pm" style="color:var(--tx)">'+esc(p.body)+'</p></div>'}).join(''):'<p>Nenhuma novidade por enquanto.</p>';
}).catch(function(){$('albums').innerHTML=$('vids').innerHTML=$('posts').innerHTML='<p>Conteúdo indisponível no momento.</p>'});
})();
