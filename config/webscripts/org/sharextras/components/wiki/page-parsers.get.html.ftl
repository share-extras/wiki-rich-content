<div id="${args.htmlid}-wikipage" class="wiki-page preview">
<h2>${msg('wikipage.preview')}</h2>
<div id="${args.htmlid}-content" class="rich-content"></div>
</div>
<script type="text/javascript">//<![CDATA[
   new Extras.WikiPageParsers("${args.htmlid}").setOptions(
   {
      siteId: "${page.url.templateArgs.site}",
      pageTitle: "${(page.url.args["title"]!"")?js_string}",
      mode: "${(page.url.args["action"]!"view")?js_string}"
   }).setMessages(
      ${messages}
   );
//]]></script>
