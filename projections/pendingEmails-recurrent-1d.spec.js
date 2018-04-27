import assert from 'assert';
import test from './../lib/test';
import recurrent1D from './pendingEmails-recurrent-1d';
import once from './mock/PaymentSucceeded-once';
import recurrentInitial from './mock/PaymentSucceeded-recurrentInitial';
import recurrentNext from './mock/PaymentSucceeded-recurrentNext';

test('recurrent-1d', async projectionManager => {
    projectionManager.registerProjection('recurrent-1d', recurrent1D);

    projectionManager.onEvent(once);
    assert.equal(projectionManager.getResult('recurrent-1d').length, 0, 'Non-recurrent doesn\'t yield');
    
    projectionManager.onEvent(recurrentInitial);
    assert.equal(projectionManager.getResult('recurrent-1d').length, 1, 'Recurrent yields');
    const result = projectionManager.getResult('recurrent-1d').find(i => i.email === 'test@user.com');
    assert.equal(result.firstName, 'Dmitri', 'firstName correctly deduced');
    assert.equal(result.lastName, 'Pisarev', 'lastName correctly deduced');

    projectionManager.onEvent({
        'eventId': 's1',
        'eventType': 'EmailSent',
        'data': {
            'reason': 'test@user.com',
            'type': 'recurrent-1d_WRONG',
            'email': 'test@user.com'
        }
    });
    assert.equal(projectionManager.getResult('recurrent-1d').length, 1, 'EmailSent with wrong type should not decrement the queue');

    projectionManager.onEvent({
        'eventId': 's2',
        'eventType': 'EmailSent',
        'data': {
            'reason': 'test@user.com',
            'type': 'recurrent-1d',
            'email': 'test@user.com'
        }
    });
    assert.equal(projectionManager.getResult('recurrent-1d').length, 0, 'EmailSent should decrement the queue');

    projectionManager.onEvent(recurrentInitial);
    assert.equal(projectionManager.getResult('recurrent-1d').length, 0, 'One more payment should NOT increment the queue again');
});

test('recurrent-1d: unsubscribe', async projectionManager => {
    projectionManager.registerProjection('recurrent-1d', recurrent1D);

    projectionManager.onEvent(recurrentInitial);
    assert.equal(projectionManager.getResult('recurrent-1d').length, 1, 'Recurrent yields');

    projectionManager.onEvent({
        'eventId': 'u1',
        'eventType': 'SubscriberUnsubscribed',
        'data': {
            'email': 'test@user.com'
        }
    });
    assert.equal(projectionManager.getResult('recurrent-1d').length, 0, 'After SubscriberUnsubscribed he should not get any email');
});
