import ProjectionManager from './projectionManager';

export default async (testName, testFunc) => {
    const projectionManager = new ProjectionManager({
        debug: true
    });
    await testFunc(projectionManager)
        .then(() => {
            console.log('\x1b[33m%s\x1b[0m\x1b[32m%s\x1b[0m', testName, '✓');
        })
        .catch(e => {
            console.log('\x1b[33m%s\x1b[0m', testName);
            console.log('\x1b[31m%s\x1b[0m actual:%s expected:%s', e.message, e.actual, e.expected)
        });
};
