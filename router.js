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

FlowRouter.route('/games/:id', {
  name: 'game',
  action() {
    BlazeLayout.render('layout', { child: 'game' });
  }
});

FlowRouter.route('/queues', {
  name: 'queues',
  action() {
    BlazeLayout.render('layout', { child: 'queues' });
  }
});

FlowRouter.route('/queues/:id', {
  name: 'queue',
  action() {
    BlazeLayout.render('layout', { child: 'queue' });
  }
});
