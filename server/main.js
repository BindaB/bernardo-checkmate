Meteor.publish('users', function() {
  return Meteor.users.find({}, {username: 1, profile: 1})
});
