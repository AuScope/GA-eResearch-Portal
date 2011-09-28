
/**
 * Identical to a normal fieldset but has workarounds for various browsers under certain circumstances
 *
 * Fixed Issues
 *  1) FF/Chrome -  Collapsible fieldsets that are expanded within a container with scroll bars (that causes scrollbars to appear)
 *                  will also cause a horizontal scroll bar to show. The problem is that once the vertical scrollbar appears and
 *                  the corresponding horizontal screen space is lost the parent container fails to perform a layout
 *  2) IE        -  Fieldset titles with hidden borders - See bug report:
 *                  http://www.sencha.com/forum/showthread.php?148067-Fieldset-titles-with-hidden-borders-problems-under-IE&p=651704
 *
 */
PortalFieldSet = Ext.extend(Ext.form.FieldSet, {
    constructor : function(cfg){

        //To deal with issue #2
        if (Ext.isIE) {
            //Style can be defined in a variety of ways, try not to destroy any existing styling information
            if (cfg.style) {
                if (Ext.isString(cfg.style)) {
                    //String concat
                    cfg.style = 'white-space: nowrap;' + cfg.style;
                } else if (Ext.isObject(cfg.style)) {
                    //Object Merge
                    cfg.style['white-space'] = 'nowrap';
                }
            } else {
                cfg.style = 'white-space: nowrap;';
            }
        }

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