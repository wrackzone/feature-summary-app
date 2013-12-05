var app = null;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items:{ html:'<a href="https://help.rallydev.com/apps/2.0rc2/doc/">App SDK 2.0rc2 Docs</a>'},
    launch: function() {
        app = this;
        console.log("Hello World!");
        this.addFeatureGrid();
    },

    defectColumn : {  
        text: "Defects", width:100, 
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            async.map([record],app.getSnapshots, function(err,results) {
                var defects = results[0];
                var states = _.countBy(defects, function(d) { 
                    return d.get("State")!= "Closed" ? "Open" : "Closed";
                });
                states.length = defects.length;
                var tpl = Ext.create('Ext.Template', "{Open}/{length}", { compiled : true } );
                record.set("Defects", defects.length > 0 ? tpl.apply(states) : "");
            });
            return record.get("Defects");
        }
    },
    
    addFeatureGrid : function() {
        var viewport = Ext.create('Ext.Viewport');
        Rally.data.ModelFactory.getModel({
         type: 'PortfolioItem/Feature',
         success: function(userStoryModel) {
             viewport.add({
                 xtype: 'rallygrid',
                 model: userStoryModel,
                 listeners : {
                     load : function(a,b) {
                         console.log("load",a.data.items);
                     }
                 },
                 columnCfgs: [
                     'FormattedID',
                     'Name',
                     'Owner',
                     app.defectColumn
                 ]
             });
         }
        });
    },
    
    getSnapshots : function(record, callback) {

        var that = this;
        var fetch = ['ObjectID','_UnformattedID','State','Priority','Severity','_ItemHierarchy','_TypeHierarchy'];
        var hydrate = ['_TypeHierarchy','State','Priority','Severity'];
        
        var find = {
                '_TypeHierarchy' : { "$in" : ["Defect"]} ,
                '_ProjectHierarchy' : { "$in": app.getContext().getProject().ObjectID },
                '__At' : 'current',
                "_ItemHierarchy" : { "$in" : record.get("ObjectID")  }
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
                    console.log("success",success);
                    console.log("completed snapshots:", snapshots.length);
                    callback(null,snapshots);
                }
            }
        };

        var snapshotStore = Ext.create('Rally.data.lookback.SnapshotStore', storeConfig);

    }
    
});
