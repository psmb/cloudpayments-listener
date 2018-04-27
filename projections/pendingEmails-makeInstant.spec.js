import assert from 'assert';
import test from './../lib/test';
import makeInstant from './pendingEmails-makeInstant';
import once from './mock/PaymentSucceeded-once';
import recurrentInitial from './mock/PaymentSucceeded-recurrentInitial';
import recurrentNext from './mock/PaymentSucceeded-recurrentNext';

test('pendingEmails-once-instant', async projectionManager => {
    projectionManager.registerProjection('once-instant', makeInstant('once-instant', false));
    assert.equal(projectionManager.getResult('once-instant').some(i => i.email === 'test@user.com'), false, 'Initial projection empty');

    projectionManager.onEvent(recurrentInitial);
    assert.equal(projectionManager.getResult('once-instant').some(i => i.email === 'test@user.com'), false, 'Still empty after recurrent');

    projectionManager.onEvent(once);
    const result = projectionManager.getResult('once-instant').find(i => i.email === 'test@user.com');
    assert.equal(Boolean(result), true, 'User is in the list after non-recurrent PaymentSucceeded');
    assert.equal(result.firstName, 'Dmitri', 'firstName correctly deduced');
    assert.equal(result.lastName, 'Pisarev', 'lastName correctly deduced');
});

test('pendingEmails-recurrent-instant', async projectionManager => {
    projectionManager.registerProjection('recurrent-instant', makeInstant('recurrent-instant', true));
    assert.equal(projectionManager.getResult('recurrent-instant').some(i => i.email === 'test@user.com'), false, 'Initial projection empty');

    projectionManager.onEvent(once);
    assert.equal(projectionManager.getResult('recurrent-instant').some(i => i.email === 'test@user.com'), false, 'Still empty after non-recurrent');

    projectionManager.onEvent(recurrentInitial);
    const result = projectionManager.getResult('recurrent-instant').find(i => i.email === 'test@user.com');
    assert.equal(projectionManager.getResult('recurrent-instant').length, 1, 'User is in the list after recurrent PaymentSucceeded');
    assert.equal(result.firstName, 'Dmitri', 'firstName correctly deduced');
    assert.equal(result.lastName, 'Pisarev', 'lastName correctly deduced');

    projectionManager.onEvent(recurrentNext);
    assert.equal(projectionManager.getResult('recurrent-instant').length, 2, 'Both initial and next events registered');
    projectionManager.getResult('recurrent-instant').forEach(i => assert.equal(i.firstName, 'Dmitri', 'Should be able to retrieve original info from initial payment'));

    projectionManager.onEvent({
        'eventId': 's1',
        'eventType': 'EmailSent',
        'data': {
            'reason': 'recurrentInitial1',
            'type': 'recurrent-instant',
            'email': 'test@user.com'
        }
    });
    assert.equal(projectionManager.getResult('recurrent-instant').length, 1, 'EmailSent should decrement the queue');
    
    projectionManager.onEvent({
        'eventId': 's1',
        'eventType': 'EmailSent',
        'data': {
            'reason': 'recurrentNext1',
            'type': 'recurrent-instant_WRONG',
            'email': 'test@user.com'
        }
    });
    assert.equal(projectionManager.getResult('recurrent-instant').length, 1, 'EmailSent with wrong type should not decrement the queue');
    
    projectionManager.onEvent({
        'eventId': 's1',
        'eventType': 'SubscriberUnsubscribed',
        'data': {
            'email': 'test@user.com'
        }
    });
    assert.equal(projectionManager.getResult('recurrent-instant').length, 0, 'After SubscriberUnsubscribed he should not get any email');
});
