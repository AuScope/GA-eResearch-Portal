Ext.namespace("CSWThemeFilter");

/**
 * This is a demonstration of theme specific filtering
 */
CSWThemeFilter.PlatformName = Ext.extend(CSWThemeFilter.BaseComponent, {
    platformTypeStore : null,
    supportedURN:["http://ga.gov.au/darwin/geography",
                               "http://ga.gov.au/darwin/physical-geog",
                               "http://ga.gov.au/darwin/built-env",
                               "http://ga.gov.au/darwin/earth-obs",
                               "http://ga.gov.au/darwin/limits",
                               "http://ga.gov.au/darwin/geodesy",
                               "http://ga.gov.au/darwin/social-geog"],

    constructor : function(cfg) {
        this.platformTypeStore = new Ext.data.SimpleStore({
            fields : ['type'],
            data   : [['Landsat 5'],['Aqua'], ['Terra'], ['Radarasat-1']]
        });

        // Generate our configuration (
        Ext.apply(cfg, {
            title : 'Platform Name',
            collapsible : true,
            border : false,
            labelWidth : 10,
            style : 'padding:5px 10px 0px 10px',
            items : [{
                xtype : 'combo',
                hideBorders : true,
                hideLabel : true,
                anchor : '100%',
                name : 'theme',
                store : this.platformTypeStore,
                forceSelection : true,
                triggerAction : 'all',
                typeAhead : true,
                typeAheadDelay : 500,
                displayField : 'type',
                valueField : 'type',
                mode : 'local'
           }]
        });

        // Create our shell form (with columns preconfigured)
        CSWThemeFilter.PlatformName.superclass.constructor.call(this, cfg);
    },

    supportsTheme : function(urn) {
        return this.containUrn(this.supportedURN,urn);
    }
});

Ext.reg('cswplatformname', CSWThemeFilter.PlatformName);
