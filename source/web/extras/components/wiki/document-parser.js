/**
 * Parser that converts document links to embedded document previews within the page.
 * 
 * <p>The parser looks for link elements in the page that point to a document details page,
 * and which are tagged with the target or class attribute values <tt>embed</tt> for an 
 * in-line preview, placed before the link, or <tt>embednolink</tt> for an in-line preview
 * replacing the link.<p>
 * 
 * <p>To make the process more user-friendly, it is possible to add the link targets to the 
 * add/edit hyperlink pop-up in TinyMCE. This requires the following configuration attribute
 * to be added in the editor config which is (unfortunately) hard-coded inside the 
 * Alfresco.WikiPage.prototype._setupEditForm method in the client-side 
 * components/wiki/page.js file.</p>
 * 
 * <code>theme_advanced_link_targets: this.msg("tinymce.linkTargets.embed") + "=embed," + this.msg("tinymce.linkTargets.embedNoLink") + "=embednolink"</code>
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
         embedTargetNoLink: "embednolink",
         
         pluginConditions: [{"attributes": {"thumbnail": "imgpreview", "mimeType": "video\/mp4"}, "plugins": [{"attributes": {"poster": "imgpreview", "posterFileSuffix": ".png"}, "name": "StrobeMediaPlayback"}, {"attributes": {"poster": "imgpreview", "posterFileSuffix": ".png"}, "name": "FlashFox"}, {"attributes": {"poster": "imgpreview", "posterFileSuffix": ".png"}, "name": "Video"}]}, {"attributes": {"thumbnail": "imgpreview", "mimeType": "video\/m4v"}, "plugins": [{"attributes": {"poster": "imgpreview", "posterFileSuffix": ".png"}, "name": "StrobeMediaPlayback"}, {"attributes": {"poster": "imgpreview", "posterFileSuffix": ".png"}, "name": "FlashFox"}, {"attributes": {"poster": "imgpreview", "posterFileSuffix": ".png"}, "name": "Video"}]}, {"attributes": {"thumbnail": "imgpreview", "mimeType": "video\/x-flv"}, "plugins": [{"attributes": {"poster": "imgpreview", "posterFileSuffix": ".png"}, "name": "StrobeMediaPlayback"}, {"attributes": {"poster": "imgpreview", "posterFileSuffix": ".png"}, "name": "FlashFox"}]}, {"attributes": {"thumbnail": "imgpreview", "mimeType": "video\/quicktime"}, "plugins": [{"attributes": {"poster": "imgpreview", "posterFileSuffix": ".png"}, "name": "StrobeMediaPlayback"}]}, {"attributes": {"thumbnail": "imgpreview", "mimeType": "video\/ogg"}, "plugins": [{"attributes": {"poster": "imgpreview", "posterFileSuffix": ".png"}, "name": "Video"}]}, {"attributes": {"thumbnail": "imgpreview", "mimeType": "video\/webm"}, "plugins": [{"attributes": {"poster": "imgpreview", "posterFileSuffix": ".png"}, "name": "Video"}]}, {"attributes": {"mimeType": "video\/mp4"}, "plugins": [{"attributes": {}, "name": "StrobeMediaPlayback"}, {"attributes": {}, "name": "FlashFox"}, {"attributes": {}, "name": "Video"}]}, {"attributes": {"mimeType": "video\/x-m4v"}, "plugins": [{"attributes": {}, "name": "StrobeMediaPlayback"}, {"attributes": {}, "name": "FlashFox"}, {"attributes": {}, "name": "Video"}]}, {"attributes": {"mimeType": "video\/x-flv"}, "plugins": [{"attributes": {}, "name": "StrobeMediaPlayback"}, {"attributes": {}, "name": "FlashFox"}]}, {"attributes": {"mimeType": "video\/quicktime"}, "plugins": [{"attributes": {}, "name": "StrobeMediaPlayback"}]}, {"attributes": {"mimeType": "video\/ogg"}, "plugins": [{"attributes": {}, "name": "Video"}]}, {"attributes": {"mimeType": "video\/webm"}, "plugins": [{"attributes": {}, "name": "Video"}]}, {"attributes": {"mimeType": "audio\/mpeg"}, "plugins": [{"attributes": {}, "name": "StrobeMediaPlayback"}, {"attributes": {}, "name": "FlashFox"}, {"attributes": {}, "name": "Audio"}]}, {"attributes": {"mimeType": "audio\/x-wav"}, "plugins": [{"attributes": {}, "name": "Audio"}]}, {"attributes": {"thumbnail": "webpreview"}, "plugins": [{"attributes": {"paging": "true", "src": "webpreview"}, "name": "WebPreviewer"}]}, {"attributes": {"thumbnail": "imgpreview"}, "plugins": [{"attributes": {"src": "imgpreview"}, "name": "Image"}]}, {"attributes": {"mimeType": "image\/jpeg"}, "plugins": [{"attributes": {"srcMaxSize": "500000"}, "name": "Image"}]}, {"attributes": {"mimeType": "image\/png"}, "plugins": [{"attributes": {"srcMaxSize": "500000"}, "name": "Image"}]}, {"attributes": {"mimeType": "image\/gif"}, "plugins": [{"attributes": {"srcMaxSize": "500000"}, "name": "Image"}]}, {"attributes": {"mimeType": "application\/x-shockwave-flash"}, "plugins": [{"attributes": {}, "name": "Flash"}]}]
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
            docRe = new RegExp("\\/document-details\\/?\\?nodeRef=(\\w+:\\/\\/\\w+\\/[-\\w]+)"),
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
                  
                  // 4.0 style - much simpler
                  var previewEl = document.createElement("DIV"), // container element
                     bdEl = document.createElement("DIV"), // body element
                     pEl = document.createElement("DIV"), // previewer element
                     msgEl = document.createElement("DIV"), // message element
                     elId = Dom.generateId(previewEl, "preview-");

                  msgEl.innerHTML = "Preparing preview..."; // optional
                  Dom.addClass(msgEl, "message"); // optional
                  pEl.appendChild(msgEl); // optional
                  Dom.setAttribute(pEl, "id", elId + "-previewer-div");
                  Dom.addClass(pEl, "previewer");
                  bdEl.appendChild(pEl);
                  Dom.setAttribute(bdEl, "id", elId + "-body");
                  Dom.addClass(bdEl, "web-preview");
                  previewEl.appendChild(bdEl);

                  // Load the list of columns for this data type
                  Alfresco.util.Ajax.jsonGet(
                  {
                     url: Alfresco.constants.PROXY_URI + "slingshot/doclib/node/" + nodeRef.replace("://", "/"),
                     successCallback:
                     {
                        fn: function WikiDocumentParser__createFromHTML_success(p_response, p_obj)
                        {
                           var nodeRef = p_response.json.item.nodeRef,
                              fileName = p_response.json.item.fileName,
                              mimetype = p_response.json.item.mimetype,
                              size = p_response.json.item.size;
                           
                           // TODO Define some global messages
                           /*
                            * The web preview component can't retrieve the list of previews itself,
                            * so we need to do this for it.
                            */
                            Alfresco.util.Ajax.jsonGet(
                            {
                               url: Alfresco.constants.PROXY_URI + "api/node/" + nodeRef.replace(":/", "") + "/content/thumbnaildefinitions",
                               successCallback:
                               {
                                  fn: function WDP_onLoadThumbnailDefinitions(p_thmbResp, p_obj)
                                  {
                                      var previews = p_thmbResp.json;
                                      Dom.addClass(p_response.config.object.previewEl, "wiki-doc-preview");
                                      new Alfresco.WebPreview(p_response.config.object.elId).setOptions(
                                      {
                                         nodeRef: nodeRef,
                                         name: fileName,
                                         mimeType: mimetype,
                                         size: size,
                                         thumbnails: previews,
                                         pluginConditions: this.options.pluginConditions
                                      }).setMessages(
                                            Alfresco.messages.scope["Extras.WikiPageParsers"]
                                      );
                                  },
                                  scope: this
                               },
                               failureMessage: "Could not load thumbnail definitions list"
                           });
                           
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
                        previewEl: previewEl
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
   
   //new Alfresco.WikiDocumentParser();
   
})();