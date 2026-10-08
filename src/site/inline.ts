// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The one inline script. It runs before first paint so a saved dark theme,
// text size or contrast setting never flashes the default first. The build
// hashes it into the Content-Security-Policy, so it must stay byte-identical
// between the HTML and the header.

export const PREPAINT_SCRIPT =
  "(function(){var d=document.documentElement;d.classList.remove('no-js');d.classList.add('js');" +
  "try{var p=JSON.parse(localStorage.getItem('pelana:prefs')||'{}');" +
  "['theme','contrast','text','motion','sound'].forEach(function(k){if(typeof p[k]==='string')d.setAttribute('data-'+k,p[k]);});}catch(e){}})();";
