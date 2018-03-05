fromStream('data')
    .when({
        $init: function () {
            return {
                amount: 1520500+450000+66850,
                byReferer: {
                    "chapel": 0
                }
            }
        },
        PaymentSucceeded: function (s, e) {
            if (e.body.Amount > 0) {
                s.amount += Number(e.body.Amount);
                let referer;
                if (e.body.Data) {
                   const data = JSON.parse(e.body.Data.replace("\\", ""));
                   referer = data.referer;
                }
                referer = referer || 'chapel';
                referer = referer === 'c.sfi.ru' ? 'chapel' : referer;
                if (s.byReferer[referer]) {
                    s.byReferer[referer] += Number(e.body.Amount);
                } else {
                    s.byReferer[referer] = Number(e.body.Amount);
                }
            }
        }
    })
