   <div id="header-container">
      <div id="logo">
         <h1>
            <a href="#" onclick="window.open('about.html','AboutWin','toolbar=no, menubar=no,location=no,resizable=no,scrollbars=yes,statusbar=no,top=100,left=200,height=650,width=450');return false"><img alt="" src="img/img-auscope-banner.gif"></a>
         </h1>
      </div>
      <div id="menu">
         <ul >
            <li ><a href="http://ga.gov.au/">Geoscience Australia<span></span></a></li>
            <li <%if (request.getRequestURL().toString().contains("/gmap.")) {%>class="current" <%} %>><a href="gmap.html">GA Portal<span></span></a></li>
            <li <%if (request.getRequestURL().toString().contains("/links.")) {%>class="current" <%} %>><a href="links.html">Links<span></span></a></li>
         </ul>
      </div>
      <span id="latlng" class="input-text"></span>
      <div id="permalinkicon"><a href="javascript:void(0)" onclick="permaLinkClickHandler()"><img src="img/link.png" width="16" height="16"/></a></div>
      <div id="permalink"><a href="javascript:void(0)" onclick="permaLinkClickHandler()">Permanent Link</a></div>


   </div>
