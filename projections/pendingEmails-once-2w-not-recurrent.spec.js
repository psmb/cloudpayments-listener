import assert from 'assert';
import test from './../lib/test';
import once2WNotRecurrent from './pendingEmails-once-2w-not-recurrent';
import once from './mock/PaymentSucceeded-once';
import recurrentInitial from './mock/PaymentSucceeded-recurrentInitial';
import recurrentNext from './mock/PaymentSucceeded-recurrentNext';

test('once-2w-not-recurrent: not recurrent', async projectionManager => {
    projectionManager.registerProjection('once-2w-not-recurrent', once2WNotRecurrent);

    projectionManager.onEvent(once);
    assert.equal(projectionManager.getResult('once-2w-not-recurrent').length, 1, 'User is in the list after recurrent PaymentSucceeded');
    const result = projectionManager.getResult('once-2w-not-recurrent').find(i => i.email === 'test@user.com');
    assert.equal(result.firstName, 'Dmitri', 'firstName correctly deduced');
    assert.equal(result.lastName, 'Pisarev', 'lastName correctly deduced');

    projectionManager.onEvent(recurrentInitial);
    assert.equal(projectionManager.getResult('once-2w-not-recurrent').length, 0, 'After recurrent should be empty');
});

test('once-2w-not-recurrent', async projectionManager => {
    projectionManager.registerProjection('once-2w-not-recurrent', once2WNotRecurrent);

    projectionManager.onEvent(once);

    projectionManager.onEvent({
        'eventId': 's1',
        'eventType': 'EmailSent',
        'data': {
            'reason': 'test@user.com',
            'type': 'once-2w-not-recurrent_WRONG',
            'email': 'test@user.com'
        }
    });
    assert.equal(projectionManager.getResult('once-2w-not-recurrent').length, 1, 'EmailSent with wrong type should not decrement the queue');

    projectionManager.onEvent({
        'eventId': 's2',
        'eventType': 'EmailSent',
        'data': {
            'reason': 'test@user.com',
            'type': 'once-2w-not-recurrent',
            'email': 'test@user.com'
        }
    });
    assert.equal(projectionManager.getResult('once-2w-not-recurrent').length, 0, 'EmailSent should decrement the queue');

    projectionManager.onEvent(once);
    assert.equal(projectionManager.getResult('once-2w-not-recurrent').length, 0, 'One more payment should NOT increment the queue again');

    projectionManager.onEvent({
        'eventId': 'u1',
        'eventType': 'SubscriberUnsubscribed',
        'data': {
            'email': 'test@user.com'
        }
    });
    assert.equal(projectionManager.getResult('once-2w-not-recurrent').length, 0, 'After SubscriberUnsubscribed he should not get any email');
});
