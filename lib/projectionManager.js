export default class ProjectionManager {
    projections = {};
    state = {};
    options = {};
    live = false;

    constructor(options) {
        if (options) {
            this.options = options;
        }
    }

    goLive = () => {
        this.live = true;
    }

    registerProjection = (name, projector) => {
        this.projections[name] = projector;
        this.state[name] = projector['$init']();
    };

    log = (...args) => {
        if (this.options.debug) {
            console.log(...args);
        }
    }

    onEvent = event => {
        const eventType = event.eventType;
        this.log('==================================');
        this.log(eventType);
        this.log('==================================');
        Object.keys(this.projections).forEach(projectionName => {
            const projection = this.projections[projectionName];
            const projectionState = this.state[projectionName];
            const projector = projection[eventType];

            if (projector) {
                try {
                    projector(projectionState, event);
                } catch (e) {
                    console.error(e);
                }
                this.log(projectionName + ': ', this.getResult(projectionName));
                this.log(projectionName + ' state: ', projectionState);
            }
        });
    };

    getState = projectionName => this.state[projectionName];

    getResult = projectionName => {
        if (!this.live) {
            console.warn('The subscription is not live yet');
            return null;
        }
        const projection = this.projections[projectionName];
        if (!projection) {
            console.warn(`Projection "${projectionName}" not found`);
            return null;
        }
        const projectionState = this.state[projectionName];
        if (projection['$transform']) {
            return projection['$transform'](projectionState);
        }
        return projectionState;
    };
}
