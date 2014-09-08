var app = null;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items:{},

    config: {
        defaultSettings : {
            showTime : false,
            showTasks : true
        }
    },

    getSettingsFields: function() {
        return [
            {
                name: 'showTime',
                xtype: 'rallycheckboxfield',
                label : "Selected to show Time Tracker column"
            },
            {
                name: 'showTasks',
                xtype: 'rallycheckboxfield',
                label : "Selected to show Task columns"
            }
        ];
    },

    launch: function() {
        app = this;
        app.showTime = app.getSetting("showTime");
        app.showTasks = app.getSetting("showTasks");

        console.log("Hello World!");
        this.addFeatureGrid();
    },

    timeColumn : {  
        text: "Time", width:100,
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var defects = record.get("Defects");
            if (defects && defects.length > 0) {
                var states = _.countBy(defects, function(d) { 
                    return d.get("State")!= "Closed" ? "Open" : "Closed";
                });
                states.Open = states.Open !== undefined ? states.Open : 0;
//                    states.Open = 0 
                states.length = defects.length;
                var tpl = Ext.create('Ext.Template', "{Open}/{length}", { compiled : true } );
                return tpl.apply(states);
            } else
                return "";
        }
    },

    taskEstimateColumn : {  
        text: "Task Estimate", width:100,
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var tasks = record.get("Tasks");
            var estimate = _.reduce( tasks, function(sum,task) {
                return sum + (_.isNumber(task.get("Estimate")) ? task.get("Estimate") : 0);
            },0);
            return estimate > 0 ? estimate : "";
        }
    },

    taskToDoColumn : {  
        text: "Task ToDo", width:100,
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var tasks = record.get("Tasks");
            var todo = _.reduce( tasks, function(sum,task) {
                return sum + (_.isNumber(task.get("ToDo")) ? task.get("ToDo") : 0);
            },0);
            return todo > 0 ? todo : "";
        }
    },


    taskActualsColumn : {  
        text: "Task Actuals", width:100,
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var tasks = record.get("Tasks");
            var actuals = _.reduce( tasks, function(sum,task) {
                return sum + (_.isNumber(task.get("Actuals")) ? task.get("Actuals") : 0);
            },0);
            return actuals > 0 ? actuals : "";
        }
    },

    defectColumn : {  
        text: "Defects", width:100, 
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var defects = record.get("Defects");
            if (defects && defects.length > 0) {
                var states = _.countBy(defects, function(d) { 
                    return d.get("State")!= "Closed" ? "Open" : "Closed";
                });
                states.Open = states.Open !== undefined ? states.Open : 0;
//                    states.Open = 0 
                states.length = defects.length;
                var tpl = Ext.create('Ext.Template', "{Open}/{length}", { compiled : true } );
                return tpl.apply(states);
            } else
                return "";
        }
    },

    blockedColumn : {  
        text: "Blocked", width:100, 
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var blockedSnapshots = record.get("Blocked");
            return (!_.isUndefined(blockedSnapshots) && blockedSnapshots.length > 0) ? blockedSnapshots.length : "";
        }
    },
    
    addFeatureGrid : function() {
        // var viewport = Ext.create('Ext.Viewport');
        Rally.data.ModelFactory.getModel({
         type: 'PortfolioItem/Feature',
         success: function(userStoryModel) {

            var columnCfgs = [
                    'FormattedID',
                    'Name',
                    'Owner',
                    app.defectColumn,
                    app.blockedColumn
            ];
            if (app.showTime) {
                columnCfgs.push(app.timeColumn);
            }
            if (app.showTasks) {
                columnCfgs.push(app.taskEstimateColumn);
                columnCfgs.push(app.taskToDoColumn);
                columnCfgs.push(app.taskActualsColumn);
            }

            var grid = Ext.create('Rally.ui.grid.Grid',
                {
                 xtype: 'rallygrid',
                 model: userStoryModel,
                 listeners : {
                    load : function(items) {
                        console.log("load",items.data.items);
                        var features = items.data.items;
                        async.map(features,app.getSnapshots, function(err,results) {
                            _.each( features, function(feature,i){
                                feature.set("Defects",results[i]);
                            })
                            async.map(features,app.getBlockedSnapshots, function(err,results) {
                                _.each( features, function(feature,i){
                                    feature.set("Blocked",results[i]);
                                });
                                async.map(features,app.getTaskSnapshots, function(err,results) {
                                    _.each( features, function(feature,i){
                                        if (results[i].length>0)
                                            console.log(results[i]);

                                        feature.set("Tasks",results[i]);
                                    });
                                });
                            });
                        });
                    }
                 },
                 columnCfgs: columnCfgs
             });
            console.log(app.showTime);
            if (app.showTime) {
                grid.columnCfgs.push(app.timeColumn);
            }

            app.add(grid);
        }
        });
    }
    ,
    
    getSnapshots : function(record, callback) {

        var that = this;
        var fetch = ['ObjectID','_UnformattedID','State','Priority','Severity','_ItemHierarchy','_TypeHierarchy'];
        var hydrate = ['_TypeHierarchy','State','Priority','Severity'];
        
        var find = {
                '_TypeHierarchy' : { "$in" : ["Defect"]} ,
                '_ProjectHierarchy' : { "$in": [app.getContext().getProject().ObjectID] },
                '__At' : 'current',
                "_ItemHierarchy" : { "$in" : [record.get("ObjectID")]  }
        };

        var storeConfig = {
            find : find,
            autoLoad : true,
            pageSize:1000,
            limit: 'Infinity',
            fetch: fetch,
            hydrate: hydrate,
            listeners : {
                scope : this,
                load: function(store, snapshots, success) {
                    callback(null,snapshots);
                }
            }
        };

        var snapshotStore = Ext.create('Rally.data.lookback.SnapshotStore', storeConfig);

    },

    getBlockedSnapshots : function(record, callback) {

        var that = this;
        var fetch = ['_TypeHierarchy','FormattedID','ObjectID','_UnformattedID','Name','Owner','Blocked','ScheduleState'];
        var hydrate = ['_TypeHierarchy','ScheduleState'];
        
        var find = {
                '_TypeHierarchy' : { "$in" : ["Defect","HierarchicalRequirement"]},
                '__At' : 'current',
                "_ItemHierarchy" : { "$in" : [record.get("ObjectID")]  },
                'Blocked' : true
        };

        var storeConfig = {
            find : find,
            autoLoad : true,
            pageSize:1000,
            limit: 'Infinity',
            fetch: fetch,
            hydrate: hydrate,
            listeners : {
                scope : this,
                load: function(store, snapshots, success) {
                    callback(null,snapshots);
                }
            }
        };

        var snapshotStore = Ext.create('Rally.data.lookback.SnapshotStore', storeConfig);

    }, 

    getTaskSnapshots : function(record, callback) {

        var that = this;
        var fetch = ['ObjectID','Estimate','ToDo','Actuals','_ItemHierarchy','_TypeHierarchy'];
        var hydrate = ['_TypeHierarchy'];
        
        var find = {
                '_TypeHierarchy' : { "$in" : ["Task"]} ,
                '_ProjectHierarchy' : { "$in": [app.getContext().getProject().ObjectID] },
                '__At' : 'current',
                "_ItemHierarchy" : { "$in" : [record.get("ObjectID")]  }
        };

        var storeConfig = {
            find : find,
            autoLoad : true,
            pageSize:1000,
            limit: 'Infinity',
            fetch: fetch,
            hydrate: hydrate,
            listeners : {
                scope : this,
                load: function(store, snapshots, success) {
                    callback(null,snapshots);
                }
            }
        };

        var snapshotStore = Ext.create('Rally.data.lookback.SnapshotStore', storeConfig);

    },

    getAllFeatureSnapshots : function(record, callback) {

        var that = this;
        var fetch = ['ObjectID','_TypeHierarchy'];
        var hydrate = ['_TypeHierarchy'];
        
        var find = {
                '_TypeHierarchy' : { "$in" : ["Defect","Task","HierarchicalRequirement"]},
                '_ProjectHierarchy' : { "$in": [app.getContext().getProject().ObjectID] },
                '__At' : 'current',
                "_ItemHierarchy" : { "$in" : [record.get("ObjectID")]  }
        };

        var storeConfig = {
            find : find,
            autoLoad : true,
            pageSize:1000,
            limit: 'Infinity',
            fetch: fetch,
            hydrate: hydrate,
            listeners : {
                scope : this,
                load: function(store, snapshots, success) {
                    callback(null,snapshots);
                }
            }
        };

        var snapshotStore = Ext.create('Rally.data.lookback.SnapshotStore', storeConfig);

    },

    timeEntryItems : function( refs, callback ) {

        var configs = [
            { 
                model : "TypeDefinition",
                fetch : true,
                filters : app.createTimeEntryFilter(refs)
            }
        ];

        // get the preliminary estimate type values, and the releases.
        async.map( configs, app.wsapiQuery, function(err,results) {
            callback(null,results);
        });

    },

    // creates a filter to return all releases with a specified set of names
    createTimeEntryFilter : function(refs) {

        var filter = null;

        _.each( refs, function( ref, i ) {
            var filterFieldName = ( ref.toLowerCase().indexOf("task") === -1) ? "WorkProduct" : "Task";
            var f = Ext.create('Rally.data.wsapi.Filter', {
                        property : filterFieldName, operator : '=', value : ref }
            );
            filter = (i===0) ? f : filter.or(f);
        });

        console.log("Time Filter:",filter.toString());
        return filter;

    },

    wsapiQuery : function( config , callback ) {

        Ext.create('Rally.data.WsapiDataStore', {
            autoLoad : true,
            limit : "Infinity",
            model : config.model,
            fetch : config.fetch,
            filters : config.filters,
            listeners : {
                scope : this,
                load : function(store, data) {
                    callback(null,data);
                }
            }
        });

    },



    
});
