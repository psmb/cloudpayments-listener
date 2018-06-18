import getData from './_getData';

export default {
    $init: () => ({
        amount: 0,
        byReferer: {
        },
        subscriptions: {}
    }),
    PaymentSucceeded: (s, e) => {
        if (e.data.TestMode == 0) {
            const { referer } = getData(s, e);

            s.amount += Number(e.data.Amount);
            if (s.byReferer[referer]) {
                s.byReferer[referer] += Number(e.data.Amount);
            } else {
                s.byReferer[referer] = Number(e.data.Amount);
            }
        }
    },
    $transform: s => ({amount: s.amount, byReferer: s.byReferer})
};
