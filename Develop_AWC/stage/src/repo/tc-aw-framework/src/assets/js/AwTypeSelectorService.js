import _ from 'lodash';
import _cmm from 'soa/kernel/clientMetaModel';
import awIconSvc from 'js/awIconService';
import AwWidget from 'viewmodel/AwWidgetViewModel';
import addObjectUtils from 'js/addObjectUtils';

/**
 * @param {props} props - props of the component
 * @return {string} override value
 */
export const getOverrideId = ( props ) => {
    const {
        overrideId
    } = props;
    return _.isUndefined( overrideId ) ? '' : overrideId;
};

/**
 * @param {props} props - props of the component
 * @return {string} included object types
 */
export const getListOfIncludeObjectTypes = ( props, data ) => {
    const {
        include
    } = props;

    const { preferredTypeTracker } = data;

    return preferredTypeTracker.dbValue ? preferredTypeTracker.dbValue : include;
};

/**
 * @param {props} props - props of the component
 * @return {string} load sub types
 */
export const getLoadSubTypes = ( props, data ) => {
    const {
        loadSubTypes
    } = props;

    const { preferredTypeTracker } = data;

    if( preferredTypeTracker && preferredTypeTracker.dbValue ) {
        return 'false';
    }
    return loadSubTypes === 'false' ? 'false' : 'true';
};

/**
 * @param {props} props - props of the component
 * @param {dataProvider} dataProvider - awTypeSelector dataProvider
 * @param {typeList} typeList - typeList generated from SOA response
 */
export const typeSelectorObjectsUpdated = function( props, dataProvider, typeList, data ) {
    const { autoSelectOnUniqueTypeTracker, preferredTypeTracker } = data;

    let newAutoSelectOnUniqueTypeTracker = { ...autoSelectOnUniqueTypeTracker };
    let newPreferredTypeTracker = { ...preferredTypeTracker };

    if( newAutoSelectOnUniqueTypeTracker.dbValue || newPreferredTypeTracker.dbValue ) {
        if( dataProvider.viewModelCollection.totalFound === 1 ) {
            if( typeList && typeList[ 0 ] ) {
                const lovEntry = typeList[ 0 ];
                props.setLovVal( { lovEntry, dataProvider }, '' );
            }

            dataProvider.selectionModel.setSelection(
                dataProvider.getViewModelCollection().getViewModelObject( 0 ), props );
        }

        // The autoSelectOnUniqueType is valid only first time types are loaded.
        if( newAutoSelectOnUniqueTypeTracker.dbValue ) {
            newAutoSelectOnUniqueTypeTracker.dbValue = false;
        }

        if( newPreferredTypeTracker.dbValue ) {
            // The preferred type is valid only first time you open the panel, when come back to types panel by clicking type( ex. Item )
            // on xrt, it should load the types panel.
            // if we do not delete the declViewModel.preferredType, it will come back to types panel and immediately navigate
            // to preferred type as we have not deleted.
            newPreferredTypeTracker.dbValue = undefined;
            // if( dataprovider.viewModelCollection.totalFound === 0 ) {
            //     dataprovider.action.inputData.searchInput.searchCriteria.loadSubTypes = props.loadSubTypes === false ? 'false' : 'true';
            //     dataprovider.action.inputData.searchInput.searchCriteria.listOfIncludeObjectTypes = props.include;
            //     dataprovider.initialize( props );
            // }
        }
    }

    return {
        autoSelectOnUniqueTypeTracker: newAutoSelectOnUniqueTypeTracker,
        preferredTypeTracker: newPreferredTypeTracker
    };
};

export const convertTypesToLovEntries = function( response ) {
    if( response && response.searchResults && response.searchResults.length > 0 ) {
        return response.searchResults.map( obj => {
            var typeHierarchy = [];
            if( obj ) {
                var type = _cmm.getType( obj.uid );
                if( type ) {
                    typeHierarchy = type.typeHierarchyArray;
                } else {
                    let typeName = obj.props.type_name.dbValue ? obj.props.type_name.dbValue : obj.props.type_name.dbValues[ 0 ];
                    typeHierarchy.push( typeName );
                    var parentTypes = obj.props.parent_types.dbValues;
                    for( var j in parentTypes ) {
                        // parentType is of form "TYPE::Item::Item::WorkspaceObject"
                        var arr = parentTypes[ j ].split( '::' );
                        typeHierarchy.push( arr[ 1 ] );
                    }
                }
            }

            let typeIcon = awIconSvc.getTypeIconFileUrlForTypeHierarchy( typeHierarchy );

            return {
                propInternalValue: obj.uid,
                propDisplayValue: obj.props.object_string.uiValues[ 0 ],
                object: obj,
                iconSource: typeIcon
            };
        } );
    }
    return [];
};

export const loadRecentTypes = async function( prop, data ) {
    const { maxRecentCount, include, overrideId } = prop;
    const { preferredChoices, selectedValueTracker } = data;
    let newPreferredChoices = undefined;

    let forceRefreshFlag = false;
    if( preferredChoices ) {
        forceRefreshFlag = selectedValueTracker.dbValue.length > 0 &&
            ( preferredChoices.length === 0 || preferredChoices[ 0 ].propDisplayValue !== selectedValueTracker.dbValue );
    }

    if( maxRecentCount > 0 && ( !preferredChoices || forceRefreshFlag ) ) {
        let newRecents = ( await addObjectUtils.getRecentUsedTypes( maxRecentCount, include !== undefined ? include : overrideId ) ).preferredChoices;
        newPreferredChoices = newRecents[ 0 ] === undefined ? [] : newRecents;
    }

    return { preferredChoices: newPreferredChoices ? newPreferredChoices : preferredChoices };
};

export const updateVmpFromProps = async function( props, data ) {
    const { autoSelectOnUniqueType, preferredType } = props;

    const { autoSelectOnUniqueTypeTracker, preferredTypeTracker } = data;

    let newAutoSelectOnUniqueTypeTracker = { ...autoSelectOnUniqueTypeTracker };
    let newPreferredTypeTracker = { ...preferredTypeTracker };
    if( autoSelectOnUniqueType || preferredType ) {
        newAutoSelectOnUniqueTypeTracker.dbValue = autoSelectOnUniqueType;
        newPreferredTypeTracker.dbValue = preferredType;
    }

    return {
        autoSelectOnUniqueTypeTracker: newAutoSelectOnUniqueTypeTracker,
        preferredTypeTracker: newPreferredTypeTracker
    };
};

export const validatePropsAndTriggerSoa = function( props, data, initializeSoaAction ) {
    const { autoSelectOnUniqueType, preferredType } = props;
    const { preferredTypeTracker } = data;
    if( autoSelectOnUniqueType || preferredType || preferredTypeTracker.dbValue ) {
        initializeSoaAction();
    }
};

export const getSearchInput = ( props, data ) => {
    let searchInput = {
        attributesToInflate: [ 'parent_types', 'type_name' ],
        internalPropertyName: '',
        maxToLoad: 25,
        maxToReturn: 25,
        providerName: 'Awp0TypeSearchProvider',
        searchCriteria: {
            typeSelectorId: getOverrideId( props ),
            listOfIncludeObjectTypes: getListOfIncludeObjectTypes( props, data ),
            loadSubTypes: getLoadSubTypes( props, data )
        },
        searchFilterFieldSortType: 'Alphabetical',
        searchFilterMap: {},
        searchSortCriteria: []
    };

    if( props.searchInput ) {
        searchInput = props.searchInput;
    }
    let searchVMP = props.__vmprop__();
    searchInput.searchCriteria.searchString = !_.isUndefined( searchVMP ) ? searchVMP.filterString : '';
    searchInput.searchCriteria.defaultType = searchInput.searchCriteria.searchString;
    searchInput.startIndex = data.dataProviders.awTypeSelector.startIndex;

    return searchInput;
};

export const checkAndOpenTypeSelector = ( props ) => {
    const { value, autoOpenOnMount } = props;

    if( !value && autoOpenOnMount === 'true' ) {
        let element = document.querySelector( '#aw_toolsAndInfo .aw-panel-header input.sw-property-val' );
        if( element ) {
            element.click();
        }
    }
};

export const clearOutRecentUsedList = ( selectedValueTracker, preferredChoices, props )=>{
    let newSelectedValueTracker = { ...selectedValueTracker };
    let selectedValue = props.fielddata.uiValue;
    let listToReturn = preferredChoices;
    if( selectedValue && newSelectedValueTracker.dbValue !== selectedValue ) {
        newSelectedValueTracker.dbValue = selectedValue;
        listToReturn = undefined;
    }
    return {
        selectedValueTracker:newSelectedValueTracker,
        preferredChoices: listToReturn };
};

export const awTypeSelectorRenderFunction = ( props ) => {
    const {
        viewModel
    } = props;

    const {
        dataProviders
    } = viewModel;

    let fielddata = { ...props.fielddata };

    if( props && props.fielddata && dataProviders ) {
        fielddata.dataProvider = dataProviders.awTypeSelector;
    }

    let newProps = { ...props, fielddata };

    return <AwWidget {...newProps} ></AwWidget>;
};
