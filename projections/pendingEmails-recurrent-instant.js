const TYPE = 'recurrent-instant';
const ISRECURRENT = true;

const getData = (s, e) => {
    const processReferer = referer => referer === 'c.sfi.ru' ? 'chapel' : (referer || 'chapel');
    const subscriptionId = e.body.SubscriptionId;
    if (subscriptionId) {
        if (s.subscriptions[subscriptionId]) {
            rawData = s.subscriptions[subscriptionId].Data;
        } else {
            s.subscriptions[subscriptionId] = e.body;
            rawData = e.body.Data;
        }
    } else {
        rawData = e.body.Data;
    }
    const data = rawData ? JSON.parse(rawData) : {};
    data.referer = processReferer(data.referer);
    data.firstName = data.firstName ? data.firstName.trim() : '';
    data.lastName = data.lastName ? data.lastName.trim() : '';
    data.name = (data.firstName || data.lastName) ? data.firstName + ' ' + data.lastName : data.name;
    
    return data;
};

fromStreams('payments', 'subscriptions')
.when({
    $init: function(){
        return {
            "result": {},
            "unsubscribed": [],
            "subscriptions": {},
        };
    },
    PaymentSucceeded: function (s, e) {
        if (e.body.TestMode === "0" && e.body.Email) {
            const data = getData(s, e);
            const {name, firstName, lastName, referer} = data;
            const email = e.body.Email.toLowerCase();
            const date = e.body.DateTime;
            const subscriptionId = e.body.SubscriptionId;
            const amount = parseInt(e.body.Amount);
            
            const transaction = {email, name, firstName, lastName, date, referer, amount, subscriptionId};
            const transactionId = ISRECURRENT ? e.body.SubscriptionId : e.body.TransactionId;
            
            if ((ISRECURRENT && subscriptionId) || (!ISRECURRENT && !e.body.SubscriptionId)) {
                s.result[transactionId] = transaction;
            }
        }
    },
    SubscriptionChanged: function(s, e) {
        if (e.body.Status !== "Active" && e.body.Status !== "PastDue" && ISRECURRENT) {
            delete s.result[e.body.SubscriptionId];
        }
    },
    EmailSent: function(s, e) {
        if (e.body.reason && e.body.type && e.body.type === TYPE) {
            delete s.result[e.body.reason];
        }
    },
    SubscriberUnsubscribed: function (s, e) {
        s.unsubscribed.push(e.body.hash);
    }
}).transformBy(s => Object.keys(s.result)
    .map(transactionId => s.unsubscribed.includes(s.result[transactionId]) ? null : s.result[transactionId])
    .filter(i => i));
