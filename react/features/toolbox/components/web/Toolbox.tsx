import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { isMobileBrowser } from '../../../base/environment/utils';
import { getLocalParticipant, isLocalParticipantModerator } from '../../../base/participants/functions';
import ContextMenu from '../../../base/ui/components/web/ContextMenu';
import { isTranscribing } from '../../../transcribing/functions';
import {
    setHangupMenuVisible,
    setOverflowMenuVisible,
    setToolbarHovered,
    showToolbox
} from '../../actions.web';
import {
    getJwtDisabledButtons,
    getVisibleButtons,
    isButtonEnabled,
    isToolboxVisible
} from '../../functions.web';
import { useKeyboardShortcuts, useToolboxButtons } from '../../hooks.web';
import HangupButton from '../HangupButton';

import { EndConferenceButton } from './EndConferenceButton';
import HangupMenuButton from './HangupMenuButton';
import { LeaveConferenceButton } from './LeaveConferenceButton';
import Separator from './Separator';

/**
 * The type of the React {@code Component} props of {@link Toolbox}.
 */
interface IProps {
    isConferenceJoined?: boolean;

    /**
     * Explicitly passed array with the buttons which this Toolbox should display.
     */
    toolbarButtons?: Array<string>;
}

const useStyles = makeStyles()(() => {
    return {
        contextMenu: {
            position: 'relative',
            right: 'auto',
            margin: 0,
            marginBottom: '8px',
            maxHeight: 'calc(100dvh - 100px)',
            minWidth: '240px'
        },

        hangupMenu: {
            position: 'relative',
            right: 'auto',
            display: 'flex',
            flexDirection: 'column',
            rowGap: '8px',
            margin: 0,
            padding: '16px',
            marginBottom: '4px'
        }
    };
});

/**
 * A component that renders the main toolbar.
 *
 * @param {IProps} props - The props of the component.
 * @returns {ReactElement}
 */
export default function Toolbox({
    toolbarButtons,
    isConferenceJoined
}: IProps) {
    const { classes, cx } = useStyles();
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const _toolboxRef = useRef<HTMLDivElement>(null);

    const conference = useSelector((state: IReduxState) => state['features/base/conference'].conference);
    const isNarrowLayout = useSelector((state: IReduxState) => state['features/base/responsive-ui'].isNarrowLayout);
    const clientWidth = useSelector((state: IReduxState) => state['features/base/responsive-ui'].clientWidth);
    const isModerator = useSelector(isLocalParticipantModerator);
    const customToolbarButtons = useSelector(
        (state: IReduxState) => state['features/base/config'].customToolbarButtons);
    const iAmRecorder = useSelector((state: IReduxState) => state['features/base/config'].iAmRecorder);
    const iAmSipGateway = useSelector((state: IReduxState) => state['features/base/config'].iAmSipGateway);
    const overflowDrawer = useSelector((state: IReduxState) => state['features/toolbox'].overflowDrawer);
    const shiftUp = useSelector((state: IReduxState) => state['features/toolbox'].shiftUp);
    const overflowMenuVisible = useSelector((state: IReduxState) => state['features/toolbox'].overflowMenuVisible);
    const hangupMenuVisible = useSelector((state: IReduxState) => state['features/toolbox'].hangupMenuVisible);
    const buttonsWithNotifyClick
        = useSelector((state: IReduxState) => state['features/toolbox'].buttonsWithNotifyClick);
    const reduxToolbarButtons = useSelector((state: IReduxState) => state['features/toolbox'].toolbarButtons);
    const toolbarButtonsToUse = toolbarButtons || reduxToolbarButtons;
    const chatOpen = useSelector((state: IReduxState) => state['features/chat'].isOpen);
    const isDialogVisible = useSelector((state: IReduxState) => Boolean(state['features/base/dialog'].component));
    const jwt = useSelector((state: IReduxState) => state['features/base/jwt'].jwt);
    const localParticipant = useSelector(getLocalParticipant);
    const transcribing = useSelector(isTranscribing);

    // Do not convert to selector, it returns new array and will cause re-rendering of toolbox on every action.
    const jwtDisabledButtons = getJwtDisabledButtons(transcribing, isModerator, jwt, localParticipant?.features);

    const toolbarVisible = useSelector(isToolboxVisible);
    const mainToolbarButtonsThresholds
        = useSelector((state: IReduxState) => state['features/toolbox'].mainToolbarButtonsThresholds);
    const allButtons = useToolboxButtons(customToolbarButtons);

    useKeyboardShortcuts(toolbarButtonsToUse);

    useEffect(() => {
        if (!toolbarVisible) {
            if (document.activeElement instanceof HTMLElement
                && _toolboxRef.current?.contains(document.activeElement)) {
                document.activeElement.blur();
            }
        }
    }, [ toolbarVisible ]);

    /**
     * Sets the visibility of the hangup menu.
     *
     * @param {boolean} visible - Whether or not the hangup menu should be
     * displayed.
     * @private
     * @returns {void}
     */
    const onSetHangupVisible = useCallback((visible: boolean) => {
        dispatch(setHangupMenuVisible(visible));
        dispatch(setToolbarHovered(visible));
    }, [ dispatch ]);

    /**
     * Sets the visibility of the overflow menu.
     *
     * @param {boolean} visible - Whether or not the overflow menu should be
     * displayed.
     * @private
     * @returns {void}
     */
    const onSetOverflowVisible = useCallback((visible: boolean) => {
        dispatch(setOverflowMenuVisible(visible));
        dispatch(setToolbarHovered(visible));
    }, [ dispatch ]);

    useEffect(() => {
        if (hangupMenuVisible && !toolbarVisible) {
            onSetHangupVisible(false);
            dispatch(setToolbarHovered(false));
        }
    }, [ dispatch, hangupMenuVisible, toolbarVisible, onSetHangupVisible ]);

    useEffect(() => {
        if (overflowMenuVisible && isDialogVisible) {
            onSetOverflowVisible(false);
            dispatch(setToolbarHovered(false));
        }
    }, [ dispatch, overflowMenuVisible, isDialogVisible, onSetOverflowVisible ]);

    /**
     * Key handler for overflow/hangup menus.
     *
     * @param {KeyboardEvent} e - Esc key click to close the popup.
     * @returns {void}
     */
    const onEscKey = useCallback((e?: React.KeyboardEvent) => {
        if (e?.key === 'Escape') {
            e?.stopPropagation();
            hangupMenuVisible && dispatch(setHangupMenuVisible(false));
            overflowMenuVisible && dispatch(setOverflowMenuVisible(false));
        }
    }, [ dispatch, hangupMenuVisible, overflowMenuVisible ]);

    /**
     * Dispatches an action signaling the toolbar is not being hovered.
     *
     * @private
     * @returns {void}
     */
    const onMouseOut = useCallback(() => {
        !overflowMenuVisible && dispatch(setToolbarHovered(false));
    }, [ dispatch, overflowMenuVisible ]);

    /**
     * Dispatches an action signaling the toolbar is being hovered.
     *
     * @private
     * @returns {void}
     */
    const onMouseOver = useCallback(() => {
        dispatch(setToolbarHovered(true));
    }, [ dispatch ]);

    /**
     * Toggle the toolbar visibility when tabbing into it.
     *
     * @returns {void}
     */
    const onTabIn = useCallback(() => {
        if (!toolbarVisible) {
            dispatch(showToolbox());
        }
    }, [ toolbarVisible, dispatch ]);

    if (iAmRecorder || iAmSipGateway) {
        return null;
    }

    const endConferenceSupported = Boolean(conference?.isEndConferenceSupported() && isModerator);
    const isMobile = isMobileBrowser();

    const rootClassNames = `new-toolbox ${toolbarVisible ? 'visible' : ''} ${
        toolbarButtonsToUse.length ? '' : 'no-buttons'} ${chatOpen ? 'shift-right' : ''} 
        ${isConferenceJoined ? 'conference-joined-toolbox' : ''}`;

    const toolbarAccLabel = 'toolbar.accessibilityLabel.moreActionsMenu';
    const containerClassName = `toolbox-content${isMobile || isNarrowLayout ? ' toolbox-content-mobile' : ''}`;

    const { mainMenuButtons, overflowMenuButtons } = getVisibleButtons({
        allButtons,
        buttonsWithNotifyClick,
        toolbarButtons: toolbarButtonsToUse,
        clientWidth,
        jwtDisabledButtons,
        mainToolbarButtonsThresholds
    });
    const toolMainMenuButtons = [ ...mainMenuButtons, ...overflowMenuButtons ];

    return (
        <div
            className = { cx(rootClassNames, shiftUp && 'shift-up') }
            id = 'new-toolbox'>
            <div className = { containerClassName }>
                <div
                    className = 'toolbox-content-wrapper'
                    onFocus = { onTabIn }
                    { ...(isMobile ? {} : {
                        onMouseOut,
                        onMouseOver
                    }) }>

                    <div
                        className = 'toolbox-content-items'
                        ref = { _toolboxRef }>
                        {toolMainMenuButtons.map(({ Content, key, ...rest }) => Content !== Separator && (
                            <Content
                                { ...rest }
                                buttonKey = { key }
                                key = { key } />))}

                        {isButtonEnabled('hangup', toolbarButtonsToUse) && (
                            endConferenceSupported
                                ? <HangupMenuButton
                                    ariaControls = 'hangup-menu'
                                    isOpen = { hangupMenuVisible }
                                    key = 'hangup-menu'
                                    notifyMode = { buttonsWithNotifyClick?.get('hangup-menu') }
                                    onVisibilityChange = { onSetHangupVisible }>
                                    <ContextMenu
                                        accessibilityLabel = { t(toolbarAccLabel) }
                                        className = { classes.hangupMenu }
                                        hidden = { false }
                                        inDrawer = { overflowDrawer }
                                        onKeyDown = { onEscKey }>
                                        <EndConferenceButton
                                            buttonKey = 'end-meeting'
                                            notifyMode = { buttonsWithNotifyClick?.get('end-meeting') } />
                                        <LeaveConferenceButton
                                            buttonKey = 'hangup'
                                            notifyMode = { buttonsWithNotifyClick?.get('hangup') } />
                                    </ContextMenu>
                                </HangupMenuButton>
                                : <HangupButton
                                    buttonKey = 'hangup'
                                    customClass = 'hangup-button'
                                    key = 'hangup-button'
                                    notifyMode = { buttonsWithNotifyClick.get('hangup') }
                                    visible = { isButtonEnabled('hangup', toolbarButtonsToUse) } />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
