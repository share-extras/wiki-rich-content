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
 * Parser that uses Google Code Prettify to <a href="http://en.wikipedia.org/wiki/Prettyprint">prettyprint</a> 
 * code blocks (<tt>&lt;pre&gt;</tt> and <tt>&lt;code&gt;</tt>) in a wiki page.
 * 
 * <p>Could be extended in the future to support other prettifiers, e.g. SyntaxHighlighter.</p>
 * 
 * @namespace Alfresco
 * @class Extras.WikiPrettyprintParser
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
    * WikiPrettyprintParser constructor.
    * 
    * @return {Extras.WikiPrettyprintParser} The new parser instance
    * @constructor
    */
   Extras.WikiPrettyprintParser = function()
   {
      /* Decoupled event listeners */
      YAHOO.Bubbling.on("pageContentAvailable", this.onPageContentAvailable, this);
      
      return this;
   };

   Extras.WikiPrettyprintParser.prototype =
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
          * Whether to automatically add the prettyprint class to all code sections found
          *
          * @property addClass
          * @type boolean
          * @default true
          */
         addClass: true
      },
      
      /**
       * Event handler called when the "pageContentAvailable" event is received.
       * 
       * @method onPageContentAvailable
       * @param pageObj {Alfresco.WikiPage} The wiki page instance
       * @param textEl {HTMLElement} The wiki page markup container element
       */
      onPageContentAvailable: function WikiPrettyprintParser_onPageContentAvailable(layer, args)
      {
         var pageObj = args[1].pageObj, textEl = args[1].textEl;
         if (typeof(prettyPrint) == "function")
         {
            if (this.options.addClass)
            {
               var pElems = textEl.getElementsByTagName("pre");
               for ( var i = 0; i < pElems.length; i++)
               {
                  if (!Dom.hasClass(pElems[i], "no-prettyprint"))
                  {
                     Dom.addClass(pElems[i], "prettyprint");
                  }
                  else
                  {
                     Dom.removeClass(pElems[i], "no-prettyprint")
                  }
               }
               var cElems = textEl.getElementsByTagName("code");
               for ( var i = 0; i < cElems.length; i++)
               {
                  if (!Dom.hasClass(pElems[i], "no-prettyprint"))
                  {
                     Dom.addClass(pElems[i], "prettyprint");
                  }
                  else
                  {
                     Dom.removeClass(pElems[i], "no-prettyprint")
                  }
               }
            }
            prettyPrint();
         }
      }
      
   };
   
   //new Extras.WikiPrettyprintParser();
   
})();