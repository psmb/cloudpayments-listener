fromStream('payments')
    .when({
        $init: function () {
            return {
                amount: 0
            }
        },
        PaymentSucceeded: function (s, e) {
            if (e.body.Amount > 0) {
                s.amount += Number(e.body.Amount);
            }
        }
    })