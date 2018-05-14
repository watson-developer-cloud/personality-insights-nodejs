function loadAnalytics() {
  var idaScript = document.createElement('script');
  idaScript.src = '//www.ibm.com/common/stats/ida_stats.js';
  document.head.appendChild(idaScript);
}


window.addEventListener('load', loadAnalytics);
