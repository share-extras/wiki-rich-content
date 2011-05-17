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
      onPageContentAvailable: function WikiDocumentParser_onPageContentAvailable(layer, args)
      {
         var pageObj = args[1].pageObj, 
            textEl = args[1].textEl, 
            linkEls = textEl.getElementsByTagName("a"), 
            linkEl, link, embedUrl, embed, embedContainer,
            includeLink,
            docRe = new RegExp("\\/document-details\\?nodeRef=(\\w+:\\/\\/\\w+\\/[-\\w]+)"),
            docMatch, nodeRef;
         for (var i = 0; i < linkEls.length; i++)
         {
            embed = null;
            linkEl = linkEls[i];
            if ((Dom.getAttribute(linkEl, "target") == this.options.embedTarget || Dom.getAttribute(linkEl, "target") == this.options.embedTargetNoLink) 
                  && Dom.getAttribute(linkEl, "href") != null)
            {
               includeLink = Dom.getAttribute(linkEl, "target") == this.options.embedTarget;
               link = Dom.getAttribute(linkEl, "href");
               docMatch = docRe.exec(link);
               if (docMatch)
               {
                  nodeRef = docMatch[1];
                  
                  var previewEl = document.createElement("DIV");
                  var swfDivEl = document.createElement("DIV");
                  var msgEl = document.createElement("DIV");
                  Dom.addClass(previewEl, "wiki-doc-preview");
                  var elId = Dom.generateId(previewEl, "docpreview-");
                  Dom.insertAfter(previewEl, linkEl);
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
                     url: Alfresco.constants.PROXY_URI + "slingshot/doclib/node/" + nodeRef.replace("://", "/"),
                     successCallback:
                     {
                        fn: function WikiDocumentParser__createFromHTML_success(p_response, p_obj)
                        {
                           // TODO Send a request to the server to determine what previews are available
                           // TODO Define some global messages
                     
                           if (p_response.json.item.mimetype.indexOf("video/") == 0 && 
                                 typeof(Alfresco.VideoPreview) != "undefined")
                           {
                              Dom.setStyle(p_response.config.object.swfDivEl, "height", "400px");
                              new Alfresco.VideoPreview(p_response.config.object.elId).setOptions(
                              {
                                 nodeRef: p_response.json.item.nodeRef,
                                 name: p_response.json.item.fileName,
                                 icon: "/components/images/generic-file-32.png",
                                 mimeType: p_response.json.item.mimetype,
                                 previews: [ "h264preview", "imgpreview", "imgpreviewfull" ],
                                 availablePreviews: [ "h264preview", "imgpreview", "imgpreviewfull" ],
                                 size: p_response.json.item.size
                              }).setMessages(
                                    {"preview.fullwindow": "Maximize", "error.error": "The content cannot be displayed due to an unknown error.", "error.content": "The content cannot be displayed because it is not of type png, jpg, gif or swf.", "preview.fullscreen": "Fullscreen", "label.noPreview": "This document can't be previewed.<br\/><a class=\"theme-color-1\" href=\"{0}\">Click here to download it.<\/a>", "preview.fitWidth": "Fit Width", "preview.pageOf": "of", "error.io": "The preview could not be loaded from the server. ", "label.noContent": "This document has no content.", "preview.fitHeight": "Fit Height", "preview.fullwindowEscape": "Press Esc to exit full window mode", "label.preparingPreviewer": "Preparing previewer...", "label.noFlash": "To view the preview please download the latest Flash Player from the<br\/><a href=\"http:\/\/www.adobe.com\/go\/getflashplayer\">Adobe Flash Player Download Center<\/a>.", "preview.fitPage": "Fit Page", "preview.page": "Page", "preview.actualSize": "Actual Size"}
                                    //Alfresco.messages.scope["org/alfresco/components/preview/web-preview.get"]
                              );
                           }
                           else if (p_response.json.item.mimetype.indexOf("audio/") == 0 && 
                                 typeof(Alfresco.AudioPreview) != "undefined")
                           {
                              Dom.setStyle(p_response.config.object.swfDivEl, "height", "100px");
                              new Alfresco.AudioPreview(p_response.config.object.elId).setOptions(
                              {
                                 nodeRef: p_response.json.item.nodeRef,
                                 name: p_response.json.item.fileName,
                                 icon: "/components/images/generic-file-32.png",
                                 mimeType: p_response.json.item.mimetype,
                                 previews: [ ],
                                 availablePreviews: [ ],
                                 size: p_response.json.item.size
                              }).setMessages(
                                    {"preview.fullwindow": "Maximize", "error.error": "The content cannot be displayed due to an unknown error.", "error.content": "The content cannot be displayed because it is not of type png, jpg, gif or swf.", "preview.fullscreen": "Fullscreen", "label.noPreview": "This document can't be previewed.<br\/><a class=\"theme-color-1\" href=\"{0}\">Click here to download it.<\/a>", "preview.fitWidth": "Fit Width", "preview.pageOf": "of", "error.io": "The preview could not be loaded from the server. ", "label.noContent": "This document has no content.", "preview.fitHeight": "Fit Height", "preview.fullwindowEscape": "Press Esc to exit full window mode", "label.preparingPreviewer": "Preparing previewer...", "label.noFlash": "To view the preview please download the latest Flash Player from the<br\/><a href=\"http:\/\/www.adobe.com\/go\/getflashplayer\">Adobe Flash Player Download Center<\/a>.", "preview.fitPage": "Fit Page", "preview.page": "Page", "preview.actualSize": "Actual Size"}
                                    //Alfresco.messages.scope["org/alfresco/components/preview/web-preview.get"]
                              );
                           }
                           else
                           {
                              new Alfresco.WebPreview(p_response.config.object.elId).setOptions(
                              {
                                 nodeRef: p_response.json.item.nodeRef,
                                 name: p_response.json.item.fileName,
                                 icon: "/components/images/generic-file-32.png",
                                 mimeType: p_response.json.item.mimetype,
                                 previews: ["doclib", "webpreview", "avatar", "medium", "imgpreview"],
                                 size: p_response.json.item.size
                              }).setMessages(
                                    {"preview.fullwindow": "Maximize", "error.error": "The content cannot be displayed due to an unknown error.", "error.content": "The content cannot be displayed because it is not of type png, jpg, gif or swf.", "preview.fullscreen": "Fullscreen", "label.noPreview": "This document can't be previewed.<br\/><a class=\"theme-color-1\" href=\"{0}\">Click here to download it.<\/a>", "preview.fitWidth": "Fit Width", "preview.pageOf": "of", "error.io": "The preview could not be loaded from the server. ", "label.noContent": "This document has no content.", "preview.fitHeight": "Fit Height", "preview.fullwindowEscape": "Press Esc to exit full window mode", "label.preparingPreviewer": "Preparing previewer...", "label.noFlash": "To view the preview please download the latest Flash Player from the<br\/><a href=\"http:\/\/www.adobe.com\/go\/getflashplayer\">Adobe Flash Player Download Center<\/a>.", "preview.fitPage": "Fit Page", "preview.page": "Page", "preview.actualSize": "Actual Size"}
                              );
                           }
                           
                           /*
                           YAHOO.Bubbling.fire("documentDetailsAvailable", {
                              documentDetails: p_response.json.item
                           });
                           */
                        },
                        scope: this
                     },
                     failureMessage: "Failed to load document details for " + nodeRef,
                     scope: this,
                     object: {
                        elId: elId,
                        swfDivEl: swfDivEl
                     },
                     noReloadOnAuthFailure: true
                  });
                  
                  embed = previewEl;
                  // Remove target="embed" from the link
                  Dom.setAttribute(linkEl, "target", "_self");
                  // Fix link href as TinyMCE can corrupt these
                  if (link.indexOf("http://document-details") == 0)
                  {
                     link = window.location.toString().substring(0, window.location.toString().indexOf("wiki-page")) +
                        "document-details?nodeRef=" + nodeRef;
                     Dom.setAttribute(linkEl, "href", link);
                  }
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
   
})();