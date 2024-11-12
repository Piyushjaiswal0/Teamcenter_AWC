import AwButton from 'viewmodel/AwButtonViewModel';
import AwListbox from 'viewmodel/AwListboxViewModel';
import AwTypeSelector from 'viewmodel/AwTypeSelectorViewModel';
import AwPanelBody from 'viewmodel/AwPanelBodyViewModel';
import AwSourceEditor from 'viewmodel/AwSourceEditorViewModel';
import AwToolbar from 'viewmodel/AwToolbarViewModel';
import AwTextbox from 'viewmodel/AwTextboxViewModel';
import localStorage from 'js/localStorage';
import soaService from 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';
import configurationService from 'js/configurationService';
import cmm from 'soa/kernel/clientMetaModel';
import messageService from 'js/messagingService';
import xrtEditorUtils from 'js/xrtEditorUtilities';
import _ from 'lodash';

const defaultXRT = '%3C?xml%20version=%221.0%22%20encoding=%22UTF-8%22?%3E%0A%3C!--%20Empty%20Rendering%20--%3E%0A%3Crendering%3E%0A%3C/rendering%3E';

export const awXrtEditorOnMount = ( data ) => {
    localStorage.subscribe( 'getDeclStyleSheet', function( event ) {
        const stylesheetContext = JSON.parse( event.newValue );
        loadXRTFromContext( data, stylesheetContext );
    } );
    const editor = {
        readOnlyConfig: {
            theme: 'vs',
            options: {
                readOnly: true,
                wordWrap: 'off',
                lineNumbers: 'on',
                automaticLayout: true,
                minimap: {},
                formatOnType: true,
                fontFamily: 'monospace'
            }
        },
        config: {
            language: 'html',
            theme: 'vs',
            options: {
                readOnly: false,
                wordWrap: 'off',
                lineNumbers: 'on',
                automaticLayout: true,
                minimap: {},
                formatOnType: true,
                fontFamily: 'monospace'
            }
        },
        update: function( newContent ) {
            data.dispatch( { path: 'data.newContent', value: newContent } );
        }

    };
    data.dispatch( { path: 'data.editor', value: editor } );

    let locationList = [];
    let sublocationList = [];
    // Add special case locations and sublocations
    locationList.push( {
        propDisplayValue: 'showObjectLocation',
        propInternalValue: 'showObjectLocation'
    } );
    sublocationList.push( {
        propDisplayValue: 'objectNavigationSubLocation',
        propInternalValue: 'objectNavigationSubLocation'
    } );
    sublocationList.push( {
        propDisplayValue: 'OccurrenceManagementSubLocation',
        propInternalValue: 'OccurrenceManagementSubLocation'
    } );
    configurationService.getCfg( 'states' ).then( function( states ) {
        for( const name in states ) {
            const state = states[name];
            if( state && state.type ) {
                if( state.type === 'location' ) {
                    const locationName = name.substring( name.lastIndexOf( '_' ) + 1 );
                    locationList.push( {
                        propDisplayValue: locationName,
                        propInternalValue: locationName,
                        propDisplayDescription: '',
                        hasChildren: false,
                        children: {},
                        sel: false
                    } );
                } else if( state.type === 'subLocation' ) {
                    const sublocationName = name.substring( name.lastIndexOf( '_' ) + 1 );
                    sublocationList.push( {
                        propDisplayValue: sublocationName,
                        propInternalValue: sublocationName,
                        propDisplayDescription: '',
                        hasChildren: false,
                        children: {},
                        sel: false
                    } );
                }
            }
        }
        data.dispatch( { path: 'data.locationList', value: locationList } );
        data.dispatch( { path: 'data.sublocationList', value: sublocationList } );
        data.dispatch( { path: 'data.content', value: decodeURI( defaultXRT ) } );
    } );
};

export const awXrtEditorOnUnMount = () => {
    localStorage.removeItem( 'getStyleSheet' );
};

export const awXrtEditorRenderFunction = ( props ) => {
    const { viewModel, fields, actions, i18n } = props;
    let { data } = viewModel;
    let sourceEditor;
    if( data.editor && data.content ) {
        sourceEditor = <AwSourceEditor name='awXrtEditor' value={data.content} update={data.editor.update}
            config={ data.editing ? data.editor.config : data.editor.readOnlyConfig }></AwSourceEditor>
        ;
    }
    return data.editor && data.content && <AwPanelBody>
        <div className='sw-row aw-layout-workareaCommandbar aw-theme-toolbar'>
            {
                <AwToolbar overflow={false} context={ data } firstAnchor='' secondAnchor='aw_xrteditor' reverseSecond orientation='HORIZONTAL'></AwToolbar>
            }
        </div>
        <div className='sw-row aw-xrteditor-header'>
            <span className='aw-xrteditor-listboxLabel'>{i18n.scopeLabel}</span>
            <AwListbox className='aw-xrteditor-listbox' {...fields.scopeListBox} list={data.scopeValues.dbValue} action={actions.updateScope}></AwListbox>
            <span className='aw-xrteditor-listboxLabel'>{i18n.objectTypeLabel}</span>
            <AwTypeSelector { ...fields.objectTypeListBox } include={'WorkspaceObject'} load-sub-types={true} overrideId={'XRTEditor'}></AwTypeSelector>
            <span className='aw-xrteditor-listboxLabel'>{i18n.xrtTypeLabel}</span>
            <AwListbox className='aw-xrteditor-listbox' {...fields.xrtTypeListBox} list={data.xrtTypeValues.dbValue}></AwListbox>
            <span className='aw-xrteditor-listboxLabel'>{i18n.locationLabel}</span>
            <AwListbox className='aw-xrteditor-listbox' {...fields.locationListBox} list={data.locationList}></AwListbox>
            <span className='aw-xrteditor-listboxLabel'>{i18n.sublocationLabel}</span>
            <AwListbox className='aw-xrteditor-listbox' {...fields.sublocationListBox} list={data.sublocationList}></AwListbox>
            { ( data.scopeListBox.dbValue !== data.scope || data.xrtTypeListBox.dbValue !== data.xrtType
            || data.objectTypeListBox.dbValue !== data.objectType || data.locationListBox.dbValue !== data.location
            || data.sublocationListBox.dbValue !== data.sublocation )  && <AwButton buttonType='base' class='small' action={actions.loadXRT}>{i18n.loadButtonText}</AwButton>
            }
        </div>
        <div className='sw-row aw-layout-panelTitle'>
            { data.editing ?  <span className='aw-xrteditor-textboxLabel' title='Edit'>{i18n.editLabel}</span>
                :  <span className ='aw-xrteditor-textboxLabel' title='Edit'>{data.datasetName} {i18n.readOnlyLabel}</span> }
            { data.editing &&  <AwTextbox className='aw-xrteditor-textbox flex-auto' {...fields.datasetNameTextBox}></AwTextbox> }
        </div>
        <div className='sw-row flex-auto aw-xrteditor'>
            {
                sourceEditor ? sourceEditor : ''
            }
        </div>
    </AwPanelBody>;
};

export const startEdit = ( data, groupName, userName ) => {
    let result = {
        editing: true,
        scopeListBox: data.scopeListBox,
        datasetNameTextBox: data.datasetNameTextBox
    };

    if( groupName !== 'dba' && data.scopeListBox.dbValue !== 'User' ) {
        result.scopeListBox.dbValue = 'User';
        result.scopeListBox.uiValue = 'User';
        result.datasetNameTextBox.dbValue = data.datasetName + '_' + userName;
        result.datasetNameTextBox.uiValue = data.datasetName + '_' + userName;
        result.datasetNameTextBox.dirty = false;
    }

    return result;
};

export const cancelEdit = ( data ) => {
    data.scopeListBox.dbValue = data.scope;
    data.scopeListBox.uiValue = data.scope;
    return {
        editing: false,
        newContent: data.content,
        scopeListBox: data.scopeListBox
    };
};

export const saveEdit = ( data ) => {
    let deferred = AwPromiseService.instance.defer();
    let result = {
        editing: false,
        content: data.content,
        datasetName: data.datasetName,
        scope: data.scope
    };
    const request = {
        dsInfo: {
            datasetObject: data.datasetName === data.datasetNameTextBox.dbValue ? data.datasetObject : { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' },
            stylesheetContext: {
                client: 'AWC',
                datasetName: data.datasetNameTextBox.dbValue,
                location: data.locationListBox.dbValue,
                sublocation: data.sublocationListBox.dbValue,
                preferenceLocation: data.scopeListBox.dbValue,
                stylesheetType: data.xrtTypeListBox.dbValue,
                type: data.objectTypeListBox.dbValue
            },
            injectedByDatasetName: {},
            injectedByPreference: {},
            xrt: data.newContent
        }
    };
    soaService.postUnchecked( 'Internal-AWS2-2016-03-DataManagement', 'saveXRT', request ).then(
        function( serviceData ) {
            if( serviceData.partialErrors ) {
                processPartialErrors( serviceData );
            } else {
                result.content = data.newContent;
                result.datasetName = data.datasetNameTextBox.dbValue;
                result.scope = data.scopeListBox.dbValue;
                if( serviceData.created ) {
                    result.datasetObject = serviceData.modelObjects[ serviceData.created[0] ];
                } else {
                    result.datasetObject = data.datasetObject;
                }
            }
            deferred.resolve( result );
        } );

    return deferred.promise;
};

/**
 * Process the partial error in SOA response if there are any.
 *
 * @param {serviceData} serviceData - service data of createOrUpdateNotificationRules
 */
function processPartialErrors( serviceData ) {
    let msgObj = {
        msg: '',
        level: 0
    };

    if( serviceData.partialErrors ) {
        for( let inx = 0; inx < serviceData.partialErrors[ 0 ].errorValues.length; inx++ ) {
            msgObj.msg += serviceData.partialErrors[ 0 ].errorValues[ inx ].message;
            msgObj.msg += '<BR/>';
            msgObj.level = _.max( [ msgObj.level, serviceData.partialErrors[ 0 ].errorValues[ inx ].level ] );
        }
        messageService.showError( msgObj.msg );
    }
}

export const loadXRTFromContext = ( data, context ) => {
    let deferred = AwPromiseService.instance.defer();
    xrtEditorUtils.loadXRTFromContext( context ).then( function( stylesheetContext ) {
        loadXRT( data, stylesheetContext.type, stylesheetContext.stylesheetType, stylesheetContext.preferenceLocation,
            stylesheetContext.client, stylesheetContext.location, stylesheetContext.sublocation ).then( function() {
            deferred.resolve();
        } );
    }, function() {
        deferred.resolve();
    } );
    return deferred.promise;
};

export const loadXRT = ( data, type, stylesheetType, preferenceLocation, client, location, sublocation ) => {
    let deferred = AwPromiseService.instance.defer();
    xrtEditorUtils.loadXRT( type, stylesheetType, preferenceLocation, client, location, sublocation ).then(
        function( dsInfo ) {
            data.dispatch( { path: 'data.editing', value: false } );
            if( data.datasetObject.uid !== dsInfo.datasetObject.uid ) {
                data.dispatch( { path: 'data.datasetObject', value: dsInfo.datasetObject } );
            }

            if( data.datasetName !== dsInfo.stylesheetContext.datasetName ) {
                data.dispatch( { path: 'data.datasetName', value: dsInfo.stylesheetContext.datasetName } );
            }

            if( data.datasetNameTextBox.dbValue !== dsInfo.stylesheetContext.datasetName ) {
                data.datasetNameTextBox.dbValue = dsInfo.stylesheetContext.datasetName;
                data.datasetNameTextBox.uiValue = dsInfo.stylesheetContext.datasetName;
                data.dispatch( { path: 'data.datasetNameTextBox', value: data.datasetNameTextBox } );
            }

            if( data.content !== dsInfo.xrt ) {
                data.dispatch( { path: 'data.content', value: dsInfo.xrt !== '' ?  dsInfo.xrt : decodeURI( defaultXRT ) } );
            }

            if( data.scope !== dsInfo.stylesheetContext.preferenceLocation ) {
                data.dispatch( { path: 'data.scope', value: dsInfo.stylesheetContext.preferenceLocation } );
            }

            if( data.scopeListBox.dbValue !== dsInfo.stylesheetContext.preferenceLocation ) {
                data.scopeListBox.dbValue = dsInfo.stylesheetContext.preferenceLocation;
                data.scopeListBox.uiValue = dsInfo.stylesheetContext.preferenceLocation;
                data.dispatch( { path: 'data.scopeListBox', value: data.scopeListBox } );
            }

            if( data.xrtType !== dsInfo.stylesheetContext.stylesheetType ) {
                data.dispatch( { path: 'data.xrtType', value: dsInfo.stylesheetContext.stylesheetType } );
            }

            if( data.xrtTypeListBox.dbValue !== dsInfo.stylesheetContext.stylesheetType ) {
                data.xrtTypeListBox.dbValue = dsInfo.stylesheetContext.stylesheetType;
                data.xrtTypeListBox.uiValue = dsInfo.stylesheetContext.stylesheetType;
                data.dispatch( { path: 'data.xrtTypeListBox', value: data.xrtTypeListBox } );
            }

            if( data.objectType !== dsInfo.stylesheetContext.type ) {
                data.dispatch( { path: 'data.objectType', value: dsInfo.stylesheetContext.type } );
            }

            if( data.objectTypeListBox.dbValue !== dsInfo.stylesheetContext.type ) {
                data.objectTypeListBox.dbValue = dsInfo.stylesheetContext.type;
                const modelType = cmm.getType( dsInfo.stylesheetContext.type );
                data.objectTypeListBox.uiValue = modelType ? modelType.displayName : dsInfo.stylesheetContext.type;
                data.dispatch( { path: 'data.objectTypeListBox', value: data.objectTypeListBox } );
            }

            if( data.location !== dsInfo.stylesheetContext.location ) {
                data.dispatch( { path: 'data.location', value: dsInfo.stylesheetContext.location } );
            }

            if( data.locationListBox.dbValue !== dsInfo.stylesheetContext.location ) {
                data.locationListBox.dbValue = dsInfo.stylesheetContext.location;
                data.locationListBox.uiValue = dsInfo.stylesheetContext.location;
                data.dispatch( { path: 'data.locationListBox', value: data.locationListBox } );
            }

            if( data.sublocation !== dsInfo.stylesheetContext.sublocation ) {
                data.dispatch( { path: 'data.sublocation', value: dsInfo.stylesheetContext.sublocation } );
            }

            if( data.sublocationListBox.dbValue !== dsInfo.stylesheetContext.sublocation ) {
                data.sublocationListBox.dbValue = dsInfo.stylesheetContext.sublocation;
                data.sublocationListBox.uiValue = dsInfo.stylesheetContext.sublocation;
                data.dispatch( { path: 'data.sublocationListBox', value: data.sublocationListBox } );
            }
            deferred.resolve( dsInfo );
        },
        function() {
            deferred.resolve();
        } );

    return deferred.promise;
};
