export default {
    $init: () => ({
        amount: 0,
        byReferer: {
            "chapel": 0
        }
    }),
    PaymentSucceeded: (s, e) => {
        if (e.data.Amount > 0) {
            s.amount += Number(e.data.Amount);
            let referer;
            if (e.data.Data) {
                const data = JSON.parse(e.data.Data.replace("\\", ""));
                referer = data.referer;
            }
            referer = referer || 'chapel';
            referer = referer === 'c.sfi.ru' ? 'chapel' : referer;
            if (s.byReferer[referer]) {
                s.byReferer[referer] += Number(e.data.Amount);
            } else {
                s.byReferer[referer] = Number(e.data.Amount);
            }
        }
    }
};
