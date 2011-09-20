Ext.namespace("CSWThemeFilter");

/**
 * An extension of CSWThemeFilter.BaseComponent to allow the selection of a spatial bounding box
 */
CSWThemeFilter.Spatial = Ext.extend(CSWThemeFilter.BaseComponent, {

    /**
     * An instance of MPolyDragControl
     */
    bboxSelection : null,

    /**
     * BBOX coordinate - Will be populated after the component is rendered
     */
    numberFieldNELat : null,
    /**
     * BBOX coordinate - Will be populated after the component is rendered
     */
    numberFieldNELon : null,
    /**
     * BBOX coordinate - Will be populated after the component is rendered
     */
    numberFieldSWLat : null,
    /**
     * BBOX coordinate - Will be populated after the component is rendered
     */
    numberFieldSWLon : null,

    buttonClear : null,
    buttonDraw : null,

    /**
     * Shown when the user clicks "Draw Bounds"
     */
    labelBBoxHelp : null,

    constructor : function(cfg) {
        var spatialComponent = this;

        //Build our configuration
        Ext.apply(cfg, {
            title : 'Within Spatial Bounds',
            collapsible : true,
            border : false,
            items : [{
                xtype : 'livenumberfield',
                fieldLabel : 'Lat (NE)',
                name : 'neLat',
                anchor : '100%',
                decimalPrecision : 6,
                endTypingDelay : 500,
                listeners : {
                    change : this._numberFieldChange.createDelegate(this, [])
                }
            },{
                xtype : 'livenumberfield',
                fieldLabel : 'Lon (NE)',
                name : 'neLon',
                anchor : '100%',
                decimalPrecision : 6,
                endTypingDelay : 500,
                listeners : {
                    change : this._numberFieldChange.createDelegate(this, [])
                }
            },{
                xtype : 'livenumberfield',
                fieldLabel : 'Lat (SW)',
                name : 'swLat',
                anchor : '100%',
                decimalPrecision : 6,
                endTypingDelay : 500,
                listeners : {
                    change : this._numberFieldChange.createDelegate(this, [])
                }
            },{
                xtype : 'livenumberfield',
                fieldLabel : 'Lon (SW)',
                name : 'swLon',
                anchor : '100%',
                decimalPrecision : 6,
                endTypingDelay : 500,
                listeners : {
                    change : this._numberFieldChange.createDelegate(this, [])
                }
            },{
                xtype : 'button',
                text : 'Draw Bounds',
                handler : this._drawBoundsHandler.createDelegate(this, [])
            },{
                xtype : 'button',
                text : 'Clear Bounds',
                handler : this._clearBoundsHandler.createDelegate(this, []),
                hidden : true
            },{
                xtype : 'label',
                cls : 'x-form-item',
                text : 'Use your mouse to drag a filter bounding box on the map.',
                hidden : true
            }],
            listeners : {
                //Get references to our fields
                afterrender : function(cmp) {
                    var coordFields = cmp.findByType('livenumberfield');
                    for (var i = 0; i < coordFields.length; i++) {
                        if (coordFields[i].getName() === 'neLat') {
                            spatialComponent.numberFieldNELat = coordFields[i];
                        } else if (coordFields[i].getName() === 'neLon') {
                            spatialComponent.numberFieldNELon = coordFields[i];
                        } else if (coordFields[i].getName() === 'swLat') {
                            spatialComponent.numberFieldSWLat = coordFields[i];
                        } else if (coordFields[i].getName() === 'swLon') {
                            spatialComponent.numberFieldSWLon = coordFields[i];
                        }
                    }

                    var buttonFields = cmp.findByType('button');

                    spatialComponent.buttonDraw = buttonFields[0];
                    spatialComponent.buttonClear = buttonFields[1];

                    var labelFields = cmp.findByType('label');
                    spatialComponent.labelBBoxHelp = labelFields[0];
                }
            }
        });

        //Construct our instance
        CSWThemeFilter.Spatial.superclass.constructor.call(this, cfg);
    },

    /**
     * Utility for the delayed creation of the bboxSelection object (which will be created once
     * the map object is populated at some time AFTER component render).
     *
     * This function may return null if the map object is not yet initialised.
     */
    _getBBoxSelection : function() {
        if (this.bboxSelection) {
            return this.bboxSelection;
        }

        //If this method has been called too early (what else can we do???)
        if (!map) {
            return null;
        }

        //This is our control for drawing a bounding box on the map
        var me = this;
        this.bboxSelection = new MPolyDragControl({
            map: map,
            type: 'rectangle',
            labelText: 'CSW Bounds',
            ondragend : function() {
                me.labelBBoxHelp.hide();
                me.numberFieldNELat.setRawValue(me.bboxSelection.getNorthEastLat());
                me.numberFieldNELon.setRawValue(me.bboxSelection.getNorthEastLng());
                me.numberFieldSWLat.setRawValue(me.bboxSelection.getSouthWestLat());
                me.numberFieldSWLon.setRawValue(me.bboxSelection.getSouthWestLng());

                me.buttonDraw.hide();
                me.buttonClear.show();
            }
        });
        return this.bboxSelection;
    },

    _numberFieldChange : function() {
        var north = this.numberFieldNELat.getValue();
        var east = this.numberFieldNELon.getValue();
        var south = this.numberFieldSWLat.getValue();
        var west = this.numberFieldSWLon.getValue();
        var bboxSelection = this._getBBoxSelection();

        //if our map hasn't rendered yet, we can't do anything
        if (!bboxSelection) {
            return;
        }

        //If we have entered in specific values, draw that bounds on the map
        if (!isNaN(north) && !isNaN(south) &&
            !isNaN(east) && !isNaN(west)) {
            bboxSelection.drawRectangle(north,east,south,west);
        } else {
            bboxSelection.reset();

            this.buttonDraw.enable();
            this.buttonDraw.show();
            this.buttonClear.hide();
        }
    },

    _clearBounds : function() {
        this.numberFieldNELat.setRawValue('');
        this.numberFieldNELon.setRawValue('');
        this.numberFieldSWLat.setRawValue('');
        this.numberFieldSWLon.setRawValue('');
    },

    /**
     * Handler for the draw bounds function
     */
    _drawBoundsHandler : function() {
        this._clearBounds();

        var bboxSelection = this._getBBoxSelection();
        if (bboxSelection && !bboxSelection.transMarkerEnabled) {
            this.labelBBoxHelp.show();
            bboxSelection.enableTransMarker();
            this.buttonDraw.disable();
        }
    },

    _clearBoundsHandler : function() {
        this._clearBounds();

        var bboxSelection = this._getBBoxSelection();
        if (bboxSelection) {
            bboxSelection.reset();
        }
        this.buttonDraw.enable();
        this.buttonDraw.show();
        this.buttonClear.hide();
    },

    /**
     * Returns the selected spatial bounding box
     */
    getFilterValues : function() {
        var north = this.numberFieldNELat.getValue();
        var east = this.numberFieldNELon.getValue();
        var south = this.numberFieldSWLat.getValue();
        var west = this.numberFieldSWLon.getValue();

        if (isNaN(north) || isNaN(south) ||
            isNaN(east) || isNaN(west)) {
            return {};
        } else {
            return {
                westBoundLongitude : west,
                eastBoundLongitude : east,
                northBoundLatitude : north,
                southBoundLatitude : south
            };
        }
    },

    /**
     * The Spatial component supports all URN's
     */
    supportsTheme : function(urn) {
        //VT:temporary disable spatial filter on build environment to demostrate that if a theme
        //that doesn't support spatial is selected, the bounding box will clear up.
        if(urn=='http://ga.gov.au/darwin/built-env'){
            return false;
        }
        return true;
    },

    isPreserved : function(urn) {
        return true;
    },


    /**
     * Overrides the parent cleanup specifically for spatial component.
     */
    cleanUp : function() {
        this._clearBoundsHandler();
    }
});
