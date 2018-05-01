import assert from 'assert';
import test from './../lib/test';
import failed from './pendingEmails-failed';
import fail from './mock/PaymentFailed';

import once from './mock/PaymentSucceeded-once';
import recurrentInitial from './mock/PaymentSucceeded-recurrentInitial';
import recurrentNext from './mock/PaymentSucceeded-recurrentNext';

test('pendingEmails-failed', async projectionManager => {
    projectionManager.registerProjection('failed', failed);
    assert.equal(projectionManager.getResult('failed').some(i => i.email === 'test@user.com'), false, 'Initial projection empty');

    projectionManager.onEvent(fail);
    assert.equal(projectionManager.getResult('failed').some(i => i.email === 'test@user.com'), true, 'In the list after fail');

    projectionManager.onEvent(once);
    assert.equal(projectionManager.getResult('failed').some(i => i.email === 'test@user.com'), false, 'After success, remove from the list');

    projectionManager.onEvent(fail);
    assert.equal(projectionManager.getResult('failed').some(i => i.email === 'test@user.com'), true, 'After failing again, should be in the list');

    projectionManager.onEvent({
        'eventId': 's1',
        'eventType': 'EmailSent',
        'data': {
            'reason': 'test@user.com',
            'type': 'failed',
            'email': 'test@user.com'
        }
    });
    assert.equal(projectionManager.getResult('failed').some(i => i.email === 'test@user.com'), false, 'Sent should remove from the list');
});
