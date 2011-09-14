//this runs on DOM load - you can access all the good stuff now.
var theglobalexml;
//var host = "http://localhost:8080";
//Ext.Ajax.timeout = 180000; //3 minute timeout for ajax calls

//A global instance of GMapInfoWindowManager that helps to open GMap info windows
var mapInfoWindowManager = null;
var map;

//Send these headers with every AJax request we make...
//VT:chrome doesn't like this header: Refused to set unsafe header "Accept-Encoding"
Ext.Ajax.defaultHeaders = {
    'Accept-Encoding': 'gzip, deflate' //This ensures we use gzip for most of our requests (where available)
};

Ext.onReady(function() {

    // Ext quicktips - check out <span qtip="blah blah"></span> around pretty much anything.
    Ext.QuickTips.init();

    var searchBarThreshold = 6; //how many records do we need to have before we show a search bar

    //Generate our data stores
    var activeLayersStore = new ActiveLayersStore();
    var customLayersStore = new CSWRecordStore('getCustomLayers.do');
    
    //Called whenever any of the CSWPanels click 'Add to Map'
    //defaultVisibility [boolean] - Optional - Set this to override the visibility setting for the new layer
    var cswPanelAddHandler = function(cswRecord, defaultVisibility, deferLayerLoad) {
        var activeLayerRec = activeLayersStore.getByCSWRecord(cswRecord);

        if (defaultVisibility == null || defaultVisibility == undefined) {
            defaultVisibility = true;
        }

        if (deferLayerLoad == null || deferLayerLoad == undefined) {
            deferLayerLoad = false;
        }

        //Only add if the record isn't already there
        if (!activeLayerRec) {
            //add to active layers (At the top of the Z-order)
            activeLayerRec = activeLayersStore.addCSWRecord(cswRecord);

            //invoke this layer as being checked
            activeLayerCheckHandler(activeLayerRec, defaultVisibility, false, deferLayerLoad);

            showCopyrightInfo(activeLayerRec);
        }

        //set this record to selected
        activeLayersPanel.getSelectionModel().selectRecords([activeLayerRec.internalRecord], false);
    };

    //Display any copyright information associated with the layer.
    var showCopyrightInfo = function(activeLayerRec) {
        var html = "";
        var cswRecords = activeLayerRec.getCSWRecords();
        if(cswRecords.length > 0) {
            if(cswRecords.length == 1) {
                var constraints = activeLayerRec.getCSWRecords()[0].getConstraints();

                if(constraints.length > 0 ) {
                    html += "<table cellspacing='10' cellpadding='0' border='0'>";
                    if(constraints.length == 1 && constraints[0].length <= 0) {
                        html += "<tr><td>Copyright: Exclusive right to the publication, production, or sale of the rights to a literary, dramatic, musical, or artistic work, or to the use of a commercial print or label, granted by law for a specified period of time to an author, composer, artist, distributor.</td></tr>";
                    } else {
                        for(var i=0; i<constraints.length; i++) {
                            if(/^http:\/\//.test(constraints[i])) {
                                html += "<tr><td><a href="+constraints[i]+" target='_blank'>" + constraints[i] + "</a></td></tr>";
                            } else {
                                html += "<tr><td>" + constraints[i] + "</td></tr>";
                            }
                        }
                    }
                    html += "</table>";
                }
            } else { //TODO: Uncomment to handle layers with multiple cswRecords
//              var hasConstraints = false;
//              var i = 0;
//              while(hasConstraints == false && i < cswRecords.length) {
//                  var constraints = activeLayerRec.getCSWRecords()[0].getConstraints();
//                  if(constraints.length > 0) {
//                      hasConstraints = true;
//                  }
//                  i++;
//              }
//
//              if(hasConstraints == true) {
//                  html += "<table cellspacing='10' cellpadding='0' border='0'>";
//                  html += "<tr><td>";
//                  html += "One or more of the records in this collection has copyright constraints. Please refer to individual records for further information.";
//                  html += "</td></tr>";
//                  html += "</table>";
//              }
            }

            if(html != "") {
                win = new Ext.Window({
                    title       : 'Copyright Information',
                    layout      : 'fit',
                    width       : 500,
                    autoHeight:    true,
                    items: [{
                        xtype   : 'panel',
                        html    : html,
                        bodyStyle   : 'padding:0px',
                        autoScroll  : true,
                        autoDestroy : true
                    }]
                });

                win.show(this);
            }
        }
    };
    
    //Pans the map so that all bboxes linked to this record are visible.
    //If currentBounds is specified
    var moveToBoundsCSWRecord = function(cswRecord) {
    	var bboxExtent = cswRecord.generateGeographicExtent();

    	if (!bboxExtent) {
    		return;
    	}

    	moveMapToBounds(bboxExtent);
    };
    
  //Given a CSWRecord, show (on the map) the list of bboxes associated with that record temporarily
    //bboxOverlayManager - if specified, will be used to store the overlays, otherwise the cswRecord's
    //                      bboxOverlayManager will be used
    var showBoundsCSWRecord = function(cswRecord, bboxOverlayManager) {
    	var geoEls = cswRecord.getGeographicElements();

    	if (!bboxOverlayManager) {
	    	bboxOverlayManager = cswRecord.getBboxOverlayManager();
	    	if (bboxOverlayManager) {
	    		bboxOverlayManager.clearOverlays();
	    	} else {
	    		bboxOverlayManager = new OverlayManager(map);
	    		cswRecord.setBboxOverlayManager(bboxOverlayManager);
	    	}
    	}

    	//Iterate our geographic els to get our list of bboxes
    	for (var i = 0; i < geoEls.length; i++) {
    		var geoEl = geoEls[i];
    		if (geoEl instanceof BBox) {
    			var polygonList = geoEl.toGMapPolygon('00FF00', 0, 0.7,'#00FF00', 0.6);

        	    for (var j = 0; j < polygonList.length; j++) {
        	    	polygonList[j].title = 'bbox';
        	    	bboxOverlayManager.addOverlay(polygonList[j]);
        	    }
    		}
    	}

    	//Make the bbox disappear after a short while
    	var clearTask = new Ext.util.DelayedTask(function(){
    		bboxOverlayManager.clearOverlays();
    	});

    	clearTask.delay(2000);
    };

    //Returns an object
    //{
    //    bboxSrs : 'EPSG:4326'
    //    lowerCornerPoints : [numbers]
    //    upperCornerPoints : [numbers]
    //}
    var fetchVisibleMapBounds = function(gMapInstance) {
        var mapBounds = gMapInstance.getBounds();
        var sw = mapBounds.getSouthWest();
        var ne = mapBounds.getNorthEast();
        var center = mapBounds.getCenter();

        var adjustedSWLng = sw.lng();
        var adjustedNELng = ne.lng();

        //this is so we can fetch data when our bbox is crossing the anti meridian
        //Otherwise our bbox wraps around the WRONG side of the planet
        if (adjustedSWLng <= 0 && adjustedNELng >= 0 ||
            adjustedSWLng >= 0 && adjustedNELng <= 0) {
            adjustedSWLng = (sw.lng() < 0) ? (180 - sw.lng()) : sw.lng();
            adjustedNELng = (ne.lng() < 0) ? (180 - ne.lng()) : ne.lng();
        }

        return {
                bboxSrs : 'EPSG:4326',
                lowerCornerPoints : [Math.min(adjustedSWLng, adjustedNELng), Math.min(sw.lat(), ne.lat())],
                upperCornerPoints : [Math.max(adjustedSWLng, adjustedNELng), Math.max(sw.lat(), ne.lat())]
        };
    };

    /**
     *Iterates through the activeLayersStore and updates each WMS layer's Z-Order to is position within the store
     *
     *This function will refresh every WMS layer too
     */
    var updateActiveLayerZOrder = function() {
        //Update the Z index for each WMS item in the store
        for (var i = 0; i < activeLayersStore.getCount(); i++) {
            var activeLayerRec = new ActiveLayersRecord(activeLayersStore.getAt(i));
            var overlayManager = activeLayerRec.getOverlayManager();

            if (overlayManager && activeLayerRec.getLayerVisible()) {
                var newZOrder = activeLayersStore.getCount() - i;

                overlayManager.updateZOrder(newZOrder);
            }
        }
    };

    //Loads the contents for the specified activeLayerRecord (applying any filtering too)
    //overrideFilterParams [Object] - Optional - specify to ignore any calculated filter parameters and use these values instead
    var loadLayer = function(activeLayerRecord, overrideFilterParams) {
        var cswRecords = activeLayerRecord.getCSWRecords();

        //We simplify things by treating the record list as a single type of WFS, WCS or WMS
        //So lets find the first record with a type we can choose (Prioritise WFS -> WCS -> WMS)
        if (cswRecords.length > 0) {
            var cswRecord = cswRecords[0];

            if (cswRecord.getFilteredOnlineResources('WFS').length !== 0) {
                wfsHandler(activeLayerRecord, overrideFilterParams);
            } else if (cswRecord.getFilteredOnlineResources('WCS').length !== 0) {
                wcsHandler(activeLayerRecord);
            } else if (cswRecord.getFilteredOnlineResources('WMS').length !== 0) {
                wmsHandler(activeLayerRecord);
            } else {
                genericRecordHandler(activeLayerRecord, overrideFilterParams);
            }
        }
    };


    /**
     *@param forceApplyFilter (Optional) if set AND isChecked is set AND this function has a filter panel, it will force the current filter to be loaded
     *@param deferLayerLoad (Optional) if set, the layer will be added but it will NOT load any data
     */
    var activeLayerCheckHandler = function(activeLayerRecord, isChecked, forceApplyFilter, deferLayerLoad) {
        //set the record to be selected if checked
        activeLayersPanel.getSelectionModel().selectRecords([activeLayerRecord.internalRecord], false);

        if (activeLayerRecord.getIsLoading()) {
            activeLayerRecord.setLayerVisible(!isChecked); //reverse selection
            Ext.MessageBox.show({
                title: 'Please wait',
                msg: "There is an operation in process for this layer. Please wait until it is finished.",
                buttons: Ext.MessageBox.OK,
                animEl: 'mb9',
                icon: Ext.MessageBox.INFO
            });
            return;
        }

        activeLayerRecord.setLayerVisible(isChecked);

        if (isChecked) {
            loadLayer(activeLayerRecord);
        } else {
            //Otherwise we are making the layer invisible, so clear any overlays
            var overlayManager = activeLayerRecord.getOverlayManager();
            if (overlayManager) {
                overlayManager.clearOverlays();
            }
        }
    };


    //This will attempt to render the record using only the csw record bounding boxes
    var genericRecordHandler = function(activeLayerRecord, overrideFilterParams) {
        //get our overlay manager (create if required)
        var overlayManager = activeLayerRecord.getOverlayManager();
        if (!overlayManager) {
            overlayManager = new OverlayManager(map);
            activeLayerRecord.setOverlayManager(overlayManager);
        }
        overlayManager.clearOverlays();

        var responseTooltip = new ResponseTooltip();
        activeLayerRecord.setResponseToolTip(responseTooltip);



        //Get the list of bounding box polygons
        var cswRecords = activeLayerRecord.getCSWRecords();
        var knownLayer = activeLayerRecord.getParentKnownLayer();
        var numRecords = 0;
        for (var i = 0; i < cswRecords.length; i++) {
            numRecords++;
            var geoEls = cswRecords[i].getGeographicElements();

            //If we dont have any way of rendering this on the map, just show popup window with details instead
            if (geoEls.length === 0) {
                var popup = new CSWRecordMetadataWindow({
                    cswRecord : cswRecords[i]
                });
                popup.show();
            }

            for (var j = 0; j < geoEls.length; j++) {
                var geoEl = geoEls[j];
                if (geoEl instanceof BBox) {
                    if(geoEl.eastBoundLongitude == geoEl.westBoundLongitude &&
                        geoEl.southBoundLatitude == geoEl.northBoundLatitude) {
                        //We only have a point
                        var point = new GLatLng(parseFloat(geoEl.southBoundLatitude),
                                parseFloat(geoEl.eastBoundLongitude));

                        var icon = new GIcon(G_DEFAULT_ICON, activeLayerRecord.getIconUrl());
                        icon.shadow = null;

                        if (knownLayer !== null) {
                            var iconSize = knownLayer.getIconSize();
                            if (iconSize) {
                                icon.iconSize = new GSize(iconSize.width, iconSize.height);
                            }

                            var iconAnchor = knownLayer.getIconAnchor();
                            if(iconAnchor) {
                                icon.iconAnchor = new GPoint(iconAnchor.x, iconAnchor.y);
                            }
                        }

                        var marker = new GMarker(point, {icon: icon});
                        marker.activeLayerRecord = activeLayerRecord.internalRecord;
                        marker.cswRecord = cswRecords[i].internalRecord;
                        //marker.onlineResource = onlineResource;

                        //Add our single point
                        overlayManager.markerManager.addMarker(marker, 0);

                    } else { //polygon
                        var polygonList = geoEl.toGMapPolygon('#0003F9', 4, 0.75,'#0055FE', 0.4);

                        for (var k = 0; k < polygonList.length; k++) {
                            polygonList[k].cswRecord = cswRecords[i].internalRecord;
                            polygonList[k].activeLayerRecord = activeLayerRecord.internalRecord;

                            overlayManager.addOverlay(polygonList[k]);
                        }
                    }
                }
            }
        }
        overlayManager.markerManager.refresh();

        responseTooltip.addResponse("", numRecords + " record(s) retrieved.");

        activeLayerRecord.setHasData(numRecords > 0);
    };

    //The WCS handler will create a representation of a coverage on the map for a given WCS record
    //If we have a linked WMS url we should use that (otherwise we draw an ugly red bounding box)
    var wcsHandler = function(activeLayerRecord) {

        //get our overlay manager (create if required)
        var overlayManager = activeLayerRecord.getOverlayManager();
        if (!overlayManager) {
            overlayManager = new OverlayManager(map);
            activeLayerRecord.setOverlayManager(overlayManager);
        }

        overlayManager.clearOverlays();

        var responseTooltip = new ResponseTooltip();
        activeLayerRecord.setResponseToolTip(responseTooltip);

        //Attempt to handle each CSW record as a WCS (if possible).
        var cswRecords = activeLayerRecord.getCSWRecordsWithType('WCS');
        for (var i = 0; i < cswRecords.length; i++) {
            var wmsOnlineResources = cswRecords[i].getFilteredOnlineResources('WMS');
            var wcsOnlineResources = cswRecords[i].getFilteredOnlineResources('WCS');
            var geographyEls = cswRecords[i].getGeographicElements();

            //Assumption - We only contain a single WCS in a CSWRecord (although more would be possible)
            var wcsOnlineResource = wcsOnlineResources[0];

            if (geographyEls.length === 0) {
                responseTooltip.addResponse(wcsOnlineResource.url, 'No bounding box has been specified for this coverage.');
                continue;
            }

            //We will need to add the bounding box polygons regardless of whether we have a WMS service or not.
            //The difference is that we will make the "WMS" bounding box polygons transparent but still clickable
            var polygonList = [];
            for (var j = 0; j < geographyEls.length; j++) {
                var thisPolygon = null;
                if (wmsOnlineResources.length > 0) {
                    thisPolygon = geographyEls[j].toGMapPolygon('#000000', 0, 0.0,'#000000', 0.0);
                } else {
                    thisPolygon = geographyEls[j].toGMapPolygon('#FF0000', 0, 0.7,'#FF0000', 0.6);
                }

                polygonList = polygonList.concat(thisPolygon);
            }

            //Add our overlays (they will be used for clicking so store some extra info)
            for (var j = 0; j < polygonList.length; j++) {
                polygonList[j].onlineResource = wcsOnlineResource;
                polygonList[j].cswRecord = cswRecords[i].internalRecord;
                polygonList[j].activeLayerRecord = activeLayerRecord.internalRecord;

                overlayManager.addOverlay(polygonList[j]);
            }

            //Add our WMS tiles (if any)
            for (var j = 0; j < wmsOnlineResources.length; j++) {
                var tileLayer = new GWMSTileLayer(map, new GCopyrightCollection(""), 1, 17);
                tileLayer.baseURL = wmsOnlineResources[j].url;
                tileLayer.layers = wmsOnlineResources[j].name;
                tileLayer.opacity = activeLayerRecord.getOpacity();

                overlayManager.addOverlay(new GTileLayerOverlay(tileLayer));
            }

            if(wcsOnlineResources.length > 0 || wmsOnlineResources.length > 0) {
                activeLayerRecord.setHasData(true);
            }
        }


        //This will update the Z order of our WMS layers
        updateActiveLayerZOrder();
    };

    var wfsHandler = function(activeLayerRecord, overrideFilterParams) {
        //if there is already a filter running for this record then don't call another
        if (activeLayerRecord.getIsLoading()) {
            Ext.MessageBox.show({
                title: 'Please wait',
                msg: "There is an operation in process for this layer. Please wait until it is finished.",
                buttons: Ext.MessageBox.OK,
                animEl: 'mb9',
                icon: Ext.MessageBox.INFO
            });
            return;
        }

        //Get our overlay manager (create if required).
        var overlayManager = activeLayerRecord.getOverlayManager();
        if (!overlayManager) {
            overlayManager = new OverlayManager(map);
            activeLayerRecord.setOverlayManager(overlayManager);
        }
        overlayManager.clearOverlays();

        //a response status holder
        var responseTooltip = new ResponseTooltip();
        activeLayerRecord.setResponseToolTip(responseTooltip);

        //Holds debug info
        var debuggerData = new DebuggerData();
        activeLayerRecord.setDebuggerData(debuggerData);

        //Prepare our query/locations
        var cswRecords = activeLayerRecord.getCSWRecordsWithType('WFS');
        var iconUrl = activeLayerRecord.getIconUrl();
        var finishedLoadingCounter = cswRecords.length;
        var parentKnownLayer = activeLayerRecord.getParentKnownLayer();

        //Begin loading from each service
        activeLayerRecord.setIsLoading(true);
        activeLayerRecord.setHasData(false);

        var transId = [];
        var transIdUrl = [];

        for (var i = 0; i < cswRecords.length; i++) {
            //Assumption - We will only have 1 WFS linked per CSW
            var wfsOnlineResource = cswRecords[i].getFilteredOnlineResources('WFS')[0];

            //Proceed with the query only if the resource url is contained in the list
            //of service endpoints for the known layer, or if the list is null.
            if(activeLayerRecord.getServiceEndpoints() == null  ||
                    includeEndpoint(activeLayerRecord.getServiceEndpoints(),
                            wfsOnlineResource.url, activeLayerRecord.includeEndpoints())) {

                //Generate our filter parameters for this service (or use the override values if specified)
                var filterParameters = { };

                if (overrideFilterParams) {
                    filterParameters = overrideFilterParams;
                } else {
                    // limit our feature request to 200 so we don't overwhelm the browser
                    if (Ext.isNumber(MAX_FEATURES)) {
                        filterParameters.maxFeatures = MAX_FEATURES;
                    } else {
                        filterParameters.maxFeatures = 200;
                    }
                    filterParameters.bbox = Ext.util.JSON.encode(fetchVisibleMapBounds(map)); // This line activates bbox support AUS-1597
                    if (parentKnownLayer && parentKnownLayer.getDisableBboxFiltering()) {
                        filterParameters.bbox = null; //some WFS layer groupings may wish to disable bounding boxes
                    }
                }
                activeLayerRecord.setLastFilterParameters(filterParameters);

                //Generate our filter parameters for this service
                filterParameters.serviceUrl = wfsOnlineResource.url;
                filterParameters.typeName = wfsOnlineResource.name;

                handleQuery(activeLayerRecord, cswRecords[i], wfsOnlineResource, filterParameters, function() {
                    //decrement the counter
                    finishedLoadingCounter--;

                    //check if we can set the status to finished
                    if (finishedLoadingCounter <= 0) {
                        activeLayerRecord.setIsLoading(false);
                    }
                });
                transId[i] = this.Ext.Ajax.transId;
                transIdUrl[i] = wfsOnlineResource.url;

            } else { //If the endpoint will not be part of this layer just mark it as finished loading
                //decrement the counter
                finishedLoadingCounter--;

                //check if we can set the status to finished
                if (finishedLoadingCounter <= 0) {
                    activeLayerRecord.setIsLoading(false);
                }
            }
        }
        activeLayerRecord.setWFSRequestTransId(transId);
        activeLayerRecord.setWFSRequestTransIdUrl(transIdUrl);
    };

    /**
     * determines whether or not a particular endpoint should be included when loading
     * a layer
     */
    var includeEndpoint = function(endpoints, endpoint, includeEndpoints) {
        for(var i = 0; i < endpoints.length; i++) {
            if(endpoints[i].indexOf(endpoint) >= 0) {
                return includeEndpoints;
            }
        }
        return !includeEndpoints;
    };

    /**
     * internal helper method for Handling WFS filter queries via a proxyUrl and adding them to the map.
     */
    var handleQuery = function(activeLayerRecord, cswRecord, onlineResource, filterParameters, finishedLoadingHandler) {

        var responseTooltip = activeLayerRecord.getResponseToolTip();
        responseTooltip.addResponse(filterParameters.serviceUrl, "Loading...");

        var debuggerData = activeLayerRecord.getDebuggerData();

        var knownLayer = activeLayerRecord.getParentKnownLayer();

        //If we don't have a proxy URL specified, use the generic 'getAllFeatures.do'
        var url = activeLayerRecord.getProxyUrl();
        if (!url) {
            url = 'getAllFeatures.do';
        }

        Ext.Ajax.request({
            url         : url,
            params      : filterParameters,
            timeout     : 1000 * 60 * 20, //20 minute timeout
            failure     : function(response) {
                responseTooltip.addResponse(filterParameters.serviceUrl, 'ERROR ' + response.status + ':' + response.statusText);
                finishedLoadingHandler();
            },
            success     : function(response) {
                var jsonResponse = Ext.util.JSON.decode(response.responseText);

                if (jsonResponse.success) {
                    var icon = new GIcon(G_DEFAULT_ICON, activeLayerRecord.getIconUrl());

                    //Assumption - we are only interested in the first (if any) KnownLayer
                    if (knownLayer) {
                        var iconSize = knownLayer.getIconSize();
                        if (iconSize) {
                            icon.iconSize = new GSize(iconSize.width, iconSize.height);
                        }

                        var iconAnchor = knownLayer.getIconAnchor();
                        if(iconAnchor) {
                            icon.iconAnchor = new GPoint(iconAnchor.x, iconAnchor.y);
                        }

                        var infoWindowAnchor = knownLayer.getInfoWindowAnchor();
                        if(infoWindowAnchor) {
                            icon.infoWindowAnchor = new GPoint(infoWindowAnchor.x, infoWindowAnchor.y);
                        }
                    }

                    //TODO: This is a hack to remove marker shadows. Eventually it should be
                    // put into an external config file or become a session-based preference.
                    icon.shadow = null;

                    //Parse our KML
                    var parser = new KMLParser(jsonResponse.data.kml);
                    parser.makeMarkers(icon, function(marker) {
                        marker.activeLayerRecord = activeLayerRecord.internalRecord;
                        marker.cswRecord = cswRecord.internalRecord;
                        marker.onlineResource = onlineResource;
                    });

                    var markers = parser.markers;
                    var overlays = parser.overlays;

                    //Add our single points and overlays
                    var overlayManager = activeLayerRecord.getOverlayManager();
                    overlayManager.markerManager.addMarkers(markers, 0);
                    for(var i = 0; i < overlays.length; i++) {
                        overlayManager.addOverlay(overlays[i]);
                    }
                    overlayManager.markerManager.refresh();

                    //Store some debug info
                    var debugInfo = jsonResponse.debugInfo.info;
                    debuggerData.addResponse(jsonResponse.debugInfo.url,debugInfo);

                    //store the status
                    responseTooltip.addResponse(filterParameters.serviceUrl, (markers.length + overlays.length) + " record(s) retrieved.");

                    if(markers.length > 0 || overlays.length > 0) {
                        activeLayerRecord.setHasData(true);
                    }

                } else {
                    //store the status
                    responseTooltip.addResponse(filterParameters.serviceUrl, jsonResponse.msg);
                    if(jsonResponse.debugInfo === undefined) {
                        debuggerData.addResponse(filterParameters.serviceUrl, jsonResponse.msg);
                    } else {
                        debuggerData.addResponse(filterParameters.serviceUrl, jsonResponse.msg +jsonResponse.debugInfo.info);
                    }
                }

                //we are finished
                finishedLoadingHandler();
            }
        });
    };

    var wmsHandler = function(activeLayerRecord) {

        //Get our overlay manager (create if required).
        var overlayManager = activeLayerRecord.getOverlayManager();
        if (!overlayManager) {
            overlayManager = new OverlayManager(map);
            activeLayerRecord.setOverlayManager(overlayManager);
        }
        overlayManager.clearOverlays();

        //Add each and every WMS we can find
        var cswRecords = activeLayerRecord.getCSWRecordsWithType('WMS');
        for (var i = 0; i < cswRecords.length; i++) {
            var wmsOnlineResources = cswRecords[i].getFilteredOnlineResources('WMS');
            for (var j = 0; j < wmsOnlineResources.length; j++) {
                var tileLayer = new GWMSTileLayer(map, new GCopyrightCollection(""), 1, 17);
                tileLayer.baseURL = wmsOnlineResources[j].url;
                tileLayer.layers = wmsOnlineResources[j].name;
                tileLayer.opacity = activeLayerRecord.getOpacity();

                overlayManager.addOverlay(new GTileLayerOverlay(tileLayer));
            }

            if(wmsOnlineResources.length > 0) {
                activeLayerRecord.setHasData(true);
            }
        }

        //This will handle adding the WMS layer(s) (as well as updating the Z-Order)
        updateActiveLayerZOrder();
    };

    //This handler is called whenever the user selects an active layer
    var activeLayerSelectionHandler = function(activeLayerRecord) {

    };


    //This handler is called on records that the user has requested to delete from the active layer list
    var activeLayersRemoveHandler = function(activeLayerRecord) {
        if (activeLayerRecord.getIsLoading()) {
            Ext.MessageBox.show({
                buttons: {yes:'Stop Processing', no:'Cancel'},
                fn: function(buttonId){
                    if(buttonId === 'yes')
                    {
                        activeLayersStopRequest(activeLayerRecord);
                    }
                    else if (buttonId === 'no') {
                        return;
                    }
                },
                icon: Ext.MessageBox.INFO,
                modal:true,
                msg: "Cannot remove the layer because there is an operation in process. Do you want to stop further processing?",
                title: 'Stop Processing!'
            });
        }
        else{

            var overlayManager = activeLayerRecord.getOverlayManager();
            if (overlayManager) {
                overlayManager.clearOverlays();
            }

            //remove it from active layers
            activeLayersStore.removeActiveLayersRecord(activeLayerRecord);
        }
    };

    var activeLayersStopRequest = function(activeLayerRecord){
        if (!activeLayerRecord.getIsLoading()) {
            return;
        }
        else{
            var transID = activeLayerRecord.getWFSRequestTransId();
            var transIDUrl = activeLayerRecord.getWFSRequestTransIdUrl();
            for(i =0;i< transID.length; i++){
                if(Ext.Ajax.isLoading(transID[i])){
                    Ext.Ajax.abort(transID[i]);
                    var responseTooltip = activeLayerRecord.getResponseToolTip();
                    responseTooltip.addResponse(transIDUrl[i],"Processing Aborted");
                }
            }
            activeLayerRecord.setIsLoading(false);
        }
    };



    this.activeLayersPanel = new ActiveLayersGridPanel('active-layers-panel',
                                                        'Active Layers',
                                                        'The map layers will display on the map in the order in which they were added.',
                                                        activeLayersStore,
                                                        activeLayerSelectionHandler,
                                                        updateActiveLayerZOrder,
                                                        activeLayersRemoveHandler,
                                                        activeLayersStopRequest,
                                                        activeLayerCheckHandler);

    /**
     * Tooltip for the active layers
     */
    var activeLayersToolTip = null;

    /**
     * Handler for mouse over events on the active layers panel, things like server status, and download buttons
     */
    this.activeLayersPanel.on('mouseover', function(e, t) {
        e.stopEvent();

        var row = e.getTarget('.x-grid3-row');
        var col = e.getTarget('.x-grid3-col');

        //if there is no visible tooltip then create one, if on is visible already we dont want to layer another one on top
        if (col !== null && (activeLayersToolTip === null || !activeLayersToolTip.isVisible())) {

            //get the actual data record
            var theRow = activeLayersPanel.getView().findRow(row);
            var activeLayerRecord = new ActiveLayersRecord(activeLayersPanel.getStore().getAt(theRow.rowIndex));

            var autoWidth = !Ext.isIE6 && !Ext.isIE7;

            //This is for the key/legend column
            if (col.cellIndex == '1') {

                if (activeLayerRecord.getCSWRecordsWithType('WMS').length > 0) {
                    activeLayersToolTip = new Ext.ToolTip({
                        target: e.target ,
                        autoHide : true,
                        html: 'Show the key/legend for this layer' ,
                        anchor: 'bottom',
                        trackMouse: true,
                        showDelay:60,
                        autoHeight:true,
                        autoWidth: autoWidth,
                        listeners : {
                            hide : function(component) {
                                component.destroy();
                            }
                        }
                    });
                }
            }
            //this is the status icon column
            else if (col.cellIndex == '2') {
                var html = 'No status has been recorded.';
                var htmlResponse = false;

                if (activeLayerRecord.getResponseToolTip() != null) {
                    html = activeLayerRecord.getResponseToolTip().getHtml();
                    htmlResponse = true;
                }

                activeLayersToolTip = new Ext.ToolTip({
                    target: e.target ,
                    header: false,
                    //title: 'Status Information',
                    autoHide : true,
                    html: html ,
                    anchor: 'bottom',
                    trackMouse: true,
                    showDelay:60,
                    autoHeight:true,
                    autoWidth: autoWidth,
                    maxWidth:500,
                    width:autoWidth ? undefined : 500,
                    listeners : {
                        hide : function(component) {
                            component.destroy();
                        }
                    }
                });
            }

            //this is the column for download link icons
            else if (col.cellIndex == '5') {
                if(activeLayerRecord.hasData()) {
                    activeLayersToolTip = new Ext.ToolTip({
                        target: e.target ,
                        //title: 'Status Information',
                        autoHide : true,
                        html: 'Download data for this layer.' ,
                        anchor: 'bottom',
                        trackMouse: true,
                        showDelay:60,
                        autoHeight:true,
                        autoWidth: autoWidth,
                        listeners : {
                            hide : function(component) {
                                component.destroy();
                            }
                        }
                    });
                } else {
                    activeLayersToolTip = new Ext.ToolTip({
                        target: e.target ,
                        autoHide : true,
                        html: 'No download is available.' ,
                        anchor: 'bottom',
                        trackMouse: true,
                        showDelay:60,
                        autoHeight:true,
                        autoWidth: autoWidth,
                        listeners : {
                            hide : function(component) {
                                component.destroy();
                            }
                        }
                    });
                }
            }
        }
    });

    /**
     * Handler for click events on the active layers panel, used for the
     * new browser window popup which shows the GML or WMS image
     */
    this.activeLayersPanel.on('click', function(e, t) {
        e.stopEvent();

        var row = e.getTarget('.x-grid3-row');
        var col = e.getTarget('.x-grid3-col');

        // if there is no visible tooltip then create one, if on is
        // visible already we don't want to layer another one on top
        if (col !== null) {

            //get the actual data record
            var theRow = activeLayersPanel.getView().findRow(row);
            var activeLayerRecord = new ActiveLayersRecord(activeLayersPanel.getStore().getAt(theRow.rowIndex));

            //This is the marker key column
            if (col.cellIndex == '1') {
                //For WMS, we request the Legend and display it
                var cswRecords = activeLayerRecord.getCSWRecordsWithType('WMS');
                if (cswRecords.length > 0) {

                    //Only show the legend window if it's not currently visible
                    var win = activeLayerRecord.getLegendWindow();
                    if (!win || (win && !win.isVisible())) {

                        //Generate a legend for each and every WMS linked to this record
                        var html = '';
                        var titleTypes = '';
                        for (var i = 0; i < cswRecords.length; i++) {
                            var wmsOnlineResources = cswRecords[i].getFilteredOnlineResources('WMS');

                            if (titleTypes.length !== 0) {
                                titleTypes += ', ';
                            }
                            titleTypes += cswRecords[i].getServiceName();

                            for (var j = 0; j < wmsOnlineResources.length; j++) {
                                var url = new LegendManager(wmsOnlineResources[j].url, wmsOnlineResources[j].name).generateImageUrl();

                                html += '<a target="_blank" href="' + url + '">';
                                html += '<img onerror="this.alt=\'There was an error loading this legend. Click here to try again in a new window or contact the data supplier.\'" alt="Loading legend..." src="' + url + '"/>';
                                html += '</a>';
                                html += '<br/>';
                            }
                        }

                        win = new Ext.Window({
                            title       : 'Legend: ' + titleTypes,
                            layout      : 'fit',
                            width       : 200,
                            height      : 300,

                            items: [{
                                xtype   : 'panel',
                                html    : html,
                                autoScroll  : true
                            }]
                        });

                        //Save our window reference so we can tell if its already been open
                        activeLayerRecord.setLegendWindow(win);

                        win.show(e.getTarget());
                    } else if (win){
                        //The window is already open
                        win.toFront();
                        win.center();
                        win.focus();
                    }
                }
            }
            //this is to add Service Information Popup Window to Active Layers
            else if (col.cellIndex == '2'){

                if (this.onlineResourcesPopup && this.onlineResourcesPopup.isVisible()) {
                    this.onlineResourcesPopup.close();
                }
                var cswRecords = activeLayerRecord.getCSWRecords();
                if (activeLayerRecord.getSource() === 'KnownLayer'){
                    var knownLayerRecord = knownLayersStore.getKnownLayerById(activeLayerRecord.getId());
                    this.onlineResourcesPopup = new CSWRecordDescriptionWindow(cswRecords, knownLayerRecord);
                }else{
                    this.onlineResourcesPopup = new CSWRecordDescriptionWindow(cswRecords);
                }
                this.onlineResourcesPopup.show(e.getTarget());

            }

          //this is for clicking the loading icon
            else if (col.cellIndex == '3') {

                //to get the value of variable used in url
                var gup = function ( name ) {
                    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
                    var regexS = "[\\?&]"+name+"=([^&#]*)";
                    var regex = new RegExp( regexS );
                    var results = regex.exec( window.location.href );
                    if( results === null ) {
                        return "";
                    } else {
                        return results[1];
                    }
                };
                var filter_debugger_param = gup( 'debug' );
                //get the debug window if there is a debug variable with value 1
                if(filter_debugger_param == 1 || filter_debugger_param == "on"){
                       var debugHtml = 'Please generate a request to get the request query.';

                    if (activeLayerRecord.getDebuggerData()) {
                           debugHtml = activeLayerRecord.getDebuggerData().getHtml();
                    }

                    var chkpanel = new Ext.Panel({
                           autoScroll   : true,
                        html    :   debugHtml
                    });
                    var debugWin = new Ext.Window({
                        title: 'WFS Debug Information',
                           layout:'fit',
                           width:500,
                        height:300,

                        items: [chkpanel]
                    });

                    debugWin.show(this);
                }
            }
            //this is the column for download link icons
            else if (col.cellIndex == '5') {
                if(activeLayerRecord.hasData()) {
                    var keys = [];
                    var values = [];

                    var wfsRecords = activeLayerRecord.getCSWRecordsWithType('WFS');
                    var wcsRecords = activeLayerRecord.getCSWRecordsWithType('WCS');
                    var wmsRecords = activeLayerRecord.getCSWRecordsWithType('WMS');

                    //We simplify things by treating the record list as a single type of WFS, WCS or WMS
                    //So lets find the first record with a type we can choose (Prioritise WFS -> WCS -> WMS)
                    var cswRecords = wfsRecords;
                    if (cswRecords.length !== 0) {
                        var filterParameters = activeLayerRecord.getLastFilterParameters();
                        if (!filterParameters) {
                            filterParameters = {};
                        }
                        var bbox = filterParameters.bbox;
                        var boundingbox = Ext.util.JSON.encode(fetchVisibleMapBounds(map));
                        var proxyUrl = activeLayerRecord.getProxyUrl()!== null ? activeLayerRecord.getProxyUrl() : 'getAllFeatures.do';
                        var prefixUrl = window.location.protocol + "//" + window.location.host + WEB_CONTEXT + "/" + proxyUrl + "?";

                        if(bbox === null || bbox === undefined){
                            downloadWFS(cswRecords, activeLayerRecord, filterParameters, prefixUrl, null, keys, values);
                        }
                        else{
                            if(bbox === boundingbox){
                                downloadWFS(cswRecords, activeLayerRecord, filterParameters, prefixUrl, bbox, keys, values);
                            }
                            else{
                                Ext.MessageBox.show({
                                    buttons:{yes:'Use current', no:'Use original'},
                                    fn:function (buttonId) {
                                        if (buttonId === 'yes') {
                                            downloadWFS(cswRecords, activeLayerRecord, filterParameters, prefixUrl, boundingbox, keys, values);
                                        } else if (buttonId === 'no') {
                                            downloadWFS(cswRecords, activeLayerRecord, filterParameters, prefixUrl, bbox, keys, values);
                                        }
                                    },
                                    modal:true,
                                    msg:'The visible bounds have changed since you added this layer. Would you like to download using the original or the current visible bounds?',
                                    title:'Warning: Changed Visible Bounds!'
                                });
                            }
                        }
                    }

                    if (wfsRecords.length === 0 && wcsRecords.length !== 0) {
                        cswRecords = wcsRecords;
                        //Assumption - we only expect 1 WCS
                        var wcsOnlineResource = cswRecords[0].getFilteredOnlineResources('WCS')[0];
                        showWCSDownload(wcsOnlineResource.url, wcsOnlineResource.name);
                        return;
                    }

                    //For WMS we download every WMS
                    if (wfsRecords.length === 0 && wcsRecords.length === 0 && wmsRecords.length !== 0) {
                        cswRecords = wmsRecords;
                        for (var i = 0; i < cswRecords.length; i++) {
                            var wmsOnlineResources = cswRecords[i].getFilteredOnlineResources('WMS');
                            for (var j = 0; j < wmsOnlineResources.length; j++) {
                                var boundBox = (map.getBounds().getSouthWest().lng() < 0 ? map.getBounds().getSouthWest().lng() + 360.0 : map.getBounds().getSouthWest().lng()) + "," +
                                map.getBounds().getSouthWest().lat() + "," +
                                (map.getBounds().getNorthEast().lng() < 0 ? map.getBounds().getNorthEast().lng() + 360.0 : map.getBounds().getNorthEast().lng()) + "," +
                                map.getBounds().getNorthEast().lat();

                                 var url = wmsOnlineResources[j].url;
                                 var typeName = wmsOnlineResources[j].name;

                                 var last_char = url.charAt(url.length - 1);
                                 if ((last_char !== "?") && (last_char !== "&")) {
                                     if (url.indexOf('?') == -1) {
                                         url += "?";
                                     } else {
                                         url += "&";
                                     }
                                 }

                                 url += "REQUEST=GetMap";
                                 url += "&SERVICE=WMS";
                                 url += "&VERSION=1.1.0";
                                 url += "&LAYERS=" + typeName;
                                 if (this.styles) {
                                     url += "&STYLES=" + this.styles;
                                 } else {
                                     url += "&STYLES="; //Styles parameter is mandatory, using a null string ensures default style
                                 }
                                 /*
                                  if (this.sld)
                                  url += "&SLD=" + this.sld;*/
                                 url += "&FORMAT=" + "image/png";
                                 url += "&BGCOLOR=0xFFFFFF";
                                 url += "&TRANSPARENT=TRUE";
                                 url += "&SRS=" + "EPSG:4326";
                                 url += "&BBOX=" + boundBox;
                                 url += "&WIDTH=" + map.getSize().width;
                                 url += "&HEIGHT=" + map.getSize().height;

                                 keys.push('serviceUrls');
                                 values.push(url);
                            }
                        }

                        openWindowWithPost("downloadDataAsZip.do?", 'WMS_Layer_Download', keys, values);
                        return;
                    }
                }
            }
        }
    });


    var downloadWFS = function( cswRecords, activeLayerRecord, filterParameters, prefixUrl, bbox, keys, values){

        for (var i = 0; i < cswRecords.length; i++) {
            var wfsOnlineResources = cswRecords[i].getFilteredOnlineResources('WFS');
            var cswWfsRecordCount = cswRecords.length;
            var WfsOnlineResourceCount = wfsOnlineResources.length;

            for (var j = 0; j < wfsOnlineResources.length; j++) {
                //Generate our filter parameters (or just grab the last set used
                var url = wfsOnlineResources[j].url;

                filterParameters.serviceUrl = wfsOnlineResources[j].url;
                filterParameters.typeName = wfsOnlineResources[j].name;
                filterParameters.maxFeatures = 0;

                if(activeLayerRecord.getServiceEndpoints() === null ||
                        includeEndpoint(activeLayerRecord.getServiceEndpoints(), url, activeLayerRecord.includeEndpoints())) {
                        var currentFilterParameters = copy_obj(filterParameters);
                        currentFilterParameters.bbox = bbox;
                        keys.push('serviceUrls');
                        values.push(Ext.urlEncode(currentFilterParameters, prefixUrl));
                }
            }
        }

        openWindowWithPost("downloadGMLAsZip.do?", 'WFS_Layer_Download_'+new Date().getTime(), keys, values);
        return;
    }

   /** This function copy an object to another by value and not by reference**/
   var copy_obj = function(objToCopy) {
        var obj = new Object();

        for (var e in objToCopy) {
          obj[e] = objToCopy[e];
        }
        return obj;
  };



    /**
     * Opens a new window to the specified URL and passes URL parameters like so keys[x]=values[x]
     *
     * @param {String} url
     * @param {String} name
     * @param {Array}  keys
     * @param {Array} values
     */
    var openWindowWithPost = function(url, name, keys, values)
    {
        if (keys && values && (keys.length == values.length)) {
            for (var i = 0; i < keys.length; i++) {
                url += '&' + keys[i] + '=' + escape(values[i]);
            }
            url += '&filename=' + escape(name);
        }
        downloadFile(url);
    };

    //downloads given specified file.
    downloadFile = function(url) {
        var body = Ext.getBody();
        var frame = body.createChild({
            tag:'iframe',
            cls:'x-hidden',
            id:'iframe',
            name:'iframe'
        });
        var form = body.createChild({
            tag:'form',
            cls:'x-hidden',
            id:'form',
            target:'iframe',
            method:'POST'
        });
        form.dom.action = url;
        form.dom.submit();
    };

    // a form for filtering records from a CSW and then displaying the results
    var cswFilterPanel = new CSWThemeFilterForm({
        id : 'csw-filter-panel',
        title : 'CSW Theme Filter',
        region:'north',
        split: true,
        height: 425,
        autoScroll: true,
        getMapFn : function() {
            return map;
        },
       
        bbar: [{
        	xtype: 'tbfill'
        	},{
            xtype : 'button',
            text : 'Search',    
            
            //pressed : true,
            iconCls : 'find',
            handler : function() {
                var filterPanel = Ext.getCmp('csw-filter-panel');
                var filterParams = filterPanel.generateCSWFilterParameters();

                //Ensure we have selected at least 1 registry
                var selectedCSWs = filterPanel.getSelectedCSWServices();
                if (selectedCSWs.length == 0) {
                    Ext.MessageBox.show({
                        title : 'No Registries',
                        icon : Ext.MessageBox.WARNING,
                        buttons : Ext.Msg.OK,
                        msg : 'You must select at least one registry before you can perform a CSW query.',
                        multiline : false
                    });
                    return;
                }

                win = new Ext.Window({
                    title       : 'Search Results',
                    layout      : 'fit',
                    width       : 500,
                    height      : 420,
                    items: [{
                        xtype : 'multicswresultspanel',
                        filterParams : filterParams,
                        cswServiceItems : selectedCSWs,
                        map : map
                    }],
                    buttonAlign : 'right',
                    buttons : [{
                        xtype : 'button',
                        text : 'Add Selected Records',
                        iconCls : 'add',
                        handler : function(button, e) {
                            //Get our reference to our MultiCSWResultsPanel
                            var multiFilterPanel = button.findParentByType('window').findByType('multicswresultspanel')[0];

                            //Get our selected records
                            var selection = multiFilterPanel.getSelectedCSWRecords();
                            if (selection.length === 0) {
                                return;
                            }

                            for (var i = 0; i < selection.length; i++) {
                                cswPanelAddHandler(selection[i]);
                            }
                        }
                    }]

                });

                win.show(this);
            }
        }]
    });
    
    var customLayersPanel = new CustomLayersGridPanel('custom-layers-panel',
    		'Custom Layers',
    		'Add your own WMS Layers',
    		customLayersStore,
    		cswPanelAddHandler,
    		showBoundsCSWRecord,
    		moveToBoundsCSWRecord);
    
 // basic tabs 1, built from existing content
    var tabsPanel = new Ext.TabPanel({
        //width:450,
        activeTab: 0,
        region:'north',
        split: true,
        //height: 225,
        autoHeight: true,
        autoScroll: true,
        enableTabScroll: true,
        //autosize:true,
        items:[
            cswFilterPanel,
            customLayersPanel
        ]
    });
    
    

    /**
     * Used as a placeholder for the tree and details panel on the left of screen
     */
    var westPanel = {
        layout: 'border',
        region:'west',
        border: false,
        split:true,
        //margins: '100 0 0 0',
        margins:'100 0 0 3',
        width: 350,
        items:[tabsPanel , activeLayersPanel]
    };

    /**
     * This center panel will hold the google maps
     */
    var centerPanel = new Ext.Panel({
        region: 'center',
        id: 'center_region',
        margins: '100 0 0 0',
        cmargins:'100 0 0 0'
    });

    /**
     * Add all the panels to the viewport
     */
    var viewport = new Ext.Viewport({
        layout:'border',
        items:[westPanel, centerPanel]
    });

    // Is user's browser suppported by Google Maps?
    if (GBrowserIsCompatible()) {

        map = new GMap2(centerPanel.body.dom);

        /* AUS-1526 search bar. */

        map.enableGoogleBar();
        /*
        // Problems, find out how to
        1. turn out advertising
        2. Narrow down location seraches to the current map view
                        (or Australia). Search for Albany retruns Albany, US
        */

        map.setUIToDefault();

        //add google earth
        map.addMapType(G_SATELLITE_3D_MAP);

        // Large pan and zoom control
        //map.addControl(new GLargeMapControl(),  new GControlPosition(G_ANCHOR_TOP_LEFT));

        // Toggle between Map, Satellite, and Hybrid types
        map.addControl(new GMapTypeControl());

        var startZoom = 4;
        map.setCenter(new google.maps.LatLng(-26, 133.3), startZoom);
        map.setMapType(G_SATELLITE_MAP);

        //Thumbnail map
        var Tsize = new GSize(150, 150);
        map.addControl(new GOverviewMapControl(Tsize));

        map.addControl(new DragZoomControl(), new GControlPosition(G_ANCHOR_TOP_RIGHT, new GSize(345, 7)));

        mapInfoWindowManager = new GMapInfoWindowManager(map);
    }

    // Fix for IE/Firefox resize problem (See issue AUS-1364 and AUS-1565 for more info)
    map.checkResize();
    centerPanel.on('resize', function() {
        map.checkResize();
    });

    //updateCSWRecords dud gloabal for geoxml class
    theglobalexml = new GeoXml("theglobalexml", map, null, null);

    //event handlers and listeners
    //tree.on('click', function(node, event) { treeNodeOnClickController(node, event, viewport, filterPanel); });
    //tree.on('checkchange', function(node, isChecked) { treeCheckChangeController(node, isChecked, map, statusBar, viewport, downloadUrls, filterPanel); });

    //when updateCSWRecords person clicks on updateCSWRecords marker then do something
    GEvent.addListener(map, "click", function(overlay, latlng, overlayLatlng) {
        gMapClickController(map, overlay, latlng, overlayLatlng, activeLayersStore);
    });

    GEvent.addListener(map, "mousemove", function(latlng){
        var latStr = "<b>Long:</b> " + latlng.lng().toFixed(6) +
                   "&nbsp&nbsp&nbsp&nbsp" +
                   "<b>Lat:</b> " + latlng.lat().toFixed(6);
        document.getElementById("latlng").innerHTML = latStr;
    });

    GEvent.addListener(map, "mouseout", function(latlng){
        document.getElementById("latlng").innerHTML = "";
    });

    //Attempts to deserialize the state string and apply its contents to the current map
    var attemptDeserialization = function(stateString) {
        var s = new MapStateSerializer();

        //Attempt to deserialize - there shouldn't be any problems unless we are trying to backport a 'future' serialization string
        try {
            s.deserialize(stateString);
        } catch(er) {
            Ext.MessageBox.show({
                title : 'Unsupported Permanent Link',
                icon : Ext.MessageBox.WARNING,
                buttons : Ext.Msg.OK,
                msg : 'The permanent link that you are using is in a format that this portal cannot recognize. The saved layers and viewport will not be loaded.',
                multiline : false
            });
            return;
        }

        //Pan our map to the appropriate location
        map.setZoom(s.mapState.zoom);
        map.panTo(new GLatLng(s.mapState.center.lat, s.mapState.center.lng));

        var missingLayers = false; //are there any layers serialized that no longer exist?

        //Add the layers, attempt to load whatever layers are available
        //but warn the user if some layers no longer exist
        for (var i = 0; i < s.activeLayers.length; i++) {
            if (s.activeLayers[i].source === 'KnownLayer') {
                if (!s.activeLayers[i].id) {
                    continue;
                }

                var knownLayer = knownLayersStore.getKnownLayerById(s.activeLayers[i].id);
                if (!knownLayer) {
                    missingLayers = true;
                    continue;
                }

                knownLayerAddHandler(knownLayer, s.activeLayers[i].visible, true);
                var activeLayerRec = activeLayersStore.getByKnownLayerRecord(knownLayer);
                if (activeLayerRec) {
                    activeLayerRec.setOpacity(s.activeLayers[i].opacity);

                    if (s.activeLayers[i].visible) {
                        loadLayer(activeLayerRec, s.activeLayers[i].filter);
                    }
                }

            } else if (s.activeLayers[i].source === 'CSWRecord') {
                //Perform a 'best effort' to find a matching CSWRecord
                var cswRecords = cswRecordStore.getCSWRecordsByOnlineResources(s.activeLayers[i].onlineResources);
                if (cswRecords.length === 0) {
                    missingLayers = true;
                    continue;
                }

                var cswRecord = cswRecords[0];
                cswPanelAddHandler(cswRecord, s.activeLayers[i].visible, true);
                var activeLayerRec = activeLayersStore.getByCSWRecord(cswRecord);
                if (activeLayerRec) {
                    activeLayerRec.setOpacity(s.activeLayers[i].opacity);

                    if (s.activeLayers[i].visible) {
                        loadLayer(activeLayerRec, s.activeLayers[i].filter);
                    }
                }
            }
        }

        if (missingLayers) {
            Ext.MessageBox.show({
                title : 'Missing Layers',
                icon : Ext.MessageBox.WARNING,
                buttons : Ext.Msg.OK,
                msg : 'Some of the layers that were saved no longer exist and will be ignored. The remaining layers will load normally',
                multiline : false
            });
        }
    };
});