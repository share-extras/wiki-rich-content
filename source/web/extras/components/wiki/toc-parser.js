/**
 * Parser that inserts a table of contents into a wiki page.
 * 
 * @namespace Alfresco
 * @class Alfresco.WikiTOCParser
 * @author Will Abson
 */
(function()
{
   /**
    * YUI Library aliases
    */
   var Dom = YAHOO.util.Dom,
       Event = YAHOO.util.Event,
       Element = YAHOO.util.Element,
       Selector = YAHOO.util.Selector;
   
   /**
    * WikiTOCParser constructor.
    * 
    * @return {Alfresco.WikiTOCParser} The new parser instance
    * @constructor
    */
   Alfresco.WikiTOCParser = function()
   {
      /* Decoupled event listeners */
      YAHOO.Bubbling.on("pageContentAvailable", this.onPageContentAvailable, this);
      
      return this;
   };

   Alfresco.WikiTOCParser.prototype =
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
          * Minimum number of headings needed before a TOC is added
          *
          * @property tocMinHeadings
          * @type int
          * @default 2
          */
         tocMinHeadings: 2
      },
      
      /**
       * Event handler called when the "pageContentAvailable" event is received.
       * 
       * @method onPageContentAvailable
       * @param pageObj {Alfresco.WikiPage} The wiki page instance
       * @param textEl {HTMLElement} The wiki page markup container element
       */
      onPageContentAvailable: function WikiTOCParser_onPageContentAvailable(layer, args)
      {
         var pageObj = args[1].pageObj;
         if (pageObj.options == null || (pageObj.options.mode != "details" && 
               pageObj.options.tocEnabled !== false))
         {
            return this._insertToc(pageObj, args[1].textEl);
         }
      },

      /**
       * Parse the wiki page and insert a table of contents into the document.
       * 
       * <p>Unlike Alfresco.WikiParser.parse() this method uses the Dom to actually
       * insert the new content, rather than simply returning the modified markup
       * for later insertion.</p>
       * 
       * @method _insertToc
       * @param pageObj {Alfresco.WikiPage} The wiki page instance
       * @param textEl {HTMLElement} The wiki page markup container element
       * @private
       */
      _insertToc: function WikiTOCParser__insertToc(pageObj, textEl)
      {
         var tocData = {}, tocContent = "";
         var hCounts = [0, 0, 0, 0, 0, 0, 0];
         var anames = [], minLevel = 6;
         var currLevel = 0, i, hdrElem, hdrLevel, hdrText, tocItem;
         
         var hdrElems = Dom.getElementsBy(function(el) {
            return el.nodeName == "H1" || el.nodeName == "H2" || el.nodeName == "H3" || 
               el.nodeName == "H4" || el.nodeName == "H5" || el.nodeName == "H6";
         }, null, textEl);
         
         if (hdrElems.length >= this.options.tocMinHeadings)
         {
            tocData.items = [];
            
            // Iterate through each heading element, collect information needed to build the TOC
            // and add anchor elements
            for (i = 0; i < hdrElems.length; i++)
            {
               hdrElem = hdrElems[i],
                  hdrLevel = parseInt(hdrElem.nodeName.substring(1, 2), 10),
                  hdrText = YAHOO.lang.trim(hdrElem.textContent||hdrElem.innerText);
               
               if (hdrLevel < minLevel)
               {
                  minLevel = hdrLevel;
               }

               var aname = this._tocAnchorName(hdrText, anames);
               
               tocData.items.push({
                  "level": hdrLevel,
                  "text": hdrText,
                  "name": aname
               });

               // Add <a name=""> elems in the page text plus whatever came before the match
               hdrElem.innerHTML = "<a name=\"" + aname + "\"></a>" + hdrElem.innerHTML.replace(/<br ?\/?>/, "");
               var span = document.createElement("SPAN");
               span.innerHTML = " <a href=\"#" + aname + "\" class=\"section-anchor\">¶</a>";
               Dom.setStyle(span, "visibility", "hidden");
               hdrElem.appendChild(span);
               Event.addListener(hdrElem, "mouseover", function(e) {
                  Dom.setStyle(Dom.getLastChild(this), "visibility", "visible")
               });
               Event.addListener(hdrElem, "mouseout", function(e) {
                  Dom.setStyle(Dom.getLastChild(this), "visibility", "hidden")
               });
            }
            
            // Check the lowest level heading, if it is not H1 then we need to move the
            // numbers along
            if (minLevel > 1)
            {
               for (i = 0; i < tocData.items.length; i++)
               {
                  tocData.items[i].level -= minLevel - 1;
               }
            }
            
            // Generate the TOC HTML
            for (i = 0; i < tocData.items.length; i++)
            {
               tocItem = tocData.items[i], 
                  hdrLevel = tocItem.level,
                  hdrText = tocItem.text, 
                  hdrName = tocItem.name;
               
               // Increment counters
               hCounts[hdrLevel] ++;
               hCounts[0] ++;
               
               // Add to TOC
               for (var j=currLevel; j<hdrLevel; j++) tocContent += "\n<ul>\n<li class=\"toc-" + (j + 1) + "\">";
               for (var j=currLevel; j>hdrLevel; j--) tocContent += "\n</li>\n</ul>";
               if (currLevel == hdrLevel) tocContent += "</li>\n<li class=\"toc-" + hdrLevel + "\">";
               tocContent += "<a href=\"#" + hdrName + "\">" + this._tocItemNum(hdrLevel, hCounts) + " " + hdrText + "</a>";
               
               // Cache last header level
               currLevel = hdrLevel;
               
               // Reset header counts of sub-headings
               for (var j = hdrLevel + 1; j < hCounts.length; j++)
               {
                  hCounts[j] = 0;
               }
            }

            // Complete TOC HTML
            for (var i=currLevel; i>1; i--)
            {
               tocContent += "\n</ul>";
            }
            
            function generateTocDiv(tc)
            {
               var containerDiv = document.createElement("DIV"),
                  tocDiv = document.createElement("DIV"),
                  tocTitleDiv = document.createElement("DIV"),
                  tocContentDiv = document.createElement("DIV"),
                  brDiv = document.createElement("DIV"),
                  toggleSpan = document.createElement("SPAN"),
                  toggleLink = document.createElement("A");
               
               Dom.addClass(containerDiv, "wiki-toc-container");
               Dom.addClass(tocDiv, "wiki-toc");
               Dom.addClass(tocTitleDiv, "toc-title");
               Dom.addClass(tocContentDiv, "toc-content");
               Dom.addClass(brDiv, "break");
               Dom.addClass(toggleSpan, "toc-toggle");
               Dom.addClass(toggleLink, "theme-color-1");
               Dom.setAttribute(toggleLink, "href", "#");
               
               tocTitleDiv.innerHTML = "<h2>" + pageObj.msg("label.tocHeader") + "</h2>";
               tocContentDiv.innerHTML = tc;
               
               Event.addListener(toggleLink, "click", function(e) {
                  Event.preventDefault(e);
                  var content = Dom.getNextSibling(this.parentNode.parentNode.parentNode);
                  if (Dom.getStyle(content, "display") == "none")
                  {
                     Dom.setStyle(content, "display", "block");
                     this.innerHTML = "[" + pageObj.msg("label.tocHide") + "]";
                  }
                  else
                  {
                     Dom.setStyle(content, "display", "none");
                     this.innerHTML = "[" + pageObj.msg("label.tocShow") + "]";
                  }
               });
               toggleLink.innerHTML = "[" + pageObj.msg("label.tocHide") + "]";
               toggleSpan.appendChild(toggleLink);

               Dom.getFirstChild(tocTitleDiv).appendChild(toggleSpan); // Append into h2 elem
               tocDiv.appendChild(tocTitleDiv);
               tocDiv.appendChild(tocContentDiv);
               containerDiv.appendChild(tocDiv);
               containerDiv.appendChild(brDiv);
               return containerDiv;
            }
            
            // Add TOC
            var elems, n = 0;
            
            // Insert TOC before elements with toc-before class
            elems = Dom.getElementsByClassName("toc-before", null, textEl);
            for (var i = 0; i < elems.length; i++)
            {
               Dom.insertBefore(generateTocDiv(tocContent), elems[i]);
               n ++;
            }
            
            // Insert TOC after elements with toc-after class
            elems = Dom.getElementsByClassName("toc-after", null, textEl);
            for (var i = 0; i < elems.length; i++)
            {
               var sib = Dom.getNextSibling(elems[i]);
               if (sib == null || !Dom.hasClass(sib, "wiki-toc-container"))
               {
                  Dom.insertAfter(generateTocDiv(tocContent), elems[i]);
                  n ++;
               }
            }
            
            // Support __TOC__ marker, like MediaWiki
            // See http://meta.wikimedia.org/wiki/MediaWiki_FAQ#How_do_I_add_a_table_of_contents.3F
            elems = Dom.getElementsBy(function(el) {
               return YAHOO.lang.trim(el.innerHTML).replace(/<br ?\/?>/, "") == "__TOC__"
            }, "p", textEl);
            for (var i = 0; i < elems.length; i++)
            {
               Dom.insertAfter(generateTocDiv(tocContent), elems[i]);
               textEl.removeChild(elems[i]);
               n ++;
            }
            
            // Support <wiki:toc /> marker, similar to http://code.google.com/p/support/wiki/WikiSyntax
            // Warning: this is not fully tested
            elems = Dom.getElementsBy(function(el) {
               return el.nodeName == "WIKI:TOC"
            }, null, textEl);
            for (var i = 0; i < elems.length; i++)
            {
               Dom.insertAfter(generateTocDiv(tocContent), elems[i]);
               textEl.removeChild(elems[i]);
               n ++;
            }
            
            // Insert at start of document if no TOC has been inserted yet
            if (n == 0)
            {
               // Insert before first heading
               var hnodes = Selector.query("h1, h2, h3, h4, h5, h6", textEl);
               if (hnodes != null)
               {
                  Dom.insertBefore(generateTocDiv(tocContent), hnodes[0]);
               }
            }
         }
      },
      
      /**
       * Generate a valid anchor name from the specified heading text
       *
       * @method _tocAnchorName
       * @param heading {String} The heading text
       * @param usedNames {array} Array containing the list of anchor names already used
       * @return {string} The anchor text
       * @private
       */
      _tocAnchorName: function WikiTOCParser__tocAnchorName(heading, usedNames)
      {
         var name = "";
         
         for (var i=0; i<heading.length; i++)
         {
            var letter = heading.charAt(i);
            if (letter >= "A" && letter <= "Z" || letter >= "a" && letter <= "z" ||
               letter >= "0" && letter <= "9")
            {
               name += letter;
            }
            else
            {
               name += "_";
            }
         }
         
         // If the name is taken we add a suffix on
         var thisName = name; var i = 1;
         while (this._tocContainsName(thisName, usedNames))
         {
            thisName = name + "_" + i;
            i ++;
         }
         usedNames.push(thisName);
         return thisName;
      },

      /**
       * Check whether a given name value exists in an array of existing values
       *
       * @method _tocContainsName
       * @param name {String} The value being searched for
       * @param usedNames {array} The array to search within
       * @return {boolean} true if found in the array, false otherwise
       * @private
       */
      _tocContainsName: function WikiTOCParser__tocContainsName(name, usedNames)
      {
         for (var i=0; i<usedNames.length; i++)
         {
            if (usedNames[i] == name)
            {
               return true;
            }
         }
         return false;
      },

      /**
       * Generate the number to be used for a TOC item. Item consist of one
       * or more integers, joined into a string value and separated by dots.
       *
       * @method _tocItemNum
       * @param level {int} The heading level, e.g. h1=1, h2=2
       * @param counts {array} The numbers of previous headings found at each preceding level, so far
       * @return {string} The generated item number, e.g. "1.2.1"
       * @private
       */
      _tocItemNum: function WikiTOCParser__tocItemNum(level, counts)
      {
         var num = "";
         for (var i=1; i<=level; i++)
         {
            num += ((num != "") ? "." : "") + counts[i];
         }
         return num;
      }
      
   };
   
   //new Alfresco.WikiTOCParser();
   
})();