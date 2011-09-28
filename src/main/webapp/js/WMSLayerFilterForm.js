/**
 * Builds a form panel for WMS Layers (Containing WMS specific options such as transparency).
 *
 */

WMSLayerFilterForm = function(activeLayerRecord, map) {
    var wmsLayerFilterForm = this;

    var sliderHandler = function(caller, newValue) {
        var overlayManager = activeLayerRecord.getOverlayManager();
        var newOpacity = (newValue / 100);

        activeLayerRecord.setOpacity(newOpacity);
        overlayManager.updateOpacity(newOpacity);
    };

    this.isFormLoaded = true; //We aren't reliant on any remote downloads

    var cswRecords = activeLayerRecord.getCSWRecords();
    var totalWMSResources = 0;
    for (var i = 0; i < cswRecords.length; i++) {
        totalWMSResources += cswRecords[i].getFilteredOnlineResources('WMS').length;
    }

    //Given an overlay manager and a cswOnlineResource object lookup the
    //GTileLayerOverlay representation of cswOnlineResource and return it
    //or return null if it DNE
    var getGTileLayerOverlayForResource = function(overlayManager, cswOnlineResource) {
        for (var i = 0; i < overlayManager.overlayList.length; i++) {
            if (overlayManager.overlayList[i] instanceof GTileLayerOverlay) {
                var tileLayer = overlayManager.overlayList[i].getTileLayer();
                if (tileLayer.baseURL === cswOnlineResource.url &&
                    tileLayer.layers === cswOnlineResource.name) {
                    return overlayManager.overlayList[i];
                }
            }
        }

        return null;
    };

    //-----------Panel
    WMSLayerFilterForm.superclass.constructor.call(this, {
        id          : String.format('{0}',activeLayerRecord.getId()),
        border      : false,
        autoScroll  : true,
        hideMode    : 'offsets',
        labelAlign  : 'right',
        bodyStyle   : 'padding:5px',
        items:[{
            xtype      :'fieldset',
            title      : 'WMS Properties',
            anchor     : '-10',
            style      : 'padding:0px',
            bodyStyle  : 'padding:5px',
            labelWidth : 50,
            items      : [{
                    xtype       : 'slider',
                    fieldLabel  : 'Opacity',
                    anchor      : '100%',
                    minValue    : 0,
                    maxValue    : 100,
                    value       : (activeLayerRecord.getOpacity() * 100),
                    listeners   : {changecomplete: sliderHandler}
            }]
        },{
            xtype :'fieldset',
            title : 'Available WMS Layers',
            collapsible : true,
            collapsed : true,
            anchor : '-10',
            style : 'padding:0px',
            bodyStyle : 'padding:2px',
            hidden : (totalWMSResources <= 1),
            listeners : {
                //This exists to prevent the horizontal scroll bar from showing whenever
                //the vertical scroll bar shows (extjs doesn't seem to re-layout correctly
                //after the scrollbar shows
                expand : function(fieldSet) {
                    var task = new Ext.util.DelayedTask(function(){
                        fieldSet.ownerCt.doLayout();
                    });

                    task.delay(50);

                },
                //See comment for expand
                collapse : function(fieldSet) {
                    var task = new Ext.util.DelayedTask(function(){
                        fieldSet.ownerCt.doLayout();
                    });

                    task.delay(50);
                },
            },
            items : [{
                xtype : 'cswresourcesgrid',
                header : false,
                anchor : '100%',
                cswRecords : cswRecords,
                border : false,
                allowSelection : true,
                defaultSelection : true,
                onlineResourceFilter : function(onlineResource, cswRecord) {
                    return onlineResource.onlineResourceType === 'WMS';
                },
                listeners : {
                    resourceselect : function(grid, cswOnlineResource, parentCSWRecord) {
                        var overlayManager = activeLayerRecord.getOverlayManager();
                        var tileLayerOverlay = getGTileLayerOverlayForResource(overlayManager, cswOnlineResource);
                        if (tileLayerOverlay) {
                            tileLayerOverlay.show();
                        }
                    },
                    resourcedeselect : function(grid, cswOnlineResource, parentCSWRecord) {
                        var overlayManager = activeLayerRecord.getOverlayManager();
                        var tileLayerOverlay = getGTileLayerOverlayForResource(overlayManager, cswOnlineResource);
                        if (tileLayerOverlay) {
                            tileLayerOverlay.hide();
                        }
                    },
                }
            }]
        }]
    });

    //Our WMS selection will NOT be preserved so we always reset our selection
    //when the layer visibility button is clicked
    activeLayerRecord.getOverlayManager().on('clear', function(manager) {
        if (!wmsLayerFilterForm.rendered) {
            return;
        }

        var resourcesGrid = wmsLayerFilterForm.findByType('cswresourcesgrid')[0];
        if (!resourcesGrid.rendered) {
            return;
        }

        resourcesGrid.getSelectionModel().silent = true;
        resourcesGrid.getSelectionModel().selectAll();
        resourcesGrid.getSelectionModel().silent = false;
    });
};

Ext.extend(WMSLayerFilterForm, BaseFilterForm, {

});