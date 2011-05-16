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
 * @class Alfresco.WikiDocumentParser
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
    * WikiDocumentParser constructor.
    * 
    * @return {Alfresco.WikiDocumentParser} The new parser instance
    * @constructor
    */
   Alfresco.WikiDocumentParser = function()
   {
      /* Decoupled event listeners */
      YAHOO.Bubbling.on("pageContentAvailable", this.onPageContentAvailable, this);
      
      return this;
   };

   Alfresco.WikiDocumentParser.prototype =
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
          * Target name to look for on links to replace with embedded videos
          *
          * @property embedTarget
          * @type String
          * @default "vembed"
          */
         embedTarget: "embed"
      },
      
      /**
       * Event handler called when the "pageContentAvailable" event is received.
       * 
       * @method onPageContentAvailable
       * @param pageObj {Alfresco.WikiPage} The wiki page instance
       * @param textEl {HTMLElement} The wiki page markup container element
       */
      onPageContentAvailable: function WikiDocumentParser_onPageContentAvailable(layer, args)
      {
         var pageObj = args[1].pageObj, 
            textEl = args[1].textEl, 
            linkEls = textEl.getElementsByTagName("a"), 
            linkEl, link, embedUrl, embed,
            docRe = /^\/share\/page\/site\/(\w+)\/document-details\?nodeRef=(\w+:\/\/\w+\/[-\w]+)/,
            docMatch;
         
         for (var i = 0; i < linkEls.length; i++)
         {
            embed = null;
            linkEl = linkEls[i];
            if (Dom.getAttribute(linkEl, "target") == this.options.embedTarget && Dom.getAttribute(linkEl, "href") != null)
            {
               link = Dom.getAttribute(linkEl, "href");
               docMatch = docRe.exec(link);
               if (docMatch)
               {
                  var previewEl = document.createElement("DIV");
                  var swfDivEl = document.createElement("DIV");
                  var msgEl = document.createElement("DIV");
                  var elId = Dom.generateId(previewEl, "docpreview-");
                  Dom.insertBefore(previewEl, linkEl);
                  var titleTextEl = document.createElement("SPAN");
                  var titleImgEl = document.createElement("IMG");
                  Dom.setAttribute(titleTextEl, "id", elId + "-title-span");
                  Dom.setAttribute(titleImgEl, "id", elId + "-title-img");
                  Dom.setAttribute(swfDivEl, "id", elId + "-shadow-swf-div");
                  Dom.setAttribute(msgEl, "id", elId + "-swfPlayerMessage-div");
                  Dom.setStyle(swfDivEl, "width", "600px");
                  Dom.setStyle(swfDivEl, "height", "600px");
                  Dom.addClass(titleTextEl, "hidden");
                  Dom.addClass(titleImgEl, "hidden");
                  previewEl.appendChild(titleTextEl);
                  previewEl.appendChild(titleImgEl);
                  previewEl.appendChild(swfDivEl);
                  previewEl.appendChild(msgEl);

                  // Load the list of columns for this data type
                  Alfresco.util.Ajax.jsonGet(
                  {
                     // http://localhost:8080/share/proxy/alfresco/slingshot/doclib/node/workspace/SpacesStore/93270cb6-d617-4c04-9e92-e7961c2fb539
                     url: Alfresco.constants.PROXY_URI + "slingshot/doclib/node/" + docMatch[2].replace("://", "/"),
                     successCallback:
                     {
                        fn: function WikiDocumentParser__createFromHTML_success(p_response)
                        {
                           new Alfresco.WebPreview(elId).setOptions(
                                 {
                                    nodeRef: p_response.json.item.nodeRef,
                                    name: "",
                                    icon: "/components/images/generic-file-32.png",
                                    mimeType: p_response.json.item.mimetype,
                                    previews: ["doclib", "webpreview", "avatar", "medium", "imgpreview"],
                                    size: p_response.json.item.size
                                 }).setMessages(
                                    {"preview.fullwindow": "Maximize", "error.error": "The content cannot be displayed due to an unknown error.", "error.content": "The content cannot be displayed because it is not of type png, jpg, gif or swf.", "preview.fullscreen": "Fullscreen", "label.noPreview": "This document can't be previewed.<br\/><a class=\"theme-color-1\" href=\"{0}\">Click here to download it.<\/a>", "preview.fitWidth": "Fit Width", "preview.pageOf": "of", "error.io": "The preview could not be loaded from the server. ", "label.noContent": "This document has no content.", "preview.fitHeight": "Fit Height", "preview.fullwindowEscape": "Press Esc to exit full window mode", "label.preparingPreviewer": "Preparing previewer...", "label.noFlash": "To view the preview please download the latest Flash Player from the<br\/><a href=\"http:\/\/www.adobe.com\/go\/getflashplayer\">Adobe Flash Player Download Center<\/a>.", "preview.fitPage": "Fit Page", "preview.page": "Page", "preview.actualSize": "Actual Size"}
                              );
                           
                           YAHOO.Bubbling.fire("documentDetailsAvailable", {
                              documentDetails: p_response.json.item
                           });
                        },
                        scope: this
                     },
                     failureCallback:
                     {
                        fn: function WikiDocumentParser__createFromHTML_failure(p_response) {
                           alert("failed to load document details for " + docMatch[2]);
                        },
                        scope: this
                     },
                     scope: this,
                     noReloadOnAuthFailure: true
                  });
                  
                  embed = previewEl;
               }
               Dom.setAttribute(linkEl, "target", "_self");
            }
            if (embed != null)
            {
               Dom.insertBefore(embed, linkEl.parentNode);
               //linkEl.parentNode.replaceChild(embed, linkEl);
            }
         }
      }
      
   };
   
})();