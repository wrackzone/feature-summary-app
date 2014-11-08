var app = null;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items:{},

    config: {
        defaultSettings : {
            showTime : false,
            showTasks : true,
            showDependencies : true
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
            },
            {
                name: 'showDependencies',
                xtype: 'rallycheckboxfield',
                label : "Selected to show Task columns"
            }
        ];
    },

    launch: function() {
        app = this;
        app.showTime = app.getSetting("showTime");
        app.showTasks = app.getSetting("showTasks");
        app.showDependencies = app.getSetting("showDependencies");
        app.releaseName = null;

        var timeboxScope = this.getContext().getTimeboxScope();
        if (timeboxScope) {
            app.releaseName = timeboxScope.getType() === 'iteration' ? 
                record.get('Name') : null;
        } else {
            app.releaseName = "Release 1"
        }
        console.log("Release",app.releaseName);
        
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

    dependenciesColumn : {  
        text: "Dependencies", width:100, 
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var snapshots = record.get("Dependencies");
            if (snapshots!==undefined)
                console.log(record.get("FormattedID"),snapshots.length,
                    snapshots.length>0 ? snapshots[0].get("FormattedID") : "",
                    snapshots.length>0 ? _.map(snapshots[0].get("PredStories"),function(s){return s.get("FormattedID");}):"");
            return (!_.isUndefined(snapshots) && snapshots.length > 0) ? snapshots.length : "";
        }
    },

    // creates a filter to return all releases with a specified set of names
    createReleaseFilter : function(releaseNames) {

        console.log("releaseNames",releaseNames.split(","));

        var filter = null;

        _.each( releaseNames.split(","), function( releaseName, i ) {
            if (releaseName !== "") {
                var f = Ext.create('Rally.data.wsapi.Filter', {
                        property : 'Release.Name', operator : '=', value : app.trimString(releaseName) }
                );
                filter = (i===0) ? f : filter.or(f);
            }
        });

        console.log("Release Filter:",filter.toString());
        return filter;

    },

    // remove leading and trailing spaces
    trimString : function (str) {
        return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
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
            if (app.showDependencies) {
                columnCfgs.push(app.dependenciesColumn);
            }

            var grid = Ext.create('Rally.ui.grid.Grid',
                {
                 xtype: 'rallygrid',
                 model: userStoryModel,
                 storeConfig : {
                    filters : app.releaseName !== null  ? [app.createReleaseFilter(app.releaseName)] : null
                 },
                 listeners : {
                    load : function(items) {
                        console.log("load",items.data.items);
                        var features = items.data.items;

                        async.series( [
                            function(callback) {
                                async.map(features,app.getDefectSnapshots, function(err,results) {
                                    callback(null,results);
                                });
                            },
                            function(callback) {
                                async.map(features,app.getBlockedSnapshots, function(err,results) {
                                    callback(null,results);
                                });
                            },
                            function(callback) {
                                async.map(features,app.getTaskSnapshots, function(err,results) {
                                    callback(null,results);
                                });
                            },
                            function(callback) {
                                async.map(features,app.getDependencySnapshots, function(err,results) {

                                    async.mapSeries(results,app.readPredecessors,function(err,preds) {
                                            callback(null,results);
                                    })
                                });
                            }

                        ], function(err,results) {
                            // indices: 0 Defects, 1 Blocked, 2 Tasks, 3 Dependencies
                            // console.log("results",err,results);
                            _.each( features, function( feature,i){
                                feature.set("Defects",      results[0][i]);
                                feature.set("Blocked",      results[1][i]);
                                feature.set("Tasks",        results[2][i]);
                                feature.set("Dependencies", results[3][i]);
                            })
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

    readPredecessors : function( stories, callback) {

        async.mapSeries(stories,
            function(story,callback) {
                async.mapSeries(story.get("Predecessors"),app.readStory,function(err,results) {
                    var preds = _.flatten(results);
                    story.set("PredStories",preds)
                    callback(null,null);
                });
            },
            function(err,stories) {
                callback(null,null);
            }
        );
    },

    // read a single story based on id
    readStory : function( id, callback) {
         var configs = [
            { 
                model : "HierarchicalRequirement",
                fetch : true,
                filters : [{property:"ObjectID",operator:"=",value:id}]
            }
        ];

        async.map( configs, app.wsapiQuery, function(err,results) {
            callback(null,results[0]);
        });
    },
    
    getDefectSnapshots : function(record, callback) {

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

    getDependencySnapshots : function(record, callback) {

        var that = this;
        var fetch = ['ObjectID','Estimate','ToDo','Actuals','_ItemHierarchy','_TypeHierarchy','Predecessors','Successors','Name','FormattedID','ScheduleState','PlanEstimate'];
        var hydrate = ['_TypeHierarchy','ScheduleState'];
        
        var find = {
                '_TypeHierarchy' : { "$in" : ["HierarchicalRequirement"]} ,
                '_ProjectHierarchy' : { "$in": [app.getContext().getProject().ObjectID] },
                '__At' : 'current',
                "_ItemHierarchy" : { "$in" : [record.get("ObjectID")]  },
                "Predecessors" : { "$exists" : true }
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
