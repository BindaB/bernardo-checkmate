Template.queue.onCreated(function() {
  this.autorun(() => {
    this.subscribe('users');
    this.subscribe('queue', FlowRouter.getParam('id'));
    this.subscribe('chat', FlowRouter.getParam('id'));
    //maybe have some way of swapping multiple game boards in one URL 5.1
  });
});

Template.queue.helpers({

  colorsPicked: function() {
    return Queues.find({$and: [{_id: FlowRouter.getParam('id')}, {$or: [{w: null}, {b: null}]}]}).count() > 0;
  },

  myTurn: function() {
    var game = getGame();
    if(getUsername(game[game.board.split(' ')[1]]) === Meteor.user().username) {
      return true;;
    }
    return false;
  },

  system: function() {
    return Conversations.findOne({ game: FlowRouter.getParam('id')}).system;
  },

  nextUp: function() {
    var queuePlayers = Queues.find({_id: FlowRouter.getParam('id')}).fetch()[0].queue;
    var players = 'Next Up: ';
    for(var i=0; i<queuePlayers.length; i++) {
      if(i===queuePlayers.length-1) {
        players = players + getUsername(queuePlayers[i]);
      }
      else {
        players = players + getUsername(queuePlayers[i]) + ', ';
      }
    }
    return players;
  },

  players: function() {
    var w = Queues.find({_id: FlowRouter.getParam('id')}).fetch()[0].w;
    var b = Queues.find({_id: FlowRouter.getParam('id')}).fetch()[0].b;
    var players = getUsername(w) + ' vs. ' + getUsername(b);
    return players;
  },

  amWhite: function() {
    if(Queues.find({$and: [{_id: FlowRouter.getParam('id')}, {w: Meteor.userId()}]}).count() > 0) {
      return true;
    }
    else {
      return false;
    }
  },

  haveActivePlayers: function() {
    Meteor.call('hasActivePlayers', FlowRouter.getParam('id'));
    return Queues.find({$and: [{_id: FlowRouter.getParam('id')}, {activePlayers: {$not: {$size: 0}}}]}).count() > 0;
  },

  amActivePlayer: function() {
    return Queues.find({$and: [{_id: FlowRouter.getParam('id')}, {activePlayers: {$in: [Meteor.userId()]}}]}).count() > 0;
  },

  currentTurn: function() {
    var game = getGame();
    if(getUsername(game[game.board.split(' ')[1]]) === Meteor.user().username) {
      return 'Your';
    }
    return getUsername(game[game.board.split(' ')[1]]);
  },

  result: function() {
    var result = getGame().result;

    if(!result) return null;
    else if(result === 'draw') return 'Draw!';
    else return getUsername(result) + ' won!';
  },

  moves: function() {
    return pair(getMoves()).map(function (arr) {
      return arr[0] + ' ' + (arr[1] || '');
    });
  },

  rows: function() {
    var chess = new Chess();
    getMoves().forEach(chess.move.bind(chess));
    return makeRows(chess.fen(), getGame().b);
  }
});

function pair(arr) {
  var i = 0;
  var ret = [];

  while (i < arr.length){
    ret.push([arr[i++], arr[i++]]);
  }
  return ret;
}

var selectedData = null;
var selectedNode = null;

Template.queue.events({
  'click td': function (evt) {
    var data = getGame();

    if (data[data.board.split(' ')[1]] !== Meteor.userId()) return;

    var chess = new Chess(data.board);

    if(selectedData) {
      if(selectedData.cell === this.cell) {
        deselect();
      } else {
        var move = canMove(selectedData.cell, this.cell);
        if (move) {
          var gameOver = Meteor.call('makeQueueMove', data._id, move, Meteor.user().username);
          if(gameOver) {
            chess = new Chess();
          }
          deselect();
        }
      }
    } else {
        if(canMove(this.cell)) select(evt.target, this);
    }

    function canMove(from, to) {
      var moves = chess.moves({ square: from });
      return !to ? moves.length > 0: moves.reduce(function (prev, curr) {
        if (prev) return prev;
        return curr.indexOf(to) > -1 ? curr: false;
      }, false);
    }
  },

  'click #forfeit': function() {
    Meteor.call('playerForfeit', FlowRouter.getParam('id'), Meteor.userId());
    chess = new Chess();
  },

  'click #offer-draw': function() {
    //Meteor.call('acceptedDraw', FlowRouter.getParam('id'));
  }
});

function select(node, data) {
  selectedNode = node;
  selectedData = data;
  selectedNode.classList.add('selected');
}

function deselect(node, data) {
  selectedNode.classList.remove('selected');
  selectedNode = null;
  selectedData = null;
}

function makeRows(board, b) {
  var rows = board.split(' ')[0].split('/');

  var data = rows.map(function(row, i) {
    var rank = 8 - i; //row number
    var file = 0; // column number

    return [].concat.apply([], row.split('').map(function (cell) {
      var n = parseInt(cell);

      if(isNaN(n)) return makeCell(cell, rank, file++); //return the cell w/ piece

      return Array.apply(null, Array(n)).map(function (cell) {
        return makeCell(cell, rank, file++);
      });
    }));
  });

  if(b === Meteor.userId()) {
    data.reverse();
    data = data.map(function (row) {
      return row.reverse();
    });
  }

  return data;
}

function makeCell(val, rank, file) {
  return {
    piece: val,
    img: pieces[val] || '',
    cell: String.fromCharCode(97 + file) + rank
  };
}

function getGame() {
  return Queues.findOne(FlowRouter.getParam('id'));
}

function getMoves() {
  var chess = new Chess();
  chess.load_pgn(getGame().moves);
  var moves = chess.history();
  if(Session.get('stepping')) {
    if(moves.length < Session.get('moveIndex')) {
      Session.set('moveIndex', moves.length);
    }
    moves = moves.slice(0, Session.get('moveIndex'));
  }
  return moves;
};

Template.colorPicker.helpers({
  whiteTaken: function() {
    return Queues.find({$and: [{_id: FlowRouter.getParam('id')}, {w: null}]}).count() !== 0;
  },

  blackTaken: function() {
    return Queues.find({$and: [{_id: FlowRouter.getParam('id')}, {b: null}]}).count() !== 0;
  }
});

Template.colorPicker.events({
  'click #white': function(evt) {
    if(Queues.find({$and: [{_id: FlowRouter.getParam('id')}, {b: Meteor.userId()}]}).count() > 0) {
      return;
    }
    Meteor.call('whitePicked', FlowRouter.getParam('id'), 'w');
  },

  'click #black': function(evt) {
    if(Queues.find({$and: [{_id: FlowRouter.getParam('id')}, {w: Meteor.userId()}]}).count() > 0) {
      return;
    }
    Meteor.call('blackPicked', FlowRouter.getParam('id'), 'w');
  }
});
