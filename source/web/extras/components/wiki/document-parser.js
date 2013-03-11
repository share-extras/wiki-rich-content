/**
 * Copyright (C) 20010-2011 Share Extras contributors
 *
 * This file is part of the Share Extras project.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
* Extras root namespace.
* 
* @namespace Extras
*/
if (typeof Extras == "undefined" || !Extras)
{
   var Extras = {};
}

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
 * @class Extras.WikiDocumentParser
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
    * @return {Extras.WikiDocumentParser} The new parser instance
    * @constructor
    */
   Extras.WikiDocumentParser = function()
   {
      /* Decoupled event listeners */
      YAHOO.Bubbling.on("pageContentAvailable", this.onPageContentAvailable, this);
      
      return this;
   };

   Extras.WikiDocumentParser.prototype =
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
            docRe = /\/?document-details\/?\?nodeRef=(\w+):\/\/?(\w+\/[-\w]+)/gi,
            docMatch, nodeRef,
            dependencies = [], dependenciesLoaded = 0, fnQueue = [],
            hd = document.getElementsByTagName("head")[0];
         
         var queueFunction = function(fobj) {
            if (Alfresco.logger.isDebugEnabled())
            {
               Alfresco.logger.debug("Queue function");
            }
            fnQueue.push(fobj);
            if (dependencies.length == dependenciesLoaded)
            {
               executeQueue();
            }
         };
         
         var executeQueue = function() {
            if (Alfresco.logger.isDebugEnabled())
            {
               Alfresco.logger.debug("Executing queue of " + fnQueue.length + " scripts");
            }
            while ((fobj = fnQueue.pop()))
            {
               fobj.fn.apply(fobj.scope || window, fobj.args || []);
            }
         };

         // Load handler for the scripts/CSS. This makes sure that the 'done' handler passed in as 'fn' is only executed when all dependencies have loaded
         var onDependencyLoaded = function(e, obj) {
            if (Alfresco.logger.isDebugEnabled())
            {
               Alfresco.logger.debug("Loaded dependency " + obj);
            }
            dependenciesLoaded ++;
            if (dependencies.length == dependenciesLoaded)
            {
               executeQueue();
            }
         };
         
         var addScript = function(scriptPath) {
            if (Alfresco.logger.isDebugEnabled())
            {
               Alfresco.logger.debug("Adding JavaScript dependency " + scriptPath);
            }
            var scriptEl=document.createElement('script');
            scriptEl.setAttribute("type", "text/javascript");
            scriptEl.setAttribute("src", scriptPath);
            YUIEvent.addListener(scriptEl, "load", onDependencyLoaded, scriptPath, this);
            dependencies.push(scriptPath);
            hd.appendChild(scriptEl);
         };
         
         var addStyleSheet = function(cssPath) {
            if (Alfresco.logger.isDebugEnabled())
            {
               Alfresco.logger.debug("Adding CSS dependency " + cssPath);
            }
            var linkEl=document.createElement('link');
            linkEl.setAttribute("type", "text/css");
            linkEl.setAttribute("rel", "stylesheet");
            linkEl.setAttribute("href", cssPath);
            YUIEvent.addListener(linkEl, "load", onDependencyLoaded, cssPath, this);
            dependencies.push(cssPath);
            hd.appendChild(linkEl);
         };
         
         var addHeadResources = function(markup)
         {
            var scripts = [], css = [], item = null,
               csstext = "", csslines, line, importline, 
               scriptsregexp = /<script[^>]*src="([\s\S]*?)"[^>]*><\/script>/gi,
               cssregexp = /<style[^>]*media="screen"[^>]*>([\s\S]*?)<\/style>/gi, 
               importre = /@import "([\w\.\/_\-]*)";/;
            
            while ((item = scriptsregexp.exec(markup)))
            {
               scripts.push(item[1]);
            }
            
            while ((item = cssregexp.exec(markup)))
            {
               css.push(item[1]);
            }
            
            if (Alfresco.logger.isDebugEnabled())
            {
               Alfresco.logger.debug("Found " + scripts.length + " JS files, " + css.length + " CSS files");
            }
            
            // Add JS scripts to the page
            for (var i = 0; i < scripts.length; i++)
            {
               // Check script is not already on the page
               if (!Alfresco.util.arrayContains(dependencies, scripts[i]))
               {
                  addScript(scripts[i]);
               }
            }

            // Add CSS imports to the page - but use <link> tags so that we can attach event handlers
            csslines = YAHOO.lang.trim(css.join("\n")).split("\n");
            for (var i = 0; i < csslines.length; i++)
            {
               line = YAHOO.lang.trim(csslines[i]);
               if (line)
               {
                  importline = importre.exec(line);
                  if ((importline))
                  {
                     // Check script is not already on the page
                     if (!Alfresco.util.arrayContains(dependencies, importline[1]))
                     {
                        addStyleSheet(importline[1]);
                     }
                  }
                  else
                  {
                     if (Alfresco.logger.isDebugEnabled())
                     {
                        Alfresco.logger.debug("Adding CSS text " + line);
                     }
                     csstext += (line + "\n");
                  }
               }
            }
            
            // Add remaining CSS to the page
            if (csstext)
            {
               var styleEl=document.createElement('style');
               styleEl.setAttribute("type", "text/css");
               styleEl.setAttribute("media", "screen");
               styleEl.innerHTML = csstext;
               hd.appendChild(styleEl);
            }
         };
         
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
                  nodeRef = docMatch[1] + "://" + docMatch[2];
                  
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
                           // Run any inline scripts in the preview component markup
                           // Following code borrowed from Alfresco.util.Ajax._successHandler
                           // Use setTimeout to execute the script. Note scope will always be "window"
                           var onloadedfn = function() {
                              var phtml = p_response.serverResponse.responseText.replace(/template_x002e_web-preview/g, p_response.config.object.elId),
                                 result = Alfresco.util.Ajax.sanitizeMarkup(phtml),
                                 scripts = result[1];
                              if (YAHOO.lang.trim(scripts).length > 0)
                              {
                                 // Run the script content immediately
                                 window.setTimeout(scripts, 0);
                                 // Delay-call the PostExec function to continue response processing after the setTimeout above
                                 YAHOO.lang.later(0, this, function() {
                                    Alfresco.util.YUILoaderHelper.loadComponents();
                                 }, p_response.serverResponse);
                              }
                           }

                           var phtml = p_response.serverResponse.responseText.replace(/template_x002e_web-preview/g, p_response.config.object.elId),
                              result = Alfresco.util.Ajax.sanitizeMarkup(phtml);

                           if (Alfresco.logger.isDebugEnabled())
                           {
                              Alfresco.logger.debug("Add head resources");
                           }
                           // Add <script> and <style> tags to the doc header
                           addHeadResources(phtml);

                           if (Alfresco.logger.isDebugEnabled())
                           {
                              Alfresco.logger.debug("Add markup");
                           }
                           // Add HTML markup to the Dom
                           p_response.config.object.previewEl.innerHTML = YAHOO.lang.trim(result[0].replace(/<style.*<\/style>/m, '').replace(/<!--.*-->/m, ''));
                           Dom.addClass(p_response.config.object.previewEl, "wiki-doc-preview");

                           if (Alfresco.logger.isDebugEnabled())
                           {
                              Alfresco.logger.debug("Queue functions");
                           }
                           // Queue function to be run after loading head resources
                           queueFunction({ scope: this, args: [], fn: function() {
                              onloadedfn.call();
                           }});

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
   
   new Extras.WikiDocumentParser();
   
})();