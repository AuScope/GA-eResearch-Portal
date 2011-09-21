/**
 * A Ext.TabPanel specialisation for allowing the user to browse
 * a multiple CSWFilterResultsPanel tabs
 *
 * The filter is designed to be generated from a CSWThemeFilterForm
 */
MultiCSWFilterResultsPanel = Ext.extend(Ext.TabPanel, {

    /**
     * Constructor for this class, accepts all configuration options that can be
     * specified for a Ext.TabPanel as well as the following values
     * {
     *  filterParams : An object containing filter parameters (generate this from a CSWThemeFilterForm)
     *  cswServiceItems : An array of objects with 'title' and 'id' being set to the details of a CSW service
     *  map : An instance of a GMap object
     * }
     */
    constructor : function(cfg) {
        var multiCSWFilterResultsPanel = this;

        this.map = cfg.map;

        //Build a result browser for each CSW
        var resultBrowsers = [];
        for (var i = 0; i < cfg.cswServiceItems.length; i++) {
            var newParams = clone(cfg.filterParams);
            newParams.cswServiceId = cfg.cswServiceItems[i].id;

            resultBrowsers.push({
                xtype : 'cswresultspanel',
                title : cfg.cswServiceItems[i].title,
                layout : 'fit',
                map : this.map,
                filterParams : newParams
            });
        }

        //Build our configuration object
        Ext.apply(cfg, {
            autoScroll : true,
            activeTab : 0,
            enableTabScroll : true,
            deferredRender : false,  //We want all of our results to render immediately (that way they can make requests immediately)
            items : resultBrowsers
        });

        //Call parent constructor
        MultiCSWFilterResultsPanel.superclass.constructor.call(this, cfg);
    },

    /**
     * Gets the Integer count of the currently selected result set (ie the number of records
     * that are available for the selected registry that pass the specified filter)
     *
     * This function makes NO external requests
     */
    getMatchingCSWRecordsCount : function() {
        var activeTab = this.getActiveTab();
        if (activeTab == null) {
            return 0;
        }

        return activeTab.getMatchingCSWRecordsCount();
    },

    /**
     * [For the currently selected result set]
     *
     * Gets EVERY CSW Record that matches the filter (up to limit records or 100 if not specified)
     *
     * The records will be returned as array which will be passed to callback (possibly immediately)
     *
     * This function will make requests to the server IF the
     * result has been broken up into pages (ie it doesn't have the
     * full set of records).
     *
     * limit - Number - a hard limit on the maximum number of records to request (if not specified 100 will be used)
     * callback - Function(Boolean, Array) - a callback function to be passed an array of CSWRecord objects
     */
    getMatchingCSWRecords : function(limit, callback) {
        var activeTab = this.getActiveTab();
        if (activeTab == null) {
            return 0;
        }

        activeTab.getMatchingCSWRecords(limit, callback);
    },

    /**
     * Returns a (possibly empty) Array of CSWRecord objects representing the
     * selected records
     */
    getSelectedCSWRecords : function() {
        var activeTab = this.getActiveTab();
        if (activeTab == null) {
            return [];
        }

        return activeTab.getSelectedCSWRecords();
    }
});

Ext.reg('multicswresultspanel', MultiCSWFilterResultsPanel);