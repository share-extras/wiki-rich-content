/**
 * Wiki Table parser. 
 * Parser turns all tables in a wiki page to DataTable instances.
 * 
 * @namespace Alfresco
 * @class Alfresco.WikiTableParser
 */
(function()
{
   /**
    * YUI Library aliases
    */
   var Dom = YAHOO.util.Dom,
       Event = YAHOO.util.Event,
       Element = YAHOO.util.Element,
       DataSource = YAHOO.util.DataSource,
       DataTable = YAHOO.widget.DataTable;
   
   /**
    * WikiTableParser constructor.
    * 
    * @return {Alfresco.WikiTableParser} The new parser instance
    * @constructor
    */
   Alfresco.WikiTableParser = function()
   {
      return this;
   };

   Alfresco.WikiTableParser.prototype =
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
       * Parse the wiki page and convert all HTML tables in the document to YUI
       * DataTable instances.
       *
       * @method parse
       * @param page {Array} The wiki page instance
       * @param text {String} The wiki page markup
       */
      parse: function WikiTableParser_parse(page, textElement)
      {
         var els, tEls = [], 
            tEl, dtEl, tId, dtId, myDataSource, cols, rows, hdrs, hd,
            ds, dt, tdEl, thEl,
            theadEl, tBodyEl, j;
         
         /**
          * Custom parser for table cell data
          * @param oData
          * @return
          */
         var myParser = function WikiTableParser_parse_parser(oData)
         {
            var cd = YAHOO.lang.trim(oData.replace("&nbsp;", " "));
            
            if (/^\d+$/.test(cd)) // int
            {
               return parseInt(cd);
            }
            else if (/^\d+\.\d+$/.test(cd)) // float
            {
               return parseInt(cd);
            }
            else if (/^(\d{2})\/(\d{2})\/(\d{4})$/.test(cd)) // date dd/MM/yyyy
            {
               var myArray = /(\d{2})\/(\d{2})\/(\d{4})/.exec(cd);
               return new Date(myArray[3], myArray[2], myArray[1]);
            }
            else if (/^(\d{4})-(\d{2})-(\d{2})$/.test(cd)) // date yyyy-MM-dd
            {
               var myArray = /(\d{4})-(\d{2})-(\d{2})/.exec(cd);
               return new Date(myArray[1], myArray[2], myArray[3]);
            }
            else if (/^([A-Za-z]{3,})[ \-](\d{1,2}),?[ \-](\d{2,4})$/.test(cd)) // date Aug 9, 1995
            {
               var myArray = /([A-Za-z]{3,})[ \-](\d{1,2}),?[ \-](\d{2,4})/.exec(cd);
               return new Date("" + myArray[1] + " " + myArray[2] + ", " + (myArray[3].length == 2 ? (2000 + parseInt(myArray[3])) : myArray[3]));
            }
            else if (/^(\d{1,2})[ \-]([A-Za-z]{3,}),?[ \-](\d{2,4})$/.test(cd)) // date 9 Aug 1995
            {
               var myArray = /(\d{1,2})[ \-]([A-Za-z]{3,}),?[ \-](\d{2,4})/.exec(cd);
               return new Date("" + myArray[2] + " " + myArray[1] + ", " + (myArray[3].length == 2 ? (2000 + parseInt(myArray[3])) : myArray[3]));
            }
            else
            {
               return cd;
            }
         };
         
         myRenderer = function WikiTableParser_parse_renderer(elLiner, oRecord, oColumn, oData)
         {
            if (Alfresco.util.isDate(oData))
            {
               elLiner.innerHTML = Alfresco.util.formatDate(oData, "ddd, d mmm yyyy");
            }
            else
            {
               elLiner.innerHTML = "" + oData;
            }
            return true;
         };
         
         els = textElement.getElementsByTagName("table");
         for (var i = 0; i < els.length; i++)
         {
            if (Dom.hasClass(els[i], "datatable"))
            {
               tEls.push(els[i]);
            }
         }
         
         // TODO Add a wrapper around the table for style control, plus allow toggling?
         // TODO Detect the styles on each column heading cell to control parsing, sorting, etc.
         // TODO Support paging if number of rows is greater than a limit
         // TODO Allow a Data List GUID to be specified somehow?
         
         for (var i = 0; i < tEls.length; i++)
         {
            tEl = tEls[i];
            tId = Dom.generateId(tEl, "wiki-table");
            dtId = tId.replace("wiki-table", "wiki-dt");
            dtEl = document.createElement("DIV");
            Dom.setAttribute(dtEl, "id", dtId);
            Dom.insertAfter(dtEl, tEl);
            dtEl.appendChild(tEl); // Make table a child
            
            // Break the table down into rows
            rows = tEl.getElementsByTagName("tr");
            if (rows.length == 0)
            {
               return false;
            }
            
            // Replace td's in the first row with th's
            hdrs = rows[0].getElementsByTagName("td");
            while (hdrs.length > 0)
            {
               tdEl = hdrs[0];
               thEl = document.createElement("TH");
               thEl.innerHTML = tdEl.innerHTML;
               Dom.insertAfter(thEl, tdEl);
               rows[0].removeChild(tdEl);
               // TODO Can we not just call parentNode.replaceChild(newChild, oldChild) instead?
            }
            
            // Add first row to a thead and the rest to a tbody
            theadEl = document.createElement("THEAD");
            theadEl.appendChild(rows[0]);
            tEl.appendChild(theadEl);
            Dom.insertBefore(theadEl, tEl.firstChild);
            /*
            if (tEl.getElementsByTagName("tbody").length > 0)
            {
               tBodyEl = tEl.getElementsByTagName("tbody")[0];
            }
            else
            {
               tBodyEl = document.createElement("TBODY");
            }
            for (j = 1; rows.length > 0; j++)
            {
               tBodyEl.appendChild(rows[0]);
            }
            */
            //tEl.appendChild(tBodyEl);
            
            // Get the column names from the first row
            cols = [];
            hdrs = rows[0].getElementsByTagName("th");
            for (j = 0; j < hdrs.length; j++)
            {
               hd = YAHOO.lang.trim(hdrs[j].textContent||hdrs[j].innerText);
               hdrs[j].innerHTML = hd; // Remove HTML from the column
               cols.push({ key: hd, sortable: true, parser: myParser, formatter: myRenderer });
            }
            
            // Create the DataSource - this will remove all data from the table and populate the DS
            ds = new YAHOO.util.DataSource(tEl);
            ds.responseType = YAHOO.util.DataSource.TYPE_HTMLTABLE;
            ds.responseSchema = {
               fields: cols
            };
            dt = new YAHOO.widget.DataTable(dtId, cols, ds);
         }
         
         return true;
      }
      
   };
   
})();