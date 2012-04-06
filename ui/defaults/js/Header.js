/*
Copyright 2010

Licensed under the Educational Community License (ECL), Version 2.0. 
You may not use this file except in compliance with this License.

You may obtain a copy of the ECL 2.0 License at
https://source.collectionspace.org/collection-space/LICENSE.txt
 */

/*global cspace:true, jQuery, fluid*/
"use strict";

cspace = cspace || {};

(function ($, fluid) {
    
    fluid.defaults("cspace.header", {
        gradeNames: ["fluid.rendererComponent", "autoInit"],
        mergePolicy: {
            model: "preserve"
        },
        components: {
            searchBox: {
                type: "cspace.searchBox",
                options: {
                    related: "all"
                }
            }
        },
        produceTree: "cspace.header.produceTree",
        selectorsToIgnore: ["searchBox" ],
        model: {
            menuitems: [
            {
                name: "myCollectionSpace",
                href: "myCollectionSpace.html"
            },
            {
                name: "createNew",
                href: "createnew.html",
                hide: {
                    expander: {
                        type: "fluid.deferredInvokeCall",
                        func: "cspace.util.modelBuilder",
                        args: {
                            related: "all",
                            resolver: "{permissionsResolver}",
                            recordTypeManager: "{recordTypeManager}",
                            permission: "create",
                            callback: "cspace.header.buildCreateNewModel"
                        }
                    }
                }
            },
            {
                name: "findEdit",
                href: "findedit.html"
            },
            {
                name: "report",
                href: "#"
            },
            {
                name: "administration",
                href: "administration.html"
            }

            ]
        },
        selectors: {
            //menu-item div box
            menuItem: ".csc-header-menu-item",
            label: ".csc-header-link",
            //other
            searchBox: ".csc-header-searchBox",
            logout: ".csc-header-logout",
            user: ".csc-header-user",
            userName: ".csc-header-userName"
        },
        repeatingSelectors: ["menuItem"],
        invokers: {
            refreshComponents: {
                funcName: "cspace.util.refreshComponents",
                args: "{header}"
            }
        },
        resources: {
            template: {
                expander: {
                    type: "fluid.deferredInvokeCall",
                    func: "cspace.specBuilder",
                    args: {
                        forceCache: true,
                        fetchClass: "fastTemplate",
                        url: "%webapp/html/components/header.html",
                        options: {
                            dataType: "html"
                        }
                    }
                }
            }
        },
        schema: {},
        login: "{userLogin}",
        strings: {
            //menu-items
            myCollectionSpace: "My CollectionSpace",
            createNew: "Create New",
            findEdit: "Find and Edit",
            report: "Report",
            administration: "Administration",
            //other
            logout: "Sign out",
            user: "Hi,",
            userName: "%userName"
        },
        postInitFunction: "cspace.header.postInit",
        finalInitFunction: "cspace.header.finalInit"
    });
    
    fluid.fetchResources.primeCacheFromResources("cspace.header");
    
    cspace.header.postInit = function (that) {
        that.refreshView();
    };
    
    cspace.header.finalInit = function (that) {
        that.refreshComponents();
    };

    /*
 * Used for conditional expander in tree. Called on each of the menu items. 
 * If args.hide is true, the menu item is hidden.
 * @param hide boolean that is === true if we need to hide the tab.
 * @return true if the item should be _displayed_
 */
    cspace.header.assertMenuItemDisplay = function(hide) {
        return !hide;
    };

    /**
 * Callback used for the create new part of the model. The records argument will contain
 * the records that the user has create permission to. If this is empty, the user cannot
 * create any records, and hence the Create New menu item should be hidden. This is taken care
 * by returning true - which will be passed to the conditional expanders args.hide variable.
 * @param options
 * @param records records argument will contain the records that the user has create permission to
 * @return whether create new menu item should be hidden. If user does not have create permission
 * to any records, true is returned, meaning menu item should be hidden.
 */
    cspace.header.buildCreateNewModel = function(options, records) {
        return (!records || records.length < 1); //return true if we want to hide
    };

    // A public function that is called as createNew's treeBuilder method and builds a component tree.
    cspace.header.produceTree = function (that) {
        var tree = {
            logout: {
                messagekey: "logout"
            },
            user: {
                messagekey: "user"
            },
            userName: {
                messagekey: "userName",
                args: {
                    userName: that.options.login.options.screenName
                } //interpret %userName string
            },
            expander: {
                repeatID: "menuItem",
                type: "fluid.renderer.repeat",
                pathAs: "item",
                valueAs: "itemName",
                controlledBy: "menuitems",
                tree: { //check whether to display the menu items by calling assertMenuItemDisplay with the hide variable
                    expander: {
                        type: "fluid.renderer.condition",
                        condition: {
                            funcName: "cspace.header.assertMenuItemDisplay",
                            args: "${{itemName}.hide}"
                        },
                        trueTree: {
                            label: {
                                target: "${{item}.href}",
                                linktext: {
                                    messagekey: "${{item}.name}"
                                }
                            }
                        }
                    }
                }
            }
        };
        return tree;
    };
    
})(jQuery, fluid);