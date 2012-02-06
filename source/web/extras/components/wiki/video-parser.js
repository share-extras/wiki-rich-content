/**
 * Parser that converts links to YouTube or Vimeo videos into embedded videos within the page itself.
 * 
 * <p>The parser looks for anchor elements in the code with a href attribute that points to a video
 * page on either YouTube or Vimeo. This means that the link target must begin with the following<p>
 * 
 * <ul>
 * <li>http://www.youtube.com/watch?v=id</li>
 * <li>http://vimo.com/id</li>
 * </ul>
 * 
 * <p>The YouTube ID must be alphanumeric (A-Z, a-z and 0-9) while Vimeo IDs should be numerical only.
 * Other parameters may follow the IDs on the URL, they will be ignored.</p>
 * 
 * <p>The parser could be extended in the future to support other video sites.</p>
 * 
 * @namespace Alfresco
 * @class Alfresco.WikiVideoParser
 * @author Will Abson
 */
(function()
{
   /**
    * YUI Library aliases
    */
   var Dom = YAHOO.util.Dom,
       Event = YAHOO.util.Event,
       Element = YAHOO.util.Element;
   
   /**
    * WikiVideoParser constructor.
    * 
    * @return {Alfresco.WikiVideoParser} The new parser instance
    * @constructor
    */
   Alfresco.WikiVideoParser = function()
   {
      /* Decoupled event listeners */
      YAHOO.Bubbling.on("pageContentAvailable", this.onPageContentAvailable, this);
      
      return this;
   };

   Alfresco.WikiVideoParser.prototype =
   {
      /**
       * Object container for initialization options
       *
       * @property options
       * @type object
       */
      options:
      {
      /**
       * Target name to look for on links to add embedded videos alongside
       *
       * @property embedTarget
       * @type String
       * @default "embed"
       */
      embedTarget: "embed",

      /**
       * Target name to look for on links to replace with embedded videos
       *
       * @property embedTargetNoLink
       * @type String
       * @default "embednolink"
       */
      embedTargetNoLink: "embednolink"
      },
      
      /**
       * Event handler called when the "pageContentAvailable" event is received.
       * 
       * @method onPageContentAvailable
       * @param pageObj {Alfresco.WikiPage} The wiki page instance
       * @param textEl {HTMLElement} The wiki page markup container element
       */
      onPageContentAvailable: function WikiVideoParser_onPageContentAvailable(layer, args)
      {
         var pageObj = args[1].pageObj, 
            textEl = args[1].textEl, 
            linkEls = textEl.getElementsByTagName("a"), 
            linkEl, link, embedUrl, embed, embedContainer,
            includeLink,
            ytRe = /^http:\/\/www\.youtube\.com\/watch\?v=([\w]+)/, // YouTube regular URLs
            ytbeRe = /^http:\/\/youtu\.be\/([\w]+)/, // YouTube short URLs
            vimeoRe = /^http:\/\/vimeo\.com\/([\d]+)/, // Vimeo regular URLs
            ytMatch, ytbeMatch, vimeoMatch;
         
         for (var i = 0; i < linkEls.length; i++)
         {
            embed = null;
            linkEl = linkEls[i];
            if ((Dom.getAttribute(linkEl, "target") == this.options.embedTarget || Dom.getAttribute(linkEl, "target") == this.options.embedTargetNoLink) 
                  && Dom.getAttribute(linkEl, "href") != null)
            {
               includeLink = Dom.getAttribute(linkEl, "target") == this.options.embedTarget;
               link = Dom.getAttribute(linkEl, "href");
               ytMatch = ytRe.exec(link), ytbeMatch = ytbeRe.exec(link), vimeoMatch = vimeoRe.exec(link);
               if (ytMatch)
               {
                  embedUrl = "http://www.youtube.com/embed/" + ytMatch[1];
               }
               else if (ytbeMatch)
               {
                  embedUrl = "http://www.youtube.com/embed/" + ytbeMatch[1];
               }
               else if (vimeoMatch)
               {
                  embedUrl = "http://player.vimeo.com/video/" + vimeoMatch[1] + "?title=1&byline=1&portrait=0";
               }
               if (embedUrl != null)
               {
                  // Remove target="embed" from the link
                  Dom.setAttribute(linkEl, "target", "_self");
                  // Construct the embed element
                  embed = document.createElement("IFRAME");
                  Dom.setAttribute(embed, "title", YAHOO.lang.trim(linkEl.textContent||linkEl.innerText));
                  Dom.setAttribute(embed, "width", "560");
                  Dom.setAttribute(embed, "height", "349");
                  Dom.setAttribute(embed, "src", embedUrl);
                  Dom.setAttribute(embed, "frameBorder", "0");
                  Dom.setAttribute(embed, "allowfullscreen", "allowfullscreen");
                  Dom.addClass(embed, "wiki-video-preview");
               }
            }
            if (embed != null)
            {
               embedContainer = Dom.getAncestorByTagName(linkEl, "p");
               if (embedContainer == null)
               {
                  embedContainer = linkEl.parentNode;
               }
               Dom.insertAfter(embed, embedContainer);
               if (!includeLink)
               {
                  Dom.addClass(embedContainer, "hidden");
               }
            }
         }
      }
      
   };
   
   //new Alfresco.WikiVideoParser();
   
})();