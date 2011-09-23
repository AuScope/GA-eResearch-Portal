Ext.namespace("CSWThemeFilter");

/**
 * This is a demonstration of theme specific filtering
 */
CSWThemeFilter.CloudCover = Ext.extend(CSWThemeFilter.BaseComponent, {
    supportedURN:["http://ga.gov.au/darwin/geography",
                               "http://ga.gov.au/darwin/physical-geog",
                               "http://ga.gov.au/darwin/built-env",
                               "http://ga.gov.au/darwin/earth-obs",
                               "http://ga.gov.au/darwin/limits",
                               "http://ga.gov.au/darwin/geodesy",
                               "http://ga.gov.au/darwin/social-geog"],

    constructor : function(cfg) {
        Ext.apply(cfg, {
            title : 'Cloud cover',
            collapsible : true,
            border : false,
            style : 'padding:5px 10px 0px 10px',
            items : [{
                xtype       : 'sliderfield',
                fieldLabel  : 'Percentage',
                minValue    : 0,
                maxValue    : 100,
                value       : 0,
                useTips     : true,
                tipText     : function(thumb){
                    return String(thumb.value) + '%';
                }
            }]
        });

        // Create our shell form (with columns preconfigured)
        CSWThemeFilter.CloudCover.superclass.constructor.call(this, cfg);
    },

    supportsTheme : function(urn) {
        return this.containUrn(this.supportedURN,urn);
    }
});

Ext.reg('cswcloudcover', CSWThemeFilter.CloudCover);