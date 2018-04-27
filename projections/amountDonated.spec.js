import assert from 'assert';
import test from './../lib/test';
import amountDonated from './amountDonated';
import once from './mock/PaymentSucceeded-once';

test('amountDonated', async projectionManager => {
    projectionManager.registerProjection('amountDonated', amountDonated);
    const original = projectionManager.getResult('amountDonated').amount;

    projectionManager.onEvent(once);

    const result = projectionManager.getResult('amountDonated').amount;
    assert.equal(original + 50, result);
});
