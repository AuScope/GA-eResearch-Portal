Ext.namespace("CSWThemeFilter");

/**
 * This is a demonstration of theme specific filtering
 */
CSWThemeFilter.ProcessingLevel = Ext.extend(CSWThemeFilter.BaseComponent, {
    processingLevelStore : null,
    supportedURN:["http://ga.gov.au/darwin/geography",
                               "http://ga.gov.au/darwin/physical-geog",
                               "http://ga.gov.au/darwin/built-env",
                               "http://ga.gov.au/darwin/earth-obs",
                               "http://ga.gov.au/darwin/limits",
                               "http://ga.gov.au/darwin/geodesy",
                               "http://ga.gov.au/darwin/social-geog"],

    constructor : function(cfg) {
        this.processingLevelStore = new Ext.data.SimpleStore({
            fields : ['type'],
            data   : [['Raw Data'],['Raw Image'], ['Path'], ['Geometric'], ['Corrected']]
        });

        // Generate our configuration (
        Ext.apply(cfg, {
            title : 'Processing Level',
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
                store : this.processingLevelStore,
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
        CSWThemeFilter.ProcessingLevel.superclass.constructor.call(this, cfg);
    },

    supportsTheme : function(urn) {
        return this.containUrn(this.supportedURN,urn);
    }
});

Ext.reg('cswprocessinglevel', CSWThemeFilter.ProcessingLevel);