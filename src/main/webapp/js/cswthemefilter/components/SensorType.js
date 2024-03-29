Ext.namespace("CSWThemeFilter");

/**
 * This is a demonstration of theme specific filtering
 */
CSWThemeFilter.SensorType = Ext.extend(CSWThemeFilter.BaseComponent, {
    sensorTypeStore : null,
    supportedURN:["http://ga.gov.au/darwin/geography",
                               "http://ga.gov.au/darwin/physical-geog",
                               "http://ga.gov.au/darwin/built-env",
                               "http://ga.gov.au/darwin/earth-obs",
                               "http://ga.gov.au/darwin/limits",
                               "http://ga.gov.au/darwin/geodesy",
                               "http://ga.gov.au/darwin/social-geog"],

    constructor : function(cfg) {
        this.sensorTypeStore = new Ext.data.SimpleStore({
            fields : ['type'],
            data   : [['TM'],['Modis'], ['SAR']]
        });

        // Generate our configuration

        Ext.apply(cfg, {
            title : 'Sensor Type',
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
                store : this.sensorTypeStore,
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
        CSWThemeFilter.SensorType.superclass.constructor.call(this, cfg);
    },

    /**
     * The Keywords component supports all URN's
     * Current unsure how Josh wants to do this. If we are going to hardcode the allowed urn, then
     * it will probably be best to rewrite supportTheme in the parent class and the list of urns allowed
     * will be specific in the concrete class.
     */
    supportsTheme : function(urn) {
        return CSWThemeFilter.SensorType.superclass.containUrn.call(this,this.supportedURN,urn);
            // return true;
    }
});

Ext.reg('cswsensortype', CSWThemeFilter.SensorType);
