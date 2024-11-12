// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global
 define
 */

/**
 * This Interface defines String constants that identify the Fully Qualified Name (FQN) of client-side and host-side
 * services. The JavaDoc comments define the uses, parameters and return value of these services.
 * <P>
 * Note: **** Changes to this file should also be represented by changes to its 'sibling' host-side file:<BR>
 * <B>com.siemens.splm.browserinterop.infrastructure.services.IInfrastructureServiceConstants</b>
 * <P>
 * Note: The services described here are for the (Internal) purpose of managing message passing or synchronization.
 * <P>
 * Prefix Legend:
 * <UL>
 * <LI>CS - Client-Side service called by the host.</LI>
 * <LI>HS - Host-Side service called by the AW client code (i.e. JavaScript).</LI>
 * </UL>
 *
 * @module js/hosting/hostConst_Services
 *
 * @namespace hostConst_Services
 * @namespace hostConst_Services_Bootstrap
 * @namespace hostConst_Services_Infrastructure
 * @namespace hostConst_Services_Solution
 */

'use strict';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// 'Bootstrap' Level Services
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * --------------------------------------------------------------------<br>
 * Client-Side Services - Associated with a Host-Side 'XXXXXXproxy'<br>
 * --------------------------------------------------------------------<br>
 */

/**
 * Called by the client to have the host return it's information
 * <P>
 * <B>Return:</B> String containing the host session information
 *
 * @see RequestHostAuthReplySvc
 * @see RequestHosthAuthResponseMsg
 * @memberof hostConst_Services_Bootstrap
 */
export let CS_REQUEST_HOST_AUTH_REPLY_SVC = 'splm.browserinterop.infrastructure.services.soa.RequestHostAuthReply.client';

/**
 * Called by the host to return the results of an previously placed (async) SOA call (i.e. request).
 *
 * @memberof hostConst_Services_Bootstrap
 * @see SoaJsonRequestSvc
 * @see SoaJsonRequestMsg
 */
export let CS_SOA_JSON_REQUEST_SVC = 'splm.browserinterop.infrastructure.services.soa.SoaJsonRequest.client';

/**
 * --------------------------------------------------------------------<br>
 * Host-Side Services - Associated with a Client-Side 'XXXXXXXproxy' <br>
 * --------------------------------------------------------------------<br>
 */

/**
 * Called by the client to have the host process a SOA call
 * <P>
 *
 * @memberof hostConst_Services_Bootstrap
 * @see SoaJsonRequestSvc
 */
export let HS_ASYNC_SOA_JSON_MESSAGE_SVC = 'splm.browserinterop.infrastructure.services.soa.AsyncSoaJsonMessage.host';

/**
 * Called by the client to announce changes in it's state.
 * <P>
 * See hostCore_2014_07:ClientStatusProxy
 * @memberof hostConst_Services_Bootstrap
 */
export let HS_CLIENT_STATUS_SVC = 'splm.browserinterop.infrastructure.services.core.ClientStatus.host';

/**
 * This service is used to indicate that the host-side (or client-side) has completed its part of the host-client
 * handshake.
 * <P>
 * Note: Because of some confusion in the Michigan (aw2.1) time frame, the same service name was used for both a
 * host-side and a client-side service even though the ID policy of the service indicates it being a host-side
 * service (i.e. it ends with xxxx.host). Instead of changing the name of the client-side implementation and
 * complicating access to older client servers by newer hosts, we will keep the ID the same.
 * <P>
 * Host-Side Service:<BR>
 * Called by the client to notify the host that the client has completed authentication/login.
 * <P>
 * Client-Side Service:<BR>
 * Called by the host when its handshake with the client has been successfully started up. It is used to signal the
 * client that the host is ready and that the client should proceed with logging in.
 * <P>
 * Note: No parameters are passed to the host (opr client).
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Bootstrap
 * @see StartupNotificationSvc
 */
export let HS_CS_STARTUP_NOTIFICATION_SVC = 'splm.browserinterop.infrastructure.services.startup.StartupNotification.host';

/**
 * Called by the client to have the host return it's host configuration
 *
 * @memberof hostConst_Services_Bootstrap
 * @see RequestHostConfigProxy
 * @see RequestHostConfigResponseMsg
 */
export let HS_HOST_CONFIGURATION_SVC = 'splm.browserinterop.infrastructure.services.core.HostConfiguration.host';

/**
 * Called by the client to have the host return it's session information
 * <P>
 * <B>Return:</B> String containing the host session information
 *
 * @memberof hostConst_Services_Bootstrap
 * @see HostSessionInfoProxy
 */
export let HS_HOST_SESSION_INFO_SVC = 'splm.browserinterop.infrastructure.services.soa.HostSessionInfo.host';

/**
 * Called by the client to send logger messages to the host
 * <P>
 * <B>Return:</B> (none) See hostLogging_2014_02:LoggerForwardProxy
 * @memberof hostConst_Services_Bootstrap
 */
export let HS_LOGGER_FORWARD_SVC = 'splm.browserinterop.infrastructure.services.LoggerForward.host';

/**
 * Called by the client to have the host return authorization
 * <P>
 *
 * @memberof hostConst_Services_Bootstrap
 * @see RequestHostAuthReplySvc
 */
export let HS_REQUEST_HOST_AUTH_SVC = 'splm.browserinterop.infrastructure.services.soa.RequestHostAuth.host';

/**
 * --------------------------------------------------------------------<br>
 * URI Parameter Constants<br>
 * --------------------------------------------------------------------<br>
 */

/**
 * Name of the URI 'query' parameter holding the desired hosting connection type. The value can be 'true' or
 * 'false'.
 * <P>
 * Note: If not present in the URI the default is 'false'.
 * @memberof hostConst_Services_Bootstrap
 */
export let URI_QUERY_PARAM_HOSTING_ENABLED = 'ah';

/**
 * Name of the URI 'query' parameter indicating if the normal startup timeout (i.e. time limiting) check should be
 * disabled.
 * <P>
 * The value can be 'true' or 'false'.<BR>
 * If 'true', the host can take as much time as it wants to perform its handshake before it calls
 * {@link hostConst_Services_Bootstrap.HS_CS_STARTUP_NOTIFICATION_SVC} event. <BR>
 * If 'false', there is a limited amount of time allowed before an exceptions will be thrown by the
 * {@link StartupNotificationSvc}.
 * <P>
 * Note: If not present in the URI the default is 'false'.
 * @memberof hostConst_Services_Bootstrap
 */
export let URI_QUERY_PARAM_HOSTING_TIMER_DISABLED = 'ahnotimer';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// 'Infrastructure' Level Services
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * --------------------------------------------------------------------<br>
 * Client-Side Services - Associated with a Host-Side 'XXXXXXproxy'<br>
 * --------------------------------------------------------------------<br>
 */

/**
 * Called by the host to have the client return available themes
 * <P>
 * <B>Return:</B> Returns a list of themes
 * <P>
 * see GetAvailableThemesSvc
 *
 * @memberof hostConst_Services_Infrastructure
 */
export let CS_GET_AVAILABLE_THEMES_SVC = 'splm.browserinterop.infrastructure.services.theme.GetAvailableThemes.client';

/**
 * Called by the host to request information about the client
 * <P>
 * <B>Return:</B> Returns a list of {@link Pair} objects with information about the client.
 *
 * @see ClientInfoSvc
 * @see BaseKeyValueMessage
 * @memberof hostConst_Services_Infrastructure
 */
export let CS_GET_CLIENT_INFO_SVC = 'splm.browserinterop.infrastructure.services.clientinfo.ClientInfo.client';

/**
 * Called by the host to have the client perform a refresh
 * <P>
 * <B>Param:</B> String name of the theme to be used
 * <P>
 * <B>Return:</B> (none)
 *
 * @see RefreshSvc
 * @memberof hostConst_Services_Infrastructure
 */
export let CS_REFRESH_SVC = 'splm.browserinterop.infrastructure.services.refresh.Refresh.client';

/**
 * Called by the host to pass it's current selection to the client
 * <P>
 * <B>Param:</B> Host selection
 * <P>
 * <B>Return:</B> (none)
 * <P>
 * see SelectionListener
 *
 * @memberof hostConst_Services_Infrastructure
 */
export let CS_SELECTION_LISTENER_SVC = 'splm.browserinterop.solutions.services.selection.SelectionListener.client';

/**
 * Called by the host to have the client update session information
 * <P>
 * <B>Param:</B> SessionMsg
 * <P>
 * <B>Return:</B> (none)
 *
 * @see SessionSvc
 * @memberof hostConst_Services_Infrastructure
 */
export let CS_SESSION_SVC = 'splm.browserinterop.infrastructure.services.session.Session.client';

/**
 * Called by the host to have the client set a theme
 * <P>
 * <B>Param:</B> String name of the theme to be used
 * <P>
 * <B>Return:</B> (none)
 * <P>
 * see SetThemeSvc
 *
 * @memberof hostConst_Services_Infrastructure
 */
export let CS_SET_THEME_SVC = 'splm.browserinterop.infrastructure.services.theme.SetTheme.client';

/**
 * --------------------------------------------------------------------<br>
 * Host-Side Services - Associated with a Client-Side 'XXXXXXXproxy' <br>
 * --------------------------------------------------------------------<br>
 */

/**
 * Called by the client to have the host refresh changed objects
 * <P>
 * <B>Param:</B> List of InteropObjectRef objects that were created <br>
 * <B>Param:</B> List of InteropObjectRef objects that were deleted <br>
 * <B>Param:</B> List of InteropObjectRef objects that were updated <br>
 * <P>
 * <B>Return:</B> (none)
 *
 * @see RefreshProxy
 * @memberof hostConst_Services_Infrastructure
 */
export let HS_REFRESH_SVC = 'splm.browserinterop.infrastructure.services.refresh.Refresh.host';

/**
 * Called by the client to send selections to the host
 * <P>
 * <B>Return:</B> (none)
 *
 * @see SelectionProviderProxy
 * @memberof hostConst_Services_Infrastructure
 */
export let HS_SELECTION_PROVIDER_SVC = 'splm.browserinterop.solutions.services.selection.SelectionProvider.host';

/**
 * Called by the client to have the host update session information
 * <P>
 * <B>Param:</B> SessionMsg
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Infrastructure
 */
export let HS_SESSION_SVC = 'splm.browserinterop.infrastructure.services.session.Session.host';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// 'Solution' Level Services
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * --------------------------------------------------------------------<br>
 * Client-Side Services - Associated with a Host-Side 'XXXXXXproxy'<br>
 * --------------------------------------------------------------------<br>
 */

/**
 * Called by the host to set the client component configuration
 * <P>
 * <B>Param:</B> String name of the component id
 * </P>
 * <B>Return:</B> (none)
 * </P>
 *
 * @memberof hostConst_Services_Solution
 * @see ComponentConfigSvc
 */
export let CS_COMPONENTCONFIG_SERVICE = 'splm.browserinterop.services.component.ComponentConfig.client';

/**
 * Called by the host to have the client generate a url to upload/download a file
 * <P>
 * <B>Param:</B> {@link InteropObjectRef} associated object <B>Param:</B> Download boolean upload or download
 * fileticket
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see GetTicketSvc
 */
export let CS_GET_FILE_TICKET = 'splm.browserinterop.solutions.services.fileticket.GetTicket.client';

/**
 * Called by the client to request file upload
 * <P>
 * <B>Param:</B> Payload Information contains write ticket and file details
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 */
export let CS_FILE_UPLOAD_SVC = 'splm.browserinterop.solutions.services.fileupload.FileUpload.host';

/**
 * Called by the host to get preferences
 * <P>
 * <B>Param:</B> {@link GetPreferencesMsg} Which preferences to retrieve
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 */
export let CS_GET_PREFERENCES_SVC = 'splm.browserinterop.solutions.services.preferences.GetPreferences.client';

/**
 * Called by the host to have the client perform a search
 * <P>
 * <B>Param:</B> String with search critera
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see InitiateSearchSvc
 */
export let CS_INITIATE_SEARCH = 'splm.browserinterop.solutions.services.search.InitiateSearch.client';

/**
 * Called by the host to query information from the client {@link HostQueryMessage}
 * <P>
 * <B>Param:</B> Queries to perform
 * <P>
 * <B>Return:</B> Query responses
 *
 * @memberof hostConst_Services_Solution
 */
export let CS_INTEROPQUERY_SVC = 'splm.browserinterop.solutions.services.interopquery.InteropQuery.client';

/**
 * Called by the host to create an IssueReport object
 * <P>
 * <B>Param:</B> HostRequestKey - host supplied key used to identify the command request.
 * <P>
 * <B>Param:</B> IssueCommand the command to execute.
 * <P>
 * <B>Param:</B> CommandArguments - command arguments in the form of Key/value pairs
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 */
export let CS_ISSUES_EXECUTECOMMAND_SVC = 'splm.browserinterop.solutions.services.issues.ExecuteCommand.client';

/**
 * Called by the host to set the input for the object info component.
 * <P>
 * <B>Param:</B> {@link InteropObjectRef} to be shown
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see ObjectInfoComponentInputSvc
 */
export let CS_OBJECTINFO_COMPONENT_INPUT_SVC = 'splm.browserinterop.services.component.ObjectInfoComponentInput.client';

/**
 * Called to open a location on the client application
 * <P>
 * <B>Param:</B> String name of the location to be opened
 * <P>
 * <B>Return:</B> (none)
 *
 * @see OpenLocationSvc
 * @memberof hostConst_Services_Solution
 */
export let CS_OPEN_LOCATION_SERVICE = 'splm.browserinterop.infrastructure.services.openlocation.OpenLocation.client';

/**
 * Called by the host to have the client add or remove items from it's clipboard
 * <P>
 * <B>Param:</B> List of {@link InteropObjectRef} to be added <B>Param:</B> List of {@link InteropObjectRef}
 * to be removed
 * <P>
 * <B>Return:</B> (none)
 *
 * @see RemoteClipboardSvc
 * @memberof hostConst_Services_Solution
 */
export let CS_REMOTE_CLIPBOARD_SERVICE = 'splm.browserinterop.services.clipboard.RemoteClipboard.client';

/**
 * Called by the host to set an app context value
 * <P>
 * <B>Param:</B> {@link SetAppContextMsg} message what context to set, and what value to give it
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 */
export let CS_SET_APP_CONTEXT_SVC = 'splm.browserinterop.solutions.services.preferences.SetAppContext.client';

/**
 * Called by the host to have the client show the summary view with {@link InteropObjectRef} item
 * <P>
 * <B>Param:</B> {@link InteropObjectRef} to be shown
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see ShowSummarySvc
 */
export let CS_SHOW_SUMMARY = 'splm.browserinterop.solutions.services.open.Summary.client';

/**
 * Called by the host to display a message to the user
 * <P>
 * <B>Param:</B> {@link UserMessagingMsg} message indicating what to display to the user
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 */
export let CS_USER_MESSAGING_SVC = 'splm.browserinterop.solutions.services.preferences.UserMessaging.client';

/**
 * Called by the host to set the input for the new workflow process component.
 * <P>
 * <B>Param:</B> {@link InteropObjectRef} to be shown
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see WorkflowComponentInputSvc
 */
export let CS_WORKFLOW_COMPONENT_INPUT_SVC = 'splm.browserinterop.services.component.WorkflowComponentInput.client';

/**
 * Called by the host to set the input for the new discuss process component.
 * <P>
 * <B>Param:</B> {@link InteropObjectRef} to be shown
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see DiscussionComponentInputSvc
 */
export let CS_DISCUSSION_COMPONENT_INPUT_SVC = 'splm.browserinterop.services.component.DiscussionComponentInput.client';

/**
 * Called by the host to open a panel in the client
 * <P>
 * <B>Param:</B> {@link OpenPanelMsg} message indicating which panel to open, and in what location
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see hostOpenPanel_2019_12
 */
export let CS_OPEN_PANEL_SVC = 'splm.browserinterop.services.component.OpenPanel.client';

/**
 * Called by the host to set the input for the advanced filter component.
 * <P>
 * <B>Param:</B> {@link InteropObjectRef} to be shown
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see AdvancedFilterComponentInputSvc
 */
export let CS_ADVANCED_FILTER_COMPONENT_INPUT_SVC = 'splm.browserinterop.services.component.AdvancedFilterComponentInput.client';

/**
 * Called by the host to set input to Study Manager
 * <P>
 * <B>Param:</B> {@link StudyMangerInputMsg} message indicating which panel to open, and in what location
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostSetInputToStudyMgrService
 * @see hostSetInputToStudyMgrService
 */
export let CS_INPUT_STUDY_MANAGER_SVC = 'com.siemens.splm.tcmaccess.SetInputToStudyManager.client';
/**
 * --------------------------------------------------------------------<br>
 * Host-Side Services - Associated with a Client-Side 'XXXXXXXproxy' <br>
 * --------------------------------------------------------------------<br>
 */

/**
 * Called by the client to tell the host about drag and drop events
 * <P>
 * <B>Param:</B> {@link DragAndDropMsg} Information about the drag and drop event that has occurred
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 */
export let HS_DRAG_AND_DROP_SVC = 'splm.browserinterop.solutions.services.dragAndDrop.DragAndDrop.host';

/**
 * Called with the requested ticket information
 * <P>
 * <B>Param:</B> URL to be used in the file operation
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see GetTicketResponseProxy
 */
export let HS_FMS_UPLOAD = 'splm.browserinterop.solutions.services.fmsupload.FmsUpload.host';

/**
 * Called by the client to return the result of a preference request from the host.
 * <P>
 * <B>Param:</B> {@link DragAndDropMsg} Information about the drag and drop event that has occurred
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 */
export let HS_GET_PREFERENCES_RESPONSE_SVC = 'splm.browserinterop.solutions.services.preferences.GetPreferencesResponse.host';

/**
 * Called with the requested ticket information
 * <P>
 * <B>Param:</B> URL to be used in the file operation
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see GetTicketResponseProxy
 */
export let HS_GET_TICKET_RESPONSE = 'splm.browserinterop.solutions.services.fileticket.GetTicketResponse.host';

/**
 * Called to add a component on the host app
 * <P>
 * <B>Param:</B> {@link InteropObjectRef} to be added <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see HostAddComponentProxy
 */
export let HS_HOST_ADD_COMPONENT = 'splm.browserinterop.solutions.services.open.HostAddComponent.host';

/**
 * Called to checkin/checkout a component on the host app
 * <P>
 * <B>Param:</B> {@link InteropObjectRef} to be opened <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see HostCheckinCheckoutProxy
 */
export let HS_HOST_CHECKIN_CHECKOUT = 'splm.browserinterop.solutions.services.checkinCheckout.HostCheckinCheckout.host';

/**
 * Called to open a URL on the host app
 * <P>
 * <B>Param:</B> URL to be opened
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see HostOpenURLProxy
 */
export let HS_HOST_FEEDBACK = 'splm.browserinterop.solutions.services.feedback.HostFeedback.host';

/**
 * Called to open a component on the host app
 * <P>
 * <B>Param:</B> {@link InteropObjectRef} to be opened <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see HostOpenProxy
 */
export let HS_HOST_OPEN = 'splm.browserinterop.solutions.services.open.HostOpen.host';

/**
 * Called by the client to have the host open a new view of Active Workspace
 * <P>
 * <B>Param:</B> {@link HostOpenNewViewMessage} with the queries
 * <P>
 *
 * @memberof hostConst_Services_Solution
 * @see HostOpenNewViewProxy
 */
export let HS_HOST_OPEN_NEW_VIEW_SVC = 'splm.browserinterop.solutions.services.hostOpenNewView.HostOpenNewView.host';

/**
 * Called to open a URL on the host app
 * <P>
 * <B>Param:</B> URL to be opened
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see HostOpenURLProxy
 */
export let HS_HOST_OPEN_URL = 'splm.browserinterop.solutions.services.open.HostOpenURL.host';

/**
 * Called to open a component on the host app within a certain context
 * <P>
 * <B>Param:</B> {@link InteropObjectRef} to be opened <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see HostOpenWithProxy
 */
export let HS_HOST_OPEN_WITH = 'splm.browserinterop.solutions.services.open.HostOpenWith.host';

/**
 * Called by the client to have the host open a object in PS
 * <P>
 * <B>Param:</B> {@link HostOpenInPSMessage} with the queries
 * <P>
 *
 * @see HostOpenInPSProxy
 */
export let HS_HOST_LOAD_PROCESS_TO_PROCESS_SIMULATE = 'com.siemens.splm.client.processsimulate.hosted.internal.hosted.HostLoadProcessToProcessSimulateSvc';

/**
 * Called by the client to have the host to load a study in PS
 * <P>
 * <B>Param:</B> {@link HostLoadStudyInPSMessage} with the queries
 * <P>
 *
 * @see HostLoadStudyInPSProxy
 */
export let HS_HOST_LOAD_STUDY_TO_PROCESS_SIMULATE = 'com.siemens.splm.client.processsimulate.hosted.internal.hosted.HostLoadStudyToProcessSimulateSvc';

/**
 * Called by the client to have the host to load a study in NX
 * <P>
 * <B>Param:</B> {@link HostLoadStudyInNXMessage} with the queries
 * <P>
 *
 * @see HostLoadStudyInNXProxy
 */
 export let HS_HOST_OPEN_STUDY_TO_NX = 'com.siemens.splm.client.mfg.tcma.hostservices.HostLoadStudySvc';

/**
 * Called by the client to send notification to PS
 * <P>
 * <B>Param:</B> {@link HostSendNotificationToPSMsg} with the queries
 * <P>
 *
 * @see HostSendNotificationToPSProxy
 */
export let HS_SEND_NTF_TO_PROCESS_SIMULATE = 'com.siemens.splm.client.processsimulate.hosted.internal.hosted.HostClientCompletedNotificationSvc';

/**
 * Called to query the host for information using {@link HostQueryMessage}
 * <P>
 * <B>Param:</B> Queries to perform
 * <P>
 * <B>Return:</B> Query responses
 *
 * @memberof hostConst_Services_Solution
 */
export let HS_INTEROPQUERY_SVC = 'splm.browserinterop.solutions.services.interopquery.InteropQuery.host';

/**
 * Called by the client to return the results of a create IssueReport request
 * <P>
 * <B>Param:</B> {@link CreateIssueResponseMsg} results of the create IssueReport
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 */
export let HS_ISSUES_CREATE_RESPONSE = 'splm.browserinterop.solutions.services.issues.CreateIssueResponse.host';


/**
 * Send selected request to Host service FQN
 * Called by the hosted page to have the host to return selected objects in PS
 * <P>
 * <B>Param:</B> {@link HostOpenInPSRequestMsg} with the queries
 * <P>
 *
 * @see HostLoadStudyInPSProxy
 */
export let HS_HOST_SEND_SELECTED_REQUEST = 'com.siemens.splm.client.mfg.tcma.hostservices.published.sendrequest.HostSendSelectedRequestSvc';

/**
 * Send selection sync request to PS
 */
export let HS_HOST_SELECT_MFGS_IN_PS_REQUEST = 'com.siemens.splm.client.processsimulate.hosted.internal.hosted.HostSelectMfgsInProcessSimulateSvc'; //$NON-NLS-1$


/**
 * Send load object request to Host service FQN
 */
export let HS_HOST_LOAD_MFG_REQUEST = 'com.siemens.splm.client.processsimulate.hosted.internal.hosted.HostLoadMFGToProcessSimulateSvc';

/**
 * Send get loaded object request to Host service FQN
 */
export let HS_HOST_GET_LOADED_MFGS_WITH_STATES_REQUEST = 'com.siemens.splm.client.mfg.tcma.hostservices.published.sendrequest.ClientRequestLoadedMfgsWithStatesSvc';

/**
 * Send get loaded object request to Host service FQN
 */
export let HS_HOST_GET_LOADED_NOTIFICATION = 'com.siemens.splm.client.processsimulate.hosted.services.refresh.ClientGetLoadedMfgsService';

/**
 * Get selected MFGs to sync with client from Host service FQN
 */
export let HS_HOST_GET_SELECTION_SYNC_SVC = 'com.siemens.splm.tcmaccess.SelectMfgsInSearchResult.client';

/**
 * Send selected request to PS
 */
export let HS_HOST_UPDATE_MFGS_VISIBILITY_IN_PS_REQUEST = 'com.siemens.splm.client.processsimulate.hosted.internal.hosted.HostUpdateMfgVisibilitySvc';


/**
 * Called to send clipboard updates from the client app to the hosting app <B>@param:</B> List of
 * {@link InteropObjectRef} to add. <B>@param:</B> List of {@link InteropObjectRef} to remove.
 * <P>
 * <B>Return:</B> (none)
 *
 * @memberof hostConst_Services_Solution
 * @see RemoteClipboardProxy
 */
export let HS_REMOTE_CLIPBOARD_SERVICE = 'splm.browserinterop.services.clipboard.RemoteClipboard.host';

/**
 * Called to send a command notification from the client app to the hosting app
 *
 * @memberof hostConst_Services_Solution
 */
export let HS_FIRE_COMMAND_SERVICE = 'splm.browserinterop.solutions.services.preferences.CommandFired.host';

/**
 * Called by the client to have the host update the URL displayed in the browser
 * <P>
 * <P>
 * <B>Return:</B> (none)
 *
 * @see RouterProxy
 * @memberof hostConst_Services_Infrastructure
 */
export let HS_ROUTER_SVC = 'splm.browserinterop.infrastructure.services.router.host';

/**
 * Send study to RAC to Open it in PS
 *
 */
export let HS_HOST_SEND_STUDY_OPENWITHPS_REQUEST = 'com.siemens.splm.tcmaccess.OpenWithPS.host';

/**
 * --------------------------------------------------------------------<br>
 * Misc. Constants used to help centralize definition/use of common string<br>
 * --------------------------------------------------------------------<br>
 */

/**
 * Feb, 2014 version (i.e. AW2.1 - Michigan)
 * @memberof hostConst_Services
 */
export let VERSION_2014_02 = '_2014_02';

/**
 * July, 2014 version (i.e. AW2.2 - Pennsylvania)
 * @memberof hostConst_Services
 */
export let VERSION_2014_07 = '_2014_07';

/**
 * July, 2014 version (i.e. AW2.3 - New Jersey)
 * @memberof hostConst_Services
 */
export let VERSION_2014_10 = '_2014_10';

/**
 * March, 2015 version (i.e. AW2.4 - Georgia)
 * @memberof hostConst_Services
 */
export let VERSION_2015_03 = '_2015_03';

/**
 * October, 2015 version )
 *
 * @memberof hostConst_Services
 */
export let VERSION_2015_10 = '_2015_10';

/**
 * March, 2016 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2016_03 = '_2016_03';

/**
 * April, 2016 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2016_04 = '_2016_04';

/**
 * December, 2016 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2016_12 = '_2016_12';

/**
 * May, 2017 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2017_05 = '_2017_05';

/**
 * November, 2017 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2017_11 = '_2017_11';

/**
 * May, 2018 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2018_05 = '_2018_05';

/**
 * July, 2018 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2018_07 = '_2018_07';

/**
 * May, 2019 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2019_05 = '_2019_05';

/**
 * July, 2019 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2019_07 = '_2019_07';

/**
 * December, 2019 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2019_12 = '_2019_12';

/**
 * January, 2020 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2020_01 = '_2020_01';

/**
 * March, 2022 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2022_03 = '_2022_03';

/**
 * December, 2022 version
 *
 * @memberof hostConst_Services
 */
export let VERSION_2022_12 = '_2022_12';


let exports = {};
export default exports = {
    CS_REQUEST_HOST_AUTH_REPLY_SVC,
    CS_SOA_JSON_REQUEST_SVC,
    HS_ASYNC_SOA_JSON_MESSAGE_SVC,
    HS_CLIENT_STATUS_SVC,
    HS_CS_STARTUP_NOTIFICATION_SVC,
    HS_HOST_CONFIGURATION_SVC,
    HS_HOST_SESSION_INFO_SVC,
    HS_LOGGER_FORWARD_SVC,
    HS_REQUEST_HOST_AUTH_SVC,
    URI_QUERY_PARAM_HOSTING_ENABLED,
    URI_QUERY_PARAM_HOSTING_TIMER_DISABLED,
    CS_GET_AVAILABLE_THEMES_SVC,
    CS_GET_CLIENT_INFO_SVC,
    CS_REFRESH_SVC,
    CS_SELECTION_LISTENER_SVC,
    CS_SESSION_SVC,
    CS_SET_THEME_SVC,
    HS_REFRESH_SVC,
    HS_SELECTION_PROVIDER_SVC,
    HS_SESSION_SVC,
    CS_COMPONENTCONFIG_SERVICE,
    CS_DISCUSSION_COMPONENT_INPUT_SVC,
    CS_FILE_UPLOAD_SVC,
    CS_GET_FILE_TICKET,
    CS_GET_PREFERENCES_SVC,
    CS_INPUT_STUDY_MANAGER_SVC,
    CS_INITIATE_SEARCH,
    CS_INTEROPQUERY_SVC,
    CS_ISSUES_EXECUTECOMMAND_SVC,
    CS_OBJECTINFO_COMPONENT_INPUT_SVC,
    CS_OPEN_LOCATION_SERVICE,
    CS_REMOTE_CLIPBOARD_SERVICE,
    CS_SET_APP_CONTEXT_SVC,
    CS_SHOW_SUMMARY,
    CS_USER_MESSAGING_SVC,
    CS_OPEN_PANEL_SVC,
    CS_WORKFLOW_COMPONENT_INPUT_SVC,
    CS_ADVANCED_FILTER_COMPONENT_INPUT_SVC,
    HS_DRAG_AND_DROP_SVC,
    HS_FMS_UPLOAD,
    HS_GET_PREFERENCES_RESPONSE_SVC,
    HS_GET_TICKET_RESPONSE,
    HS_HOST_ADD_COMPONENT,
    HS_HOST_CHECKIN_CHECKOUT,
    HS_HOST_FEEDBACK,
    HS_HOST_LOAD_PROCESS_TO_PROCESS_SIMULATE,
    HS_HOST_LOAD_STUDY_TO_PROCESS_SIMULATE,
    HS_HOST_OPEN_STUDY_TO_NX,
    HS_HOST_OPEN,
    HS_HOST_OPEN_NEW_VIEW_SVC,
    HS_HOST_OPEN_URL,
    HS_HOST_OPEN_WITH,
    HS_HOST_SEND_STUDY_OPENWITHPS_REQUEST,
    HS_SEND_NTF_TO_PROCESS_SIMULATE,
    HS_INTEROPQUERY_SVC,
    HS_ISSUES_CREATE_RESPONSE,
    HS_REMOTE_CLIPBOARD_SERVICE,
    HS_FIRE_COMMAND_SERVICE,
    HS_ROUTER_SVC,
    HS_HOST_SEND_SELECTED_REQUEST,
    HS_HOST_LOAD_MFG_REQUEST,
    HS_HOST_GET_LOADED_MFGS_WITH_STATES_REQUEST,
    HS_HOST_GET_LOADED_NOTIFICATION,
    HS_HOST_GET_SELECTION_SYNC_SVC,
    HS_HOST_UPDATE_MFGS_VISIBILITY_IN_PS_REQUEST,
    HS_HOST_SELECT_MFGS_IN_PS_REQUEST,
    VERSION_2014_02,
    VERSION_2014_07,
    VERSION_2014_10,
    VERSION_2015_03,
    VERSION_2015_10,
    VERSION_2016_03,
    VERSION_2016_04,
    VERSION_2016_12,
    VERSION_2017_05,
    VERSION_2017_11,
    VERSION_2018_05,
    VERSION_2018_07,
    VERSION_2019_05,
    VERSION_2019_07,
    VERSION_2019_12,
    VERSION_2020_01,
    VERSION_2022_03,
    VERSION_2022_12
};
