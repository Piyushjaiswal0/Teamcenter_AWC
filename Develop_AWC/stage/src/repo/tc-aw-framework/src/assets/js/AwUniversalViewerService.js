// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

import AwIconButton from 'viewmodel/AwIconButtonViewModel';
import AwInclude from 'viewmodel/AwIncludeViewModel';
import AwModelThumbnail from 'viewmodel/AwModelThumbnailViewModel';
import AwPanel from 'viewmodel/AwPanelViewModel';
import appCtxService from 'js/appCtxService';

// Temporary imports which will be removed later
import adapterSvc from 'js/adapterService';

/**
 * Gets the selection object for getViewerData call from subpanelcontext
 * @param {Object} subPanelContext the subpanelContext
 * @returns {Object} the selection object
 */
export const getSelectionFromContext = function( subPanelContext ) {
    const swaSelectData = subPanelContext.selectionData && subPanelContext.selectionData.value && subPanelContext.selectionData.value.selected;
    let selected;
    if( !( swaSelectData && swaSelectData.length > 0 ) ) {
        // No SWA selection, go by PWA
        selected = subPanelContext.selected;
    } else {
        // SWA selection
        selected = swaSelectData[ 0 ];
        // temporary work around to adapt object at UV layer, which will be removed once Nihar's change is reworked and goes in.
        if( selected.type === 'Awp0XRTObjectSetRow' ) {
            selected = adapterSvc.getAdaptedObjectsSync( [ selected ] )[ 0 ];
        }
    }
    return selected;
};

/**
 * Gets the named reference data based on if viewer should use multiple named references
 * @param {Boolean} useMultNamedRefs should multiple named references be used
 * @param {Object} fileData The current named reference file
 * @returns {Object|String} the file data if using multiple named references, else empty string
 */
export const getNamedReferenceData = function( useMultNamedRefs, fileData ) {
    if( useMultNamedRefs ) {
        return fileData;
    }
    return '';
};

const uvOnMouseEnter = function( uvRef, chevronsVisible ) {
    if( chevronsVisible ) {
        uvRef.current.classList.add( 'aw-viewerjs-hover' );
    }
};

const uvOnMouseLeave = function( uvRef, chevronsVisible ) {
    if( chevronsVisible ) {
        uvRef.current.classList.remove( 'aw-viewerjs-hover' );
    }
};

/**
 * Render function for universal viewer
 * @param {*} param0 -
 * @returns {JSX.Element} Viewer element
 */
export const awUniversalViewerRenderFn = function( { viewModel, subPanelContext, fields, elementRefList, enableMultipleFilesPerDataset } ) {
    // Build the viewer in pieces to account for exist-whens
    // Get the uv ref
    let uvRef = elementRefList.get( 'uvRef' );
    const viewerData = {
        ...viewModel.viewerData,
        fileVM: viewModel.fileVM ? fields.fileVM : null,
        datasetVM: viewModel.datasetVM ? fields.datasetVM : null,
        headerPropertyNames: viewModel.headerPropertyNames,
        viewerRef: uvRef,
        viewerSizeStateRef: viewModel.atomicDataRef.viewerSizeState,
        parentRef: subPanelContext.parentRef,
        fullScreenState: subPanelContext.fullScreenState
    };
    const fileData = viewerData && viewerData.fileData;
    const viewerName = fileData && fileData.viewer || '';
    const fmsTicket = fileData && fileData.fmsTicket;
    const viewerVisible = viewerName && viewerName !== 'Awp0Preview';
    const namedRefsAvailable = viewerData.hasMoreNamedReferences && enableMultipleFilesPerDataset;
    const chevronsVisible = viewerVisible && ( viewerData.hasMoreDatasets || namedRefsAvailable );

    let viewerElem;
    let atomicViewerData = viewModel.atomicData && viewModel.atomicData.viewerSizeState;

    if( viewerVisible || atomicViewerData && Object.keys( atomicViewerData ).length > 0 ) {
        const leftChevron = <div className='aw-viewerjs-controlArrowContainer aw-viewerjs-controlArrowContainerLeft'>
            <AwIconButton id='Awp0LeftChevron' className='aw-viewerjs-controlArrow aw-viewerjs-leftArrow' command={fields.onPreviousChevronClick}></AwIconButton>
        </div>;
        const rightChevron = <div className='aw-viewerjs-controlArrowContainer aw-viewerjs-controlArrowContainerRight'>
            <AwIconButton id='Awp0RightChevron' className='aw-viewerjs-controlArrow aw-viewerjs-rightArrow' command={fields.onNextChevronClick}></AwIconButton>
        </div>;

        let style = {
            position: 'relative',
            minHeight: '400px'
        };

        if( atomicViewerData && atomicViewerData.viewerHeight ) {
            style.height = atomicViewerData.viewerHeight;
        }

        viewerElem =
            <div className='aw-layout-flexRow aw-viewerjs-elementPosition' style={style} ref={uvRef} onMouseEnter={()=>uvOnMouseEnter( uvRef, chevronsVisible )} onMouseLeave={()=>uvOnMouseLeave( uvRef, chevronsVisible )}>
                { chevronsVisible ? leftChevron : '' }
                <div className='aw-viewerjs-dimensions aw-viewerjs-container'>
                    { viewerVisible ? <AwInclude name={viewerName} subPanelContext={viewerData}></AwInclude> : '' }
                </div>
                { chevronsVisible ? rightChevron : '' }
            </div>;
    }

    let thumbnailElem = '';
    if( fmsTicket === '' || viewerName === 'Awp0Preview' ) {
        let vmo = appCtxService.getCtx( 'selected' );
        thumbnailElem = <AwModelThumbnail vmo={vmo} ></AwModelThumbnail>;
    }

    return (
        <AwPanel className='aw-viewer-gallery'>
            { viewerElem }
            { thumbnailElem }
        </AwPanel>
    );
};

export default {
    getSelectionFromContext,
    getNamedReferenceData,
    awUniversalViewerRenderFn
};
