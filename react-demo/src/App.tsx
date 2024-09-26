import { useEffect, useContext, useState, useCallback, useReducer, useMemo } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import ZoomVideo, { ConnectionState, ReconnectReason } from '@zoom/videosdk';
import { message, Modal } from 'antd';
import 'antd/dist/antd.min.css';
import produce from 'immer';
import ZoomContext from './context/zoom-context';
import ZoomMediaContext from './context/media-context';
import LoadingLayer from './component/loading-layer';
import Chat from './feature/chat/chat';
import Command from './feature/command/command';
import Subsession from './feature/subsession/subsession';
import { MediaStream } from './index-types';
import './App.css';

import Home from './feature/home/home';
import NewHome from './feature/new-home/new-home';
import Video from './feature/video/video';
import VideoSingle from './feature/video/video-single';
import VideoNonSAB from './feature/video/video-non-sab';
import Preview from './feature/preview/preview';
import WaitingRoom from './feature/waiting-room/waiting-room';
import Researcher from './feature/researcher/researcher';
import ViewVideo from './feature/view-video/view-video';

import { isAndroidBrowser } from './utils/platform';
import { useAuth } from './authContext'; // Adjust the path as per your directory structure
import { generateVideoToken } from './utils/util';

interface AppProps {
  meetingArgs: {
    sdkKey: string;
    sdkSecret: string;
    topic: string;
    signature: string;
    name: string;
    password?: string;
    sessionKey: string;
    userIdentity: string;
    role: string;
    cloud_recording_option?: string;
    cloud_recording_election?: string;
    telemetry_tracking_id?: string;
    webEndpoint?: string;
    enforceGalleryView?: string;
    customerJoinId?: string;
    lang?: string;
  };
}
const mediaShape = {
  audio: {
    encode: false,
    decode: false
  },
  video: {
    encode: false,
    decode: false
  },
  share: {
    encode: false,
    decode: false
  }
};
const mediaReducer = produce((draft, action) => {
  switch (action.type) {
    case 'audio-encode': {
      draft.audio.encode = action.payload;
      break;
    }
    case 'audio-decode': {
      draft.audio.decode = action.payload;
      break;
    }
    case 'video-encode': {
      draft.video.encode = action.payload;
      break;
    }
    case 'video-decode': {
      draft.video.decode = action.payload;
      break;
    }
    case 'share-encode': {
      draft.share.encode = action.payload;
      break;
    }
    case 'share-decode': {
      draft.share.decode = action.payload;
      break;
    }
    case 'reset-media': {
      Object.assign(draft, { ...mediaShape });
      break;
    }
    default:
      break;
  }
}, mediaShape);

declare global {
  interface Window {
    webEndpoint: string | undefined;
    zmClient: any | undefined;
    mediaStream: any | undefined;
    crossOriginIsolated: boolean;
    ltClient: any | undefined;
  }
}

function App(props: AppProps) {

  const authContext = useAuth();
  if (!authContext) {
    // Handle the case where auth context is null. For example:
    return null; // or some other appropriate handling
  }
  const { loggedInUsername, setLoggedInUsername, userGroup, setUserGroup, isResearcher, setIsResearcher } = authContext;

  const {
    meetingArgs: {
      sdkKey,
      sdkSecret,
      topic,
      signature,
      name,
      password,
      sessionKey,
      userIdentity,
      role,
      cloud_recording_option,
      cloud_recording_election,
      telemetry_tracking_id,
      webEndpoint: webEndpointArg,
      enforceGalleryView,
      customerJoinId,
      lang
    }
  } = props;
  const [loading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [isFailover, setIsFailover] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('closed');
  const [mediaState, dispatch] = useReducer(mediaReducer, mediaShape);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isSupportGalleryView, setIsSupportGalleryView] = useState<boolean>(true);
  const zmClient = useContext(ZoomContext);
  let webEndpoint: any;
  if (webEndpointArg) {
    webEndpoint = webEndpointArg;
  } else {
    webEndpoint = window?.webEndpoint ?? 'zoom.us';
  }
  const mediaContext = useMemo(() => ({ ...mediaState, mediaStream }), [mediaState, mediaStream]);
  const galleryViewWithoutSAB = Number(enforceGalleryView) === 1 && !window.crossOriginIsolated;
  
  const createVideoToken = async (group: string, isResearcher: boolean) => {
    try {
        console.log("inside createVideoToken", group);
        props.meetingArgs.signature = generateVideoToken(
            props.meetingArgs.sdkKey,
            props.meetingArgs.sdkSecret,
            group,
            props.meetingArgs.password,
            props.meetingArgs.sessionKey,
            props.meetingArgs.userIdentity,
            parseInt(props.meetingArgs.role, 10),
            props.meetingArgs.cloud_recording_option,
            props.meetingArgs.cloud_recording_election,
            props.meetingArgs.telemetry_tracking_id
        );
        props.meetingArgs.topic = group;
        console.log('=====================================');
        console.log('meetingArgs', props.meetingArgs);

        const init = async () => {
            try {
                await zmClient.init('en-US', `${window.location.origin}/lib`, {
                    webEndpoint,
                    enforceMultipleVideos: galleryViewWithoutSAB,
                    enforceVirtualBackground: galleryViewWithoutSAB,
                    stayAwake: true
                });

                setLoadingText('Joining the session...');
                if (isResearcher) {
                  await zmClient.join(group, props.meetingArgs.signature, "researcher", password);
                } else {
                  await zmClient.join(group, props.meetingArgs.signature, name, password);
                }
                const stream = zmClient.getMediaStream();
                setMediaStream(stream);
                setIsSupportGalleryView(stream.isSupportMultipleVideos());
                setIsLoading(false);
            } catch (e: any) {
                console.error("Error in init:", e);
                setIsLoading(false);
                message.error(e.message || 'Error during session initiation');
            }
        };

        await init();
    } catch (error) {
        console.error("Error in createVideoToken:", error);
    }
  };

  // useEffect(() => {
  //   const generate = async () => {
  //       console.log("inside the generate function");
  //       props.meetingArgs.signature = generateVideoToken(
  //         props.meetingArgs.sdkKey,
  //         props.meetingArgs.sdkSecret,
  //         userGroup,
  //         props.meetingArgs.password,
  //         props.meetingArgs.sessionKey,
  //         props.meetingArgs.userIdentity,
  //         parseInt(props.meetingArgs.role, 10),
  //         props.meetingArgs.cloud_recording_option,
  //         props.meetingArgs.cloud_recording_election,
  //         props.meetingArgs.telemetry_tracking_id)
  //       console.log('=====================================');
  //       console.log('meetingArgs', props.meetingArgs);
  //   }
  //   const init = async () => {
  //     await zmClient.init('en-US', `${window.location.origin}/lib`, {
  //       webEndpoint,
  //       enforceMultipleVideos: galleryViewWithoutSAB,
  //       enforceVirtualBackground: galleryViewWithoutSAB,
  //       stayAwake: true
  //     });
  //     try {
  //       setLoadingText('Joining the session...');
  //       await zmClient.join(userGroup, props.meetingArgs.signature, name, password).catch((e) => {
  //         console.log(e);
  //       });
  //       const stream = zmClient.getMediaStream();
  //       setMediaStream(stream);
  //       setIsSupportGalleryView(stream.isSupportMultipleVideos());
  //       setIsLoading(false);
  //     } catch (e: any) {
  //       setIsLoading(false);
  //       message.error(e.reason);
  //     }
  //   };

  //   if (userGroup !== null) {
  //     generate().then(() => {
  //       console.log("token generated");
  //       init();
  //     })
  //   }

  //   return () => {
  //     if (userGroup !== null) {
  //       ZoomVideo.destroyClient();
  //     }
  //   };

  // }, [userGroup]); //, sdkKey, signature, zmClient, topic, name, password, webEndpoint, galleryViewWithoutSAB, customerJoinId
  
  const onConnectionChange = useCallback(
    (payload) => {
      if (payload.state === ConnectionState.Reconnecting) {
        setIsLoading(true); //changed to false from true
        setIsFailover(true);
        setStatus('connecting');
        const { reason, subsessionName } = payload;
        if (reason === ReconnectReason.Failover) {
          setLoadingText('Session Disconnected,Try to reconnect');
        } else if (reason === ReconnectReason.JoinSubsession || reason === ReconnectReason.MoveToSubsession) {
          setLoadingText(`Joining ${subsessionName}...`);
        } else if (reason === ReconnectReason.BackToMainSession) {
          setLoadingText('Returning to Main Session...');
        }
      } else if (payload.state === ConnectionState.Connected) {
        setStatus('connected');
        if (isFailover) {
          setIsLoading(false);
        }
        window.zmClient = zmClient;
        window.mediaStream = zmClient.getMediaStream();

        console.log('getSessionInfo', zmClient.getSessionInfo());
      } else if (payload.state === ConnectionState.Closed) {
        setStatus('closed');
        dispatch({ type: 'reset-media' });
        if (payload.reason === 'ended by host') {
          Modal.warning({
            title: 'Meeting ended',
            content: 'This meeting has been ended by host'
          });
        }
      }
    },
    [isFailover, zmClient]
  );
  const onMediaSDKChange = useCallback((payload) => {
    const { action, type, result } = payload;
    dispatch({ type: `${type}-${action}`, payload: result === 'success' });
  }, []);

  const onDialoutChange = useCallback((payload) => {
    console.log('onDialoutChange', payload);
  }, []);

  const onAudioMerged = useCallback((payload) => {
    console.log('onAudioMerged', payload);
  }, []);

  const onLeaveOrJoinSession = useCallback(async () => {
    if (status === 'closed') {
      setIsLoading(true);
      await zmClient.join(topic, signature, name, password);
      setIsLoading(false);
    } else if (status === 'connected') {
      await zmClient.leave();
      message.warn('You have left the session.');
    }
  }, [zmClient, status, topic, signature, name, password]); //zmClient, status, topic, signature, name, password
  
  useEffect(() => {
    zmClient.on('connection-change', onConnectionChange);
    zmClient.on('media-sdk-change', onMediaSDKChange);
    zmClient.on('dialout-state-change', onDialoutChange);
    zmClient.on('merged-audio', onAudioMerged);
    return () => {
      zmClient.off('connection-change', onConnectionChange);
      zmClient.off('media-sdk-change', onMediaSDKChange);
      zmClient.off('dialout-state-change', onDialoutChange);
      zmClient.off('merged-audio', onAudioMerged);
    };
  }, [zmClient, onConnectionChange, onMediaSDKChange, onDialoutChange, onAudioMerged]);
  
  return (
    <div className="App">
      {loading && <LoadingLayer content={loadingText} />}
      {!loading && (
        <ZoomMediaContext.Provider value={mediaContext}>
          <Router>
            <Switch>
              <Route
                path="/"
                render={(props) => <NewHome {...props} status={status} onLeaveOrJoinSession={onLeaveOrJoinSession} createVideoToken={createVideoToken} />}
                exact
              />
              <Route
                path="/new-home"
                render={(props) => <NewHome {...props} status={status} onLeaveOrJoinSession={onLeaveOrJoinSession} createVideoToken={createVideoToken} />}
                exact
              />
              {/* <Route
                path="/home"
                render={(props) => <Home {...props} status={status} onLeaveOrJoinSession={onLeaveOrJoinSession} />}
                exact
              /> */}
              <Route path="/index.html" component={Home} exact /> {/* what this do? */}
              <Route path="/chat" component={Chat} />
              <Route
                path="/chat"
                render={(props) => <Chat {...props} />}
                exact
              />
              <Route path="/command" component={Command} />
              <Route
                path="/video"
                render={(props) => ( <Video {...props} />)}
              />
              <Route
                path="/r"
                render={(props) => <Researcher {...props} status={status} onLeaveOrJoinSession={onLeaveOrJoinSession} createVideoToken={createVideoToken} />}
                exact
              />
              <Route
                path="/r/:videoIndex"
                render={(props) => <ViewVideo {...props} status={status} onLeaveOrJoinSession={onLeaveOrJoinSession} createVideoToken={createVideoToken} />}
                exact
              />
              {/* <Route
                path="/video"
                render={(props) => (
                  isSupportGalleryView 
                    ? <Video {...props} />
                    : galleryViewWithoutSAB 
                      ? <VideoNonSAB {...props} />
                      : <VideoSingle {...props} />
                )}
              /> */}
              <Route path="/subsession" component={Subsession} />
              <Route path="/preview" component={Preview} />
              <Route path="/waiting-room" component={WaitingRoom} />
            </Switch>
          </Router>
        </ZoomMediaContext.Provider>
      )}
    </div>
  );
}

export default App;
