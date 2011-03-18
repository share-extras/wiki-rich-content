/**
 * Wiki TOC parser. 
 * Parser that inserts a table of contents into a wiki page.
 * 
 * @namespace Alfresco
 * @class Alfresco.WikiTOCParser
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
    * WikiTOCParser constructor.
    * 
    * @return {Alfresco.WikiTOCParser} The new parser instance
    * @constructor
    */
   Alfresco.WikiTOCParser = function()
   {
      return this;
   };

   Alfresco.WikiTOCParser.prototype =
   {      
      /**
       * Parse the wiki page and insert a table of contents into the document.
       * 
       * <p>Unlike Alfresco.WikiParser.parse() this method uses the Dom to actually
       * insert the new content, rather than simply returning the modified markup
       * for later insertion.</p>
       *
       * @method parse
       * @param page {Array} The wiki page instance
       * @param text {String} The wiki page markup
       */
      parse: function WikiTOCParser_parse(page, text)
      {
         return this._insertToc(page, text);
      },
      
      /**
       * Add table of contents to the wiki page.
       *
       * @method parse
       * @param text {String} The text to render
       * @private
       */
      _insertToc: function WikiTOCParser__insertToc(page, textElement, text)
      {
         var tocContent = "";
         var hCounts = [0, 0, 0, 0, 0, 0, 0];
         var anames = [];
         var currLevel = 0;
         
         var hdrElems = Dom.getElementsBy(function(el) {
            return el.nodeName == "H1" || el.nodeName == "H2" || el.nodeName == "H3" || 
               el.nodeName == "H4" || el.nodeName == "H5" || el.nodeName == "H6";
         }, null, textElement);
         
         for (var i = 0; i < hdrElems.length; i++)
         {
            var hdrElem = hdrElems[i],
               hdrLevel = parseInt(hdrElem.nodeName.substring(1, 2), 10),
               hdrText = hdrElem.textContent||hdrElem.innerText;

            // Increment counters
            hCounts[hdrLevel] ++;
            hCounts[0] ++;
            
            var aname = this._tocAnchorName(hdrText, anames);

            // Add to TOC
            for (var j=currLevel; j<hdrLevel; j++) tocContent += "\n<ul>\n<li class=\"toc-" + (j + 1) + "\">";
            for (var j=currLevel; j>hdrLevel; j--) tocContent += "\n</li>\n</ul>";
            if (currLevel == hdrLevel) tocContent += "</li>\n<li class=\"toc-" + hdrLevel + "\">";
            tocContent += "<a href=\"#" + aname + "\">" + this._tocItemNum(hdrLevel, hCounts) + " " + hdrText + "</a>";

            // Add <a name=""> elems in the page text plus whatever came before the match
            hdrElem.innerHTML = "<a name=\"" + aname + "\">" + hdrElem.innerHTML + "</a>";
            
            currLevel = hdrLevel;
         }

         // Complete wiki TOC
         for (var i=currLevel; i>1; i--)
         {
            tocContent += "\n</ul>";
         }
         var containerDiv = document.createElement("DIV");
         Dom.addClass(containerDiv, "wiki-toc-container");
         containerDiv.innerHTML = "<div class=\"wiki-toc\">" + 
            "<div class=\"toc-title\"><h2>" + page.msg("label.tocHeader") + 
            "</h2></div>" + tocContent + "</div><div class=\"break\"></div>";
         
         // Add TOC
         var elems, n = 0;
         
         // Insert TOC before elements with toc-before class
         elems = Dom.getElementsByClassName("toc-before", null, textElement);
         for (var i = 0; i < elems.length; i++)
         {
            Dom.insertBefore(containerDiv, elems[i]);
            n ++;
         }
         
         // Insert TOC after elements with toc-after class
         elems = Dom.getElementsByClassName("toc-after", null, textElement);
         for (var i = 0; i < elems.length; i++)
         {
            Dom.insertAfter(containerDiv, elems[i]);
            n ++;
         }
         
         // Support __TOC__ marker, like MediaWiki
         // See http://meta.wikimedia.org/wiki/MediaWiki_FAQ#How_do_I_add_a_table_of_contents.3F
         elems = Dom.getElementsBy(function(el) {
            return YAHOO.lang.trim(el.innerHTML) == "__TOC__"
         }, "p", textElement);
         for (var i = 0; i < elems.length; i++)
         {
            Dom.insertAfter(containerDiv, elems[i]);
            textElement.removeChild(elems[i]);
            n ++;
         }
         
         // Support <wiki:toc /> marker, similar to http://code.google.com/p/support/wiki/WikiSyntax
         elems = Dom.getElementsBy(function(el) {
            return el.nodeName == "WIKI:TOC"
         }, null, textElement);
         for (var i = 0; i < elems.length; i++)
         {
            Dom.insertAfter(containerDiv, elems[i]);
            textElement.removeChild(elems[i]);
            n ++;
         }
         
         // Insert at start of document if no TOC has been inserted yet
         if (n == 0)
         {
            var fc = Dom.getFirstChild();
            if (fc.nodeName == "P")
            {
               Dom.insertAfter(containerDiv, fc);
            }
            else
            {
               Dom.insertBefore(containerDiv, fc);
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
   
})();