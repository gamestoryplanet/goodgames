(function(){
  function enhance(el){
    var src = el.getAttribute('data-src');
    var ratio = parseFloat(el.getAttribute('data-ratio')||0.6667);
    el.style.position='relative'; el.style.width='100%'; el.style.maxWidth='800px'; el.style.margin='auto';
    el.style.paddingTop=(ratio*100)+'%';
    var f=document.createElement('iframe');
    f.src=src; f.title=el.getAttribute('data-title')||'게임';
    f.loading='lazy'; f.allowFullscreen=true;
    f.style.cssText='position:absolute;inset:0;border:0;width:100%;height:100%;border-radius:16px;overflow:hidden;';
    el.appendChild(f);
  }
  function run(){ document.querySelectorAll('.game-embed').forEach(enhance); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
})();