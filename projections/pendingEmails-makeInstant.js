import getData from './_getData';

export default (TYPE, ISRECURRENT, OCCURANCE = null) => ({
    $init: () => ({
        "result": {},
        "unsubscribed": {},
        "subscriptions": {},
    }),
    PaymentSucceeded: (s, e) => {
        if (parseInt(e.data.TestMode) === 0 && e.data.Email) {
            const data = getData(s, e);
            const {name, firstName, lastName, referer, date} = data;
            const email = e.data.Email.toLowerCase();
            const subscriptionId = e.data.SubscriptionId;
            const amount = parseInt(e.data.Amount);

            const reason = e.data.TransactionId;
            const transaction = {reason, email, name, firstName, lastName, date, referer, amount, subscriptionId};
            

            if ((ISRECURRENT && subscriptionId) || (!ISRECURRENT && !subscriptionId)) {
                if ((OCCURANCE === 'onlyFirst' && !e.data.Data) || (OCCURANCE === 'onlyNext' && e.data.Data)) {
                    return;
                }
                s.result[e.data.TransactionId] = transaction;
            }
        }
    },
    SubscriptionChanged: (s, e) => {
        if (e.data.Status !== "Active" && e.data.Status !== "PastDue" && ISRECURRENT) {
            delete s.result[e.data.Id];
        }
    },
    EmailSent: (s, e) => {
        if (e.data.reason && e.data.type && e.data.type === TYPE) {
            delete s.result[e.data.reason];
        }
    },
    SubscriberUnsubscribed: (s, e) => {
        s.unsubscribed[e.data.email] = true;
    },
    $transform: s => Object.keys(s.result)
        .map(transactionId => s.unsubscribed[s.result[transactionId].email] ? null : s.result[transactionId])
        .filter(i => i)
});
