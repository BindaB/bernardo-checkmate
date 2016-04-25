FlowRouter.route('/', {
  name: 'main',
  action() {
    BlazeLayout.render('layout',{ child: 'main' });
  }
});

FlowRouter.route('/users', {
  name: 'users',
  action() {
    BlazeLayout.render('layout', { child: 'users' });
  }
});

FlowRouter.route('/games', {
  name: 'games',
  action() {
    BlazeLayout.render('layout', { child: 'games' });
  }
});
