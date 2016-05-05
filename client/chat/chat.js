Template.chat.onCreated( function() {
  this.id = () => FlowRouter.getParam('id');
  this.subscribe('chat', this.id());
});

Template.chat.helpers({
  message: function () {
    return Conversations.findOne({ game: Template.instance().id() }).messages;
  },

  getClass: function(name) {
    if(name === 'system') return 'system';
    else if(name === Meteor.user().username) return 'me';
    else return 'them';
  }
});

Template.chat.events({
  'keypress input': function(evt, instance) {

    if(evt.target.value === '') return;
    if(evt.keyCode !== 13) return;

    Meteor.call('addMessage', evt.target.value, instance.id());

    evt.target.value = '';

  }
});
