<script type="text/javascript">//<![CDATA[
   new Extras.WikiPageParsers("${args.htmlid?replace("wikipage-parsers", "wikipage")}").setOptions(
   {
      siteId: "${page.url.templateArgs.site}",
      pageTitle: "${(page.url.args["title"]!"")?js_string}",
      mode: "${(page.url.args["action"]!"view")?js_string}"
   }).setMessages(
      ${messages}
   );
//]]></script>
