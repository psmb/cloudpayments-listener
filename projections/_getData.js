export default (s, e) => {
    const processReferer = referer => referer === 'c.sfi.ru' ? 'furniture' : (referer || 'furniture');
    const subscriptionId = e.data.SubscriptionId;
    let originalData;
    if (subscriptionId) {
        if (s.subscriptions[subscriptionId]) {
            originalData = s.subscriptions[subscriptionId];
        } else {
            s.subscriptions[subscriptionId] = e.data;
            originalData = e.data;
        }
    } else {
        originalData = e.data;
    }
    const rawData = originalData.Data;
    const data = rawData ? JSON.parse(rawData) : {};
    data.referer = processReferer(e.data.Referer ? e.data.Referer : data.referer);
    data.firstName = data.firstName ? data.firstName.trim() : '';
    data.lastName = data.lastName ? data.lastName.trim() : '';
    data.name = (data.firstName || data.lastName) ? data.firstName + ' ' + data.lastName : data.name;
    data.date = originalData.DateTime;

    return data;
};
