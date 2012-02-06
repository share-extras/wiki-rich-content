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
                  
                  var previewEl = document.createElement("DIV");
                  var swfDivEl = document.createElement("DIV");
                  var msgEl = document.createElement("DIV");
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
                           var nodeRef = p_response.json.item.nodeRef,
                              fileName = p_response.json.item.fileName,
                              mimetype = p_response.json.item.mimetype,
                              size = p_response.json.item.size,
                              icon = "/components/images/generic-file-32.png";
                           
                           // TODO Define some global messages
                     
                           if (mimetype.indexOf("video/") == 0 && 
                                 typeof(Alfresco.VideoPreview) != "undefined")
                           {
                              Dom.setStyle(p_response.config.object.swfDivEl, "height", "400px");
                              Dom.addClass(p_response.config.object.previewEl, "wiki-video-preview");
                              new Alfresco.VideoPreview(p_response.config.object.elId).setOptions(
                              {
                                 nodeRef: nodeRef,
                                 name: fileName,
                                 icon: icon,
                                 mimeType: mimetype,
                                 size: size
                              }).setMessages(
                                    Alfresco.messages.scope["Alfresco.WikiPage"]
                              );
                           }
                           else if (mimetype.indexOf("audio/") == 0 && 
                                 typeof(Alfresco.AudioPreview) != "undefined")
                           { 
                              Dom.setStyle(p_response.config.object.swfDivEl, "height", "100px");
                              Dom.addClass(p_response.config.object.previewEl, "wiki-audio-preview");
                              new Alfresco.AudioPreview(p_response.config.object.elId).setOptions(
                              {
                                 nodeRef: nodeRef,
                                 name: fileName,
                                 icon: icon,
                                 mimeType: mimetype,
                                 size: size
                              }).setMessages(
                                    Alfresco.messages.scope["Alfresco.WikiPage"]
                              );
                           }
                           else
                           {
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
                                            icon: icon,
                                            mimeType: mimetype,
                                            previews: previews,
                                            size: size
                                         }).setMessages(
                                               Alfresco.messages.scope["Alfresco.WikiPage"]
                                         );
                                     },
                                     scope: this,
                                     obj:
                                     {
                                     }
                                  },
                                  failureMessage: "Could not load thumbnail definitions list"
                              });
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
                        swfDivEl: swfDivEl,
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