var $ = require("jquery");
var queryString = require("query-string");
var Classe = require("classe");
var Observable = require("core/observable");
var Parser = require("./parser");
var Renderer = require("./renderer/");
var TimeManager = require("./timeManager");
var SettingsManager = require("./settingsManager");

var Viseur = Classe(Observable, {
    /**
     * A hackish way of initializing itself after being required, as being a singleton others requiring it would cause cyclical rferences otherwise
     */
    start: function() {
        var GUI = require("./gui");

        this.timeManager = new TimeManager();

        this.gui = new GUI({
            $parent: $("#main"),
        });

        var self = this;

        this.timeManager.on("new-index", function(index) {
            self._updateCurrentState(index);
        });

        this.renderer = new Renderer({
            $parent: this.gui.$rendererWrapper,
        });

        this.gui.on("resized", function(width, height, rendererHeight) {
            self.renderer.resize(width, rendererHeight);
        });

        this.gui.resize();

        this.renderer.on("rendering", function() {
            if(self.game) {
                var c = self.timeManager.getCurrentTime();
                self._emit("time-updated", c.index, c.dt);
                self.game.render(c.index, c.dt);
            }
        });

        this._parseURL();
    },

    _games: require("games/"),

    _parseURL: function() {
        this.urlParms = queryString.parse(location.search);

        var logUrl = this.urlParms.log || this.urlParms.logUrl || this.urlParms.logURL;
        if(logUrl) {
            this.gui.modalMessage("Loading remote gamelog");
            var self = this;
            $.ajax({
                dataType: "json",
                url: logUrl,
                success: function(data) {
                    self.gui.modalMessage("Initializing Visualizer.");
                    self._gamelogLoaded(data);
                },
                error: function() {
                    self.gui.modalError("Error loading remote gamelog.");
                },
            });
        }
    },

    _gamelogLoaded: function(gamelog, callback) {
        this._rawGamelog = gamelog;
        this._parser = new Parser(gamelog.constants);

        this._initGame(gamelog.gameName);

        this._emit("gamelog-loaded", gamelog);

        this._mergedDelta = {
            index: -1,
            currentState: {},
            nextState: this._parser.mergeDelta({}, gamelog.deltas[0].game),
        };
        this._updateCurrentState(0, 0);
    },

    _updateCurrentState: function(index) {
        if(index < this._mergedDelta.index) {
            throw new Error("Cannot merge deltas backwards!");
        }

        var d = this._mergedDelta;
        var deltas = this._rawGamelog.deltas;

        var indexChanged = index !== d.index;

        while(index > this._mergedDelta.index) { // merge deltas till we are up to date
            d.index++;

            d.currentState = this._parser.mergeDelta(d.currentState, deltas[d.index].game);
            if(deltas[d.index + 1]) { // if there is a next state (not at the end)
                d.nextState = this._parser.mergeDelta(d.nextState, deltas[d.index + 1].game);
            }
        }

        if(indexChanged) {
            this._currentState = $.extend({}, deltas[d.index], {
                game: d.currentState,
                nextGame: d.nextState,
            });

            this._emit("state-changed", this._currentState);
        }
    },

    getCurrentState: function() {
        return this._currentState;
    },

    _initGame: function(gameName) {
        var gameNamespace = this._games[gameName];

        if(!gameNamespace) {
            throw new Error("Cannot load data for game '{}'.".format(gameClass));
        }

        this.game = new gameNamespace.Game(this._rawGamelog);

        var textures = {};

        for(var key in this.game.namespace.textures) {
            if(this.game.namespace.textures.hasOwnProperty(key)) {
                textures[key] = "games/" + this.game.namespace.dir + "/textures/" + this.game.namespace.textures[key];
            }
        }
        var self = this;
        this.renderer.loadTextures(textures, function() {
            self._ready();
        });
    },

    _ready: function() {
        this.gui.hideModal();
        this._emit("ready", this.game, this._rawGamelog);
    },
});

module.exports = new Viseur(); // singleton
