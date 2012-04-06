/*
Copyright 2010 University of Toronto

Licensed under the Educational Community License (ECL), Version 2.0. 
ou may not use this file except in compliance with this License.

You may obtain a copy of the ECL 2.0 License at
https://source.collectionspace.org/collection-space/LICENSE.txt
*/

/*global jQuery, fluid, cspace:true*/
"use strict";

cspace = cspace || {};

(function ($, fluid) {
    fluid.log("Repeatable.js loaded");

    // TODO: Account for an elPath into the model that points to undefined: not known whether it is a simple field or an object/row.
    //       We need to write a test for this but I think it is fixed now
    var addRow = function (fields, index, elPath, schema, recordType) {
        var row;
        if (schema && recordType) {
            row = cspace.util.getBeanValue({}, fluid.model.composeSegments(recordType, elPath, 0), schema);
        }
        fields.push(row || {});
        return fields;
    };
    
    // TODO: This should go away once we have proper radio button prototree expansion
    var updatePrimary = function (fields, index) {
        fluid.transform(fields, function (field, idx) {
            field._primary = (index === idx) ? true : false;
        });
        return fields;
    };
            
    var deleteRow = function (fields, index) {
        if (fields[index]._primary === true) {
            var sucIndex = index === 0 ? 1 : index - 1;
            fields[sucIndex]._primary = true;
        }
        fields.splice(index, 1);
        return fields;
    };

    // TODO: This should go away once we have proper radio button prototree expansion
    var setupPrimary = function (radioButtons, fields) {
        $.each(fields, function (index, field) {
            radioButtons[index].checked = field._primary || false;
        });
    };

    var requestChange = function (that, callback, index) {
        var elPath = that.options.elPath;
        that.applier.requestChange(elPath, callback(that.fetchModel(), index, elPath, that.options.schema, that.options.recordType));
    };
    
    var processDeleteInput = function (input, model) {
        input.prop("disabled", model.length <= 1);
    };

    var bindEventHandlers = function (that) {        
        var elPath = that.options.elPath;
        
        // Waiting to ensure that the change request went through before changing the model.
        // Also fires when fields get modified.
        that.applier.modelChanged.addListener(elPath, function (model) {
            fluid.model.setBeanValue(that.model, elPath, that.fetchModel(model));
        });
        
        // Make a change request to add an extra row.
        that.container.delegate(that.options.selectors.add, "click", function () {
            requestChange(that, addRow);
            that.refreshView();
            that.events.afterAdd.fire();
        });
        
        that.container.delegate(that.options.selectors.remove, "click", function () {
            // TODO: This functionality should be available on the public API for repeatable instead of hiding it away in an event handler.
            if (that.fetchModel().length < 2) {
                return false;
            }
            
            var index = that.locate("remove").index(this);
            requestChange(that, deleteRow, index);
            that.refreshView();
            that.events.afterDelete.fire();
        });
        
        $.each(["Delete", "Add"], function (i, event) {
            that.events["after" + event].addListener(function () {
                processDeleteInput(that.locate("remove").eq(0), that.fetchModel());
            });
        });

        that.container.delegate(that.options.selectors.primary, "click", function () {
            var index = that.locate("primary").index(this);
            requestChange(that, updatePrimary, index);
            that.events.afterUpdatePrimary.fire();
        });
    };
    
    function positionAddButton(button, target) {
        var offset = $(target).offset();		
        // TODO: Do something when the offset parent is null
        var offsetParent = button.offsetParent;		
        if (offsetParent) {
            var poffset = $(offsetParent).offset();			
            var tleft = offset.left - poffset.left;
			var foo = tleft + target.offsetWidth - button.offsetWidth;
            $(button).css("left", tleft - button.offsetWidth + "px");
        }
    }
    
    var renderPage = function (that, blankRowOnly) {
        fluid.renderer.clearDecorators(that.options.rendererOptions.instantiator, that);
        var expander = fluid.renderer.makeProtoExpander({ELstyle: "${}", model: that.model});
        var tree = expander(that.options.protoTree);
        fluid.clear(that.options.rendererOptions.fossils);
        if (that.template) {
            fluid.reRender(that.template, that.container, tree, that.options.rendererOptions);
        }
        else {
            that.template = fluid.selfRender(that.container, tree, that.options.rendererOptions);
        }
        positionAddButton(that.locate("add")[0], that.locate("remove")[0]);
        setupPrimary(that.locate("primary"), that.fetchModel());
        that.events.afterRender.fire();
    };

    /*
     * Repeated fields are expected to save the fields even if they're empty.
     * In this case, we require at least one instance of the field in the model.
     */
    // TODO: Make most of this code go away by supporting "offset models" in the applier
    var prepareModel = function (model, elPath, applier, schema, recordType) {
        var list = fluid.get(model, elPath);
        if (list && list.length > 1) {
            return;
        }
        if (list && list.length > 0 && list[0]._primary) {
            return;
        }
        list = list && list.length > 0 ? list : addRow([], null, elPath, schema, recordType);
        fluid.merge(null, list[0], {
            _primary: true
        });
        applier.requestChange(elPath, list);
    };

    var addColumnsToHeader = function (headerRow) {
        var headerCols = headerRow.children();
        if (headerCols.length > 0) {
            var newCol = $(headerCols[0]).clone().empty();
            headerRow.prepend(newCol.clone());
            headerRow.append(newCol);
        }
    };

    /**
     * @node content node that will contain primary and delete
     */
    var addPrimaryAndDelete = function (that, node) {
        if (that.locate("primary").length === 0) {
            var primary = $(that.options.markup.primaryControl).addClass(that.options.styles.primary);
            // TODO: we need to programatically generate the 'name' attribute since we need more then one group of radio buttons on a page.
            primary.attr("name", "primary-" + that.options.elPath);
            if (that.options.hidePrimary) {
                primary.hide();
            }
            else if (that.options.disablePrimary) {
                primary.prop("disabled", "disabled");
            }
            else {
                primary.removeProp("disabled");
            }
            node.prepend(primary);
        }
        
        if (that.locate("remove").length === 0) {
            var remove = $(that.options.markup.deleteControl).addClass(that.options.styles.remove);
            node.append(remove);
        }
                
        if (node.is("tr")) {
            primary.wrap("<td />");
            remove.wrap("<td />");
            var headerRow = that.locate("headerRow");
            if (headerRow.length > 0) {
                addColumnsToHeader(headerRow);
            }
        }
        
    };
    
    var setupRepeatable = function (that) {
        that.refreshView();
        processDeleteInput(that.locate("remove").eq(0), that.fetchModel());
        bindEventHandlers(that);
    };
    
    var makeRepeatable = function (container, options) {
        var that = fluid.initView("cspace.makeRepeatable", container, options);
        
        that.applier = that.options.applier;
        that.model = that.options.model;
        prepareModel(that.model, that.options.elPath, that.applier, that.options.schema, that.options.recordType);
        fluid.invokeGlobalFunction(that.options.generateMarkup, [that]);
        that.options.rendererOptions.model = that.model;
        that.options.rendererOptions.applier = that.applier;
        that.options.rendererOptions.fossils = {};
        that.options.rendererOptions.cutpoints = that.options.rendererOptions.cutpoints || cspace.renderUtils.cutpointsFromUISpec(that.options.protoTree);
        that.options.rendererOptions.cutpoints.push({id: "repeat:", selector: that.options.selectors.repeat});
        // A "temporary container" for rendering additional rows. This is currently a more stable strategy than
        // using renderer template juggling to render partial templates.
        that.tempContainer = cspace.makeRepeatable.cleanseClone(that.container);
        
        that.refreshView = function () {
            renderPage(that);
        };
        
        that.fetchModel = function (model) {
            return fluid.model.getBeanValue(model || that.model, that.options.elPath);
        };
        
        setupRepeatable(that);

        return that;
    };
    
    var isListOrTable = function (elem) {
        return $(elem).is("ul, ol, table");
    };
    
    /**
     * Repeatable is a markup generating component. If it does not find things in the markup that are specified 
     * in the default selectors, it generates nodes appropriately and puts the default selector classes into the markup.
     *  
     */
    cspace.makeRepeatable = function (container, options) {
        container = $(container);
        container.addClass("csc-repeatable-repeat");
        if (container.is("tr") || container.is("li")) {
            container = fluid.findAncestor(container, isListOrTable);
            container = $(container);
            $("thead tr", container).addClass("csc-repeatable-headerRow");
        }
        container.wrap("<div />");
        
        return makeRepeatable(container.parent("div"), options);
    };
    
    cspace.repeatable = makeRepeatable;
    
    // Remove id attributes from a cloned tree    
    cspace.makeRepeatable.cleanseClone = function (toClone) {
        var node = toClone.clone();
        fluid.dom.iterateDom(node.get(0), function (node) {
            node.removeAttribute("id");
        });
        return node.removeAttr("id").hide().insertAfter(toClone);
    };
    
    cspace.makeRepeatable.generateMarkup = function (that) {
        // Check for the add button and generate it if required 
        if (that.locate("add").length === 0) {
            var button = $(that.options.markup.addControl);
            that.container.prepend(button);
            button.val(that.options.strings.add); // TODO: generalise this to recognise non-input
            button.addClass(that.options.styles.add);
            button.css("position", "absolute");
        }
        
        var node = that.locate("repeat");
        // TODO: check that we have a repeating node - if not what should we do? grab the first thing? grab everything?
        
        if (!node.is("tr") && !node.is("li")) {
            // TODO: explain why this manipulation is done, and what assumptions it makes about the markup
            node.wrap("<ul class=\"cs-repeatable\"><li class=\"csc-repeatable-repeat clearfix " + that.options.styles.repeat + "\"/></ul>");            
            // TODO: there is probably a bug here when the 'repeat' selector is overridden - write a test to prove this
            //       to fix the issue we need to add another selector - repeatable-content
            node.removeClass("csc-repeatable-repeat");
            node.addClass(that.options.styles.content);
            node = node.parent("li");    
        }

        addPrimaryAndDelete(that, node);        
    };
    
    cspace.repeatable.getSchema = function (globalSchema, recordType) {
        var schema = {};
        schema[recordType] = globalSchema[recordType];
        return schema;
    };
    
    fluid.defaults("cspace.makeRepeatable", {
        gradeNames: ["fluid.viewComponent"],
        selectors: {
            add: ".csc-repeatable-add",
            remove: ".csc-repeatable-delete",
            primary: ".csc-repeatable-primary",
            repeat: ".csc-repeatable-repeat",
            headerRow: ".csc-repeatable-headerRow"
        },
        events: {
            afterRender: null,
            afterDelete: null,
            afterAdd: null,
            afterUpdatePrimary: null
        },    
        strings: {
            add: "+"
        },
        styles: {
            add: "cs-repeatable-add",
            remove: "cs-repeatable-delete",
            primary: "cs-repeatable-primary",
            content: "cs-repeatable-content",
            repeat: "cs-repeatable-repeat"     
        },
        disablePrimary: false,
        markup: {
            addControl:     "<input class=\"csc-repeatable-add\" type=\"button\" />",
            deleteControl:  "<input class=\"csc-repeatable-delete \" type=\"button\" value=\"\"/>",
            primaryControl: "<input class=\"csc-repeatable-primary \" type=\"radio\" name=\"primary\" />"
        },
        mergePolicy: { // TODO: GRADES, when they exist
            model: "preserve",
            applier: "nomerge",
            protoTree: "noexpand",
            "rendererOptions.instantiator": "nomerge",
            "rendererOptions.parentComponent": "nomerge"
        },
        applier: null,      // Applier for the main record that cspace.repeatable belongs to. REQUIRED
        model: {},        // Model for the main record that cspace.repeatable belongs to. REQUIRED
        schema: null,
        elPath: "items",    // Path into the model that points to the collection of fields to be repeated - it should reference an array.
        protoTree: {},      // A dehydrated tree that will be expanded by the expander and rendered in the component's refreshView.
        rendererOptions: {
            autoBind: true,
            instantiator: "{instantiator}",
            parentComponent: "{makeRepeatable}"
        },
        generateMarkup: "cspace.makeRepeatable.generateMarkup",
        prepareMarkup: true
    });

})(jQuery, fluid);