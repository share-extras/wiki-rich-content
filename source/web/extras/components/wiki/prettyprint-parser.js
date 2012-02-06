/**
 * Parser that uses Google Code Prettify to <a href="http://en.wikipedia.org/wiki/Prettyprint">prettyprint</a> 
 * code blocks (<tt>&lt;pre&gt;</tt> and <tt>&lt;code&gt;</tt>) in a wiki page.
 * 
 * <p>Could be extended in the future to support other prettifiers, e.g. SyntaxHighlighter.</p>
 * 
 * @namespace Alfresco
 * @class Alfresco.WikiPrettyprintParser
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
    * @return {Alfresco.WikiPrettyprintParser} The new parser instance
    * @constructor
    */
   Alfresco.WikiPrettyprintParser = function()
   {
      /* Decoupled event listeners */
      YAHOO.Bubbling.on("pageContentAvailable", this.onPageContentAvailable, this);
      
      return this;
   };

   Alfresco.WikiPrettyprintParser.prototype =
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
   
   //new Alfresco.WikiPrettyprintParser();
   
})();