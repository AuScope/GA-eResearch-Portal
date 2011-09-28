/**
 * A Ext.grid.GridPanel specialisation for allowing the user to browse
 * the online resource contents of a set of CSWRecords
 */
CSWResourcesGrid = Ext.extend(Ext.grid.GridPanel, {

    cswRecords : null,
    allowSelection : false,
    onlineResourceFilter : null,

    /**
     * Constructor for this class, accepts all configuration options that can be
     * specified for a Ext.grid.GridPanel as well as the following values
     * {
     *  cswRecords : Array of CSWRecord objects or a single CSWRecord object
     *  allowSelection : [Optional, default false] - whether this grid will show a column of check boxes.
     *                   Use getSelectedResources to access what resources have been selected
     *  defaultSelection : [Optional, default false] - The default value for each selection
     *  onlineResourceFilter : [Optional] function(Object, CSWRecord) - a function that will be called on every CSW online resource
     *                         which should return true if the online resource should be rendered or false if not
     * }
     *
     * Also adds the following events
     *
     * resourceselect : (CSWResourcesGrid this, Object cswOnlineResource, CSWRecord parentRecord)
     * resourcedeselect : (CSWResourcesGrid this, Object cswOnlineResource, CSWRecord parentRecord)
     */
    constructor : function(cfg) {
        var cswResourcesGrid = this;


        if (Ext.isArray(cfg.cswRecords)) {
            cfg.cswRecords = cfg.cswRecords;
        } else {
            cfg.cswRecords = [cfg.cswRecords];
        }
        this.cswRecords = cfg.cswRecords;

        this.onlineResourceFilter = cfg.onlineResourceFilter;

        //Generate our flattened 'data items' list for rendering to the grid
        var dataItems = [];
        for (var i = 0; i < this.cswRecords.length; i++) {
            var onlineResources = this.cswRecords[i].getOnlineResources();
            for (var j = 0; j < onlineResources.length; j++) {

                //Allow the user to arbitrarily filter the displayed resources
                if (this.onlineResourceFilter && !this.onlineResourceFilter(onlineResources[j], this.cswRecords[i])) {
                    continue;
                }

                //ensure we have a type we want to describe
                switch (onlineResources[j].onlineResourceType) {
                case 'WWW':
                    break;
                case 'WFS':
                    break;
                case 'WMS':
                    break;
                case 'WCS':
                    break;
                default:
                    continue;//don't include anything else
                }

                dataItems.push([
                    onlineResources[j].name,
                    onlineResources[j].description,
                    onlineResources[j].url,
                    onlineResources[j],
                    onlineResources[j].onlineResourceType,
                    i
                ]);
            }
        }

        //Build our column list incrementally
        var columns = [];

        //Turn on selection
        var sm = undefined;
        if (cfg.allowSelection) {
            sm = new Ext.grid.CheckboxSelectionModel({
                checkOnly : true,
                dataIndex : 'selected',
                listeners : {
                    rowselect : function(sm, rowIndex, r) {
                        var onlineResource = r.get('preview');
                        var cswRecord = cswResourcesGrid.cswRecords[r.get('cswRecordIndex')];
                        cswResourcesGrid.fireEvent('resourceselect', cswResourcesGrid, onlineResource, cswRecord);
                    },
                    rowdeselect : function(sm, rowIndex, r) {
                        var onlineResource = r.get('preview');
                        var cswRecord = cswResourcesGrid.cswRecords[r.get('cswRecordIndex')];
                        cswResourcesGrid.fireEvent('resourcedeselect', cswResourcesGrid, onlineResource, cswRecord);
                    }
                }
            });
            columns.push(sm);
        }


        //Build our text column
        columns.push({
            id : 'text',
            header : 'Text',
            dataIndex: 'name',
            menuDisabled: true,
            scope : this,
            sortable: true,
            renderer: function(value, metadata, record) {
                var name = record.get('name');
                var description = record.get('description');
                var cswRecord = this.cswRecords[record.get('cswRecordIndex')];
                var onlineRes = record.get('preview');

                //Ensure there is a title (even it is just '<Untitled>'
                if (!name || name.length === 0) {
                    name = '&gt;Untitled&lt;';
                }

                //Adjust our name with our service type (if appopriate)
                switch(record.get('type')) {
                case 'WFS':
                    name += ' [Web Feature Service]';
                    break;
                case 'WMS':
                    name += ' [Web Map Service]';
                    break;
                case 'WCS':
                    name += ' [Web Coverage Service]';
                    break;
                }

                //Truncate description
                var maxLength = 190;
                if (description.length > maxLength) {
                    description = description.substring(0, maxLength) + '...';
                }

                switch(record.get('type')) {
                case 'WWW':
                    return '<a target="_blank" href="' + onlineRes.url + '"><b>' + name + '</b></a><br/><span style="color:#555;">' + description + '</span>';
                default:
                    return '<b>' + name + '</b><br/><span style="color:#555;">' + description + '</span>';
                }
            }
        });

        //Build our preview column
        columns.push({
            id : 'preview',
            header : 'Preview',
            dataIndex: 'preview',
            scope: this,
            width: 140,
            sortable: false,
            menuDisabled: true,
            renderer: function(value, metadata, record) {
                var onlineRes = value;
                var cswRecord = this.cswRecords[record.get('cswRecordIndex')];

                //We preview types differently
                switch(record.get('type')) {
                case 'WFS':
                    var getFeatureUrl = onlineRes.url + this.internalURLSeperator(onlineRes.url) + 'SERVICE=WFS&REQUEST=GetFeature&VERSION=1.1.0&maxFeatures=5&typeName=' + onlineRes.name;
                    return '<a target="_blank" href="' + getFeatureUrl + '"><p>First 5 features</p></a>';
                case 'WCS':
                    var describeCoverageUrl = onlineRes.url + this.internalURLSeperator(onlineRes.url) + 'SERVICE=WCS&REQUEST=DescribeCoverage&VERSION=1.0.0&coverage=' + onlineRes.name;
                    return '<a target="_blank" href="' + describeCoverageUrl + '"><p>DescribeCoverage response</p></a>';
                case 'WMS':
                    //Form the WMS url
                    var getMapUrl = onlineRes.url + this.internalURLSeperator(onlineRes.url) + 'SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=' + onlineRes.name;
                    getMapUrl += '&SRS=EPSG:4326&FORMAT=image/png&STYLES=';

                    //To generate the url we will need to use the bounding box to make the request
                    //To avoid distortion, we also scale the width height independently
                    var geoEls = cswRecord.getGeographicElements();
                    if (geoEls && geoEls.length > 0) {
                        var superBbox = geoEls[0];
                        for (var i = 1; i < geoEls.length; i++) {
                            superBbox = superBbox.combine(geoEls[i]);
                        }

                        var superBboxStr = superBbox.westBoundLongitude + "," +
                                            superBbox.southBoundLatitude + "," +
                                            superBbox.eastBoundLongitude + "," +
                                            superBbox.northBoundLatitude;

                        //Set our width to a constant and scale the height appropriately
                        var heightRatio = (superBbox.northBoundLatitude - superBbox.southBoundLatitude) /
                                          (superBbox.eastBoundLongitude - superBbox.westBoundLongitude);
                        var width = 512;
                        var height = Math.floor(width * heightRatio);

                        getMapUrl += '&WIDTH=' + width;
                        getMapUrl += '&HEIGHT=' + height;
                        getMapUrl += '&BBOX=' + superBboxStr;

                        var thumbWidth = width;
                        var thumbHeight = height;

                        //Scale our thumbnail appropriately
                        if (thumbWidth > 128) {
                            thumbWidth = 128;
                            thumbHeight = thumbWidth * heightRatio;
                        }

                        return '<a target="_blank" href="' + getMapUrl + '"><img width="' + thumbWidth + '" height="' + thumbHeight + '" alt="Loading preview..." src="' + getMapUrl + '"/></a>';
                    }
                    return 'Unable to preview WMS';
                default :
                    return '';
                }
            }
        });

        //Build our configuration object
        Ext.apply(cfg, {
            sm : sm,
            store : new Ext.data.GroupingStore({
                autoDestroy     : true,
                groupField      : 'type',
                sortInfo        : {
                    field           : 'name',
                    direction       : 'ASC'
                },
                reader : new Ext.data.ArrayReader({
                    fields : [
                        'name',
                        'description',
                        'url',
                        'preview',
                        'type',
                        'cswRecordIndex'
                    ]
                }),
                data : dataItems
            }),
            hideHeaders : true,
            autoHeight: true,
            autoExpandColumn: 'text',
            viewConfig : {
                templates: {
                    cell: new Ext.Template(
                        '<td class="x-grid3-col x-grid3-cell x-grid3-td-{id} x-selectable {css}" style="{style}" tabIndex="0" {cellAttr}>',
                        '<div class="x-grid3-cell-inner x-grid3-col-{id}" {attr}>{value}</div>',
                        '</td>')
                }
            },
            columns: columns
        });

        //Call parent constructor
        CSWResourcesGrid.superclass.constructor.call(this, cfg);

        if (cfg.defaultSelection) {
            this.on('afterrender', function(cmp) {
                //This is an annoying workaround to ensure the selection shows (if this fires
                //too quickly then the checkboxes won't render as checked)
                var task = new Ext.util.DelayedTask(function(){
                    cmp.getSelectionModel().silent = true;
                    cmp.getSelectionModel().selectAll();
                    cmp.getSelectionModel().silent = false;
                });

                task.delay(500);
            });
        }

        this.addEvents('resourceselect', 'resourcedeselect');
    },

    /**
     * Given a URL this will determine the correct character that can be appended
     * so that a number of URL parameters can also be appended
     *
     * See AUS-1931 for why this function should NOT exist
     */
    internalURLSeperator : function(url) {
        var lastChar = url[url.length - 1];
        if (lastChar == '?') {
            return '';
        } else if (lastChar == '&') {
            return '';
        } else if (url.indexOf('?') >= 0) {
            return '&';
        } else {
            return '?';
        }
    },


    /**
     * Gets the list of selected (via checkbox) CSWRecord/CSWOnlineResource objects as an Array.
     * The response consists of an Array of objects matching
     * {
     *  onlineResource : Object - An object matching the CSW OnlineResource object type.
     *  cswRecord : CSWRecord - the CSWRecord that 'owns' the selected onlineResource
     * }
     *
     * This function is predicated on allowSelection being set in the constructor
     */
    getSelectedResources : function() {
        if (!this.allowSelection) {
            return [];
        }

        //Our selection model will be a CheckboxSelectionModel
        var sm = this.getSelectionModel();
        if (!sm) {
            return [];
        }

        var selectedRecords = sm.getSelections();
        var selectedResources = [];

        for (var i = 0; i < selectedRecords.length; i++) {
            this.selectedResources.push({
                onlineResource : selectedRecords[i].get(3),
                cswRecord : this.cswRecords[selectedRecords[i].get(5)]
            })
        }

        return selectedResources;
    }
});

Ext.reg('cswresourcesgrid', CSWResourcesGrid);