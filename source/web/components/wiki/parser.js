/**
 * Wiki markup parser. 
 * Very simple parser that converts a subset of wiki markup
 * to HTML.
 * 
 * @namespace Alfresco
 * @class Alfresco.WikiParser
 */
(function()
{
   /**
    * WikiParser constructor.
    * 
    * @return {Alfresco.WikiParser} The new parser instance
    * @constructor
    */
   Alfresco.WikiParser = function()
   {
      return this;
   };

   Alfresco.WikiParser.prototype =
   {
      /**
       * The url to use when rewriting links.
       * 
       * @property URL
       * @type String
       */
      URL : null,
      
      /**
       * Renders wiki markup.
       *
       * @method parse
       * @param page {Array} The wiki page instance
       * @param text {String} The text to render
       */
      parse: function(page, text)
      {
         var pages = page.options.pages == null ? [] : page.options.pages;
         text = this._renderLinks(text, pages);
         text = this._insertToc(page, text);
         return text;
      },
      
      /**
       * Looks for instance of [[ ]] in the text and replaces
       * them as appropriate.
       * 
       * @method _renderLinks
       * @param s {String} The text to render
       * @param pages {Array} The existing pages on the current site
       */
      _renderLinks: function(s, pages)
      {
         if (typeof s == "string")
         {
            var result = s.split("[["), text = s;
         
            if (result.length > 1)
            {
               var re = /^([^\|\]]+)(?:\|([^\]]+))?\]\]/;
               var uri, i, ii, str, matches, page, exists;
               text = result[0];
            
               for (i = 1, ii = result.length; i < ii; i++)
               {
                  str = result[i];
                  if (re.test(str))
                  {
                     matches = re.exec(str);
                     // Replace " " character in page URL with "_"
                     page = matches[1].replace(/\s+/g, "_");
                     exists = Alfresco.util.arrayContains(pages, page);
                     uri = '<a href="' + this.URL + page + '" class="' + (exists ? 'theme-color-1' : 'wiki-missing-page') + '">';
                     uri += (matches[2] ? matches[2] : matches[1]);
                     uri += '</a>';
                  
                     text += uri;
                     text += str.substring(matches[0].length);
                  }
               }
            }   
            return text;
         }
         return s;
      },
      
      /**
       * Add table of contents to the wiki page.
       *
       * @method parse
       * @param text {String} The text to render
       */
      _insertToc: function(page, text)
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
      
      _tocAnchorName: function(heading, usedNames)
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
      
      _tocContainsName: function(name, usedNames)
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

      _tocItemNum: function(level, counts)
      {
         var num = "";
         for (var i=1; i<=level; i++)
         {
            if (num != "") num += ".";
            num += counts[i];
         }
         return num;
      }
      
   };
   
})();