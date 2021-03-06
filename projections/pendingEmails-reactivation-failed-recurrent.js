const TYPE = 'reactivation-failed-recurrent';
import getData from './_getData';

// Тем, чья ежемесячная подписка прекратилась из-за отсутствия средств на карте
// однократно в случае отсутствия каких-либо платежей.

export default {
    $init: () => ({
        result: {},
        subscriptions: {},
        unsubscribed: {}
    }),
    SubscriptionChanged: (s, e) => {
        if (e.data.Status === 'Rejected') {
            const subscriptionData = s.subscriptions[e.data.Id];
            const data = getData({subscriptions: {}}, {data: subscriptionData});
            const {name, firstName, lastName, referer, date} = data;
            const email = e.data.Email.toLowerCase();
            const amount = parseInt(e.data.Amount);

            const reason = e.data.Email;
            const transaction = {reason, email, name, firstName, lastName, date, referer, amount};
            s.result[e.data.Email] = transaction;
        }
    },
    PaymentFailed: (s, e) => {
        if (parseInt(e.data.TestMode) === 0 && e.data.Email) {
            const data = getData(s, e);
        }
    },
    EmailSent: (s, e) => {
        if (e.data.reason && e.data.type && e.data.type === TYPE) {
            s.result[e.data.reason] = true;
            delete s.result[e.data.reason];
        }
    },
    
    PaymentSucceeded: (s, e) => {
        if (parseInt(e.data.TestMode) === 0) {
            const data = getData(s, e);
            if (e.data.Email) {
                delete s.result[e.data.Email];
            }
        }
    },
    $transform: s => Object.keys(s.result)
        .map(transactionId => {
            const transaction = s.result[transactionId];
            // Not among unsubscribed
            if (s.unsubscribed[transaction.email]) {
                return null;
            }
            return transaction;
        })
        .filter(i => i)
};
