const TYPE = 'reactivation-cancelled-recurrent';
import getData from './_getData';

// Тем, кто добровольно отменил ежемесячную подписку.
// Однократно, через месяц после отмены, если их нет в базе действующих реккурентов
// по другим проектам или нет среди разовых жертвователей после отмены подписки.

export default {
    $init: () => ({
        result: {},
        subscriptions: {},
        unsubscribed: {}
    }),
    SubscriptionChanged: (s, e) => {
        if (e.data.Status === 'Cancelled') {
            const subscriptionData = s.subscriptions[e.data.Id];
            const data = getData({subscriptions: {}}, {data: subscriptionData});
            const {name, firstName, lastName, referer, date} = data;
            const email = e.data.Email.toLowerCase();
            const amount = parseInt(e.data.Amount);

            const reason = e.data.Email;
            const transaction = {reason, email, name, firstName, lastName, date, referer, amount};
            s.result[e.data.Email] = transaction;
        }
        if (e.data.Status !== "Active" && e.data.Status !== "PastDue") {
            delete s.subscriptions[e.data.Email];
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
    SubscriberUnsubscribed: (s, e) => {
        s.unsubscribed[e.data.email] = true;
    },
    $transform: s => Object.keys(s.result)
        .map(transactionId => {
            const transaction = s.result[transactionId];
            const isAmongRecurrent = Object.keys(s.subscriptions)
                .some(subscriptionId => s.subscriptions[subscriptionId].Email === transaction.email);
            // Not among recurrent
            if (isAmongRecurrent) {
                return null;
            }
            // Not among unsubscribed
            if (s.unsubscribed[transaction.email]) {
                return null;
            }
            return transaction;
        })
        .filter(i => i)
};
