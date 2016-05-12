Meteor.methods({
  setFriend: function(userId) {
    var query = {};

    query[ alreadyFriends(userId) ? '$pull' : '$push' ] = {
      'profile.friends': userId
    };

    Meteor.users.update(this.userId, query);
  },

  hasActivePlayers: function(queueId) {
    if(Queues.find({$and: [{_id: queueId}, {activePlayers: {$size: 0}}]}).count() !== 0) {
      var players = Queues.find({_id: queueId});
      var queueArray = players.fetch()[0].queue;
      var activePlayersArray = players.fetch()[0].activePlayers;
      for(var i=0; i<2;i++) {
        activePlayersArray[i] = queueArray[i];
      }
      console.log(activePlayersArray);
      for(var i=0; i<2;i++) {
        console.log(i);
        queueArray.shift();
      }
      console.log(queueArray);

      Queues.update({_id: queueId}, {$set: {activePlayers: activePlayersArray}});
      Queues.update({_id: queueId}, {$set: {queue: queueArray}});
    }
  },

  createQueue: function(oppArray) {
    var game = {
      moves: '',
      board: (new Chess).fen()
    };

    game.needsConfirmation = oppArray;
    game.createdBy = Meteor.userId();
    game.haveAccepted = [];
    game.activePlayers = [];
    game.queue = [Meteor.userId()];

    Queues.insert(game, function(err, id) {
      if(err) throw err;

      Conversations.insert({
        game: id,
        users: [this.userId, oppArray],
        messages: [{
          name: 'system',
          text: 'Game started' + (new Date).toString()
        }]
      });
    }.bind(this));
  },

  createGame: function(color, opponentId) {
    var otherColor = (color === 'w')? 'b': 'w';

    var game = {
      moves: '',
      board: (new Chess).fen()
    };

    game[color] = this.userId;
    game[otherColor] = opponentId;
    game.needsConfirmation = opponentId;

    Games.insert(game, function(err, id) {
      if(err) throw err;

      Conversations.insert({
        game: id,
        users: [this.userId, opponentId],
        messages: [{
          name: 'system',
          text: 'Game started' + (new Date).toString()
        }]
      });
    }.bind(this));
  },

  acceptQueue: function(queueId, oppArray, index) {
    if (index > -1) {
      Queues.update(queueId, {$push: {haveAccepted: oppArray[index]}});
      Queues.update(queueId, {$push: {queue: oppArray[index]}});
      oppArray.splice(index, 1);
    }
    Queues.update(queueId, {$set: {needsConfirmation: oppArray}});

    if (oppArray.length === 0) {
      Queues.update(queueId, {$unset: {needsConfirmation: null}});
    }
  },

  declineQueue: function(queueId, oppArray, index) {
    if (index > -1) {
      oppArray.splice(index, 1);
    }
    Queues.update(queueId, {$set: {needsConfirmation: oppArray}});

    if(oppArray.length === 0) {
      Queues.remove(queueId);
    }
  },

  acceptGame: function(gameId) {
    Games.update(gameId, {$unset: {needsConfirmation: null}});
  },

  declineGame: function(gameId) {
    Games.remove(gameId);
  },

  makeMove: function(gameId, move) {
    var game = Games.findOne(gameId);
    var chess = new Chess();

    chess.load_pgn(game.moves);

    chess.move(move);

    var result = null;

    if (chess.game_over()) {
      result = chess.in_checkmate() ? Meteor.userId() : 'draw';
    }

    Games.update(gameId, {
      $set: {
        board: chess.fen(),
        moves: chess.pgn(),
        result: result
      }
    }, function(err) {
      if (err) throw err;

      var message;

      if (result === 'draw')
        message = 'Game over, draw';
      else if(result)
        message = getUsername(result) + ' won.';
      else if (chess.in_check())
        message = 'Check by ' + Meteor.user().username;
      else
        return;

      Conversations.update({ game: gameId}, {
        $push: {
          messages: {
            name: 'system',
            text: message
          }
        }
      });
    });
  },

  addMessage: function(message, gameId) {
    Conversations.update({ game: gameId}, {
      $push: {
        messages: {
          name: Meteor.user().username,
          text: message
        }
      }
    });
  }
});
