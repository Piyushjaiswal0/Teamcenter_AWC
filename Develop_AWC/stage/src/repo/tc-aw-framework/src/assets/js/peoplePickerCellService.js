// Copyright (c) 2022 Siemens

import AwModelIcon from 'viewmodel/AwModelIconViewModel';
import AwDefaultCellContent from 'viewmodel/AwDefaultCellContentViewModel';
import cdm from 'soa/kernel/clientDataModel';
import AwAvatar from 'viewmodel/AwAvatarViewModel';
import awIconSvc from 'js/awIconService';
import dataManagementService from 'soa/dataManagementService';
import policySvc from 'soa/kernel/propertyPolicyService';

export const awPeoplePickerCellRenderFunction = ( props ) => {
    let { item, vmo, hideoverlay, thumbnailURL, userName } = props; //Assume item is ViewModelObject (VMO)

    if( !item && props && props.subPanelContext && props.subPanelContext.vmo ) {
        item = props.subPanelContext.vmo;
    }

    if ( !item && props.vmo ) {
        item = props.vmo;
    }

    if ( item.type === 'GroupMember' && !item.props.user ) {
        var policy = {
            types: [ {
                name: 'GroupMember',
                properties: [
                    {
                        name: 'user',
                        modifiers:
                         [
                             {
                                 name: 'withProperties',
                                 Value: 'true'
                             }
                         ]
                    }
                ]
            },
            {
                name: 'User',
                properties: [
                    {
                        name: 'person'
                    }
                ]
            } ]

        };

        policySvc.register( policy );
        dataManagementService.getProperties( [ item.uid ], [ 'user_name' ] ).then( function() {
            policySvc.unregister( policy );
            return _peoplePickerCellRenderReturnValue( item, props );
        } );
    } else {
        return _peoplePickerCellRenderReturnValue( item, props );
    }
};

export const _peoplePickerCellRenderReturnValue = function( item, props ) {
    var thumbnailURL = getThumbnail( item );
    if ( thumbnailURL && item.type === 'GroupMember' ) {
        item.hasThumbnail = true;
        item.thumbnailURL = thumbnailURL;
    }

    var hideoverlay = true;
    if( !item ) { return; }

    var userName = getUserName( item );

    if ( thumbnailURL && item.type === 'GroupMember' ) {
        item.hasThumbnail = true;
        item.thumbnailURL = thumbnailURL;
    }

    if ( item.type === 'GroupMember' || item.type === 'User' ) {
        return (
            <div className = 'aw-default-cell sw-row'>
                <div className='aw-widgets-cellListCellImage'>
                    <AwAvatar size='small' source={thumbnailURL} initials={userName}></AwAvatar>
                </div>
                <AwDefaultCellContent vmo={item}></AwDefaultCellContent>
            </div>
        );
    }
    return (
        <div className = 'aw-default-cell sw-row'>
            <div className='sw-cell-image'>
                <AwModelIcon vmo={item} hideoverlay={hideoverlay}></AwModelIcon>
            </div>
            <AwDefaultCellContent vmo={item}></AwDefaultCellContent>
        </div>
    );
};

export let getUserName = function( vmo ) {
    if ( vmo.type === 'GroupMember' ) {
        if ( vmo && vmo.props && vmo.props.user ) {
            const userModelObject = cdm.getObject( vmo.props.user.dbValues[0] );
            if ( userModelObject && userModelObject.props && userModelObject.props.person && userModelObject.props.person.uiValues ) {
                return userModelObject.props.person.uiValues[0];
            }
        }
    } else if ( vmo.type === 'User' ) {
        return vmo.props.user_name.uiValues[ 0 ];
    }
};

export let getThumbnail = function( vmo ) {
    //if the user is missing from the GroupMember, fetch it from the server
    if ( vmo.type === 'GroupMember' ) {
        if ( vmo && vmo.props && vmo.props.user ) {
            const userModelObject = cdm.getObject( vmo.props.user.dbValues[0] );
            if ( userModelObject ) {
                return awIconSvc.getThumbnailFileUrl( userModelObject );
            }
        }
    } else if ( vmo.type === 'User' ) {
        return vmo.thumbnailURL;
    }
};
