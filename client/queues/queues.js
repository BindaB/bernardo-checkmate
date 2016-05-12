Template.queues.onCreated( function () {
  this.subscribe('users');
  this.subscribe('queues');
});

Template.queues.helpers({
  possibleQueue: function() {
    if(Queues.find({createdBy: Meteor.userId()}).count() === 0) {
      return true;
    }
    else {
      return false;
    }
  },

  possibleOpponents: function() {
    var user= Meteor.user();
    var friends = user.profile.friends || [];
    return friends.length ? Meteor.users.find({_id: {$in: friends} } ) : null;
  },

  accepted: function() {
    return this.haveAccepted.length >= 1;
  },

  currentQueues: function() {
    return Queues.find({$or: [{createdBy: Meteor.userId()}, {needsConfirmation: Meteor.userId()}, {haveAccepted: Meteor.userId()}]});
  },

/*  archivedGames: function(){
    return Games.find({result: {$not: null}}).map(function (game) {
      if (game.result !== ' draw') game.result = getUsername(game.result) + ' won';
      return game;
    });
  },*/

  username: getUsername,

  byMe: function() {
    return this.needsConfirmation && $.inArray(Meteor.userId(), this.needsConfirmation) > -1;
  },

  opponent: function() {
    return (this.w === Meteor.userId()) ? this.b : this.w;
  }
});

Template.queues.events({
  'submit form': function(evt, template) {
    evt.preventDefault();
    var selected = template.findAll( "#qOpp option:selected");
    var qOppArray = selected.map(function(item) {
      return item.value;
    });
    Meteor.call('createQueue', qOppArray);
  },

  'click #accept': function(evt) {
    var index = $.inArray(Meteor.userId(), this.needsConfirmation)
    Meteor.call('acceptQueue', this._id, this.needsConfirmation, index);
  },

  'click #decline': function(evt) {
      var index = $.inArray(Meteor.userId(), this.needsConfirmation)
      Meteor.call('declineQueue', this._id, this.needsConfirmation, index);
  }
});
