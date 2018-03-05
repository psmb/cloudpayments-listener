const targetReferer = 'chapel';
const startDate = '2018-01-01';

const getData = (s,e) => {
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

const getFresh = (s, e) => {
    const date = Date.parse(e.body.DateTime);
    // const daysago = Date.now() - 24 * 3600 * 1000 * spanDays;
    const daysago = Date.parse(startDate);
    return date - daysago > 0;
};

fromAll()
.when({
    $init: function() {
        return {
            unsubscribed: [],
            subscriptions: {},
            result: {}
        };
    },
    PaymentSucceeded: (s, e) => {
        if (e.body.TestMode == 0 && e.body.Email) {
            const data = getData(s, e);
            const {name, firstName, lastName} = data;
            if (data.referer === targetReferer) {
                const email = e.body.Email.toLowerCase();
                const date = e.body.DateTime;
                const isFresh = getFresh(s, e);
                const subscriptionId = e.body.SubscriptionId;
                const paymentAmount = parseInt(e.body.Amount);
                const currentAmount = (s.result[email] && s.result[email].amount) || 0;
                const currentTotalAmount = (s.result[email] && s.result[email].totalAmount) || 0;
                const amount = currentAmount + (isFresh ? paymentAmount : 0);
                const totalAmount = currentTotalAmount + paymentAmount;
                s.result[email] = {name, firstName, lastName, amount, totalAmount, date, email, subscriptionId};
            }
        }
    },
    RefundSucceeded: (s, e) => {
        if (e.body.Email) {
            const email = e.body.Email.toLowerCase();
            const paymentAmount = parseInt(e.body.Amount);
            const isFresh = getFresh(s, e);
            
            const data = getData(s, e);

            if (data.referer === targetReferer) {
                if (isFresh) {
                    s.result[email].amount -= paymentAmount;
                }
                s.result[email].totalAmount -= paymentAmount;
            }
        }
    },
    SubscriberUnsubscribed: function (s, e) {
        s.unsubscribed.push(e.body.hash);
    }
}).transformBy(s => Object.keys(s.result).map(email => s.unsubscribed.includes(email) ? null : s.result[email]).filter(i => i));
