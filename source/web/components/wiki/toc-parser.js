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
      _insertToc: function WikiTOCParser__insertToc(page, text)
      {
         var currPos = 0;
         var re = /<h([1-6])([\s]*[\w]*=?"?[^"]*?"?)>(.*?)<(?=\/h\1)\/h(\1)>/igm;
         var myArray;
         var tocContent = "";
         var pageContent = "";
         var hCounts = [0, 0, 0, 0, 0, 0, 0];
         var anames = new Array();
         var currLevel = 0;
         while (myArray = re.exec(text))
         {
            // Check myArray[1] == myArray[3] and in range 1-6
            // Increment counters
            hCounts[myArray[1]] ++;
            hCounts[0] ++;
            // Add to TOC
            var aname = this._tocAnchorName(myArray[3], anames);
            for (var i=currLevel; i<myArray[1]; i++) tocContent += "\n<ul>\n<li class=\"toc-" + (parseInt(i)+1).valueOf() + "\">";
            for (var i=currLevel; i>myArray[1]; i--) tocContent += "\n</li>\n</ul>";
            if (currLevel == myArray[1]) tocContent += "</li>\n<li class=\"toc-" + myArray[1] + "\">";
            tocContent += "<a href=\"#" + aname + "\">" + this._tocItemNum(myArray[1], hCounts) + " " + myArray[3] + "</a>";
            
            // Add <a name=""> elems in the page text plus whatever came before the match
            pageContent += 
               (text.substring(currPos, re.lastIndex - myArray[0].length) + 
               "<h" + myArray[1] + myArray[2] + "><a name=\"" + aname + "\">" + 
               myArray[3] + "</a></h" + myArray[1] + ">");
            
            currPos = re.lastIndex;
            currLevel = myArray[1];
         }
         for (var i=currLevel; i>1; i--) tocContent += "\n</ul>";
         tocContent = "\n<div class=\"wiki-toc-container\"><div class=\"wiki-toc\">" + 
            "<div class=\"toc-title\"><h2>" + page.msg("label.tocHeader") + 
            "</h2></div>" + tocContent + "</div><div class=\"break\"></div></div>";
            
         // Add last fragment
         pageContent += text.substring(currPos);
         
         // Add TOC
         
         // Insert TOC before elements with toc-before class
         var beforeRe = /<\w+ class="?toc-before"?>/mi;
         var match = beforeRe.exec(pageContent);
         if (match !== null)
         {
            pageContent = pageContent.substring(0, match.index) + tocContent +
               pageContent.substring(match.index);
         }
         // Insert TOC after elements with toc-after class
         var afterRe = /<\w+ class="toc-after">[^<]*<(?=\/)\/\w+>/mi;
         match = afterRe.exec(pageContent);
         if (match !== null)
         {
            pageContent = pageContent.substring(0, match.index + match[0].length) + 
               tocContent +
               pageContent.substring(match.index + match[0].length);
         }
         // Support __TOC__ marker, like MediaWiki
         // See http://meta.wikimedia.org/wiki/MediaWiki_FAQ#How_do_I_add_a_table_of_contents.3F
         var tocRe = /<\w+>\s*__TOC__\s*<(?=\/)\/\w+>/mi;
         match = tocRe.exec(pageContent);
         if (match !== null)
         {
            pageContent = pageContent.substring(0, match.index) + 
               tocContent +
               pageContent.substring(match.index + match[0].length);
         }
         // Support <wiki:toc /> marker, similar to http://code.google.com/p/support/wiki/WikiSyntax
         var tagRe = /<wiki:toc\s*\/\s*>/mi;
         match = tagRe.exec(pageContent);
         if (match !== null)
         {
            pageContent = pageContent.substring(0, match.index) + 
               tocContent +
               pageContent.substring(match.index + match[0].length);
         }
         return pageContent;
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