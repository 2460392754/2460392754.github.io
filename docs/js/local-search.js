!function(){var e=jQuery("#modalSearch"),t="#local-search-input",r="#local-search-result";e.on("show.bs.modal",(function(){!function(e,t,r){"use strict";var l=jQuery(t),s=jQuery(r);if(0===l.length)throw Error("No element selected by the searchSelector");if(0===s.length)throw Error("No element selected by the resultSelector");-1===s.attr("class").indexOf("list-group-item")&&s.html('<div class="m-auto text-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div><br/>Loading...</div>'),jQuery.ajax({url:e,dataType:"xml",success:function(e){var t=jQuery("entry",e).map((function(){return{title:jQuery("title",this).text(),content:jQuery("content",this).text(),url:jQuery("url",this).text()}})).get();-1===s.html().indexOf("list-group-item")&&s.html(""),l.on("input",(function(){var e=l.val(),r="",a=e.trim().toLowerCase().split(/[\s-]+/);return s.html(""),e.trim().length<=0?l.removeClass("invalid").removeClass("valid"):(t.forEach((function(e){var t=!0;e.title&&""!==e.title.trim()||(e.title="Untitled");var l=e.title.trim(),s=l.toLowerCase(),i=e.content.trim().replace(/<[^>]+>/g,""),n=i.toLowerCase(),o=e.url,c=-1,u=-1,h=-1;if(""!==n?a.forEach((function(e,r){c=s.indexOf(e),u=n.indexOf(e),c<0&&u<0?t=!1:(u<0&&(u=0),0===r&&(h=u))})):t=!1,t){r+="<a href='"+o+"' class='list-group-item list-group-item-action font-weight-bolder search-list-title'>"+l+"</a>";var d=i;if(h>=0){var m=h-20,v=h+80;m<0&&(m=0),0===m&&(v=100),v>d.length&&(v=d.length);var f=d.substring(m,v);a.forEach((function(e){var t=new RegExp(e,"gi");f=f.replace(t,'<span class="search-word">'+e+"</span>")})),r+="<p class='search-list-content'>"+f+"...</p>"}}})),-1===r.indexOf("list-group-item")?l.addClass("invalid").removeClass("valid"):(l.addClass("valid").removeClass("invalid"),void s.html(r)))}))}})}(CONFIG.search_path||"/local-search.xml",t,r)})),e.on("shown.bs.modal",(function(){jQuery("#local-search-input").focus()})),e.on("hidden.bs.modal",(function(){!function(e,t){"use strict";var r=jQuery(e),l=jQuery(t);if(0===r.length)throw Error("No element selected by the searchSelector");if(0===l.length)throw Error("No element selected by the resultSelector");r.val("").removeClass("invalid").removeClass("valid"),l.html("")}(t,r)}))}();