require("./basePane.scss");

var dateFormat = require("dateformat");
var $ = require("jquery");
var partial = require("core/partial");
var Classe = require("classe");
var BaseElement = require("core/ui/baseElement");
var Timer = require("core/timer");
var Viseur = null;

/**
 * @class BasePane - the base class for all game panes, which are the HTML part of the game normally used to show player stats
 */
var BasePane = Classe(BaseElement, {
    init: function(game, initialState) {
        Viseur = require("viseur");

        var self = this;
        var playerIDs = [];

        for(var i = 0; i < initialState.players.length; i++) {
            playerIDs.push(initialState.players[i].id);
        }

        this.game = game;
        this._ticking = {
            timer: new Timer(),
        }; // used to tick down a player's time when in human playable mode

        this._ticking.timer.on("finished", function() {
            self._ticked();
        });

        BaseElement.init.call(this, {
            players: playerIDs,
            $parent: Viseur.gui.$gamePaneWrapper,
        });

        this.$element.addClass("game-" + this.game.name);

        // top of pane game stats list
        var gameStats = this._cleanStats(this._getGameStats(initialState));
        this._gameStatsList = this._createStatList(gameStats, this.$element.find(".top-game-stats"), "game");

        // bottom of pane each player stats lists
        var playerStats = this._cleanStats(this._getPlayerStats());
        this._$players = this.$element.find(".players");
        this._$players.addClass("number-of-players-" + playerIDs.length);
        this._playerStatsList = {}; // indexed by player id
        this._$playerProgressBars = []; // indexed by player index in game.players
        var $playerProgressBarsDiv = this.$element.find(".player-progress-bars");

        for(i = 0; i < playerIDs.length; i++) {
            this._playerStatsList[playerIDs[i]] = this._createStatList(playerStats, this._$players, "player player-" + i);
            this._$playerProgressBars[i] = $("<div>")
                .addClass("player-{}-progress-bar".format(i))
                .appendTo($playerProgressBarsDiv);
        }
    },

    _template: require("./basePane.hbs"),
    _statsPartial: partial(require("./basePaneStats.hbs")),

    /**
     * @typedef {Object} PaneStat
     * @property {string} key - key within the `Player` or `Game` instances
     * @property {Function} [format] - function that formats the value of a key during display. Should take the value as an argument and return the formatted value
     * @property {string} [label] - a label to place before the (formatted) value, e.g. label: value
     */

    /**
     * Gets the stats to show on each player pane, which tracks stats for that player
     *
     * @param {GameState} state - the initial state of the game
     * @returns {Array.<PaneStat|string>} - All the PaneStats to display on this BasePane for the player. If a string is found it is tranformed to a PaneStat with the string being the `key`.
     */
    _getPlayerStats: function(state) {
        return [
            "name",
            {
                key: "timeRemaining",
                title: "Time Reminaing (in min:sec:ms format)",
                format: function(timeRemaining) {
                    var nsAsDate = new Date(Math.round(timeRemaining / 1000000)); // convert ns to ms, which is what Date() expects
                    return dateFormat(nsAsDate, "MM:ss:l");
                },
            },
        ];
    },

    /**
     * Gets the stats to show on the top bar of the pane, which tracks stats in the game
     *
     * @param {GameState} state - the initial state of the game
     * @returns {Array.<PaneStat|string>} - All the PaneStats to display on this BasePane for the game. If a string is found it is tranformed to a PaneStat with the string being the `key`.
     */
    _getGameStats: function(state) {
        var list = [];

        if(state.hasOwnProperty("currentTurn")) {
            list.push({
                key: "currentTurn",
                label: "Turn",
            });
        }

        return list;
    },

    /**
     * Cleans up shorthand PaneStats to all the attributes expected by the BasePane
     *
     * @param {Array.<PaneStat|string>} stats - the stats, that can be in shorthand, to cleanup
     * @returns {Array.<PaneStat>} - All the PaneStats cleaned up
     */
    _cleanStats: function(stats) {
        for(var i = 0; i < stats.length; i++) {
            var stat = stats[i];

            if(typeof(stat) === "string") { // it is shorthand
                stat = { key: stat };
            }

            stat.title = stat.title || ("Player's " + stat.key);

            stats[i] = stat;
        }

        return stats;
    },

    /**
     * Creates a stats list container to be updated by this pane
     *
     * @param {Array.<PaneStat>} stats - all the stats to list
     * @param {$} $parent -jQuery parent for this list
     * @param {string} [classes] - optional classes for the html element
     * @returns {Object} - container object containing all the parts of this list
     */
    _createStatList: function(stats, $parent, classes) {
        var list = {
            stats: stats,
            $element: this._statsPartial({classes: classes}, $parent),
            $stats: {},
        };

        for(var i = 0; i < stats.length; i++) {
            var stat = stats[i];

            list.$stats[stat.key] = $("<li>")
                .appendTo(list.$element)
                .addClass("stat-" + stat.key)
                .attr("title", stat.title)
                .html(stat.key);
        }

        return list;
    },

    /**
     * updates the base pane upon a new state, updating player and game stats
     *
     * @param {GameState} state - the current(most) state of the game to update reflecting
     */
    update: function(state) {
        // update players
        var players = state.players;
        for(var i = 0; i < players.length; i++) {
            var playerID = players[i].id;
            var player = state.gameObjects[playerID];
            var playerStatsList = this._playerStatsList[playerID];

            this._updateStatsList(playerStatsList, player);

            playerStatsList.$element
                .toggleClass("current-player", state.currentPlayer.id === playerID)
                .css("background-image", "url('viseur/images/{}.png')".format(player.clientType.replace("#", "s").toLowerCase())); // TODO: use webpack require() on image
        }

        // update games
        this._updateStatsList(this._gameStatsList, state);
    },

    _updateStatsList: function(statsList, obj) {
        for(var j = 0; j < statsList.stats.length; j++) {
            var stat = statsList.stats[j];
            var value = obj[stat.key];

            if(stat.format) {
                value = stat.format(value);
            }

            if(stat.label) {
                value = "{}: {}".format(stat.label, value);
            }

            statsList.$stats[stat.key].html(value);
        }
    },

    /**
     * Sets the progress bars to a certain percentage for each of them
     *
     * @param {?Array<number>} progresses - null if they have no progress (hides bars), or an array of numbers, indexed by their location in game.players, with each value being [0, 1] for their progress..
     */
    _setPlayersProgresses: function(progresses) {
        var sum = 0;
        if(progresses) {
            sum = Math.sum(progresses);
        }

        for(var i = 0; i < this._$playerProgressBars.length; i++) {
            var $bar = this._$playerProgressBars[i];

            var percentage = 0;
            if(sum > 0) {
                percentage = progresses[i] / sum;
            }

            $bar.css("width", (percentage * 100) + "%");
        }
    },

    /**
     * Starts ticking the time down for a player (human client mode)
     *
     * @param {PlayerState} player - the player to tick for
     */
    startTicking: function(player) {
        this._ticking.player = player;
        this._ticking.time = player.timeRemaining;

        this._ticking.timer.tick();
    },

    /**
     * Stops the player timer from ticking
     */
    stopTicking: function() {
        this._ticking.timer.pause();
        this._ticking.timer.setProgress(0);
    },

    /**
     * Invoked when the timer ticks once a second
     */
    _ticked: function() {
        if(this._ticking.player) {
            var $player = this._$players[this._ticking.player.id];
            this._ticking.time -= (1000 * 1000000); // 1000 ms elapsed on this tick

            var timeRemainingStat = this._playerStatsList[this._ticking.player.id].stats.timeRemaining;
            timeRemainingStat.$element.html(this._formatTimeRemaining(this._ticking.time));

            this._ticking.timer.restart();
        }
    },
});

module.exports = BasePane;
