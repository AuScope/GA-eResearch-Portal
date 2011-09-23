Ext.namespace("CSWThemeFilter");

/**
 * This is a demonstration of theme specific filtering
 */
CSWThemeFilter.EODSID = Ext.extend(CSWThemeFilter.BaseComponent, {
    supportedURN:["http://ga.gov.au/darwin/geography",
                               "http://ga.gov.au/darwin/physical-geog",
                               "http://ga.gov.au/darwin/built-env",
                               "http://ga.gov.au/darwin/earth-obs",
                               "http://ga.gov.au/darwin/limits",
                               "http://ga.gov.au/darwin/geodesy",
                               "http://ga.gov.au/darwin/social-geog"],

    constructor : function(cfg) {
        Ext.apply(cfg, {
            title : 'EODS ID',
            collapsible : true,
            border : false,
            items : [{
                xtype : 'textfield',
                anchor : '100%',
                hideLabel : true
            }]
        });

        // Create our shell form (with columns preconfigured)
        CSWThemeFilter.EODSID.superclass.constructor.call(this, cfg);
    },

    supportsTheme : function(urn) {
        return this.containUrn(this.supportedURN,urn);
    }
});

Ext.reg('csweodsid', CSWThemeFilter.EODSID);