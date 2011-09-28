
/**
 * Identical to a normal fieldset but has workarounds for various browsers under certain circumstances
 *
 * Fixed Issues
 *  1) FF/Chrome -  Collapsible fieldsets that are expanded within a container with scroll bars (that causes scrollbars to appear)
 *                  will also cause a horizontal scroll bar to show. The problem is that once the vertical scrollbar appears and
 *                  the corresponding horizontal screen space is lost the parent container fails to perform a layout
 *
 */
PortalFieldSet = Ext.extend(Ext.form.FieldSet, {
    constructor : function(cfg){
        PortalFieldSet.superclass.constructor.call(this, cfg);

        //This exists to address issue 1)
        var forceDelayedLayout = function(fieldSet) {
            if (!fieldSet.rendered) {
                return;
            }

            //Force our top level container to layout (defined by the first non field set parent)
            var parent = fieldSet;
            while (parent.isXType('fieldset')) {
                if (!parent.ownerCt) {
                    break;
                }
                parent = parent.ownerCt;
            }

            parent.doLayout();
        };
        this.on('expand', forceDelayedLayout);
        this.on('collapse', forceDelayedLayout);
    }
});

Ext.reg('portalfieldset', PortalFieldSet);