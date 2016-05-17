Meteor.methods({
  getBoard: function(queueId) {
    return Queues.find({_id: queueId}).fetch()[0].board;
  },

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
      for(var i=0; i<2;i++) {
        queueArray.shift();
      }

      Queues.update({_id: queueId}, {$set: {activePlayers: activePlayersArray}});
      Queues.update({_id: queueId}, {$set: {queue: queueArray}});
    }
  },

  createQueue: function(oppArray) {
    var game = {
      moves: '',
      board: (new Chess).fen()
    };

    game.w = null;
    game.b = null;
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
          text: 'Game started ' + (new Date).toString()
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

  makeQueueMove: function(queueId, move) {
    var game = Queues.findOne(queueId);
    var chess = new Chess();

    chess.load_pgn(game.moves);

    chess.move(move);

    var result;

    if (chess.game_over()) {
      result = chess.in_checkmate() ? Meteor.userId() : 'draw';
      if (result === 'draw') {
          var players = Queues.find({_id: queueId});
          var queueArray = players.fetch()[0].queue;
          var activePlayersArray = players.fetch()[0].activePlayers;
          for(var i=0; i<2; i++) {
            queueArray.push(activePlayersArray[i]);
          }
          activePlayersArray = [];
          for(var i=0; i<2; i++) {
            activePlayersArray[i] = queueArray.splice(0,1);
          }

          Queues.update({_id: queueId}, {$set: {activePlayers: activePlayersArray}});
          Queues.update({_id: queueId}, {$set: {queue: queueArray}});
          Queues.update({_id: queueId}, {$set: {queue: queueArray}},
            function(err) {
              if (err) throw err;

              var message = 'Draw! Both players are now moved to the back of the queue. ' + getUsername(activePlayersArray[0]) + ' and ' + activePlayersArray[1] + ' are now playing.';

              Conversations.update({ game: queueId}, {
                $push: {
                  messages: {
                    name: 'system',
                    text: message
                  }
                }
              });
            });
          return 'game over';
      }
      else {
        var players = Queues.find({_id: queueId});
        var queueArray = players.fetch()[0].queue;
        var activePlayersArray = players.fetch()[0].activePlayers;
        var winner = result;
        var loser;
        var white = players.fetch()[0].w;
        var black = players.fetch()[0].b;
        for(var i=0; i<2; i++) {
          if(winner !== activePlayersArray[i]) {
            loser = activePlayersArray[i];
          }
        }
        queueArray.push(loser);
        activePlayersArray = [winner];
        if(winner === white) {
          Queues.update({_id: queueId}, {$set: {b: queueArray[0]}});
        }
        else {
          Queues.update({_id: queueId}, {$set: {w: queueArray[0]}});
        }
        activePlayersArray.push(queueArray.splice(0,1)[0]);

        Queues.update({_id: queueId}, {$set: {activePlayers: activePlayersArray}});
        Queues.update({_id: queueId}, {$set: {moves: '', board: (new Chess).fen(), result: null}});
        console.log(queueArray);
        Queues.update({_id: queueId}, {$set: {queue: queueArray}},
          function(err) {
            if (err) throw err;

            var message = getUsername(winner) + ' won by checkmate. ' + getUsername(activePlayersArray[1]) + ' is now an active player!';

            Conversations.update({ game: queueId}, {
              $push: {
                messages: {
                  name: 'system',
                  text: message
                }
              }
            });
          });
        return 'game over';
      }
    }

    Queues.update(queueId, {
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

      Conversations.update({ game: queueId}, {
        $push: {
          messages: {
            name: 'system',
            text: message
          }
        }
      });
    });
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
  },

  whitePicked: function(queueId) {
    Queues.update({_id: queueId}, {$set: {w: Meteor.userId()}});
  },

  blackPicked: function(queueId) {
    Queues.update({_id: queueId}, {$set: {b: Meteor.userId()}});
  },

  playerForfeit: function(queueId, playerId) {
    var players = Queues.find({_id: queueId});
    var queueArray = players.fetch()[0].queue;
    var activePlayersArray = players.fetch()[0].activePlayers;
    var winner;
    var loser = playerId;
    for(var i=0; i<2; i++) {
        if(loser !== activePlayersArray[i]) {
          winner = activePlayersArray[i];
        }
    }
    queueArray.push(loser);
    activePlayersArray = [winner];
    activePlayersArray.push(queueArray.splice(0,1)[0]);

    Queues.update({_id: queueId}, {$set: {activePlayers: activePlayersArray}});
    Queues.update({_id: queueId}, {$set: {moves: '', board: (new Chess).fen(), result: null}});
    Queues.update({_id: queueId}, {$set: {queue: queueArray}},
      function(err) {
        if (err) throw err;

        var message = getUsername(winner) + ' won by forfeit. ' + getUsername(activePlayersArray[1]) + ' is now an active player!';

        Conversations.update({ game: queueId}, {
          $push: {
            messages: {
              name: 'system',
              text: message
            }
          }
        });
      });

      return 'game over';
  },
});
