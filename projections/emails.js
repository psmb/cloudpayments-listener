fromStream('payments')
    .when({
        $init: function () {
            return {
                subscribers: {}
            }
        },
        PaymentSucceeded: function (s, e) {
            if (e.body.TestMode == 0 && e.body.Email) {
                const email = e.body.Email.toLowerCase();
                let name = '';
                if (e.body.Data) {
                    const data = JSON.parse(e.body.Data);
                    if (data.name) {
                        name = data.name;
                    }
                }
                if (!s.subscribers[email]) {
                    s.subscribers[email] = name;
                }
            }
        }
    })