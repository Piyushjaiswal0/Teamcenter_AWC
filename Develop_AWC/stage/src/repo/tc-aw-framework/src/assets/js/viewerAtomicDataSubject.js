class ViewerAtomicDataSubject {
    /**
     * Viewer subject topics
     */
    constructor() {
        this.topics = {};
    }

    isSubscribed( topic, newSub ) {
        if( this.topics.hasOwnProperty( topic ) ) {
            let observers = this.topics[ topic ];
            return observers.filter( subscriber => subscriber === newSub ).length;
        }
        return false;
    }

    subscribe( topic, newSub ) {
        if( this.isSubscribed( newSub ) ) {
            return;
        }
        let observers = null;
        if( this.topics.hasOwnProperty( topic ) ) {
            observers = this.topics[ topic ];
            observers.push( newSub );
        } else {
            this.topics[ topic ] = [ newSub ];
        }
    }

    unsubscribe( topic, sub ) {
        if( this.topics.hasOwnProperty( topic ) ) {
            let observers = this.topics[ topic ];
            observers = observers.filter( subscriber => subscriber !== sub );
            this.topics[ topic ] = observers;
        }
    }

    notify( topic, data ) {
        if( this.topics.hasOwnProperty( topic ) ) {
            let observers = this.topics[ topic ];
            observers.forEach( observer => observer.update( topic, data ) );
        }
    }
}

export default ViewerAtomicDataSubject;
