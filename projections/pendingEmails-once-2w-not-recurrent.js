const TYPE = 'once-2w-not-recurrent';
import getData from './_getData';

// Разовым жертвователям через 2 недели после платежа
// и если нет и не было в реккурентах ни по одному из проектов,
// при этом только один раз в жизни

export default {
    $init: () => ({
        "result": {},
        "unsubscribed": {},
        "subscriptions": {},
        "sent": {}
    }),
    PaymentSucceeded: (s, e) => {
        if (e.data.TestMode === "0" && e.data.Email) {
            const data = getData(s, e);
            const { name, firstName, lastName, referer, date } = data;
            const email = e.data.Email.toLowerCase();
            const subscriptionId = e.data.SubscriptionId;
            const amount = parseInt(e.data.Amount);
            const reason = email;

            const transaction = {reason, email, name, firstName, lastName, date, referer, amount};

            // Only take non-recurrent
            if (!subscriptionId) {
                s.result[email] = transaction;
            }
        }
    },
    EmailSent: (s, e) => {
        if (e.data.reason && e.data.type && e.data.type === TYPE) {
            s.sent[e.data.reason] = true;
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
            // Not among sent
            if (s.sent[transaction.email]) {
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
