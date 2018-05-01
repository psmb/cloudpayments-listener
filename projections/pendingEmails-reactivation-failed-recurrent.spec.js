import assert from 'assert';
import test from './../lib/test';
import reactivationFailed from './pendingEmails-reactivation-failed-recurrent';
import rejected from './mock/SubscriptionChanged-rejected';

import once from './mock/PaymentSucceeded-once';
import recurrentInitial from './mock/PaymentSucceeded-recurrentInitial';
import recurrentNext from './mock/PaymentSucceeded-recurrentNext';

test('pendingEmails-reactivation-failed-recurrent', async projectionManager => {
    projectionManager.registerProjection('reactivation-failed-recurrent', reactivationFailed);
    assert.equal(projectionManager.getResult('reactivation-failed-recurrent').some(i => i.email === 'test@user.com'), false, 'Initial projection empty');

    projectionManager.onEvent(recurrentInitial);
    projectionManager.onEvent(rejected);
    assert.equal(projectionManager.getResult('reactivation-failed-recurrent').some(i => i.email === 'test@user.com'), true, 'In the list after fail');

    projectionManager.onEvent(once);
    assert.equal(projectionManager.getResult('reactivation-failed-recurrent').some(i => i.email === 'test@user.com'), false, 'After success, remove from the list');

    projectionManager.onEvent(recurrentInitial);
    projectionManager.onEvent(rejected);
    assert.equal(projectionManager.getResult('reactivation-failed-recurrent').some(i => i.email === 'test@user.com'), true, 'After failing again, should be in the list');

    projectionManager.onEvent({
        'eventId': 's1',
        'eventType': 'EmailSent',
        'data': {
            'reason': 'test@user.com',
            'type': 'reactivation-failed-recurrent',
            'email': 'test@user.com'
        }
    });
    assert.equal(projectionManager.getResult('reactivation-failed-recurrent').some(i => i.email === 'test@user.com'), false, 'Sent should remove from the list');
});
