Template.game.onCreated(function() {
  this.autorun(() => {
    this.subscribe('users');
    this.subscribe('game', FlowRouter.getParam('id'));
  });
});

Template.game.helpers({
  rows: function() {
    var chess = new Chess();
    getMoves().forEach(chess.moves.bind(chess));
    return makeRows(chess.fen(), getGame().b);
  }
});

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
  return Games.findOne(FlowRouter.getParam('id'));
}

function getMoves() {
  var chess = new Chess();
  chess.load_pgn(getGame().moves);
  return chess.history();
}
