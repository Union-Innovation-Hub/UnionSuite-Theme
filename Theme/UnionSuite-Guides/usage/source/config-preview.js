// Fixture-only navigation. Fragment links in srcdoc inherit the containing
// file's base URL; their default navigation can load the editor in its preview.
// Run after component handlers, leaving handled commands and CSV downloads alone.
(function () {
  'use strict';
  function previewLink(event) {
    const link=event.target.closest?.('a[href]');
    if(!link||event.defaultPrevented)return;
    const href=link.getAttribute('href')||'';
    if(event.type==='click'&&link.hasAttribute('download')&&href.startsWith('blob:'))return;
    event.preventDefault();
    if(event.type!=='click'||!href.startsWith('#')||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    let id;
    try{id=decodeURIComponent(href.slice(1));}catch(_){return;}
    const target=document.getElementById(id);
    if(target)target.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  window.addEventListener('click',previewLink);
  window.addEventListener('auxclick',previewLink);
  // Every form is a local fixture; its own submit handler may simulate a result.
  window.addEventListener('submit',event=>event.preventDefault());
})();
