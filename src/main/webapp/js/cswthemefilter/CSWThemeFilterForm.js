/**
 * A Ext.form.FormPanel specialisation for allowing the user to generate
 * a filter query for an underlying CSW based on a number of preconfigured themes.
 *
 * The filter is generated dynamically from a series of plugin components
 */
CSWThemeFilterForm = Ext.extend(Ext.form.FormPanel, {

    themeComponents : [],
    themeStore : null,
    cswServiceItemStore : null,

    /**
     * Constructor for this class, accepts all configuration options that can be
     * specified for a Ext.form.FormPanel as well as the following extensions
     */
    constructor : function(cfg) {
        var cswThemeFilterForm = this;  //To maintain our scope in callbacks

        //Load our list of themes
        this.themeStore = new Ext.data.Store({
            proxy    : new Ext.data.HttpProxy({url: 'getAllCSWThemes.do'}),
            reader : new Ext.data.JsonReader({
                root            : 'data',
                id              : 'urn',
                successProperty : 'success',
                messageProperty : 'msg',
                fields          : [
                    'urn',
                    'label',
                    'indent'
                ]
            })
        });
        this.themeStore.load();

        //Load our list of CSW Items (when the form is rendered)
        this.cswServiceItemStore = new Ext.data.Store({
            proxy    : new Ext.data.HttpProxy({url: 'getCSWServices.do'}),
            reader : new Ext.data.JsonReader({
                root            : 'data',
                id              : 'id',
                successProperty : 'success',
                messageProperty : 'msg',
                fields          : [
                    'id',
                    'title',
                    'url',
                    'selectedByDefault'
                ]
            })
        });

        //Load all components that can be selected in relation to a theme specific selection
        this.themeComponents.push(CSWThemeFilter.SensorType);

        //Build our configuration
        Ext.apply(cfg, {
            hideBorders : true,
            items : [{
                xtype : 'spacer',
                height : 5
            },
            new CSWThemeFilter.Text({}), //This component is 'generic' and used by all CSW filters
            new CSWThemeFilter.Keywords({}), //This component is 'generic' and used by all CSW filters
            new CSWThemeFilter.Spatial({collapsed : true}), //This component is 'generic' and used by all CSW filters
            {
                xtype: 'fieldset',
                title: 'Search by Theme',
                collapsible : true,
                collapsed : true,
                hideBorders: true,
                items : [{
                    xtype : 'portalclearablecombo',
                    hideBorders : true,
                    fieldLabel : 'Theme',
                    anchor : '100%',
                    name : 'theme',
                    store : this.themeStore,
                    forceSelection : true,
                    triggerAction : 'all',
                    typeAhead : true,
                    typeAheadDelay : 500,
                    displayField : 'label',
                    valueField : 'urn',
                    mode : 'local',
                    //This template allows us to treat 'indent' levels differently
                    tpl :  new Ext.XTemplate(
                            '<tpl for=".">',
                                '<div class="x-combo-list-item">',
                                    '<tpl if="indent==0"><b>{label}</b></tpl>',
                                    '<tpl if="indent==1">&bull; {label}</tpl>',
                                    '<tpl if="indent==2">&raquo; {label}</tpl>',
                                '</div>',
                            '</tpl>'),
                    listeners : {
                        // On selection update our list of active base components
                        select : function(combo, record, index) {
                            cswThemeFilterForm._clearThemeComponents();
                            if (record) {
                                var urn = record.get('urn');
                                for (var i = 0; i < cswThemeFilterForm.themeComponents.length; i++) {
                                    //Only add components that support the newly selected theme
                                    //(components that are always visible are added elsewhere)
                                    var cmp = new cswThemeFilterForm.themeComponents[i]({});
                                    if (cmp.supportsTheme(urn)) {
                                        this.ownerCt.add(cmp);
                                    } else {
                                        cmp.destroy();
                                    }
                                }
                            }
                            cswThemeFilterForm.doLayout();
                        }
                    }
                }]
            },{
                xtype : 'fieldset',
                title : 'Locations to search',
                collapsible : true,
                collapsed : true,
                hideBorders : false,

                listeners : {
                    afterrender : function() {
                        cswThemeFilterForm.cswServiceItemStore.load({
                            callback : cswThemeFilterForm._updateCSWList.createDelegate(cswThemeFilterForm)
                        });
                    }
                }
            }]
        });

        //construct our instance
        CSWThemeFilter.BaseComponent.superclass.constructor.call(this, cfg);
    },

    /**
     * Gets the parent field set containing all repositories to be searched
     */
    _getRepositoryFieldSet : function() {
        return this.items.get(this.items.getCount() - 1);
    },

    /**
     * Gets the parent field set containing the them selection
     */
    _getThemeFieldSet : function() {
        return this.items.get(this.items.getCount() - 2);
    },

    /**
     * Can be called on any object type
     *
     * Tests to see if item is an instance of a BaseComponent class
     */
    _isBaseComponentFilterFn : function(item) {
        return item.isBaseComponent;
    },

    /**
     * Gets every BaseComponent instance that is added to this form's fieldset
     *
     * returns an Ext.util.MixedCollection
     */
    _getThemeComponents : function() {
        var parentFieldSet = this._getThemeFieldSet();
        return parentFieldSet.items.filterBy(this._isBaseComponentFilterFn);
    },

    /**
     * Removes every component that would be returned by _getThemeComponents
     */
    _clearThemeComponents : function() {
        var components = this._getThemeComponents();

        for (var i = 0; i < components.getCount(); i++) {
            var cmp = components.get(i);
            var parent = cmp.ownerCt;
            var obj = parent.remove(cmp);
        }
    },

    /**
     * Returns every instance of a BaseComponent object that is a child of this object as an Array
     */
    _getAllBaseComponents : function() {
        var defaultComponents = this.items.filterBy(this._isBaseComponentFilterFn);
        var themeComponents = this._getThemeComponents();
        var result = [];

        //Concat our collections into an array
        defaultComponents.each(function(item) {
            result.push(item);
        });
        themeComponents.each(function(item) {
            result.push(item);
        });

        return result;
    },



    /**
     * Updates the list of CSW services available checkbox group (if this form is yet to be rendered this function has no effect)
     */
    _updateCSWList : function() {
        if (!this.rendered) {
            return;
        }

        //delete our checkbox group (if it exists)
        var parentFieldSet = this._getRepositoryFieldSet();
        var checkBoxItems = parentFieldSet.findByType('checkboxgroup');
        for (var i = 0; i < checkBoxItems.length; i++) {
            var cmp = checkBoxItems[i];
            var parent = cmp.ownerCt;
            parent.remove(cmp);
        }

        //Create a new checkbox group based upon the items in the cswServiceItemStore
        var checkBoxItems = [];
        for (var i = 0; i < this.cswServiceItemStore.getCount(); i++) {
            var cswServiceItemRec = this.cswServiceItemStore.getAt(i);
            checkBoxItems.push({
                boxLabel : cswServiceItemRec.get('title'),
                name : cswServiceItemRec.get('id'),
                checked : cswServiceItemRec.get('selectedByDefault')
            });
        }
        parentFieldSet.insert(1, {
            xtype : 'checkboxgroup',
            fieldLabel : 'Registries',
            columns : 1,
            items : checkBoxItems
        });

        this.doLayout();
    },

    /**
     * Iterates through all components in this filter form and merges their
     * filter attributes into a single object which is returned
     *
     * Returns a javascript object
     */
    generateCSWFilterParameters : function() {
        var components = this._getAllBaseComponents();
        var filterParams = {};
        for (var i = 0; i < components.length; i++) {
            var cmpFilterValues = components[i].getFilterValues();
            Ext.apply(filterParams, cmpFilterValues);
        }

        return filterParams;
    },

    /**
     * Returns an array of objects representing the list of CSW services that the user has chosen to query
     *[{
     *  id : String - Unique ID for the service
     *  url : String - URL of the CSW
     *  title : String - descriptive title of the service
     * }]
     */
    getSelectedCSWServices : function() {
        var parentFieldSet = this._getRepositoryFieldSet();

        // Our checkbox may NOT have been rendered (if the parent hasn't been expanded yet)
        // Ensure we are rendered before proceeding
        var checkBoxGroup = parentFieldSet.findByType('checkboxgroup')[0];
        if (!checkBoxGroup.rendered) {
            parentFieldSet.expand();
            parentFieldSet.collapse();
        }

        var items = checkBoxGroup.getValue();
        var result = [];
        for (var i = 0; i < items.length; i++) {
            var id = items[i].getName();
            var rec = this.cswServiceItemStore.getById(id);
            result.push({
                id : rec.get('id'),
                title : rec.get('title'),
                url : rec.get('url')
            });
        }
        return result;
    }
});