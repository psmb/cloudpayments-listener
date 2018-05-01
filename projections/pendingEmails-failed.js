const TYPE = 'failed';
import getData from './_getData';

// для незавершенных платежей, при отсутствии платежа в течении 3 часов

export default {
    $init: () => ({
        result: {}
    }),
    PaymentFailed: (s, e) => {
        if (e.data.TestMode === "0" && e.data.Email) {
            const data = getData(s, e);
            const {name, firstName, lastName, referer, date} = data;
            const email = e.data.Email.toLowerCase();
            const subscriptionId = e.data.SubscriptionId;
            const amount = parseInt(e.data.Amount);
            const reason = email;

            const transaction = {reason, email, name, firstName, lastName, date, referer, amount};

            s.result[email] = transaction;
        }
    },
    EmailSent: (s, e) => {
        if (e.data.reason && e.data.type && e.data.type === TYPE) {
            s.result[e.data.reason] = true;
            delete s.result[e.data.reason];
        }
    },
    PaymentSucceeded: (s, e) => {
        const email = e.data.Email.toLowerCase();
        delete s.result[email];
    },
    $transform: s => Object.keys(s.result).map(i => s.result[i])
};
