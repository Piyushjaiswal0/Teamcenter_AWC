// Copyright (c) 2022 Siemens
/* eslint-disable no-invalid-this */
/* eslint-disable class-methods-use-this */

/**
 * This class stores visibility from various viewers
 *
 * @module js/viewerVisibilityCoreManager
 */
import _ from 'lodash';

export default class viewerVisibilityCoreManager {
    /**
     * Constructor of viewerVisibilityCoreManager
     */
    constructor() {
        this.invisibleCsids = [];
        this.invisibleExceptionCsids = [];
        this.invisiblePartitionIds = [];
        this.invisibleExceptionPartitionIds = [];
        this.ROOT_ID = '';
        /**
         * Viewer visibility types
         */
        this.VISIBILITY = {
            VISIBLE: 'VISIBLE',
            INVISIBLE: 'INVISIBLE',
            PARTIAL: 'PARTIAL'
        };
    }

    /**
     * Update visibility of all children of given parent assembly
     *
     * @param {Object} occurrence parent occurrence
     * @param {Boolean} visibilityToSet visibility to set
     */
    updateVisibilityAllChildrenOfGivenOccurrence( occurrence, visibilityToSet ) {
        if( visibilityToSet ) {
            var invisibleChildren = this._findTheInvisibleChildrenOf( occurrence );
            invisibleChildren.push( occurrence );
            _.remove( this.invisibleCsids, function( currentObject ) {
                return invisibleChildren.indexOf( currentObject ) >= 0;
            } );
            this.invisibleExceptionCsids = _.union( this.invisibleExceptionCsids, invisibleChildren );
        } else {
            var invisibleExceptionChildren = this._findTheInvisibleExceptionChildrenOf( occurrence );
            invisibleExceptionChildren.push( occurrence );
            _.remove( this.invisibleExceptionCsids, function( currentObject ) {
                return invisibleExceptionChildren.indexOf( currentObject ) >= 0;
            } );
            this.invisibleCsids = _.union( this.invisibleCsids, invisibleExceptionChildren );
        }
    }

    /**
     * get part visibility
     *
     * @param {String} csidChain csid chains of the model object
     * @return {Boolean} boolean indicating visible or not
     */
    isVisible( csidChain ) {
        var visibility = this.getProductViewerVisibility( csidChain );
        if( visibility === this.VISIBILITY.INVISIBLE || visibility === this.VISIBILITY.PARTIAL ) {
            return false;
        }
        return true;
    }

    /**
     * Get invisible csids
     *
     * @return {Array} array of invisible csid chains
     */
    getInvisibleCsids() {
        return this.invisibleCsids;
    }

    /**
     * Get invisible exception csids
     *
     * @return {Array} array of invisible exception csid chains
     */
    getInvisibleExceptionCsids() {
        return this.invisibleExceptionCsids;
    }

    /**
     * Get invisible partition csids
     *
     * @return {Array} array of invisible partition csid chains
     */
    getInvisiblePartitionCsids() {
        return this.invisiblePartitionIds;
    }

    /**
     * Get invisible exception partition csids
     *
     * @return {Array} array of invisible exception partition csid chains
     */
    getInvisibleExceptionPartitionCsids() {
        return this.invisibleExceptionPartitionIds;
    }

    /**
     * Searches for any children of the given parents.<br>
     * This is a linear search but the lists should be sparse and decreasing in size on every iteration.
     *
     * @param {[String]} parents The parent CSIDs
     * @param {[String]} children The children CSIDs
     * @return {[String]} any found children or empty collection.
     */
    findChildrenOf( parents, children ) {
        var foundChildren = [];
        for( var i = 0; i < parents.length; i++ ) {
            for( var j = 0; j < children.length; j++ ) {
                if( parents[ i ].length < children[ j ].length && children[ j ].startsWith( parents[ i ] ) ) {
                    foundChildren.push( children[ j ] );
                }
            }
        }
        return foundChildren;
    }

    /**
     * Process visibility and updates stored visibility data
     * @param {String} initialVisibility initial visibility of csid chain
     * @param {String} finalVisibility final visibility of csid chain
     * @param {String} csidChain csid chain of occurence
     * @param {Boolean} toggleVisibility true/false toggling visibility
     * @returns {String} final visibility state of csid chain passed
     */
    processVisibility( initialVisibility, finalVisibility, csidChain, toggleVisibility ) {
        switch ( initialVisibility ) {
            case this.VISIBILITY.INVISIBLE: //toggle invisible to visible
            case this.VISIBILITY.PARTIAL: //toggle partial to visible
                //if invisible because of this, remove this invisible
                var indexToBeRemoved = this.invisibleCsids.indexOf( csidChain );
                if( indexToBeRemoved > -1 ) {
                    this.invisibleCsids.splice( indexToBeRemoved, 1 );
                }
                //if still invisible because of parent, add this exception
                if( this._findNearestParentVisibility( csidChain ) === this.VISIBILITY.INVISIBLE ) {
                    this.invisibleExceptionCsids.push( csidChain );
                }
                this._clearChildren( csidChain );
                if( toggleVisibility ) {
                    finalVisibility = this.VISIBILITY.VISIBLE;
                }
                break;
            case this.VISIBILITY.VISIBLE: //toggle visible to invisible
                //if visible because of this, remove this exception
                var indexToBeRemoved = this.invisibleExceptionCsids.indexOf( csidChain );
                if( indexToBeRemoved > -1 ) {
                    this.invisibleExceptionCsids.splice( indexToBeRemoved, 1 );
                }
                //if still visible because of parent, add this exception
                if( this._findNearestParentVisibility( csidChain ) === this.VISIBILITY.VISIBLE ) {
                    if( csidChain === this.ROOT_ID ) {
                        this.clearVisibility();
                    }
                    this.invisibleCsids.push( csidChain );
                }
                this._clearChildren( csidChain );
                if( toggleVisibility ) {
                    finalVisibility = this.VISIBILITY.INVISIBLE;
                }
                break;
        }
        return finalVisibility;
    }

    /**
     * Checks for the visibility state of the nearest parent, after first checking for this.<br>
     * Only VISIBLE and INVISIBLE are possible results. (never PARTIAL)
     *
     * @param {String} csidChain csid chain of the model object
     * @return {Boolean} (this.VISIBILITY) The visibility state based on the search.
     */
    _findNearestParentVisibility( csidChain ) {
        if( _.includes( this.invisibleExceptionCsids, csidChain ) ) {
            return this.VISIBILITY.VISIBLE;
        }
        if( _.includes( this.invisibleCsids, csidChain ) ) {
            return this.VISIBILITY.INVISIBLE;
        }

        var parentCsidChains = this._getParentCsidChains( csidChain );

        for( var i = 0; i < parentCsidChains.length; i++ ) {
            if( _.includes( this.invisibleExceptionCsids, parentCsidChains[ i ] ) ) {
                return this.VISIBILITY.VISIBLE;
            }
            if( _.includes( this.invisibleCsids, parentCsidChains[ i ] ) ) {
                return this.VISIBILITY.INVISIBLE;
            }
        }

        // no state in parents, need to look at root
        if( _.includes( this.invisibleCsids, '' ) ) {
            return this.VISIBILITY.INVISIBLE;
        }

        return this.VISIBILITY.VISIBLE;
    }

    /**
     * Checks for the visibility state of the nearest parent, after first checking for this.<br>
     * Only VISIBLE and INVISIBLE are possible results. (never PARTIAL)
     *
     * @param {String} partitionChain csid chain of the model object
     * @return {Boolean} (this.VISIBILITY) The visibility state based on the search.
     */
    _findNearestPartitionParentVisibility( partitionChain ) {
        if( _.includes( this.invisibleExceptionPartitionIds, partitionChain ) ) {
            return this.VISIBILITY.VISIBLE;
        }
        if( _.includes( this.invisiblePartitionIds, partitionChain ) ) {
            return this.VISIBILITY.INVISIBLE;
        }

        var parentCsidChains = this._getParentCsidChains( partitionChain );

        for( var i = 0; i < parentCsidChains.length; i++ ) {
            if( _.includes( this.invisibleExceptionPartitionIds, parentCsidChains[ i ] ) ) {
                return this.VISIBILITY.VISIBLE;
            }
            if( _.includes( this.invisiblePartitionIds, parentCsidChains[ i ] ) ) {
                return this.VISIBILITY.INVISIBLE;
            }
        }

        // no state in parents, need to look at root
        if( _.includes( this.invisibleCsids, '' ) ) {
            return this.VISIBILITY.INVISIBLE;
        }

        return this.VISIBILITY.VISIBLE;
    }

    /**
     * Pulls all the parent CSIDs from the given CSID. Ordered as nearest parent at the lowest index.
     *
     * @param {String} csidChain csid chain of the model object
     * @return {Array} An array containing any parent CSIDs.
     */
    _getParentCsidChains( csidChain ) {
        var parentCsidChains = [];
        if( _.isUndefined( csidChain ) || _.isNull( csidChain ) || csidChain.indexOf( '/' ) === 0 ) {
            return parentCsidChains;
        }

        var tempCsidChain = csidChain;
        var nextSlash = tempCsidChain.lastIndexOf( '/', tempCsidChain.length - 2 );
        while( nextSlash !== -1 ) {
            tempCsidChain = tempCsidChain.substring( 0, nextSlash );
            parentCsidChains.push( tempCsidChain );
            nextSlash = tempCsidChain.lastIndexOf( '/', tempCsidChain.length - 2 );
        }

        return parentCsidChains;
    }

    /**
     * gets part viewer visibility
     *
     * @param {String} csidChain csid chain of the model object
     * @returns {Boolean} gets parts viewer visibility
     */
    getProductViewerVisibility( csidChain ) {
        var thisVisibility = this._findNearestParentVisibility( csidChain );
        var childIsDifferent = this._findDifferentChildOf( csidChain, thisVisibility );

        if( thisVisibility === this.VISIBILITY.VISIBLE ) {
            return childIsDifferent ? this.VISIBILITY.PARTIAL : this.VISIBILITY.VISIBLE;
        }
        return childIsDifferent ? this.VISIBILITY.PARTIAL : this.VISIBILITY.INVISIBLE;
    }

    /**
     * gets part viewer visibility
     *
     * @param {String} partitionChain csid chain of the model object
     * @returns {Boolean} gets parts viewer visibility
     */
    getPartitionVisibility( partitionChain ) {
        var thisVisibility = this._findNearestPartitionParentVisibility( partitionChain );
        var childIsDifferent = this._findDifferentPartitionChildOf( partitionChain, thisVisibility );

        if( thisVisibility === this.VISIBILITY.VISIBLE ) {
            return childIsDifferent ? this.VISIBILITY.PARTIAL : this.VISIBILITY.VISIBLE;
        }
        return childIsDifferent ? this.VISIBILITY.PARTIAL : this.VISIBILITY.INVISIBLE;
    }

    /**
     * Process partition visibility and updates stored visibility data
     * @param {String} initialVisibility initial visibility of csid chain
     * @param {String} finalVisibility final visibility of csid chain
     * @param {String} partitionUidChain csid chain of occurence
     * @param {Boolean} toggleVisibility true/false toggling visibility
     * @returns {String} final visibility state of csid chain passed
     */
    processPartitionVisibility( initialVisibility, finalVisibility, partitionUidChain, toggleVisibility ) {
        switch ( initialVisibility ) {
            case this.VISIBILITY.INVISIBLE: //toggle invisible to visible
            case this.VISIBILITY.PARTIAL: //toggle partial to visible
                //if invisible because of this, remove this invisible
                var indexToBeRemoved = this.invisiblePartitionIds.indexOf( partitionUidChain );
                if( indexToBeRemoved > -1 ) {
                    this.invisiblePartitionIds.splice( indexToBeRemoved, 1 );
                }
                //if still invisible because of parent, add this exception
                if( this._findNearestPartitionParentVisibility( partitionUidChain ) === this.VISIBILITY.INVISIBLE ) {
                    this.invisibleExceptionPartitionIds.push( partitionUidChain );
                }
                this._clearPartitionChildren( partitionUidChain );
                if( toggleVisibility ) {
                    finalVisibility = this.VISIBILITY.VISIBLE;
                }
                break;
            case this.VISIBILITY.VISIBLE: //toggle visible to invisible
                //if visible because of this, remove this exception
                var indexToBeRemoved = this.invisibleExceptionPartitionIds.indexOf( partitionUidChain );
                if( indexToBeRemoved > -1 ) {
                    this.invisibleExceptionPartitionIds.splice( indexToBeRemoved, 1 );
                }
                //if still visible because of parent, add this exception
                if( this._findNearestPartitionParentVisibility( partitionUidChain ) === this.VISIBILITY.VISIBLE ) {
                    this.invisiblePartitionIds.push( partitionUidChain );
                }
                this._clearPartitionChildren( partitionUidChain );
                if( toggleVisibility ) {
                    finalVisibility = this.VISIBILITY.INVISIBLE;
                }
                break;
        }
        return finalVisibility;
    }

    /**
     * Searches for children that are different than the given state.
     *
     * @param {String} csidChain the this CSID chain
     * @param {Boolean} thisVisible looking for children different than this state.
     * @return {Boolean} if any children were found to have different visibility.
     */
    _findDifferentChildOf( csidChain, thisVisible ) {
        if( thisVisible === this.VISIBILITY.VISIBLE ) {
            for( var i = 0; i < this.invisibleCsids.length; i++ ) {
                if( this.invisibleCsids[ i ].lastIndexOf( csidChain, 0 ) === 0 ) {
                    return true;
                }
            }
        } else {
            for( var i = 0; i < this.invisibleExceptionCsids.length; i++ ) {
                if( this.invisibleExceptionCsids[ i ].lastIndexOf( csidChain, 0 ) === 0 ) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Searches for children that are different than the given state.
     *
     * @param {String} partitionChain the this CSID chain
     * @param {Boolean} thisVisible looking for children different than this state.
     * @return {Boolean} if any children were found to have different visibility.
     */
    _findDifferentPartitionChildOf( partitionChain, thisVisible ) {
        if( thisVisible === this.VISIBILITY.VISIBLE ) {
            for( var i = 0; i < this.invisiblePartitionIds.length; i++ ) {
                if( this.invisiblePartitionIds[ i ].lastIndexOf( partitionChain, 0 ) === 0 ) {
                    return true;
                }
            }
        } else {
            for( var i = 0; i < this.invisibleExceptionPartitionIds.length; i++ ) {
                if( this.invisibleExceptionPartitionIds[ i ].lastIndexOf( partitionChain, 0 ) === 0 ) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Removes all children of the given CSID.
     *
     * @param {String} csidChain The CSID to search for children of.
     * @return {Number} The number of children culled.
     */
    _clearChildren( csidChain ) {
        var foundChildren = [];
        var removedCount = 0;
        _.forEach( this.invisibleCsids, function( invisibleCsidChain ) {
            if( invisibleCsidChain.lastIndexOf( csidChain, 0 ) === 0 ) {
                foundChildren.push( invisibleCsidChain );
            }
        } );
        _.remove( foundChildren, function( child ) {
            return child === csidChain;
        } );

        _.remove( this.invisibleCsids, function( child ) {
            return _.includes( foundChildren, child );
        } );

        removedCount = foundChildren.length;
        foundChildren.length = 0;

        _.forEach( this.invisibleExceptionCsids, function( invisibleExpCsidChain ) {
            if( invisibleExpCsidChain.lastIndexOf( csidChain, 0 ) === 0 ) {
                foundChildren.push( invisibleExpCsidChain );
            }
        } );

        _.remove( foundChildren, function( child ) {
            return child === csidChain;
        } );

        _.remove( this.invisibleExceptionCsids, function( child ) {
            return _.includes( foundChildren, child );
        } );

        removedCount += foundChildren.length;
        foundChildren.length = 0;

        return removedCount;
    }

    /**
     * Removes all children of the given CSID.
     *
     * @param {String} partitionUidChain The CSID to search for children of.
     * @return {Number} The number of children culled.
     */
    _clearPartitionChildren( partitionUidChain ) {
        var foundChildren = [];
        var removedCount = 0;
        _.forEach( this.invisiblePartitionIds, function( invisiblePartitionId ) {
            if( invisiblePartitionId.lastIndexOf( partitionUidChain, 0 ) === 0 ) {
                foundChildren.push( invisiblePartitionId );
            }
        } );
        _.remove( foundChildren, function( child ) {
            return child === partitionUidChain;
        } );

        _.remove( this.invisiblePartitionIds, function( child ) {
            return _.includes( foundChildren, child );
        } );

        removedCount = foundChildren.length;
        foundChildren.length = 0;

        _.forEach( this.invisibleExceptionPartitionIds, function( invisibleExpCsidChain ) {
            if( invisibleExpCsidChain.lastIndexOf( partitionUidChain, 0 ) === 0 ) {
                foundChildren.push( invisibleExpCsidChain );
            }
        } );

        _.remove( foundChildren, function( child ) {
            return child === partitionUidChain;
        } );

        _.remove( this.invisibleExceptionPartitionIds, function( child ) {
            return _.includes( foundChildren, child );
        } );

        removedCount += foundChildren.length;
        foundChildren.length = 0;

        return removedCount;
    }

    /**
     * Finds the invisible children of given modelObject
     *
     * @param {String} parentCSID The CSID of the modelObject whose invisible child is searched
     * @return {Array} array of the invisible children
     */
    _findTheInvisibleChildrenOf( parentCSID ) {
        var returnArray = [];
        for( var i = 0; i < this.invisibleCsids.length; i++ ) {
            if( this.invisibleCsids[ i ].indexOf( parentCSID ) === 0 && this.invisibleCsids[ i ] !== parentCSID ) {
                returnArray.push( this.invisibleCsids[ i ] );
            }
        }
        return returnArray;
    }

    /**
     * Finds the invisible exception children of given modelObject
     *
     * @param {String} parentCSID The CSID of the modelObject whose invisible child is searched
     * @return {Array} array of the invisible exception children
     */
    _findTheInvisibleExceptionChildrenOf( parentCSID ) {
        var returnArray = [];
        for( var i = 0; i < this.invisibleExceptionCsids.length; i++ ) {
            if( this.invisibleExceptionCsids[ i ].indexOf( parentCSID ) === 0 &&
                this.invisibleExceptionCsids[ i ] !== parentCSID ) {
                returnArray.push( this.invisibleExceptionCsids[ i ] );
            }
        }
        return returnArray;
    }

    /**
     * Clear visibility
     */
    clearVisibility() {
        this.invisibleCsids.length = 0;
        this.invisibleExceptionCsids.length = 0;
        this.invisiblePartitionIds.length = 0;
        this.invisibleExceptionPartitionIds.length = 0;
    }
}
