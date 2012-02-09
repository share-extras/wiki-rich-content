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
   var Dom = YAHOO.util.Dom;
   
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
            linkEl, link, embed, embedContainer,
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
                     elId = Dom.generateId(previewEl, "preview-");

                  // Load the web-previewer mark-up using the custom page definition, which just includes that component
                  Alfresco.util.Ajax.request(
                  {
                     url: Alfresco.constants.URL_PAGECONTEXT + "site/" + pageObj.options.siteId + "/wiki-document-preview",
                     dataObj: {
                        nodeRef: nodeRef
                     },
                     successCallback:
                     {
                        fn: function WikiDocumentParser__createFromHTML_success(p_response, p_obj)
                        {
                           var phtml = p_response.serverResponse.responseText.replace(/template_x002e_web-preview/g, p_response.config.object.elId),
                              result = Alfresco.util.Ajax.sanitizeMarkup(phtml);
                           // Following code borrowed from Alfresco.util.Ajax._successHandler
                           // Use setTimeout to execute the script. Note scope will always be "window"
                           var scripts = result[1];
                           if (YAHOO.lang.trim(scripts).length > 0)
                           {
                              window.setTimeout(scripts, 0);
                              // Delay-call the PostExec function to continue response processing after the setTimeout above
                              YAHOO.lang.later(0, this, function() {
                                 Alfresco.util.YUILoaderHelper.loadComponents();
                              }, p_response.serverResponse);
                           }
                           p_response.config.object.previewEl.innerHTML = result[0];
                           Dom.addClass(p_response.config.object.previewEl, "wiki-doc-preview");
                        },
                        scope: this
                     },
                     // Unfortunately we cannot set execScripts to true, as we need to first update the element ids in the html to make them unique, before the scripts are run
                     // So instead we execute the scripts manually, above
                     //execScripts: true,
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