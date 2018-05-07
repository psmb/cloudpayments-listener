import getData from './_getData';
const TYPE = 'once-2m-last-payment';

// разовым жертвователям через 2 месяца с последнего платежа по любому из проектов,
// если при этом его нет в активных рекуррентных по любому проектов

export default {
    $init: () => ({
        "result": {},
        "unsubscribed": {},
        "subscriptions": {},
    }),
    PaymentSucceeded: (s, e) => {
        if (e.data.TestMode === "0" && e.data.Email) {
            const data = getData(s, e);
            const {name, firstName, lastName, referer, date} = data;
            const email = e.data.Email.toLowerCase();
            const subscriptionId = e.data.SubscriptionId;
            const amount = parseInt(e.data.Amount);
            const transactionId = e.data.TransactionId;
            const reason = transactionId;

            const transaction = {reason, email, name, firstName, lastName, date, referer, amount};

            // Only record non-recurrent
            if (!subscriptionId) {
                s.result[email] = transaction;
            }
        }
    },
    SubscriptionChanged: (s, e) => {
        if (e.data.Status !== "Active" && e.data.Status !== "PastDue") {
            delete s.subscriptions[e.data.SubscriptionId];
        }
    },
    EmailSent: (s, e) => {
        if (e.data.reason && e.data.type && e.data.type === TYPE) {
            // delete based on reason, not email
            const found = Object.keys(s.result).find(key => s.result[key].reason === e.data.reason);
            if (found) {
                delete s.result[found];
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
