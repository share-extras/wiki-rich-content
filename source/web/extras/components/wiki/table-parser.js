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
 * Parser that turns HTML tables in a wiki page to YUI DataTable instances.
 * 
 * <p>To use this plugin simply add class=&quot;datatable&quot; to the tables in your wiki
 * markup.</p>
 * 
 * @namespace Alfresco
 * @class Extras.WikiTableParser
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
       DataSource = YAHOO.util.DataSource,
       DataTable = YAHOO.widget.DataTable;

   /**
    * Alfresco Slingshot aliases
    */
   var $html = Alfresco.util.encodeHTML,
      $combine = Alfresco.util.combinePaths;
   
   /**
    * WikiTableParser constructor.
    * 
    * @return {Extras.WikiTableParser} The new parser instance
    * @constructor
    */
   Extras.WikiTableParser = function()
   {
      /* Decoupled event listeners */
      YAHOO.Bubbling.on("pageContentAvailable", this.onPageContentAvailable, this);
      
      return this;
   };

   Extras.WikiTableParser.prototype =
   {
      /**
       * Object container for initialization options
       *
       * @property options
       * @type object
       */
      options:
      {
      },
      
      /**
       * Widgets
       *
       * @property widgets
       * @type object
       */
      widgets:
      {
      },
      
      /**
       * Event handler called when the "pageContentAvailable" event is received.
       * 
       * @method onPageContentAvailable
       * @param pageObj {Alfresco.WikiPage} The wiki page instance
       * @param textEl {HTMLElement} The wiki page markup container element
       */
      onPageContentAvailable: function WikiTableParser_onPageContentAvailable(layer, args)
      {
         var pageObj = args[1].pageObj;
         return this._convertTables(pageObj, args[1].textEl);
      },
      
      /**
       * Parse the wiki page and convert all HTML tables in the document to YUI
       * DataTable instances.
       *
       * @method _convertTables
       * @param pageObj {Alfresco.WikiPage} The wiki page instance
       * @param textEl {HTMLElement} The wiki page markup container element
       * @private
       */
      _convertTables: function WikiTableParser__convertTables(pageObj, textEl)
      {
         var els, // All table instances from the Dom
            tEls = [], // HTML tables
            dltEls = [], // Datalist tables
            tEl, // current selection
            classes,
            dlCmpts,
            dlName;
         
         els = textEl.getElementsByTagName("table");
         for (var i = 0; i < els.length; i++)
         {
            if (Dom.hasClass(els[i], "datatable"))
            {
               tEls.push(els[i]);
            }
            else if (Dom.getAttribute(els[i], "class"))
            {
               dlName = null;
               classes = Dom.getAttribute(els[i], "class").split(" ");
               for (var j = 0; j < classes.length; j++)
               {
                  if (classes[j].indexOf("datatable:") == 0)
                  {
                     dlCmpts = classes[j].split(":");
                     if (dlCmpts.length == 2)
                     {
                        dlName = dlCmpts[1];
                     }
                  }
               }
               if (dlName != null)
               {
                  dltEls.push({
                     element: els[i],
                     dlName: dlName
                  });
               }
            }
         }
         
         // TODO Add a wrapper around the table for style control, plus allow toggling?
         // TODO Detect the styles on each column heading cell to control parsing, sorting, etc.
         // TODO Support paging if number of rows is greater than a limit
         // TODO Support filtering on data list items
         
         for (var i = 0; i < tEls.length; i++)
         {
            // TinyMCE sometimes adds tables as child elems of paragraphs
            this._removeFromParagraphEls(tEls[i])
            this._createFromHTML(tEls[i]);
         }
         
         for (var i = 0; i < dltEls.length; i++)
         {
            this._removeFromParagraphEls(dltEls[i].element)
            this._createFromDL(dltEls[i].element, dltEls[i].dlName, pageObj.options.siteId);
         }
         
         return true;
      },

      /**
       * Custom parser for table cell data
       * 
       * @method _myParser
       * @param oData {string}   Cell contents
       * @return {string|int|float|Date} Parsed data
       * @private
       */
      _myParser: function WikiTableParser_parse_parser(oData)
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
      },

      /**
       * Custom dynamic cell renderer
       * 
       * @method _myRenderer
       * @param elLiner {object}   Liner element
       * @param oRecord {object}   Record object
       * @param oColumn {object}   Column object
       * @param oData {object}   Data object
       * @return {boolean} Whether to render the cell
       * @private
       */
      _myRenderer: function WikiTableParser_parse_renderer(elLiner, oRecord, oColumn, oData)
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
      },

      /**
       * Remove the given element from any ancestor paragraph tags, if any are found.
       * 
       * <p>If the given element lies inside a paragraph element on the page, then setting
       * the innerHTML of its TH cells on IE will fail, unless the table is first removed
       * from the paragraph block.</p>
       * 
       * <p>This is because P can only contain in-line elements according to the HTML spec,
       * so IE fails to modify the inner DOM contents if this condition is breached.</p>
       * 
       * @method _removeFromParagraphEls
       * @param tEl {object}   HTML element from the Dom
       * @return null
       * @private
       */
      _removeFromParagraphEls: function WikiTableParser__removeFromParagraphEls(tEl)
      {
         var pEl = Dom.getAncestorByTagName(tEl, "p");
         while (pEl != null)
         {
            Dom.insertBefore(tEl, pEl);
            pEl = Dom.getAncestorByTagName(tEl, "p");
         }
      },

      /**
       * Modify the specified table, using data from the first row within a thead
       * element. Convert any td elements in this first row to th elements.
       * 
       * @method _insertHeadEl
       * @param tEl {object}   Table element from the Dom
       * @return null
       * @private
       */
      _insertHeadEl: function WikiTableParser__insertHeadEl(tEl)
      {
         // Break the table down into rows
         var rows = tEl.getElementsByTagName("tr");
         if (rows.length == 0)
         {
            return false;
         }
         
         // Replace td's in the first row with th's
         var hdrs = rows[0].getElementsByTagName("td"), tdEl, thEl;
         while (hdrs.length > 0)
         {
            tdEl = hdrs[0];
            thEl = document.createElement("TH");
            thEl.innerHTML = YAHOO.lang.trim(tdEl.textContent||tdEl.innerText);
            rows[0].replaceChild(thEl, tdEl);
         }
         // Add first row to a thead and the rest to a tbody
         theadEl = document.createElement("THEAD");
         theadEl.appendChild(rows[0]);
         Dom.insertBefore(theadEl, tEl.firstChild);
      },

      /**
       * Create a DataTable container element for the specified table. The table
       * will be moved into the new element as a child.
       * 
       * @method _createContainerDiv
       * @param tEl {object}   Table element from the Dom
       * @return null
       * @private
       */
      _createContainerDiv: function WikiTableParser__createContainerDiv(tEl)
      {
         var dtEl, tId, dtId, containerEl;
         
         tId = Dom.generateId(tEl, "wiki-table-");
         dtId = tId.replace("wiki-table-", "wiki-dt-");
         containerEl = document.createElement("DIV");
         dtEl = document.createElement("DIV");
         Dom.setAttribute(dtEl, "id", dtId);
         Dom.addClass(containerEl, "wiki-datatable");
         Dom.addClass(dtEl, "wiki-datatable-body");
         Dom.insertAfter(containerEl, tEl);
         containerEl.appendChild(dtEl);
         dtEl.appendChild(tEl); // Make table a child
         return dtEl;
      },

      /**
       * Create a DataTable instance from the given HTML table
       * 
       * @method _createFromHTML
       * @param tEl {object}   Table element from the Dom
       * @return null
       * @private
       */
      _createFromHTML: function WikiTableParser__createFromHTML(tEl)
      {
         var dtEl, cols, rows, hdrs, hd, ds, dt, j;
         
         // Create container element around the table
         dtEl = this._createContainerDiv(tEl);
         
         // Create THEAD element
         if (tEl.getElementsByTagName("THEAD").length == 0)
         {
            this._insertHeadEl(tEl);
         }
         
         // Get the column names from the first row
         rows = tEl.getElementsByTagName("tr");
         cols = [], fields = [];
         hdrs = rows[0].getElementsByTagName("th");
         for (j = 0; j < hdrs.length; j++)
         {
            hd = hdrs[j].innerHTML;
            //hdrs[j].innerHTML = hd; // Remove HTML from the column
            fields.push({ "key": hd.toLowerCase() });
            cols.push({ "key": hd.toLowerCase(), "label": hd, "sortable": true, "parser": this._myParser, "formatter": this._myRenderer });
         }
         
         // Create the DataSource - this will remove all data from the table and populate the DS
         ds = new YAHOO.util.DataSource(tEl);
         ds.responseType = YAHOO.util.DataSource.TYPE_HTMLTABLE;
         ds.responseSchema = {
            "fields": fields
         };
         
         return new YAHOO.widget.DataTable(dtEl, cols, ds);
      },

      /**
       * Get a list of the names of table column headings, based on the contents
       * of the th elements in the table.
       * 
       * @method _getTableColumnNames
       * @param tEl {object}   Table element from the Dom
       * @return {Array} Names of the column headings in the table as strings
       * @private
       */
      _getTableColumnNames: function WikiTableParser__getTableColumnNames(tEl)
      {
         var names = [], name;
         // Get the column names from the first row
         var hdrs = tEl.getElementsByTagName("th");
         for (var j = 0; j < hdrs.length; j++)
         {
            name = YAHOO.lang.trim(hdrs[j].textContent||hdrs[j].innerText);
            if (name != "")
            {
               names.push(name);
            }
         }
         return names;
      },

      /**
       * Create a DataTable instance from the given HTML table, which should specify
       * a datalist GUID as a CSS class named datatable:guid.
       * 
       * <p>Any rows in the HTML table will be ignored. A new DataTable instance will be created
       * using data from the Data List with the specified GUID. Table column names will be checked,
       * however, and only those columns in the Data List that have been specified will be displayed.</p>
       * 
       * @method _createFromDL
       * @param tEl {object}   Table element from the Dom
       * @return null
       * @private
       */
      _createFromDL: function WikiTableParser__createFromHTML(tEl, dlName, siteId)
      {
         var dtEl, dthEl, fields, cols, tCols, dlCols, rows, hdrs, hd, ds, dt, j, dlNodeRef, dlType, dlTitle, dlDesc,
            dataRequestFields = [];
         
         // Create container element around the table
         dtEl = this._createContainerDiv(tEl);
         
         // Create THEAD element
         if (tEl.getElementsByTagName("THEAD").length == 0)
         {
            this._insertHeadEl(tEl);
         }
         
         var successHandler = function WikiTableParser__createFromHTML_successHandler(sRequest, oResponse, oPayload)
         {
            this.onDataReturnInitializeTable.call(this, sRequest, oResponse, oPayload);
         };

         var failureHandler = function DWikiTableParser__createFromHTML_failureHandler(sRequest, oResponse)
         {
            if (oResponse.status == 401)
            {
               // Our session has likely timed-out, so refresh to offer the login page
               window.location.reload(true);
            }
            else
            {
               try
               {
                  var response = YAHOO.lang.JSON.parse(oResponse.responseText);
                  this.set("MSG_ERROR", response.message);
                  this.showTableMessage(response.message, YAHOO.widget.DataTable.CLASS_ERROR);
               }
               catch(e)
               {
                  // Do nothing;
               }
            }
         };
         
         // Load the list of data lists in the site
         Alfresco.util.Ajax.jsonGet(
         {
            url: Alfresco.constants.PROXY_URI + "slingshot/datalists/lists/site/" + encodeURI(siteId) + "/dataLists",
            successCallback:
            {
               fn: function WikiTableParser__createFromHTML_success(p_response)
               {
                  var lists = p_response.json.datalists;
                  for (var i = 0; i < lists.length; i++)
                  {
                     if (lists[i].name == dlName)
                     {
                        dlNodeRef = lists[i].nodeRef;
                        dlType = lists[i].itemType;
                        dlTitle = lists[i].title;
                        dlDesc = lists[i].description;
                     }
                  }
                  
                  if (dlNodeRef != null)
                  {
                     tCols = this._getTableColumnNames(tEl);
                     // Load the list of columns for this data type
                     Alfresco.util.Ajax.jsonGet(
                     {
                        url: Alfresco.constants.URL_SERVICECONTEXT + "components/data-lists/config/columns?itemType=" + encodeURI(dlType.replace("_", ":")),
                        successCallback:
                        {
                           fn: function WikiTableParser__createFromHTML_success(p_response)
                           {
                              dlCols = p_response.json.columns;
                              fields = [], cols = [];
                              for (var i = 0; i < dlCols.length; i++)
                              {
                                 if (tCols.length == 0 || Alfresco.util.arrayContains(tCols, dlCols[i].label) ||
                                       Alfresco.util.arrayContains(tCols, dlCols[i].formsName))
                                 {
                                    fields.push({
                                       key: "itemData." + dlCols[i].formsName
                                    });
                                    cols.push({
                                       key: "itemData." + dlCols[i].formsName,
                                       sortable: true,
                                       label: dlCols[i].label,
                                       formatter: function WikiTableParser_cFDL_renderer(elLiner, oRecord, oColumn, oData)
                                       {
                                          if (typeof(oData) == "object" && typeof(oData.displayValue) != "undefined")
                                          {
                                             elLiner.innerHTML = "" + oData.displayValue;
                                          }
                                          else
                                          {
                                             elLiner.innerHTML = "";
                                          }
                                       }
                                    });
                                    // Add to list of explicit fields we must request from the datasource
                                    dataRequestFields.push(dlCols[i].name.replace(":", "_"));
                                 }
                              }
                              // Use an XHRDataSource
                              ds = new YAHOO.util.XHRDataSource(
                                 Alfresco.constants.PROXY_URI + $combine("slingshot/datalists/data/node/", dlNodeRef.replace("://", "/")),
                                 {
                                    connMethodPost: true
                                 }
                              );
                              
                              // Set the responseType 
                              ds.responseType = YAHOO.util.XHRDataSource.TYPE_JSON;
                              // Define the schema of the results
                              ds.responseSchema = {
                                    resultsList : "items",
                                    fields: fields,
                                    metaFields: {
                                       startIndex: "metadata.startIndex",
                                       totalRecords: "metadata.totalRecords"
                                    }
                              };
                              // Enable caching
                              ds.maxCacheEntries = 5;
                              
                              ds.connMgr.setDefaultPostHeader(Alfresco.util.Ajax.JSON);
            
                              this.widgets.dataSource = ds;
                              
                              // Create the DataTable
                              dt = new YAHOO.widget.DataTable(dtEl, cols, ds, {
                                 initialLoad: false
                              });
                              
                              var requestParams =
                              {
                                 fields: dataRequestFields,
                                 filter: {
                                    filterId: "all",
                                    filterData: ""
                                 }
                              };
                              
                              ds.sendRequest(YAHOO.lang.JSON.stringify(requestParams),
                              {
                                 success: successHandler,
                                 failure: failureHandler,
                                 scope: dt
                              });
                              
                              // Insert DT header
                              dthEl = document.createElement("div");
                              Dom.addClass(dthEl, "wiki-datalist-hd");
                              Dom.insertBefore(dthEl, dtEl);
                              dthEl.innerHTML = "<div class=\"wiki-datalist-title\"><a href=\"data-lists?list=" + dlName + 
                                 "\">" + dlTitle + "</a></div>";
                              dthEl.innerHTML += "<div class=\"wiki-datalist-description\">" + dlDesc + "</div>";
                           },
                           scope: this
                        },
                        failureCallback:
                        {
                           fn: function WikiTableParser__createFromHTML_failure(p_response) {
                              Alfresco.util.displayPrompt("Failed to load columns");
                           },
                           scope: this
                        },
                        scope: this,
                        noReloadOnAuthFailure: true
                     });
                  }
                  else
                  {
                     Alfresco.util.displayPrompt("Could not find data list " + dlName)
                  }
               },
               failureCallback:
               {
                  fn: function WikiTableParser__createFromHTML_failure(p_response) {
                     Alfresco.util.displayPrompt("Failed to load data lists");
                  },
                  scope: this
               },
               scope: this,
               noReloadOnAuthFailure: true
            }
         });
      }
   };
   
   new Extras.WikiTableParser();
   
})();