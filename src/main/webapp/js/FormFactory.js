//function FormFactory() {

/*Ext.override(Ext.form.Field, {
    hideItem :function(){
        this.formItem.addClass('x-hide-' + this.hideMode);
    },

    showItem: function(){
        this.formItem.removeClass('x-hide-' + this.hideMode);
    },
    setFieldLabel: function(text) {
    var ct = this.el.findParent('div.x-form-item', 3, true);
    var label = ct.first('label.x-form-item-label');
    label.update(text);
  }
});*/

FormFactory = function() {};

FormFactory.prototype.internalGenerateResult = function(form, supportsFiltering) {
    return {
        form				: form,
        supportsFiltering	: supportsFiltering
    };
};

/**
 * Given an activeLayersRecord, work out whether there is an appropriate filter form
 *
 * Returns a response in the form
 * {
 *    form : Ext.FormPanel - can be null - the formpanel to be displayed when this layer is selected
 *    supportsFiltering : boolean - whether this formpanel supports the usage of the filter button
 * }
 *
 */
FormFactory.prototype.getFilterForm = function(activeLayersRecord, map) {
    var cswRecords = activeLayersRecord.getCSWRecords();

    //We treat the collection of CSWRecords belonging to activeLayersRecord as either a WFS, WCS WMS or 'other'
    //(Prioritise WFS -> WCS -> WMS -> other)
    if (cswRecords.length > 0) {
        var id = activeLayersRecord.getId();

        //Check for online resources of a certain type
        for (var i = 0; i < cswRecords.length; i++) {
            var cswRecord = cswRecords[i];
            var wfsResources = cswRecord.getFilteredOnlineResources('WFS');

            //Look for a specific WFS feature we can filter on (we may not find any)
            for (var j = 0; j < wfsResources.length; j++) {
                switch(wfsResources[j].name) {
                case 'er:Mine': return this.internalGenerateResult(new MineFilterForm(id), true);
                case 'er:MiningActivity': return this.internalGenerateResult(new MiningActivityFilterForm(id), true);
                case 'er:MineralOccurrence': return this.internalGenerateResult(new MineralOccurrenceFilterForm(id), true);
                case 'gsml:GeologicUnit': return this.internalGenerateResult(new YilgarnGeochemistryFilterForm(id), true);
                case 'gsml:Borehole': return this.internalGenerateResult(new BoreholeFilterForm(id), true);
                }
            }

            //WCS Records have no filter applied

            //WMS shows an opacity slider
            var wmsResources = cswRecord.getFilteredOnlineResources('WMS');
            if (wmsResources.length !== 0) {
                return this.internalGenerateResult(new WMSLayerFilterForm(activeLayersRecord, map), false);
            }
        }
    }

    return this.internalGenerateResult(null, false);
};